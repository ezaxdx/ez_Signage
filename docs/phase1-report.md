# Phase 1 — Supabase Storage 진단 리포트

> 진단 시점: 2026-05-06
> 대상: ez_Signage v3 / mice-design-guide 앱
> 점검 기준: `.claude/agents/supabase-storage-auditor.md` 12개 항목
> 본 리포트는 read-only. 어떤 파일·DB도 변경하지 않았음.

---

## 0. 결론 (TL;DR)

**현 Storage 설정은 "동작은 하지만 보안 결함이 있는" 상태**다.
- 업로드/다운로드 자체는 가능 (RLS INSERT/UPDATE/SELECT 정책 존재)
- 그러나 **사용자별 path 분리가 없어** A 사용자가 B 사용자의 파일을 덮어쓸 수 있음
- DELETE 정책 누락으로 사용자가 자기 파일 삭제 못 함
- WebP 변환 결과의 `file.type`/`size` 검증 누락 (Safari·canvas.toBlob 실패 케이스 미대응)

→ **Phase 2에서 RLS 4정책 재설계 + WebP 변환 검증 추가**가 필요.

---

## A. 코드 점검 결과 (12개 항목)

| # | 항목 | 결과 | 위치 / 비고 |
|---|---|---|---|
| 1 | `auth.getUser()` 인증 분기 (브라우저/서버) | ✅ PASS | `lib/supabase/{client,server}.ts` 분리 정상 |
| 2 | POST `/storage/v1/object/...` status code | ⏳ 런타임 | 실제 업로드 시도 시 401/403/413/415/500 추적 필요 |
| 3 | RLS 4정책 (INSERT/SELECT/UPDATE/**DELETE**) | ⚠ FAIL | `schema.sql:120-131`에 INSERT/UPDATE/SELECT(public)만 있음. **DELETE 없음** |
| 4 | bucket_id 정책 일치 | ✅ PASS | 'design-images' 일치 (실제 코드 사용 버킷) |
| 5 | path 첫 폴더 = `auth.uid()::text` | ❌ **FAIL** | 정책이 `bucket_id`만 체크. **사용자 분리 없음** — 보안 결함 |
| 6 | `createBrowserClient` 사용 | ✅ PASS | `lib/supabase/client.ts:1` |
| 7 | middleware `getUser()` + matcher | ✅ PASS | `middleware.ts:27`. matcher 글로벌이지만 storage URL은 supabase 도메인이라 무관 |
| 8 | 변환 Blob `file.type === image/webp` 검증 | ⚠ MISS | `lib/services/imageUtils.ts` — toBlob 결과 type 검증 없음 (Safari 14에서 PNG 폴백) |
| 9 | 변환 Blob `size > 0` 검증 | ⚠ MISS | toBlob null만 체크. blob.size === 0 미체크 |
| 10 | Server Action `await cookies()` | ✅ PASS | Next.js 14.2.16 → 동기 호출 정상 |
| 11 | Service Role Key 클라이언트 노출 | ✅ PASS | `service_role` / `SUPABASE_SERVICE` 검색 0건 |
| 12 | 동일 path 재업로드 `upsert: true` | ⚠ MIXED | `EditorToolbar.tsx:80` (true), `ProjectInfoClient.tsx:210` (true), :528 (false), `SlotPanel.tsx:109,159` (false) — 신규 파일 가정이면 OK, 충돌 시 409 |

**핵심 결함 3건**:
1. ❌ **#5** path 사용자 분리 없음 — 다른 사용자 파일 덮어쓰기 가능
2. ⚠ **#3** DELETE 정책 누락 — 사용자가 자기 시안 삭제 불가
3. ⚠ **#8/#9** WebP 변환 결과 검증 누락 — Safari·canvas 실패 시 빈 파일 업로드 위험

---

## B. SQL 진단 결과

> Supabase Studio → SQL Editor에서 `supabase/diagnostic_storage.sql` 실행 후 결과 붙여넣기.
> (PM이 직접 실행해야 함 — Claude는 Supabase 콘솔 접근 권한 없음)

### (a) storage.objects 정책 목록
```
[여기에 결과 붙여넣기]
```

### (b) RLS 활성화 여부
```
[여기에 결과 붙여넣기]
```

### (c) bucket 설정 (public / file_size_limit / allowed_mime_types)
```
[여기에 결과 붙여넣기]
```

### (d) 등록된 객체 path 패턴 (최근 20건)
```
[여기에 결과 붙여넣기]
```

### (e) v3 마이그레이션 관련 테이블 존재 여부
```
[여기에 결과 붙여넣기]
```

### (f) profiles.role / signage_aliases / share_tokens 컬럼
```
[여기에 결과 붙여넣기]
```

---

## C. 현재 버킷 정의 요약 (코드/SQL 기준)

- **버킷명**: `design-images` (NOT `photos` — `supabase-storage-auditor.md` 표준 패턴과 다름)
- **public**: `true` (schema.sql:115) — PPT 출력 시 외부 fetch 필요해서
- **file_size_limit / allowed_mime_types**: 미설정 (Supabase 기본값)
- **path 패턴**: `{project_id}/{item_id}.webp` (schema.sql:119 주석 — `auth.uid()` 기반 아님)

---

## D. Phase 2에서 적용할 수정안 (Acceptance Criteria)

1. **RLS 4정책 모두 재정의** (INSERT/SELECT/UPDATE/DELETE) — `bucket_id='design-images' AND (storage.foldername(name))[1] = (select auth.uid())::text`
2. **path 패턴 변경**: `{auth.uid()}/{project_id}/{item_id}.webp` — 첫 폴더를 사용자 UID로
3. **bucket 표준 설정**:
   - `public: false` (회의록의 "사내 직원만" 방향과 일치) — PPT는 서명 URL로 처리
   - `file_size_limit: 10485760` (10MB)
   - `allowed_mime_types: ['image/webp','image/jpeg','image/png']`
4. **WebP 변환 검증 추가** (`imageUtils.ts`):
   - `if (blob.size === 0) reject` 추가
   - 변환 후 `console.warn` 대신 `blob.type` 강제 검증
5. **upsert 통일**: 신규/재업로드 모두 `upsert: true` + path에 timestamp 포함하여 캐시 회피

⚠ **Phase 2는 RLS 정책 변경 = 데이터 파괴 가능성 있음** → PM(사용자) [CONFIRM] 후 SQL 실행.

---

## E. 추가 발견사항 (회의록 5/4 반영 권고)

회의록(`바이브코딩 지식/참고자료/회의록_AI업무파트너_2026년5월.txt`) 검토 결과,
**plan-v3.md를 다음과 같이 갱신하는 것이 정합적**:

1. **외부 클라이언트·디자이너 참여 전제 폐기** — `share_tokens`/`client_reviews`는 후순위
2. **사용자 = 사내 직원만** (admin/user 2분할은 유지)
3. **버킷 public 정책 재검토** — 외부 공유 필요 없으면 private + 서명 URL
4. **AI 모델 추상화** — 현재 Claude 단일 가정이지만, 회의록은 "복수 AI 모델 비교 테스트"
5. **Phase 1 1차안 정의 명확화**:
   - 핵심 = 발주 리스트 초안 + PPT 슬라이드 아웃풋 (디자이너 전달용)
   - 캔버스·이미지 생성은 후순위 (Phase 3)

---

**Phase 1 종료. Phase 2 진행 전 PM이 `diagnostic_storage.sql` 실행 결과를 본 리포트 §B에 채워주거나, 그냥 '진행'이라고 답하면 표준 Phase 2 SQL을 작성합니다.**
