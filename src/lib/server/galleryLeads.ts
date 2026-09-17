const DEFAULT_BACKEND_URL = "https://backendgcxo-hfdrd8cugtepfpcs.centralus-01.azurewebsites.net"

export function getGalleryLeadsBackendEndpoint(): string {
  const envUrl = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL)?.trim()
  let base = envUrl && envUrl.length > 0 ? envUrl : DEFAULT_BACKEND_URL
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = DEFAULT_BACKEND_URL
  }
  base = base.replace(/\/$/, "")

  if (base.endsWith("/api")) {
    return `${base}/events/gallery-leads`
  }
  return `${base}/api/events/gallery-leads`
}
