export const dashboardMetrics = [
  { label: "Toplam ürün", value: "248", change: "+12 bu ay", tone: "dark" },
  { label: "Aktif ürün", value: "231", change: "%93,1 yayında", tone: "success" },
  { label: "Toplam sipariş", value: "1.842", change: "+%18,4", tone: "info" },
  { label: "Bekleyen sipariş", value: "27", change: "8 acil", tone: "warning" },
  { label: "Toplam müşteri", value: "5.604", change: "+146 yeni", tone: "purple" },
  { label: "Gelir özeti", value: "₺1,28 Mn", change: "+%14,2", tone: "danger" },
] as const;

export const recentOrders = [
  { no: "CG-2026-10428", customer: "Ece Yılmaz", date: "24 Tem 2026, 14:32", total: "₺42.999", status: "Hazırlanıyor" },
  { no: "CG-2026-10427", customer: "Mert Akın", date: "24 Tem 2026, 13:18", total: "₺8.749", status: "Ödeme onaylandı" },
  { no: "CG-2026-10426", customer: "Selin Kaya", date: "24 Tem 2026, 11:46", total: "₺36.499", status: "Kargoya verildi" },
  { no: "CG-2026-10425", customer: "Burak Demir", date: "24 Tem 2026, 10:02", total: "₺6.299", status: "Teslim edildi" },
] as const;

export const adminCategories = [
  { name: "Akıllı Telefon", slug: "akilli-telefon", products: 82, active: true },
  { name: "Bilgisayar", slug: "bilgisayar", products: 46, active: true },
  { name: "Kulaklık", slug: "kulaklik", products: 39, active: true },
  { name: "Akıllı Saat", slug: "akilli-saat", products: 27, active: true },
] as const;

export const adminBrands = [
  { name: "Nova", products: 38, featured: true }, { name: "Core", products: 24, featured: true },
  { name: "Auralis", products: 31, featured: false }, { name: "Pulse", products: 18, featured: true },
] as const;

export const adminCustomers = [
  { name: "Ece Yılmaz", email: "ece@example.com", orders: 8, spent: "₺126.840", joined: "12 Oca 2026" },
  { name: "Mert Akın", email: "mert@example.com", orders: 5, spent: "₺54.395", joined: "28 Şub 2026" },
  { name: "Selin Kaya", email: "selin@example.com", orders: 11, spent: "₺207.420", joined: "03 Kas 2025" },
  { name: "Burak Demir", email: "burak@example.com", orders: 3, spent: "₺22.197", joined: "17 Nis 2026" },
] as const;
