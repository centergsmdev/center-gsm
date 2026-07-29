export type Province = { id: number; name: string };
export type District = { id: number; name: string };

export const TURKEY_PROVINCES: readonly Province[] =
  "Adana|Adıyaman|Afyonkarahisar|Ağrı|Amasya|Ankara|Antalya|Artvin|Aydın|Balıkesir|Bilecik|Bingöl|Bitlis|Bolu|Burdur|Bursa|Çanakkale|Çankırı|Çorum|Denizli|Diyarbakır|Edirne|Elazığ|Erzincan|Erzurum|Eskişehir|Gaziantep|Giresun|Gümüşhane|Hakkâri|Hatay|Isparta|Mersin|İstanbul|İzmir|Kars|Kastamonu|Kayseri|Kırklareli|Kırşehir|Kocaeli|Konya|Kütahya|Malatya|Manisa|Kahramanmaraş|Mardin|Muğla|Muş|Nevşehir|Niğde|Ordu|Rize|Sakarya|Samsun|Siirt|Sinop|Sivas|Tekirdağ|Tokat|Trabzon|Tunceli|Şanlıurfa|Uşak|Van|Yozgat|Zonguldak|Aksaray|Bayburt|Karaman|Kırıkkale|Batman|Şırnak|Bartın|Ardahan|Iğdır|Yalova|Karabük|Kilis|Osmaniye|Düzce"
    .split("|")
    .map((name, index) => ({ id: index + 1, name }));

const districtCache = new Map<number, readonly District[]>();

export async function getProvinceDistricts(
  provinceId: number,
  signal?: AbortSignal,
): Promise<readonly District[]> {
  const cached = districtCache.get(provinceId);
  if (cached) return cached;
  const response = await fetch(
    `https://api.turkiyeapi.dev/v2/provinces/${provinceId}/districts?limit=100`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error("İlçe listesi alınamadı.");
  const payload = (await response.json()) as {
    data?: Array<{ id?: unknown; name?: unknown }>;
  };
  const districts = (payload.data ?? [])
    .filter(
      (item): item is { id: number; name: string } =>
        typeof item.id === "number" && typeof item.name === "string",
    )
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  districtCache.set(provinceId, districts);
  return districts;
}
