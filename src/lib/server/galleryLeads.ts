import { API_BASE_URL } from "@/portal/api/config"

export function getGalleryLeadsBackendEndpoint(): string {
  return `${API_BASE_URL}/events/gallery-leads`
}
