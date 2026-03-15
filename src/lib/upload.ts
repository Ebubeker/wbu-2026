import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'

const UPLOAD_API_URL = process.env.UPLOAD_API_URL // e.g. http://your-vps-ip/api/upload
const UPLOAD_SECRET = process.env.UPLOAD_SECRET

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Accepted types: ${ACCEPTED_IMAGE_TYPES.join(', ')}`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    }
  }

  return { valid: true }
}

export async function saveFile(
  file: File,
  directory: 'teams' | 'players'
): Promise<string> {
  if (!UPLOAD_API_URL || !UPLOAD_SECRET) {
    throw new Error('Upload server not configured. Set UPLOAD_API_URL and UPLOAD_SECRET env vars.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${UPLOAD_API_URL}?directory=${directory}`, {
    method: 'POST',
    headers: { 'x-upload-secret': UPLOAD_SECRET },
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Upload failed')
  }

  const { url } = await res.json()

  // Return full public URL so images are served from the VPS
  const baseUrl = process.env.UPLOAD_PUBLIC_URL // e.g. http://your-vps-ip
  return baseUrl ? `${baseUrl}${url}` : url
}

export async function deleteFile(_filePath: string): Promise<void> {
  // Files are now on the VPS; deletion can be handled there if needed
}
