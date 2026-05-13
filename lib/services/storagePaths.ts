// Storage 객체 경로 표준화 헬퍼.
// RLS 정책이 (storage.foldername(name))[1] = auth.uid()::text 를 요구하므로
// 모든 path의 첫 세그먼트는 반드시 userId.

export type StorageKind = 'item-image' | 'slot-image' | 'qr' | 'master' | 'logo'

export interface StoragePathArgs {
  userId: string
  projectId: string
  itemId?: string
  slotKey?: string
  suffix?: string
}

export function buildStoragePath(kind: StorageKind, a: StoragePathArgs): string {
  const ts = Date.now()
  switch (kind) {
    case 'item-image':
      return `${a.userId}/${a.projectId}/items/${a.itemId}.webp`
    case 'slot-image':
      return `${a.userId}/${a.projectId}/slots/${a.itemId}-${a.slotKey}-${ts}.webp`
    case 'qr':
      return `${a.userId}/${a.projectId}/qr/${a.itemId}-${a.slotKey}-${ts}.png`
    case 'master':
      return `${a.userId}/${a.projectId}/master.webp`
    case 'logo':
      return `${a.userId}/${a.projectId}/logos/${a.suffix ?? ts}.webp`
  }
}

// 한국어 + 사용자 친화적 에러 메시지로 변환.
export function explainStorageError(message: string): string {
  if (/bucket|not found/i.test(message)) {
    return 'Supabase Storage에 design-images 버킷이 없습니다.\nSupabase Dashboard → Storage → New Bucket → 이름 design-images, Public on'
  }
  if (/row.*level|policy|permission|denied|403/i.test(message)) {
    return 'Storage 권한 부족: supabase/migration_v3_all.sql 의 Storage 정책을 실행해주세요.'
  }
  if (/payload too large|413/i.test(message)) {
    return '파일이 너무 큽니다 (10MB 초과). 압축 후 다시 시도해주세요.'
  }
  if (/mime|415/i.test(message)) {
    return '지원하지 않는 파일 형식입니다 (jpg/png/webp 만 가능).'
  }
  return '업로드 실패: ' + message
}
