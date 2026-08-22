export function portalReceiptPath(portalId: string) {
  return `/elden-taksit/takip/${encodeURIComponent(portalId)}/dekont`;
}
