/**
 * Generate a simple device fingerprint client-side.
 * Not bulletproof but sufficient for casual anti-spam.
 */
export async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    screen.colorDepth?.toString() ?? '',
  ]

  const data = components.join('|')
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
