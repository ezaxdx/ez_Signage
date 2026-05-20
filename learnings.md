# 학습 로그

> 실패한 자율 작업에서 추출한 패턴.
> 다음 세션 시작 시 최근 항목부터 검토하고 작업 시작.

## 2026-05-20 — 환경장식물 5건 hotfix 메타 패턴 (525a7cf·c12cf01·826ce06·a2d5a53·3f95d7b)

**작업**: 사용자 직접 발견 결함 5건 일괄 fix·라이브 적용
**증상**: 행사 관리 표 "되다가 안돼"·예시 이미지 미노출·탭 전환 후 사라짐·hidden 토글 silent fail·L1 드롭다운에 L2 섞임
**원인 (메타 패턴 5건)**:
1. **SOT 분산** (525a7cf): unifiedEventHistory가 SEED + user만 합산·DB event_history union 누락·page.tsx의 "DB skip" 조합으로 정상 INSERT 데이터가 사라지는 역설
2. **localStorage → DB 전환 잔존** (c12cf01): PR#4에서 localStorage cleanup됐는데 RightPanel은 여전히 읽음·정적 시드만 fallback·DB 업로드 절대 미반영
3. **React conditional render state 초기화** (826ce06): tab='sample'↔'ratio' 전환 시 자식 컴포넌트 unmount → fetch state 초기화 → state lifting 의무
4. **DB schema 컬럼명 미스매치** (a2d5a53): v14 `hidden` vs v19 `is_hidden` 공존·client는 is_hidden 전송·API PATCH는 hidden 받음·GET은 hidden select·EDITABLE에 is_hidden 누락 = silent fail 3건
5. **API raw 응답 정규화 누락** (3f95d7b): event_history.venue 합성 형식("코엑스 그랜드볼룸")이 /api/venues/available 응답에 그대로 노출·VENUE_LIST와 매칭 X·L1 드롭다운에 L2 섞임

**예방**:
- 신규 union·dedup·합성 코드 작성 시 = 데이터 소스 모두 grep (시드·DB·user·custom)
- dedup key = `code || name` (안티 패턴 `code ?? '' + name` 회피)
- localStorage → DB 전환 시 = 모든 client 사용처 grep + 정적 시드 fallback 명시
- React 자식 컴포넌트가 conditional render 안에 있음 + server fetch 보유 = state lifting 의무
- DB schema 변경 시 = client·API GET/POST/PATCH·EDITABLE 화이트리스트 4중 정합
- 공존 컬럼 (v* hidden·v** is_hidden) = 양쪽 동기화 update 의무
- API 응답 = 원본 보존 정책과 별개·표시 단위에 맞게 정규화·dedup·노이즈 필터 의무
- 기존 정규화 헬퍼 활용 (normalizeVenueName·normalizeCategory·aliasResolver) 우선 grep
- intermittent failure ("되다가 안돼") 진단 = 강제 새로고침·쿠키 삭제 후에도 재현 시 = 코드 결함 확정

**관련**: 메모리 5건 박제 (feedback-signage-data-sot-sync·localstorage-db-migration·react-state-lifting·db-schema-column-sync·api-response-normalize 260520) + CLAUDE.md §7 #27·#28·#29·#30 + decisions.md 2026-05-20 채번 SOT·δ 정책 정합


## 2026-05-20 — 정답지 검증 8% 결함이 "정확도" 라벨 오역에서 시작

**작업**: PR#4 AI 추천 정확도 신규 정의
**증상**: 기존 "AI 추천 정확도" UI 라벨은 단계별 가중치 (입력 10·중간 30·컨펌 70·완료 100) 평균값이었음. 사용자는 "AI가 추천한 게 얼마나 정확한가" 의미로 읽었지만 실제로는 "학습 진행률(누적률)"이었음. 정답지 7건 검증(scripts/validate_correct_answers.mjs) 시 표시값 70%였으나 실제 발주 정합률은 8%.
**원인**: 라벨과 의미의 미스매치. "정확도"는 추천값 vs 실측값 비교가 정의인데, 코드는 "학습 단계 진행률" 합산. design_items에 ai_initial_* 컬럼 없어 진짜 정확도 측정 불가능했음.
**예방**:
- ai_initial_* 컬럼 5종 추가 (created_by_ai·ai_initial_category·ai_initial_quantity·ai_initial_width_mm·ai_initial_height_mm)
- computeAiAccuracy(items): created_by_ai=TRUE + finalized_at 항목만 채점 (완전 일치 +100·category만 +50·오답 0)
- N<10건이면 "측정 중 (N/10건)" 표시 — 통계적 의미 없는 값 표시 회피
- 라벨과 정의 일치 의무 — 사용자가 읽을 의미로 명명
**관련**: PROGRESS.md δ-PR#4·decisions.md 2026-05-20 PR#4·lib/services/computeAiAccuracy.ts

## 2026-05-20 — 동의어 미분류 옵션 A vs B = 노이즈 비용 비교

**작업**: PR#4 동의어 자동 변환 정책 결정
**증상**: 사용자가 "빵빠레 배너" 같은 비표준 입력 시 두 옵션 — A(강제 매핑·임의 표준에 자동 분류) vs B(미분류 태그·학습 풀 제외).
**원인**: 옵션 A는 매칭 실패 시 학습 데이터에 잘못된 정답 누적·옵션 B는 누적량이 작아도 신뢰도 높은 데이터만 학습.
**예방**:
- 옵션 B 채택 (PO 확정) — category_normalize_status='unmatched' 명시 + unmatched_category_log 누적
- 관리자가 학습 관리자 UI에서 매핑 결정 → resolveUnmatchedCategory로 일괄 재변환
- 학습 풀은 status='matched' OR 'manual_override'만 포함
- 신호 vs 노이즈 trade-off에서 노이즈 회피 우선 ([[feedback-incremental-accuracy]] 정합)
**관련**: lib/services/normalizeCategory.ts·decisions.md 2026-05-20 PR#4

## 2026-05-20 — design_items INSERT 책임 7곳 분산 = 패치 1곳 fix가 잠재 잔존 6곳 남김

**작업**: 5/19 ProjectInfoClient 부분만 fix (b979439) 후 동일 패턴 grep
**증상**: design_items INSERT 7개 위치 중 EditorLayout (items.length+1)·SeriesGenerator (currentItemCount+1) 잠재 충돌 잔존. 삭제 후 추가 시 (project_id, no) 중복 위험.
**원인**: SOT 부재·INSERT 책임이 7곳에 분산·"문제 발생 시 패치"로 진행하면 잔존 6곳을 grep해야만 발견됨.
**예방**:
- 자동화·수정 착수 시 [[feedback-intent-clarification-first]] Step 0 의도 확인 의무 (3 Why)
- [[feedback-automation-design-upfront]] Step 2 책임 통합 검토 = "이 값 채우는 코드 몇 개?" 2개+ 시 helper·DB trigger로 묶기
- DB trigger (set_design_items_no) = SOT·클라이언트 헬퍼 = 보조 = 이중 방어 패턴
**관련**: decisions.md 2026-05-20 채번 SOT·feedback-automation-design-upfront·migration_v10_4_*.sql

## 2026-05-20 — 환경장식물 정의 부재가 폴더링·DB·AI 학습 모든 하위 문제의 원점

**작업**: 팀장님 정의 분석 미션·좋은 예/나쁜 예 폴더링 비교
**증상**: L1_행사장 폴더에 시설가이드(.pdf 평면도)·행정 서류(.hwp 신청서)·발주서(.xlsx)·기획서(.pptx)·CAD 도면(.dwg) 등 10종 파일 타입 혼재. 환경장식물 본체와 비환경장식물이 같은 행사장 폴더에 묻힘.
**원인**: 환경장식물의 1차 정의가 명문화되지 않음 = 분류 1차 축이 공간(행사장)인지 행사·속성인지 결정 안 됨 = 모든 하위 분류가 흔들림.
**예방**:
- 5단계 정의 (한 문장·외연 12파트×14종류·내포 4축·경계 7종 제외·운영 5질문) 모두 명문화
- 분류 1차 축 = 행사·속성 (공간은 L2 이하 보조축)
- 새 자료 분류 시 8.5절 5질문 체크리스트로 1분 판정
**관련**: docs/환경장식물_정의_분석보고서_20260520.md·decisions.md 천장≠통천 분리

---

## 2026-05-20 — δ 정책: 학습 신호 소스 분산이 의도 모호화

**작업**: PR#1·PR#2·PR#3 데이터 학습 관리자 흐름 정렬
**증상**: 진단 결과 학습 신호 3곳 분산 — 완료 버튼은 program_parts 누락·EditorLayout은 event_history POST X·ExportService는 finalized_at SET 책임 떠안음.
**원인**: SOT(단일 진실) 부재. 완료 의도가 코드 여러 곳에 흩어져 정책 변경 시마다 grep 4단계 필요.
**예방**:
- `lib/services/completeProject.ts` 헬퍼 도입 — 완료 처리 SOT 단일화 (status·event_history·finalized_at atomic)
- export 다운로드 ≠ 학습 신호 (PO 정책 δ로 명시 분리)
- "한 행위(완료) = 한 함수(completeProject)" 원칙 일관 적용
**관련**: decisions.md 2026-05-20 δ 정책·feedback-automation-design-upfront·PROGRESS.md δ-PR#1

## 2026-05-20 — AI 프롬프트 블록 폭주가 신뢰성 저하

**작업**: recommendSignage.ts AI 컨텍스트 정렬
**증상**: 시설 가이드 관련 정보가 6+개 블록에 중복 분산 (venueProfile·venueSpecs·ceiling·coverage·adminMaster.facility_guide·accumulated). 토큰 낭비 + 모델이 같은 정보 중복 학습 + 정합성 추적 어려움.
**원인**: 매 사이클 신규 정보를 새 블록으로 추가만 하고 통합 안 함. orphan 정책 보존 비용이 가산됨.
**예방**: 블록 추가 시 기존 블록 흡수 검토 의무 (venueProfile에 모든 시설 정보 단일화 — 단위 4)
**관련**: PROGRESS.md δ-PR#2·decisions.md 2026-05-20 AI 컨텍스트 정렬

## 2026-05-20 — PR#4 사전 점검 BLOCKED: 직전 PR main 미머지

**작업**: PR#4 (AI 정확도 신규 KPI + 동의어 자동 변환 + localStorage 잔존 4종 폐기) 진입 시도
**증상**: 사전 점검 §1 실패 — `auto/20260520110921-delta-policy` 브랜치(PR#1·#2·#3 누적, 3 커밋)가 `main`에 미머지 상태. `git log main..auto/...`에서 3 커밋 잔존 확인.
**원인**: PO가 직전 사이클 코드 리뷰·머지 미완료 상태에서 본 명령 발송. 명령서 "보내기 전 마지막 체크" §1을 건너뜀.
**예방**:
- 신규 PR 명령 발송 전 PO가 직전 브랜치 머지 확인 의무 — 본 사이클 명령서에 명시되어 있음
- 신규 PR이 직전 PR 위에서만 빌드되는 경우: 브랜치 베이스 명시 (예: "auto/20260520110921-delta-policy에서 분기") 또는 머지 선행
- 자율 모드에서 머지 자체는 정책 결정 — 자동 수행 금지 (BLOCKED 룰 정합)
**복구 절차** (PO 영역):
1. 직전 브랜치 코드 리뷰 후 main 머지 (`git merge auto/20260520110921-delta-policy` or PR 머지)
2. 라이브 검증 (https://ez-signage2.vercel.app)
3. 본 PR#4 명령 재발송
**관련**: decisions.md 2026-05-20 δ 정책·PROGRESS.md δ-PR#1·#2·#3

## 형식

```
## YYYY-MM-DD — <짧은 제목>
**작업**: <원래 무엇을 하려 했는가>
**증상**: <어떻게 실패했는가 — 1줄>
**원인**: <왜 그렇게 됐는가>
**예방**: <다음에는 무엇을 다르게 해야 하는가>
**관련**: <연관된 CLAUDE.md 규칙 / 파일>
```

## 예시 (실제 작업 후 채워짐)

## 2026-05-19 — 박제 자제 룰 사용자 명시 후에도 보수 적용

**작업**: 환경장식물 v3 노션 컴펌 본 정합 작업 (5/18 곽 이사 컴펌 후)
**증상**: 사용자 "전부 진행"·"왜 미완료인데 작동을 멈춰" 지적 발생·박제 자제 룰 보수 적용으로 사이클 5~8 진행 지연
**원인**: CLAUDE.md "박제 자제·라이브 변경 X" 룰을 사용자 명시 후에도 자동 적용 → 사용자 의도 위반
**예방**: ① 사용자 "전부 진행"·"왜 멈춰"·"완벽 제작" 명시 = 박제 자제 룰 자동 무력화 ② 자율 사이클 (사용자 자고 있을 가능성)에만 박제 자제 적용 ③ CLAUDE.md §7 질문 18 신규 + 메모리 박제 (feedback-사용자명시-우선원칙-260519)
**관련**: CLAUDE.md §7 자기 점검 21 질문·feedback-사용자명시-우선원칙-260519

## 2026-05-19 — PowerShell -replace 한글 파일 인코딩 손상

**작업**: v2 폴더 → _legacy_v2 mv 후 self-reference import 경로 일괄 정정
**증상**: PowerShell `-replace` 사용 후 한글 코멘트·문자열 깨짐 (TSC Unterminated string literal 다수)·rollback 필요
**원인**: PowerShell 5.1의 -replace 결과를 UTF-8로 저장 시 한글 BOM 손상
**예방**: ① 한글 포함 파일 PowerShell `-replace` 절대 금지 ② Edit tool 사용 의무 (인코딩 보존) ③ 광범위 일괄 변경 = 한 파일씩 Read + Edit ④ git mv·git checkout만 사용 (텍스트 변환 회피)
**관련**: feedback-powershell-인코딩손상-260519·CLAUDE.md §7 질문 20

## 2026-05-19 — podium·tongchun·ExportService offset 정합 누락 자동 발견 X

**작업**: 환경장식물 v3 12 카테고리 정합 작업 후 자체 점검
**증상**: TSC PASS·빌드 PASS만으로 발견 못 한 정합 누락 6건 (podium_title vs podium·tongchun vs chunchen·ExportService offset -14 vs -3·dashboardSeed X-배너 대시·SEED_SYNONYMS I-배너 대시·route_banner 매핑)
**원인**: TypeScript 컴파일 검증만으로는 의미 정합 X·외부 SOT (노션) 비교 의무
**예방**: ① grep 4단계 자체 점검 (신규 키·구 키 잔존·외부 SOT·fallback 값) ② scripts/check_v3_alignment.mjs 자동화 도구 ③ npm run check:v3·check:all 통합 명령 ④ TSC PASS만으로 부족
**관련**: feedback-정합점검-체크리스트-260519·scripts/check_v3_alignment.mjs·CLAUDE.md §7 질문 19

## 2026-05-19 — "%·완벽" feelings 표현 = 가짜 정확성

**작업**: 환경장식물 진척률 보고 ("코드 영역 97%·완벽")
**증상**: 정량 수치 (%) 사용·실제 측정 X·feelings 표현·Verifiability constraint 위반
**원인**: AI 자체 검증 = 객관 검증 가능 도메인만 작동·"진척률 %" 같은 주관 정량 표현 = 가짜 정확성 사기
**예방**: ① exit codes (TSC 0 에러·빌드 PASS·harness 72/72·check:v3 19/0 fail) 같은 객관 결과만 사용 ② 정성 표현 분리 ("코드 영역 정합·라이브 검증 사용자 영역") ③ Reflexion 영역 정합·Verifiability constraint 의무
**관련**: reference-AI-에이전트-자체개선-260519·CLAUDE.md §7 질문 21

## 2026-05-19 — 상사 보고 자료 = 자료 분류 명시 누락

**작업**: 상사 보고 자료 (회의록·카톡·메일·결재·노션·기획안·보고서·구두) 작성
**증상**: PO 5/19 명시 = "검토인지 의사결정 필요인지 보고인지 알 수 있게. 이거 어딜 봐요·뭔 내용·뭘 말함 질문 안 나와야"·기존 답변·자료 첫 줄 자료 분류 미명시
**원인**: BLUF·300자 룰 적용했지만 자료 분류 4종 (`[검토 요청]`·`[의사 결정 요청]`·`[단순 보고]`·`[진척 공유]`) 영역 SOT 부재
**예방**: ① 모든 상사 보고 자료 첫 줄·제목 4 분류 1건 명시 의무 ② CLAUDE.md §2·§7 #16·#22 + 메모리 `feedback-상사보고-분류명시-의무-260519` 박제 ③ 5 가이드 정합 (회의록·결재·메일·보고서·IA) §0 메타 룰 추가
**관련**: feedback-상사보고-분류명시-의무-260519·CLAUDE.md §7 질문 22

## 2026-05-19 — "영역" 어미 과사용 = AI 어투 즉시 인식

**작업**: 자율 사이클 답변·메모리 박제·CLAUDE.md 룰 작성
**증상**: PO 5/19 지적 = "영역같은거 더 문제 없게 하고"·답변에서 "~영역·~영역 영역" 어미 반복 = AI 어투 즉시 인식·가독성 저하
**원인**: "영원" 자모 변환 노이즈 회피 후 "영역" 단어로 대체 = 새 어미 반복 패턴 발생·자체 카운트 룰 부재
**예방**: ① 메모리 `feedback-sot-260518` "영역" 과사용 회피 룰 추가 (5회 이하 자체 카운트) ② CLAUDE.md §7 #23 자기 점검 추가 ③ "~영역" → "~부분·~쪽·~곳·~점·~사항·생략" 대체 표현 ④ 매 답 카운트 명시 의무
**관련**: feedback-sot-260518·CLAUDE.md §7 질문 23

---

## 2026-04-24 — Fabric.js stale closure

**작업**: 실시간 편집 잠금 표시 구현
**증상**: `updatingBy` 상태가 이전 값으로 굳어짐
**원인**: useEffect 의존성 배열 누락으로 클로저가 초기값을 캡처
**예방**: `contentsRef`, `onUpdateRef`, `itemRef` 패턴 유지. useEffect로 항상 최신값 동기화
**관련**: CLAUDE.md §14 Fabric.js 주의사항

## 2026-05-11 — AI 추천 검증 시 정답지 노출 편향

**작업**: 1차 AI 추천 결과를 정답지(2022 스마트국토엑스포 발주엑셀)와 비교
**증상**: 첫 시도에서 4지표 100% 일치 결과 도출 → "너무 완벽하다"는 사용자 지적
**원인**: 추천을 도출하는 과정에서 정답지를 이미 본 상태였음 → 무의식적으로 정답에 맞춘 결과. self-validation 한계.
**예방**: ① 추천 도출과 정답지 비교는 분리된 세션·담당자가 수행 ② 정답지 미보유 케이스(코엑스·송도 등)로 편향 없는 재검증 ③ 보고서에 "정답지 노출 편향" 항목 한계로 명시
**관련**: docs/VENUE_LEARNING_INSIGHTS_260511.md §5

## 2026-05-11 — 학습 데이터에 없는 카테고리는 솔직히 누락 표기

**작업**: WSCE 2021 학습 후 천정배너 추천
**증상**: 처음에는 "학습으로 5500×4000 추정 가능"이라고 사후 합리화 → 실제 WSCE 2021 시안엔 천정배너 자체가 없는데 추정한 것처럼 표기
**원인**: 학습 데이터의 실제 한계를 무시하고 "그럴듯해 보이는" 결과 도출
**예방**: ① 학습 데이터 분석 시 카테고리별 존재 여부 명시 ② 없는 카테고리는 "추천 없음 + 매뉴얼 보강 권고"로 자동 표기 ③ 보고서에 "이 카테고리의 학습 데이터 부재" 행 추가
**관련**: decisions.md 2026-05-11 (모르는 카테고리는 추천 안 함)

## 2026-05-11 — 매뉴얼 PDF 한국어 폰트 깨짐

**작업**: 킨텍스 매뉴얼 PDF(`참고자료/도면/KINTEX/8.전시주최자매뉴얼.pdf`) 본문 파싱
**증상**: pdftotext 추출 결과 한국어 일부 표준 규격(외부 광고)은 추출 성공, 천정·행잉·하중 섹션은 폰트 깨짐으로 미추출
**원인**: 한국어 폰트 임베드 PDF의 알려진 한계. 텍스트 레이어가 폰트 글리프 인덱스만 가지고 유니코드 매핑이 깨짐.
**예방**: ① 1차 시도는 pdftotext로 진행 (외부 광고·게이트 등 영어/숫자 표준은 추출됨) ② 실패 구간은 Tesseract 한국어 OCR로 백업 (`pdftoppm` → `tesseract -l kor`) ③ 시스템 운영 시 매뉴얼 신규 등록 자동화 파이프라인에 OCR 단계 필수
**관련**: docs/VENUE_LEARNING_INSIGHTS_260511.md §2-4

## 2026-05-11 — 보고서 너무 완벽한 결과는 의심받음

**작업**: 임원 보고용 1페이지 요약 작성
**증상**: 첫 버전 "수량 100% · 위치 100% · 규격 100% 일치" → 사용자가 "너무 완벽한 거 아닌가" 지적
**원인**: 사후 합리화로 만든 결과를 그대로 보고. 정답지 노출 편향 + 학습 데이터 한계 무시.
**예방**: ① 보고서에 "본 결과의 한계 (정직한 자평)" 섹션 의무 포함 ② 결과가 ±5% 오차도 없으면 검증 방법 재점검 ③ 정답지 노출 여부 명시 ④ 학습 데이터의 빈 카테고리 명시
**관련**: docs/VENUE_LEARNING_INSIGHTS_260511.md §5-3
