"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  BODY_CONDITION_LABELS,
  REPAIR_STATUS_LABELS,
  SCREEN_CONDITION_LABELS,
  TRADE_IN_BRANDS,
  TRADE_IN_MAX_PHOTOS,
  TRADE_IN_MIN_PHOTOS,
  TRADE_IN_STORAGE_OPTIONS,
} from "@/lib/trade-in/constants";
import { cn } from "@/lib/utils";

type FormState = {
  deviceBrand: string;
  deviceModel: string;
  storageCapacity: string;
  screenCondition: string;
  bodyCondition: string;
  powersOn: string;
  repairStatus: string;
  batteryHealth: string;
  hasBox: string;
  desiredProduct: string;
  customerNote: string;
  customerName: string;
  phone: string;
  consent: boolean;
};

type SelectedPhoto = { file: File; preview: string };

const initialForm: FormState = {
  deviceBrand: "",
  deviceModel: "",
  storageCapacity: "",
  screenCondition: "",
  bodyCondition: "",
  powersOn: "",
  repairStatus: "",
  batteryHealth: "",
  hasBox: "false",
  desiredProduct: "",
  customerNote: "",
  customerName: "",
  phone: "",
  consent: false,
};

const controlClass =
  "h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5";

function Field({
  label,
  children,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
        {label}
        {optional ? (
          <span className="text-xs font-medium text-zinc-400">
            İsteğe bağlı
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function ChoiceGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {Object.entries(options).map(([option, label]) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={cn(
              "flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-bold transition",
              selected
                ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/10"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400",
            )}
          >
            {label}
            {selected ? <Check className="size-4" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

async function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
}

async function preparePhoto(file: File) {
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type))
    throw new Error("Yalnızca JPG, PNG veya WebP fotoğraf yükleyebilirsiniz.");
  if (file.size > 12 * 1024 * 1024)
    throw new Error("Seçtiğiniz fotoğraf 12 MB sınırını aşıyor.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Fotoğraf hazırlanamadı.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let blob: Blob | null = null;
  for (const quality of [0.82, 0.72, 0.62]) {
    blob = await canvasBlob(canvas, quality);
    if (blob && blob.size <= 900 * 1024) break;
  }
  if (!blob || blob.size > 1024 * 1024)
    throw new Error("Fotoğraf küçültülemedi. Lütfen başka bir fotoğraf seçin.");
  return new File([blob], `takas-${crypto.randomUUID()}.webp`, {
    type: "image/webp",
  });
}

export function TradeInApplication({
  initialDesiredProduct = "",
}: {
  initialDesiredProduct?: string;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    ...initialForm,
    desiredProduct: initialDesiredProduct,
  });
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const photosRef = useRef<SelectedPhoto[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(
    () => () =>
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview)),
    [],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function validateStep(current: number) {
    if (current === 1 && (!form.deviceBrand || !form.deviceModel.trim()))
      return "Telefonunuzun marka ve modelini girin.";
    if (
      current === 2 &&
      (!form.screenCondition ||
        !form.bodyCondition ||
        !form.powersOn ||
        !form.repairStatus)
    )
      return "Telefonunuzun durumuyla ilgili tüm zorunlu seçimleri tamamlayın.";
    if (
      current === 2 &&
      form.batteryHealth &&
      (Number(form.batteryHealth) < 1 || Number(form.batteryHealth) > 100)
    )
      return "Pil sağlığı 1–100 arasında olmalıdır.";
    if (current === 3 && photos.length < TRADE_IN_MIN_PHOTOS)
      return "Ön ve arka yüzü gösterecek en az 2 fotoğraf yükleyin.";
    if (current === 3 && (!form.customerName.trim() || !form.phone.trim()))
      return "Ad soyad ve telefon bilgilerinizi girin.";
    if (current === 3 && !form.consent)
      return "Ön değerlendirme bilgilendirmesini onaylayın.";
    return "";
  }

  function next() {
    const message = validateStep(step);
    if (message) return setError(message);
    setError("");
    setStep((current) => Math.min(3, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function selectPhotos(files: FileList | null) {
    if (!files?.length) return;
    const available = TRADE_IN_MAX_PHOTOS - photos.length;
    if (files.length > available) {
      setError(`En fazla ${TRADE_IN_MAX_PHOTOS} fotoğraf yükleyebilirsiniz.`);
      return;
    }
    setPreparingPhotos(true);
    setError("");
    try {
      const prepared: SelectedPhoto[] = [];
      for (const file of Array.from(files)) {
        const processed = await preparePhoto(file);
        prepared.push({
          file: processed,
          preview: URL.createObjectURL(processed),
        });
      }
      setPhotos((current) => [...current, ...prepared]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Fotoğraf hazırlanamadı.",
      );
    } finally {
      setPreparingPhotos(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  }

  async function submit() {
    const message = validateStep(3);
    if (message) return setError(message);
    setSubmitting(true);
    setError("");
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      payload.set(key, typeof value === "boolean" ? String(value) : value),
    );
    payload.set("website", "");
    photos.forEach((photo) => payload.append("photos", photo.file));
    try {
      const response = await fetch("/api/trade-in", {
        method: "POST",
        body: payload,
      });
      const result = (await response.json()) as {
        data?: { applicationNumber?: string } | null;
        error?: string | null;
      };
      if (!response.ok || !result.data?.applicationNumber)
        throw new Error(result.error || "Başvurunuz gönderilemedi.");
      setApplicationNumber(result.data.applicationNumber);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Başvurunuz gönderilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (applicationNumber)
    return (
      <main className="min-h-[70vh] bg-zinc-50 py-12 sm:py-20">
        <Container className="max-w-2xl">
          <section className="rounded-[28px] border border-emerald-200 bg-white p-7 text-center shadow-xl shadow-zinc-950/5 sm:p-12">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-8" />
            </span>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              Başvurunuz alındı
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-950">
              Telefonunuz incelemeye hazır
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-zinc-600">
              Ekibimiz bilgileri ve fotoğrafları kontrol ederek sizinle
              iletişime geçecek. Bu aşamada stok ayrılmaz ve satış oluşmaz.
            </p>
            <div className="mx-auto mt-7 max-w-sm rounded-2xl bg-zinc-950 px-5 py-4 text-white">
              <span className="block text-xs text-zinc-400">
                Başvuru numaranız
              </span>
              <strong className="mt-1 block text-lg tracking-wide">
                {applicationNumber}
              </strong>
            </div>
            <Link
              href="/urunler"
              className="mt-7 inline-flex text-sm font-bold text-primary hover:underline"
            >
              Ürünleri incelemeye devam et
            </Link>
          </section>
        </Container>
      </main>
    );

  return (
    <main className="bg-zinc-50">
      <Container className="max-w-4xl py-6 sm:py-10">
        <div
          className="mb-7 grid grid-cols-3 gap-2"
          aria-label="Başvuru adımları"
        >
          {["Telefon", "Durum", "Fotoğraf ve iletişim"].map((label, index) => {
            const number = index + 1;
            return (
              <div key={label} className="text-center">
                <div
                  className={cn(
                    "h-1.5 rounded-full",
                    number <= step ? "bg-zinc-950" : "bg-zinc-200",
                  )}
                />
                <span
                  className={cn(
                    "mt-2 block text-[11px] font-bold sm:text-xs",
                    number === step ? "text-zinc-950" : "text-zinc-400",
                  )}
                >
                  {number}. {label}
                </span>
              </div>
            );
          })}
        </div>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-xl shadow-zinc-950/5 sm:p-8">
          {step === 1 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                1. Adım
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Hangi telefonu takasa vereceksiniz?
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Doğru model bilgisi teklifin daha hızlı hazırlanmasını sağlar.
              </p>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <Field label="Marka">
                  <select
                    className={controlClass}
                    value={form.deviceBrand}
                    onChange={(event) =>
                      update("deviceBrand", event.target.value)
                    }
                  >
                    <option value="">Marka seçin</option>
                    {TRADE_IN_BRANDS.map((brand) => (
                      <option key={brand}>{brand}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Model">
                  <input
                    className={controlClass}
                    value={form.deviceModel}
                    onChange={(event) =>
                      update("deviceModel", event.target.value)
                    }
                    placeholder="Örn. iPhone 14 Pro"
                    maxLength={120}
                  />
                </Field>
                <Field label="Depolama" optional>
                  <select
                    className={controlClass}
                    value={form.storageCapacity}
                    onChange={(event) =>
                      update("storageCapacity", event.target.value)
                    }
                  >
                    <option value="">Bilmiyorum / seçmedim</option>
                    {TRADE_IN_STORAGE_OPTIONS.map((storage) => (
                      <option key={storage}>{storage}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Almak istediğiniz ürün" optional>
                  <input
                    className={controlClass}
                    value={form.desiredProduct}
                    onChange={(event) =>
                      update("desiredProduct", event.target.value)
                    }
                    placeholder="Örn. iPhone 17 Pro"
                    maxLength={160}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                2. Adım
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Telefonunuzun durumu nasıl?
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Lütfen mevcut durumu olduğu gibi seçin. Kesin teklif fiziksel
                inceleme sonrası netleşir.
              </p>
              <div className="mt-7 space-y-6">
                <Field label="Ekran durumu">
                  <ChoiceGroup
                    value={form.screenCondition}
                    onChange={(value) => update("screenCondition", value)}
                    options={SCREEN_CONDITION_LABELS}
                  />
                </Field>
                <Field label="Kasa durumu">
                  <ChoiceGroup
                    value={form.bodyCondition}
                    onChange={(value) => update("bodyCondition", value)}
                    options={BODY_CONDITION_LABELS}
                  />
                </Field>
                <Field label="Telefon açılıyor mu?">
                  <ChoiceGroup
                    value={form.powersOn}
                    onChange={(value) => update("powersOn", value)}
                    options={{
                      true: "Evet, açılıyor",
                      false: "Hayır, açılmıyor",
                    }}
                  />
                </Field>
                <Field label="Onarım durumu">
                  <ChoiceGroup
                    value={form.repairStatus}
                    onChange={(value) => update("repairStatus", value)}
                    options={REPAIR_STATUS_LABELS}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Pil sağlığı (%)" optional>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      className={controlClass}
                      value={form.batteryHealth}
                      onChange={(event) =>
                        update("batteryHealth", event.target.value)
                      }
                      placeholder="Örn. 87"
                    />
                  </Field>
                  <Field label="Kutu mevcut mu?">
                    <select
                      className={controlClass}
                      value={form.hasBox}
                      onChange={(event) => update("hasBox", event.target.value)}
                    >
                      <option value="false">Hayır</option>
                      <option value="true">Evet</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                3. Adım
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Fotoğrafları ve iletişim bilgilerinizi ekleyin
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Ön ve arka yüz zorunludur. Varsa çizik veya darbeyi ayrıca
                gösterebilirsiniz.
              </p>
              <div className="mt-7">
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-5 text-center transition hover:border-zinc-400 hover:bg-zinc-100">
                  {preparingPhotos ? (
                    <LoaderCircle className="size-6 animate-spin" />
                  ) : (
                    <Camera className="size-6" />
                  )}
                  <strong className="mt-3 text-sm">Fotoğraf seçin</strong>
                  <span className="mt-1 text-xs text-zinc-500">
                    2–4 adet · JPG, PNG veya WebP
                  </span>
                  <input
                    className="sr-only"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    disabled={
                      preparingPhotos || photos.length >= TRADE_IN_MAX_PHOTOS
                    }
                    onChange={(event) => {
                      void selectPhotos(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {photos.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {photos.map((photo, index) => (
                      <div
                        key={photo.preview}
                        className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
                      >
                        <Image
                          src={photo.preview}
                          alt={`Telefon fotoğrafı ${index + 1}`}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 640px) 45vw, 180px"
                        />
                        <button
                          type="button"
                          aria-label={`${index + 1}. fotoğrafı kaldır`}
                          onClick={() => removePhoto(index)}
                          className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white text-zinc-950 shadow-lg"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <span className="absolute bottom-2 left-2 rounded-full bg-zinc-950/80 px-2 py-1 text-[10px] font-bold text-white">
                          {index === 0
                            ? "Ön yüz"
                            : index === 1
                              ? "Arka yüz"
                              : "Detay"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <Field label="Ad soyad">
                  <input
                    className={controlClass}
                    autoComplete="name"
                    value={form.customerName}
                    onChange={(event) =>
                      update("customerName", event.target.value)
                    }
                    placeholder="Adınız ve soyadınız"
                    maxLength={120}
                  />
                </Field>
                <Field label="Cep telefonu">
                  <input
                    className={controlClass}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="05xx xxx xx xx"
                    maxLength={20}
                  />
                </Field>
              </div>
              <div className="mt-5">
                <Field label="Eklemek istediğiniz not" optional>
                  <textarea
                    className="min-h-28 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
                    value={form.customerNote}
                    onChange={(event) =>
                      update("customerNote", event.target.value)
                    }
                    placeholder="Cihazla ilgili bilmemiz gereken bir ayrıntı varsa yazabilirsiniz."
                    maxLength={1000}
                  />
                </Field>
              </div>
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(event) => update("consent", event.target.checked)}
                  className="mt-1 size-4 accent-zinc-950"
                />
                <span>
                  Bilgilerimin takas ön değerlendirmesi ve benimle iletişim
                  kurulması amacıyla işlenmesini kabul ediyorum. Gösterilen
                  sürecin kesin fiyat veya satış taahhüdü olmadığını biliyorum.
                </span>
              </label>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          ) : null}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-zinc-100 pt-6">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError("");
                  setStep((current) => current - 1);
                }}
              >
                <ArrowLeft className="size-4" />
                Geri
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button type="button" onClick={next}>
                Devam Et
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting || preparingPhotos}
                onClick={() => void submit()}
              >
                {submitting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                Başvuruyu Güvenle Gönder
              </Button>
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [
              LockKeyhole,
              "Fotoğraflar gizli",
              "Yalnızca yetkili ekip tarafından görülür.",
            ],
            [
              ShieldCheck,
              "Kesin teklif değil",
              "Fiyat fiziksel kontrolden sonra netleşir.",
            ],
            [
              CheckCircle2,
              "Satışa etkisi yok",
              "Başvuru stok düşürmez ve sipariş oluşturmaz.",
            ],
          ].map(([Icon, title, description]) => {
            const ItemIcon = Icon as typeof LockKeyhole;
            return (
              <div
                key={String(title)}
                className="rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <ItemIcon className="size-5 text-emerald-600" />
                <strong className="mt-3 block text-sm">{String(title)}</strong>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  {String(description)}
                </span>
              </div>
            );
          })}
        </div>
      </Container>
    </main>
  );
}
