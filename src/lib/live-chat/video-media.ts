export const CUSTOMER_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "user",
    width: { ideal: 720 },
    height: { ideal: 1280 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export const ADMIN_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: false,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export async function requestCustomerMedia(
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>,
) {
  try {
    return {
      stream: await getUserMedia(CUSTOMER_MEDIA_CONSTRAINTS),
      audioOnly: false,
    };
  } catch {
    return {
      stream: await getUserMedia({
        video: false,
        audio: ADMIN_MEDIA_CONSTRAINTS.audio,
      }),
      audioOnly: true,
    };
  }
}

export async function requestAdminMedia(
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>,
) {
  const stream = await getUserMedia(ADMIN_MEDIA_CONSTRAINTS);
  if (stream.getVideoTracks().length) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("admin_video_track_forbidden");
  }
  return stream;
}

export function assertAdminPeerHasNoVideoSender(
  peer: Pick<RTCPeerConnection, "getSenders">,
) {
  if (peer.getSenders().some((sender) => sender.track?.kind === "video"))
    throw new Error("admin_video_sender_forbidden");
}

export function ensureAdminAudioSender(
  peer: Pick<RTCPeerConnection, "addTrack" | "getSenders">,
  stream: MediaStream,
) {
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack || audioTrack.readyState !== "live")
    throw new Error("admin_audio_track_missing");
  if (!peer.getSenders().some((sender) => sender.track?.kind === "audio"))
    peer.addTrack(audioTrack, stream);
  assertAdminPeerHasNoVideoSender(peer);
  return audioTrack;
}
