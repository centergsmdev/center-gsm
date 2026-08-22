"use client";

const TARGET_SAMPLE_RATE = 16_000;
const CHUNK_SAMPLES = 3_000;

type SimliAudioSender = {
  sendAudioData: (audioData: Uint8Array) => void;
};

export type SimliAudioInputSnapshot = {
  contextState: AudioContextState;
  chunksSent: number;
  bytesSent: number;
  inputLevel: number;
  lastChunkAt: number | null;
};

export type SimliAudioInput = {
  context: AudioContext;
  stop: () => void;
};

type WebkitWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function createSimliAudioContext() {
  const AudioContextConstructor =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  return new AudioContextConstructor({ sampleRate: TARGET_SAMPLE_RATE });
}

function workletSource() {
  return `
    class CenterGsmSimliPcmProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.targetRate = ${TARGET_SAMPLE_RATE};
        this.chunk = new Int16Array(${CHUNK_SAMPLES});
        this.chunkIndex = 0;
        this.sourceOffset = 0;
        this.levelSquares = 0;
        this.levelSamples = 0;
      }

      process(inputs, outputs) {
        for (const output of outputs) {
          for (const channel of output) channel.fill(0);
        }
        const input = inputs[0] && inputs[0][0];
        if (!input || input.length === 0) return true;
        const ratio = sampleRate / this.targetRate;
        let offset = this.sourceOffset;
        while (offset < input.length) {
          const left = Math.floor(offset);
          const right = Math.min(input.length - 1, left + 1);
          const fraction = offset - left;
          const sample = Math.max(-1, Math.min(1,
            input[left] * (1 - fraction) + input[right] * fraction
          ));
          this.chunk[this.chunkIndex++] = Math.max(
            -32768,
            Math.min(32767, Math.round(sample * 32767)),
          );
          this.levelSquares += sample * sample;
          this.levelSamples += 1;
          if (this.chunkIndex === this.chunk.length) {
            const payload = this.chunk.slice();
            const level = this.levelSamples
              ? Math.sqrt(this.levelSquares / this.levelSamples)
              : 0;
            this.port.postMessage(
              { type: "pcm", buffer: payload.buffer, level },
              [payload.buffer],
            );
            this.chunkIndex = 0;
            this.levelSquares = 0;
            this.levelSamples = 0;
          }
          offset += ratio;
        }
        this.sourceOffset = offset - input.length;
        return true;
      }
    }
    registerProcessor("center-gsm-simli-pcm", CenterGsmSimliPcmProcessor);
  `;
}

export async function startSimliAudioInput(input: {
  track: MediaStreamTrack;
  client: SimliAudioSender;
  preparedContext?: AudioContext | null;
  onSnapshot: (snapshot: SimliAudioInputSnapshot) => void;
  onError: () => void;
}): Promise<SimliAudioInput> {
  if (
    input.track.kind !== "audio" ||
    input.track.readyState !== "live" ||
    !input.track.enabled
  )
    throw new Error("simli_audio_track_not_live");

  const context = input.preparedContext ?? createSimliAudioContext();
  if (!context) throw new Error("simli_audio_context_unavailable");
  const ownsContext = !input.preparedContext;
  if (context.state !== "running") await context.resume();
  if (context.state !== "running") {
    if (ownsContext) await context.close().catch(() => undefined);
    throw new Error("simli_audio_context_suspended");
  }

  const moduleUrl = URL.createObjectURL(
    new Blob([workletSource()], { type: "application/javascript" }),
  );
  let source: MediaStreamAudioSourceNode | null = null;
  let worklet: AudioWorkletNode | null = null;
  let silentGain: GainNode | null = null;
  let stopped = false;
  let chunksSent = 0;
  let bytesSent = 0;

  try {
    await context.audioWorklet.addModule(moduleUrl);
    if (context.state !== "running") await context.resume();
    source = context.createMediaStreamSource(new MediaStream([input.track]));
    worklet = new AudioWorkletNode(context, "center-gsm-simli-pcm", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    silentGain = context.createGain();
    silentGain.gain.value = 0;
    worklet.port.onmessage = (event: MessageEvent<unknown>) => {
      if (stopped || !event.data || typeof event.data !== "object") return;
      const data = event.data as {
        type?: unknown;
        buffer?: unknown;
        level?: unknown;
      };
      if (data.type !== "pcm" || !(data.buffer instanceof ArrayBuffer)) return;
      try {
        const audioData = new Uint8Array(data.buffer);
        input.client.sendAudioData(audioData);
        chunksSent += 1;
        bytesSent += audioData.byteLength;
        input.onSnapshot({
          contextState: context.state,
          chunksSent,
          bytesSent,
          inputLevel:
            typeof data.level === "number" && Number.isFinite(data.level)
              ? Math.max(0, Math.min(1, data.level))
              : 0,
          lastChunkAt: performance.now(),
        });
      } catch {
        input.onError();
      }
    };
    source.connect(worklet);
    // Keep the worklet in the active render graph while outputting silence.
    // The native WebRTC admin audio remains the customer's only audible source.
    worklet.connect(silentGain).connect(context.destination);
    input.onSnapshot({
      contextState: context.state,
      chunksSent,
      bytesSent,
      inputLevel: 0,
      lastChunkAt: null,
    });
  } catch (reason) {
    URL.revokeObjectURL(moduleUrl);
    source?.disconnect();
    worklet?.disconnect();
    silentGain?.disconnect();
    if (ownsContext) await context.close().catch(() => undefined);
    throw reason;
  }
  URL.revokeObjectURL(moduleUrl);

  return {
    context,
    stop: () => {
      if (stopped) return;
      stopped = true;
      source?.disconnect();
      worklet?.port.close();
      worklet?.disconnect();
      silentGain?.disconnect();
      if (ownsContext) void context.close().catch(() => undefined);
    },
  };
}

export const SIMLI_PCM_FORMAT = {
  sampleRate: TARGET_SAMPLE_RATE,
  channels: 1,
  bitsPerSample: 16,
  chunkBytes: CHUNK_SAMPLES * 2,
} as const;
