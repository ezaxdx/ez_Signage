# 종합 점검 보고서 — 환경장식물 잔존·학습 미완·회사생활·자체 업그레이드 (2026-05-20)

**분류**: [검토 요청]
**작성**: 회사 PC Claude Code 야간 자율 최종 (사용자 "최선을 다해 모든 부분" 명시 후)
**스코프**: 환경장식물 v10.4 잔존 + 학습 미완 + 회사생활 SOT 인덱스 + 자체 업그레이드 로드맵

---

## 1. 환경장식물 v3 잔존 점검 (전수 grep 결과)

### 1-1. design_items INSERT 7곳 전수 (v10.4 정합 완료)

| 파일 | 패턴 | 상태 |
|---|---|---|
| ProjectInfoClient.tsx (175~198) | `max(existingNos) + 1` | ✅ b979439 fix |
| EditorLayout.tsx (314) | `nextDesignItemNo(items)` | ✅ v10.4 helper |
| SeriesGenerator.tsx (65~89) | DB 조회 + `nextDesignItemNos(count)` | ✅ v10.4 helper |
| ItemSidebar.tsx (58·110) | `nextDesignItemNo(items)` | ✅ v10.4 helper |
| NewProjectButton.tsx (526·579·583·777) | 위자드 일괄 + AI 추천 시 `order('no', desc).limit(1)` | ✅ DB 조회 패턴 (안전) |
| case-a/page.tsx | 신규 프로젝트 idx+1 | ✅ 안전 (항상 빈 상태) |
| case-b/page.tsx (115) | `r.no \|\| String(i+1).padStart(2, '0')` | ✅ 안전 |
| case-d/page.tsx (45) | `'01'` 하드코딩 + 'X배너' 정정 | ✅ v10.4 정정 |

**잠재 잔존**: 0건. DB trigger SOT + 클라이언트 helper 이중 방어 완료.

### 1-2. 'X-배너' 대시 잔존 활성 코드 (check_v3 [8] 자동)

| 위치 | 상태 |
|---|---|
| case-d/page.tsx · ItemSidebar.tsx · EditorGrid.tsx SIGNAGE_PRESETS · ItemSidebar CATEGORY_COLORS | ✅ 'X배너' 정정·기존 'X-배너'는 호환 keep |
| dashboardSeed.ts (legacy 통계 라벨) | ⚠️ 잔존·실사용 X·코멘트만 |
| signageCategoryStandards.ts (코멘트 영역) | ⚠️ 잔존·정합 영향 X |
| signageCategoriesSeedV3.ts match_keywords (호환) | ✅ 의도적 (입력 정규화) |

**활성 코드 = 0건**·코멘트·통계 영역만 잔존 = WARN 수준·정합 영향 0건.

### 1-3. 다른 테이블 INSERT 패턴 (관련 X 검증)

| 테이블 | INSERT 위치 | no 컬럼 | 영향 |
|---|---|---|---|
| `item_contents` | EditorLayout·ItemSidebar | 없음 | 무관 |
| `slot_styles` | ProjectInfoClient | 없음 | 무관 |
| `slot_history` | EditorLayout | 없음 | 무관 |
| `item_edit_log` | EditorLayout | 없음 | 무관 |
| `usage_logs` | ExportService | 없음 | 무관 |
| `learning_jobs` | LearningManagerClient | 없음 | 무관 |
| `venue_requests`·`venues`·`signage_aliases` | 어드민 | 없음 | 무관 |

**결론**: design_items.no 외 NOT NULL 위반 잠재 = 0건.

### 1-4. 노션 §6-2 외 SOT 정합 (check_v3 [4]·[6] 자동)

| 노션 SOT 영역 | 코드 정합 | 점검 |
|---|---|---|
| §6-2 12 카테고리 마스터 | `signageCategoriesSeedV3.ts` | ✅ v10.3 |
| §6-3 파트별 추천 | `PROGRAM_PART_SIGNAGE_DETAILS` + `SEED_PROGRAM_PART_SIGNAGE` | ✅ v9.31~v10.4 |
| §7 시설 가이드 6 행사장 | `VENUE_FACILITY_GUIDE_SEED` | ✅ v9.15·v10.3 |
| §8-1 동의어 50+ | `SEED_SYNONYMS` + DB `signage_aliases` | ✅ v10.3 |
| §3-2 일정 D-10~D-1 | `OrderingSchedule` localStorage | ✅ v9.19 |
| §3-3 안내 문구 A안 | UI 노출 | ✅ v9.21 |
| §1-3 4단 안전망 | NIST RMF 정합 | ✅ v9.22 |
| §4 학습 메타 10건 | `LEARNING_META_SEED` | ✅ v10.3 |
| §5 누적값 8 행사장 | `findSimilarPastEvents` | ✅ v9.6 |
| §9 venue·hall 47건 | `VENUE_HALLS` | ✅ v10.3 |

**결론**: 노션 SOT 전 영역 정합 완료. 다음 갱신 트리거 = 노션 변경 시.

---

## 2. 학습 미완 부분 (학습 현황 엑셀 30 행사장 + 외부 미완)

### 2-1. 시설 가이드 미등록 행사장 (12+ 행사장)

기존 6 행사장 등록 (`VENUE_FACILITY_GUIDE_SEED`): 킨텍스 5홀·1~4홀·2전시장·코엑스·송도컨벤시아·ICC 제주·DDP

v10.3 신규 골격 시드 21건 (1·2·3순위 분리·정답지 편향 회피):
- 1순위 5건: BEXCO·EXCO·GSCO·THE_SHILLA·김대중컨벤션센터
- 2순위 11건: CECO·DCC·HICO·KSPO DOME·SETEC·여수·정부세종·시그니엘·제주신라·조선팰리스·수원
- 3순위 5건: GUMICO·UECO·라한·소노캄·안동

여전히 미등록 (학습 데이터 누적 부족):
- 롯데호텔 서울 (14 도면·2 행사·6 학습 파일 = 데이터 충분·등록 후보)
- 롯데호텔 제주 (1 도면·1 행사·7 학습 파일 = 등록 후보)
- 그랜드하얏트서울 (2 도면·1 행사·78 학습 파일 = 데이터 풍부·우선 등록)
- 더 플라자 호텔 서울 (1 도면·1 행사·16 학습 파일)
- aT센터·OSCO·평창 알펜시아·웨스틴조선 (학습 현황 시트 X·SEED_PERFLIST에는 존재)

**권장**: 5/22 라이브 후 1주차 = 그랜드하얏트서울·롯데호텔 서울·더플라자·롯데호텔 제주 4건 정식 등록 (`buildDefaultConventionGuide()` 베이스).

### 2-2. HWP 본문 파싱 미완 (5/19 learnings.md)
- 킨텍스 매뉴얼 PDF 한국어 폰트 깨짐 = pdftotext 한계
- 권장 = Tesseract `pdftoppm + tesseract -l kor` 자동화
- 5/22 후 별도 사이클·외부 의존성 (Tesseract 설치)

### 2-3. Vision API 도면 학습 (기존 v9.6 작동)
- `lib/ai/visionFloorPlan.ts` + `/api/learning-jobs/run` 정상
- venues.specs_text 자동 저장
- 향후 = 도면 분석 결과 + 12파트 시드 조합 학습 (1주일+ 사이클)

### 2-4. 12파트 신규 카테고리 = Q방 미정
- 8번 부대행사-투어형 = Q방 규격·재질 미수신
- 사용자 컴펌 필요·programPartSignageSeed.ts에 note 명시

### 2-5. 정답지 노출 편향 (learnings.md 2026-05-11)
- 2차 AI 시험 = 미실시 (코엑스·송도 정답지 미보유 케이스로 검증 권장)
- 5/22 후 검증·정량 정확도 측정

### 2-6. 학습 데이터 누적 자동 cron 미구현
- 신규 발주 자료 추가 시 = 사용자 수동 실행 (`relearn_from_perflist.mjs` 스켈레톤)
- 5/22 후 분기별 자동 cron 검토

---

## 3. 회사생활·자동화·문서작성 SOT 인덱스 (이미 있는 가이드)

### 3-1. 업무별 가이드 위치 (CLAUDE.md §3 정합)

| 업무 유형 | 가이드 경로 | 핵심 SOT |
|---|---|---|
| 회의록 | `업무/회의록/MD 파일/회의록_작성_가이드.md` | STT TXT → docx·4단계 워크플로우 |
| 보고서 | `업무/보고서 작성/MD 파일/보고서_작성_가이드.md` | 30초 룰·McKinsey Pyramid·BLUF |
| 결재 서류 | `업무/결제문서 작성/결재_가이드.md` | 갑지(txt) + 을지(xlsx)·다우오피스 |
| 사내행정 | `업무/결제문서 작성/예시자료/사내행정_가이드.md` | 회사 공식 행정 |
| 기획안 | `업무/기획안 작성/기획안 MD/templates/` | 91.2 AI업무파트너 양식 §2~§19 |
| IA장표 | `업무/IA장표 제작/MD 파일/IA_TEMPLATE_GUIDE.md` | v2 1슬라이드·호버 메뉴·pptx 출력 |
| 메일·카톡 | `업무/메일 작성/메일_작성_가이드.md` | 5단계·300자 룰·BLUF·제목 말머리 |

### 3-2. 상사 보고 자료 분류 4종 (5/19 PO 명시·영구)

모든 상사 보고 자료 (회의록·카톡·메일·결재·노션·기획안·보고서·구두) = 첫 줄·제목에 1건 명시 의무:
- `[검토 요청]` = 의견·검토 부탁
- `[의사 결정 요청]` = 결정 필요·답변 받아야
- `[단순 보고]` = 정보 공유·답변 X
- `[진척 공유]` = 진행 상태·답변 X

이후 BLUF (결론·요청·기한) 첫 화면. 메모리 `feedback-상사보고-분류명시-의무-260519`.

### 3-3. 외부 자료 작성 표준 워크플로우 (5/18·CLAUDE.md §7 #11)

회의록·노션·메일·결재·기획안 외부 자료 = 입력 자료 (STT·메모·녹취·사용자 입력) 영역만 사용. 메모리·CLAUDE.md 룰 본문 추가 X·영어 약어 (SOT·BLUF·MECE) 자체 노출 X.

4단계:
1. 시작 명시 = 분류 + 입력 자료 영역
2. 본문 작성 = 입력 자료 영역만
3. 자체 검증 = grep·약어·AI 어투 점검
4. 사용자 컴펌 = 추가 항목 + 출처 명시

### 3-4. 상사 페르소나 (CLAUDE.md §2·5/15)

내부 자체 점검 도구 (외부 자료 노출 X):
- **곽은경 이사님** (MICE혁신본부장) = Controller·결정 명확·1슬라이드 + Action Title + 사전 시안
- **정호연 팀장님** (AXDX팀장) = Thinker·A·B·C 옵션 비교 + 정량 데이터
- **김연아 대리님** (AXDX팀 대리) = IA 스크린샷·컴펌 항목 분리 명확

### 3-5. 회사 정보·행정 SOT (5/19 메모리)

- `reference_company_infosec_policies` = 12종 정보보호 정책 SOT (업무/정보보호 정책)
- `reference_company_admin_process` = 위임전결·결제·법인카드·전도금·출장·정산·계약·실행서 (260309 시행)
- `reference_company_gcp_org_policies` = AXDX팀 GCP 조직 정책
- `reference_team_drive_key_assets` = G드라이브 시트 12·문서 9·발표 5종 영구 인덱스

---

## 4. 자체 업그레이드 로드맵 (5/22 라이브 후 단계별)

### Stage 0 — D-1·D-day (지금~5/22)
- 큰 변경 X·라이브 안정 우선
- 자율 모드 = 패키지 B (분석 only) + 패키지 C (BLOCKED 처리)만
- push·DB·노션 잠금 유지

### Stage 1 — 라이브 후 +1 (5/23)
- 휴식
- (선택) 라이브 회고 1쪽 (`docs/live_checklist_260522.md` 3-1)

### Stage 2 — 1주차 (5/24~5/30)
- CLAUDE.md 다이어트 (926 → 250~350줄·60% 감축)
- /loop 룰 폐기·CLAUDE.md §6 듀얼 Claude 자율 사이클 룰 제거
- Anthropic 공식 지속성 문구 도입 = 모든 자율 명령 끝에 영어 원문 자동 부착
- 상태 파일 생성 = BLOCKED.md·HANDOFF.md·DECISIONS.md·CHANGELOG.md (이미 일부 docs/에 신설)
- scripts/find_work.sh + claude_session.sh (외부 무한 루프)
- Discord 웹훅 Stop 훅

### Stage 3 — 2~4주차 (5/31~6/20)
- Claude Code 2.1.139+ `/goal` 명령 적극 사용 (외부화된 종료 조건)
- Ralph Wiggum 야간 자율 (Anthropic 공식 플러그인)
- git worktree 병렬 작업
- 거짓 완료율·BLOCKED 누적·재발 패턴 1주일 측정

### Stage 4 — 2~3개월 (6월~7월)
- Docker 컨테이너 + `--dangerously-skip-permissions` (라이브 환경 한정)
- `.claude/agents/` subagent (도메인별 워커)
- Auto Mode 기본화
- Tailscale 듀얼 PC 직접 연결 (검토 후)

### 측정 가능 지표
- "다 했다" 거짓 완료 5회/주 이상 → CLAUDE.md 룰 강화
- BLOCKED.md 20건 누적 → 사람 일괄 처리
- 토큰 80%+ 자율 모드 점유 → /compact 자동 hook 도입

---

## 5. 향후 자동화 프로젝트 (집 PC·다른 도메인 적용 가능 패턴)

### 5-1. 메타 패턴 (모든 자동화에 일반화)
1. Step 0 의도 확인 5분 (3 Why → 근본 의도 1줄)
2. 35분 설계 체크리스트 (SOT·책임·선행 사례·검토 부담)
3. Forbidden phrases 자체 검열
4. 자연어 잠금 (push X·상사 검토 중)
5. 자체 검증 의무 (TSC·빌드·grep 4단계)
6. 진행 증명 (commit hash·exit codes)
7. Anthropic 공식 지속성 문구
8. 페이지 N 섹션 ErrorBoundary

### 5-2. 집 PC 자동화 (글쓰기·웹소설 가정)
- CLAUDE.md 줄 수 점검 (`wc -l ~/CLAUDE.md`·150줄+ 시 다이어트)
- 자작 자율 명령 폐기 (`/loop` 류)
- 단어 다양화 (자모 발작 회피)
- 메모리 적재 = 회사 PC sync 폴더 흡수

---

## 6. 자체 점검 (본 보고서)

- [x] [검토 요청] 분류 첫 줄
- [x] 환경장식물 v3 잔존 = 0건 점검 (객관 grep)
- [x] 학습 미완 6항 명시 (시설 가이드·HWP·Vision·Q방·편향·cron)
- [x] 회사생활 SOT 인덱스 7 가이드 + 상사 분류 + 페르소나 + 회사 정보
- [x] 자체 업그레이드 Stage 0~4 단계별 + 측정 지표
- [x] 향후 자동화 메타 패턴 일반화
- [x] "97%·완벽·거의" 표현 0건
- [x] 모든 권장 = 사용자 결정 영역 분리

---

## 7. 사용자 영역 액션 우선순위 (최종 통합)

### 5/20 오전
1. `Desktop\야간작업_결과_260520_아침확인용.md` 5분 확인
2. 팀장님 정의 보고서 5건 컴펌 답변
3. 노션 §3 재학습 보고 (`docs/relearn_status_260520.md` 1줄)
4. 14시 예시 이미지 적재

### 5/20 오후
5. `npm run dev` 시각 검증 (Matrix·design_items·SectionBoundary)
6. v10.4 변경 시각 확인

### 5/21 D-1
7. `docs/live_checklist_260522.md` 실행
8. Supabase Studio SQL RUN 결정
9. main 머지·push 결정

### 5/22 D-day
10. 라이브 모니터링 (라이브 직전·15분·1시간)
11. rollback 절차 준비

### 5/23+
12. 회고
13. Stage 2 다이어트 사이클 착수
