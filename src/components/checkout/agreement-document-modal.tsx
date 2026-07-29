"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export type AgreementDocument = "distance" | "preInformation";

const documents = {
  distance: {
    title: "Mesafeli Satış Sözleşmesi",
    sections: [
      [
        "Taraflar ve kapsam",
        "Bu bilgilendirme, CENTER GSM üzerinden uzaktan kurulan satış işlemine ilişkin temel koşulları açıklar. Satıcı, alıcı, ürün ve bedel bilgileri sipariş özeti ile sipariş kaydında yer alır.",
      ],
      [
        "Teslimat ve ödeme",
        "Seçilen ödeme ve teslimat yöntemi, sipariş verilmeden önce kullanıcıya gösterilir. Teslimat süresi stok, adres ve kargo koşullarına göre değişebilir.",
      ],
      [
        "Cayma ve iade",
        "Cayma hakkı, istisnaları ve iade koşulları ürünün niteliğine ve yürürlükteki tüketici mevzuatına göre değerlendirilir.",
      ],
    ],
  },
  preInformation: {
    title: "Ön Bilgilendirme Formu",
    sections: [
      [
        "Sipariş bilgileri",
        "Ürünün temel özellikleri, adedi, vergiler dahil fiyatı, indirimleri, kargo bedeli ve genel toplam sipariş özetinde gösterilir.",
      ],
      [
        "Satış ve teslimat",
        "Sipariş, kullanıcı tarafından girilen teslimat adresine ve seçilen kargo firmasıyla gönderilir. İletişim bilgilerinin doğru girilmesi teslimat için gereklidir.",
      ],
      [
        "Başvuru kanalı",
        "Sipariş, teslimat, iade veya satış sonrası destek talepleri müşteri hizmetleri ve destek@centergsm.com üzerinden iletilebilir.",
      ],
    ],
  },
} as const;

export function AgreementDocumentModal({
  document,
  onClose,
}: {
  document: AgreementDocument | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!document) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [document, onClose]);

  if (!document) return null;
  const content = documents[document];
  return (
    <div
      className="fixed inset-0 z-modal grid items-end bg-zinc-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="agreement-document-title"
        className="max-h-[85dvh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4 sm:px-7">
          <h2
            id="agreement-document-title"
            className="text-lg font-black tracking-[-0.025em]"
          >
            {content.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Belgeyi kapat"
            autoFocus
            className="grid size-10 shrink-0 place-items-center rounded-full border border-zinc-200 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>
        <div className="max-h-[calc(85dvh-73px)] space-y-5 overflow-y-auto px-5 py-5 text-sm leading-7 text-zinc-600 sm:px-7 sm:py-6">
          {content.sections.map(([title, paragraph]) => (
            <section key={title}>
              <h3 className="font-black text-zinc-950">{title}</h3>
              <p className="mt-1">{paragraph}</p>
            </section>
          ))}
          <p className="rounded-xl bg-zinc-50 p-4 text-xs leading-6">
            Siparişe özgü kesin bilgiler, sipariş özeti ve işlem sırasında
            sunulan kayıtlarla birlikte değerlendirilir.
          </p>
        </div>
      </section>
    </div>
  );
}
