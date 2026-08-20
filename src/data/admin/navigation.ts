import {
  BadgePercent,
  BarChart3,
  Bell,
  Boxes,
  Landmark,
  LayoutDashboard,
  Instagram,
  Megaphone,
  Package,
  PlugZap,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tags,
  Target,
  TicketPercent,
  Truck,
  RotateCcw,
  Award,
  Gift,
  FileCheck2,
  FileText,
  FileSignature,
  MessageSquareText,
  MessagesSquare,
  Users,
  Warehouse,
  Webhook,
} from "lucide-react";

export const adminNavigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Ürünler", href: "/admin/urunler", icon: Package },
  {
    label: "Hızlı Ürün Oluştur",
    href: "/admin/urunler/hizli-olustur",
    icon: Sparkles,
    child: true,
  },
  {
    label: "Marketing Studio",
    href: "/admin/marketing-studio",
    icon: Megaphone,
    exact: true,
  },
  {
    label: "Reklam Merkezi",
    href: "/admin/reklam-merkezi",
    icon: BarChart3,
  },
  {
    label: "Satış Teşvik Merkezi",
    href: "/admin/satis-tesvik-merkezi",
    icon: Target,
  },
  {
    label: "Instagram Gönderileri",
    href: "/admin/marketing-studio/instagram",
    icon: Instagram,
    child: true,
  },
  { label: "Kategoriler", href: "/admin/kategoriler", icon: Boxes },
  { label: "Markalar", href: "/admin/markalar", icon: Tags },
  { label: "Stok", href: "/admin/stok", icon: Boxes },
  { label: "Depolar", href: "/admin/depolar", icon: Warehouse },
  { label: "Siparişler", href: "/admin/siparisler", icon: ShoppingBag },
  {
    label: "Elden Taksit Başvuruları",
    href: "/admin/elden-taksit-basvurulari",
    icon: FileSignature,
  },
  { label: "Dekontlar", href: "/admin/dekontlar", icon: FileCheck2 },
  { label: "Canlı Destek", href: "/admin/canli-destek", icon: MessagesSquare },
  { label: "Ürün Yorumları", href: "/admin/yorumlar", icon: MessageSquareText },
  { label: "İadeler", href: "/admin/iadeler", icon: RotateCcw },
  { label: "Sadakat", href: "/admin/sadakat", icon: Award },
  { label: "Hediye Kartları", href: "/admin/hediye-kartlari", icon: Gift },
  { label: "Müşteriler", href: "/admin/musteriler", icon: Users },
  { label: "Kampanyalar", href: "/admin/kampanyalar", icon: BadgePercent },
  { label: "Kuponlar", href: "/admin/kuponlar", icon: TicketPercent },
  {
    label: "Promosyon Motoru",
    href: "/admin/promosyonlar",
    icon: TicketPercent,
  },
  { label: "Ödeme Ayarları", href: "/admin/odeme-ayarlari", icon: Landmark },
  {
    label: "Ödeme Sağlayıcıları",
    href: "/admin/odeme-saglayicilari",
    icon: PlugZap,
  },
  {
    label: "Ödeme Çözüm Ortakları",
    href: "/admin/odeme-cozum-ortaklari",
    icon: Landmark,
  },
  {
    label: "Ödeme Webhookları",
    href: "/admin/odeme-webhooklari",
    icon: Webhook,
  },
  { label: "Ayarlar", href: "/admin/ayarlar", icon: Settings },
  {
    label: "Sayfa İçerikleri",
    href: "/admin/sayfa-icerikleri",
    icon: FileText,
  },
  { label: "Kargolar", href: "/admin/kargolar", icon: Truck },
  { label: "Kargo Ayarları", href: "/admin/kargo-ayarlari", icon: Truck },
  {
    label: "Kargo Sağlayıcıları",
    href: "/admin/kargo-saglayicilari",
    icon: Truck,
  },
  { label: "Kargo Webhookları", href: "/admin/kargo-webhooklari", icon: Truck },
  {
    label: "Kargo Senkronizasyonları",
    href: "/admin/kargo-senkronizasyonlari",
    icon: Truck,
  },
  {
    label: "Denetim Kayıtları",
    href: "/admin/denetim-kayitlari",
    icon: ShieldCheck,
  },
  { label: "Bildirimler", href: "/admin/bildirimler", icon: Bell },
  { label: "Favori Alarmları", href: "/admin/favori-alarmlari", icon: Bell },
  {
    label: "Bildirim Şablonları",
    href: "/admin/bildirim-sablonlari",
    icon: Bell,
  },
  { label: "Bildirim Kuyruğu", href: "/admin/bildirim-kuyrugu", icon: Bell },
  { label: "Analitik", href: "/admin/analitik", icon: BarChart3 },
] as const;

export const adminPageTitles: Record<
  string,
  { title: string; description: string }
> = {
  "/admin": {
    title: "Dashboard",
    description: "Mağazanızın bugünkü performansına genel bakış.",
  },
  "/admin/urunler": {
    title: "Ürünler",
    description: "Katalog, fiyat ve stok görünümünü yönetin.",
  },
  "/admin/urunler/yeni": {
    title: "Yeni ürün",
    description: "Kataloğa yayınlanmaya hazır bir ürün ekleyin.",
  },
  "/admin/urunler/hizli-olustur": {
    title: "Hızlı Ürün Oluştur",
    description: "Temel ürün bilgilerini hızlıca hazırlayıp taslak oluşturun.",
  },
  "/admin/marketing-studio": {
    title: "Marketing Studio",
    description: "Ürün verilerinden kanal içerikleri hazırlayın.",
  },
  "/admin/marketing-studio/instagram": {
    title: "Instagram Gönderileri",
    description: "Ürün verileriyle canlı Instagram gönderisi önizlemesi.",
  },
  "/admin/reklam-merkezi": {
    title: "Reklam Merkezi",
    description: "Ürün reklam uygunluğunu ve yayın hazırlıklarını yönetin.",
  },
  "/admin/satis-tesvik-merkezi": {
    title: "Satış Teşvik Merkezi",
    description:
      "Süreli satış teşviklerini ve müşteri görünürlüklerini yönetin.",
  },
  "/admin/kategoriler": {
    title: "Kategoriler",
    description: "Mağaza navigasyonunu ve ürün gruplarını düzenleyin.",
  },
  "/admin/markalar": {
    title: "Markalar",
    description: "Katalogda yer alan markaları yönetin.",
  },
  "/admin/stok": {
    title: "Stok Yönetimi",
    description:
      "Depo stoklarını, rezervasyonları ve kritik seviyeleri yönetin.",
  },
  "/admin/stok/hareketler": {
    title: "Stok Hareketleri",
    description: "Tüm stok değişikliklerinin denetim izini görüntüleyin.",
  },
  "/admin/depolar": {
    title: "Depolar",
    description: "Stok lokasyonlarını ve varsayılan depoyu yönetin.",
  },
  "/admin/siparisler": {
    title: "Siparişler",
    description: "Sipariş akışını ve teslimat durumlarını izleyin.",
  },
  "/admin/elden-taksit-basvurulari": {
    title: "Elden Taksit Başvuruları",
    description:
      "Müşteri başvurularını ve private belgeleri güvenle inceleyin.",
  },
  "/admin/dekontlar": {
    title: "Dekontlar",
    description:
      "Havale ve EFT siparişlerine ait ödeme dekontlarını inceleyin.",
  },
  "/admin/canli-destek": {
    title: "Canlı Destek",
    description: "Müşteri sohbetlerini görüntüleyin ve yanıtlayın.",
  },
  "/admin/yorumlar": {
    title: "Ürün Yorumları",
    description: "Müşteri yorumlarını, puanları ve mağaza yanıtlarını yönetin.",
  },
  "/admin/iadeler": {
    title: "İade ve Değişim",
    description: "RMA taleplerini, mesajları ve durum geçmişini yönetin.",
  },
  "/admin/sadakat": {
    title: "Sadakat ve Ödüller",
    description: "Puan kurallarını, bakiyeleri ve hareketleri yönetin.",
  },
  "/admin/hediye-kartlari": {
    title: "Hediye Kartları",
    description:
      "Dijital kartları, bakiyeleri ve kullanım durumlarını yönetin.",
  },
  "/admin/musteriler": {
    title: "Müşteriler",
    description: "Müşteri ilişkilerine tek bir yerden erişin.",
  },
  "/admin/kampanyalar": {
    title: "Kampanyalar",
    description: "Dönemsel tekliflerinizi planlayın.",
  },
  "/admin/kuponlar": {
    title: "Kuponlar",
    description: "İndirim kodlarını oluşturun ve takip edin.",
  },
  "/admin/promosyonlar": {
    title: "Promosyon Motoru",
    description:
      "Kupon kurallarını, kullanımları ve dönüşüm performansını yönetin.",
  },
  "/admin/odeme-ayarlari": {
    title: "Ödeme Ayarları",
    description: "Banka hesaplarını ve ödeme seçeneklerini yönetin.",
  },
  "/admin/odeme-saglayicilari": {
    title: "Ödeme Sağlayıcıları",
    description:
      "Ödeme ağ geçitlerini, ortamlarını ve sağlık durumlarını yönetin.",
  },
  "/admin/odeme-cozum-ortaklari": {
    title: "Ödeme Çözüm Ortakları",
    description: "Ana sayfadaki ödeme markalarını ve görünme sırasını yönetin.",
  },
  "/admin/odeme-webhooklari": {
    title: "Ödeme Webhookları",
    description: "Sağlayıcı olaylarını ve işleme sonuçlarını izleyin.",
  },
  "/admin/ayarlar": {
    title: "Ayarlar",
    description: "Mağaza ve operasyon tercihlerini yapılandırın.",
  },
  "/admin/sayfa-icerikleri": {
    title: "Sayfa İçerikleri",
    description:
      "Footer bağlantılarındaki kurumsal ve yasal sayfaları yönetin.",
  },
  "/admin/denetim-kayitlari": {
    title: "Denetim Kayıtları",
    description: "Kritik yönetim işlemlerini ve veri değişikliklerini izleyin.",
  },
  "/admin/kargo-saglayicilari": {
    title: "Kargo Sağlayıcıları",
    description: "Kargo gateway bağlantılarını ve ortamlarını yönetin.",
  },
  "/admin/kargo-webhooklari": {
    title: "Kargo Webhookları",
    description: "Sağlayıcı takip olaylarını ve doğrulama sonuçlarını izleyin.",
  },
  "/admin/kargo-senkronizasyonlari": {
    title: "Kargo Senkronizasyonları",
    description: "Gateway işlerini ve güvenli tekrar denemeleri izleyin.",
  },
  "/admin/bildirimler": {
    title: "Bildirimler",
    description: "Kanal, şablon ve gönderim durumlarını yönetin.",
  },
  "/admin/favori-alarmlari": {
    title: "Favori Alarmları",
    description: "Fiyat, stok ve kampanya alarm teslimatlarını izleyin.",
  },
  "/admin/bildirim-sablonlari": {
    title: "Bildirim Şablonları",
    description: "Kanal içeriklerini ve değişkenlerini yönetin.",
  },
  "/admin/bildirim-kuyrugu": {
    title: "Bildirim Kuyruğu",
    description: "Bekleyen, başarılı ve başarısız gönderimleri izleyin.",
  },
  "/admin/analitik": {
    title: "Analitik",
    description: "Satış ve operasyon performansını inceleyin.",
  },
  "/admin/analitik/urunler": {
    title: "Ürün Analitiği",
    description: "Ürün satış ve stok performansını inceleyin.",
  },
  "/admin/analitik/musteriler": {
    title: "Müşteri Analitiği",
    description: "Müşteri değeri ve tekrar satın alma davranışını inceleyin.",
  },
  "/admin/analitik/siparisler": {
    title: "Sipariş Analitiği",
    description: "Sipariş, ödeme ve teslimat dağılımlarını inceleyin.",
  },
  "/admin/analitik/stok": {
    title: "Stok Analitiği",
    description: "Stok seviyelerini ve hareketlerini inceleyin.",
  },
};
