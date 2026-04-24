const MAX_DIMENSION = 2000
const WEBP_QUALITY = 0.85

/**
 * 브라우저 Canvas API로 이미지를 WebP 변환 + 최대 2000px 리사이징.
 * Canvas 미지원 포맷(HEIC/HEIF/AVIF 등)은 원본 Blob 그대로 반환.
 * WebP 변환 실패 시 PNG로 폴백.
 */
export async function compressToWebP(file: File): Promise<Blob> {
  // HEIC/HEIF 등 Canvas 미지원 포맷 → 원본 그대로 업로드
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

      canvas.toBlob(
        (blob) => {
          if (blob) { resolve(blob); return }
          // WebP 변환 실패 → PNG 폴백
          canvas.toBlob(
            (pngBlob) => {
              if (pngBlob) resolve(pngBlob)
              else reject(new Error('이미지 변환 실패 (WebP/PNG 모두 실패)'))
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
      // 이미지 로드 실패 → 원본 그대로 (서버로 전송)
      console.warn('브라우저가 이미지를 읽지 못함 → 원본 파일 그대로 업로드')
      resolve(file)
    }

    img.src = objectUrl
  })
}
