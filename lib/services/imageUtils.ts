const MAX_DIMENSION = 2000
const WEBP_QUALITY = 0.85

/**
 * 브라우저 Canvas API로 이미지를 WebP 변환 + 최대 2000px 리사이징.
 * Canvas 미지원 포맷(HEIC/HEIF/AVIF 등)은 원본 Blob 그대로 반환.
 * WebP 변환 실패 시 PNG로 폴백.
 *
 * Phase 2 보강: blob.size === 0 / 잘못된 mime 결과를 차단.
 *   - Safari 14는 image/webp 요청에도 image/png를 반환 → 그대로 두면 415
 *   - canvas.toBlob 일부 브라우저는 빈 blob 반환 → 0 byte 업로드 차단
 */
export async function compressToWebP(file: File): Promise<Blob> {
  const unsupported = /(heic|heif|avif|tiff|svg\+xml)/i.test(file.type)
  if (unsupported) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round(height * (MAX_DIMENSION / width))
          width = MAX_DIMENSION
        } else {
          width = Math.round(width * (MAX_DIMENSION / height))
          height = MAX_DIMENSION
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context 생성 실패')); return }

      ctx.drawImage(img, 0, 0, width, height)

      const validate = (blob: Blob | null, expectedMime: string): Blob | null => {
        if (!blob) return null
        if (blob.size === 0) return null
        // Safari 14: webp 요청에도 png 반환. allowed_mime에 둘 다 있으니 그대로 통과.
        if (!/^image\/(webp|png|jpeg)$/.test(blob.type)) return null
        return blob
      }

      canvas.toBlob(
        (webpBlob) => {
          const ok = validate(webpBlob, 'image/webp')
          if (ok) { resolve(ok); return }
          // WebP 폴백: PNG
          canvas.toBlob(
            (pngBlob) => {
              const okPng = validate(pngBlob, 'image/png')
              if (okPng) resolve(okPng)
              else reject(new Error('이미지 변환 실패 (WebP/PNG 모두 0byte 또는 mime 불일치)'))
            },
            'image/png'
          )
        },
        'image/webp',
        WEBP_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      // 브라우저가 못 읽는 포맷 (예: TIFF) → 원본 그대로
      console.warn('브라우저가 이미지를 읽지 못함 → 원본 파일 그대로 업로드')
      resolve(file)
    }

    img.src = objectUrl
  })
}
