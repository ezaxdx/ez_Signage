/** QR 코드 생성 — 브라우저에서 Data URL로 변환 */
export async function generateQrDataUrl(text: string, size = 400): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}

/** Data URL을 Blob으로 변환 (Supabase Storage 업로드용) */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
