# 자동화 패턴 카탈로그

> 자율 작업 성능을 높이는 검증된 패턴 모음. 본 프로젝트뿐 아니라 향후 다른 자동화에도 재사용.
>
> 출처: 본 프로젝트 운영 경험(2026-04~05) + Claude Code 공식 권장사항 + 커뮤니티 베스트 프랙티스

---

## 0. 핵심 원칙 (모든 자동화에 공통)

### 자동화 4가지 필터 (CLAUDE.md §0)

자동화 시도 자체를 결정하는 1차 게이트:

1. **정답이 있는가** — 규칙 기반인가, 판단 필요한가
2. **현재 업무인가** — 기존 수동 업무 대체인가, 신규 도입인가
3. **데이터 신뢰** — 학습·판단 근거 자료가 정확한가
4. **개입이 줄어드는가, 바뀌는가** — 줄어드는 게 성공, 바뀌는 게 실패

⭐ 4번이 핵심. AI가 추천 → 사람이 매번 검토 = 일이 늘어남 = 실패.

---

## 1. 외부 메모리 (Memory Augmented Loop)

### 문제
- LLM 컨텍스트는 매 호출마다 fresh
- 긴 작업을 여러 호출에 걸쳐 진행하면 진행 상황을 잃음
- 같은 실수를 반복

### 해결 패턴
4개의 영구 메모리 파일을 운영:

| 파일 | 역할 | 갱신 주기 |
|---|---|---|
| `prompt.md` | 작업 명세·체크리스트·성공 기준 | 작업 시작 시 1회 |
| `PROGRESS.md` | 무엇이 끝났고 무엇이 남았는지 | 매 iteration |
| `learnings.md` | 실패 패턴·예방책 | 실패 시 |
| `decisions.md` | 의사결정 로그 (왜 X를 골랐나) | 결정 시 |
| `goals/current.md` | 상위 목표·전략·이번 주 작업 | 주 1회 |

### 적용 효과
- 매 iteration이 fresh context로 시작해도 누적 학습 유지
- 사람이 "어디까지 했어?" 묻지 않아도 됨
- 같은 실수 재발 방지

### 본 프로젝트 운영 결과
- PROGRESS.md: 13개 사이클 누적
- decisions.md: 11건 의사결정 기록
- learnings.md: 1건 (Fabric.js stale closure 패턴)

---

## 2. 검증 루프 (Verification Loop)

### 문제
- LLM은 "끝났습니다"라고 자신 있게 말하지만 실제로는 끝나지 않음
- 빌드 깨졌는데 commit하고 다음 작업 진행

### 해결 패턴
모든 작업 끝에 **객관적 명령**으로 검증:

```bash
npx tsc --noEmit             # 타입 체크
npm run lint
npm run build
node scripts/harness.mjs     # 도메인 자체 검사 (이 프로젝트 72개 항목)
```

검증 통과 후에만 commit. `<promise>COMPLETE</promise>` 출력 전에 git status도 확인.

### 본 프로젝트의 harness.mjs 패턴
72개 자동 점검 항목으로 도메인 일관성 검증:
- 시드 데이터 무결성 (54건 행사·17건 매핑·11종 환경장식물)
- 폰트 파일 존재
- DB 스키마 일치
- 라우트 빌드 성공
- 환경변수 키 형식

다른 자동화에도 이런 도메인 점검 스크립트를 갖추면 검증 강화됨.

---

## 3. 한 명령 = 끝까지 완료 (One-shot Completion)

### 문제
- 사용자가 큰 명령 던지면 AI가 "다음 단계 진행할까요?" 라며 자꾸 끊음
- 매번 사람이 다시 입력해야 함 → 자동화 의미 없음

### 해결 패턴
- 명령 시작 시점에 **모든 필요 작업을 식별**
- 그 후 끝까지 자동 진행 (확인 없이)
- 단계 분할 시에도 사실만 알리고 자동 진행
- 응답 종료는 진짜 다 끝났을 때만

예외 (멈추고 사람 호출):
- 결제·DB·인증 자동 변경
- 5번 시도해도 진척 없음
- 100파일 이상 변경 시도
- 명세 모호로 추측 위험

### 적용 결과
- 사용자 입력 빈도 ↓
- 한 세션에서 13~20 사이클 자동 진행 가능

---

## 4. 외부 루프 (External Loop Pattern)

### 문제
- LLM이 스스로 "다시 시작" 못 함 (한 응답 = 한 호출)
- 야간 무중단 작업 필요

### 해결 패턴
Bash 스크립트 외부 루프:

```bash
while [[ $cycle -lt $MAX_CYCLES ]]; do
  [[ -f "$STOP_FILE" ]] && break
  cycle=$((cycle + 1))
  claude -p "[사이클 $cycle/$MAX] $PROMPT" 2>&1 | tee -a "$LOG_FILE"
  # COMPLETED 출력하면 종료, 아니면 다음 사이클
done
```

본 프로젝트 구현: `automation/po_loop.sh`

### 정지 메커니즘 (3중)
1. `Ctrl+C` → trap으로 STOP_FILE 생성
2. `touch /tmp/po-stop` → 다른 터미널에서 정지 신호
3. `MAX_CYCLES` 도달 → 자동 종료

---

## 5. 격리 (Sandbox / Isolation)

### 문제
- AI가 잘못된 명령(`rm -rf /`) 실행 시 사용자 머신 전체 위험
- 야간 무인 실행 시 사고 사례 실재

### 해결 패턴 (3계층)

**계층 1: Docker sandbox**
- 비root 사용자
- 프로젝트 디렉터리만 마운트
- `--rm` 자동 삭제
- 환경변수 명시적 주입

**계층 2: git 브랜치 격리**
- `auto/<timestamp>` 브랜치
- main 푸시 금지 (CLAUDE.md §20)
- 사람 검토 후 머지

**계층 3: PreToolUse hook**
- `validate-bash.sh`: 위험 명령 차단
- `scan-secrets.sh`: 시크릿 누출 차단

본 프로젝트: `Dockerfile.claude-overnight` 제공, 기본 CMD는 안전 모드.

### Pre-flight 체크리스트
시작 전 모든 항목 통과 확인:
- git status 깨끗
- verification 명령 통과
- 환경변수 길이 검증
- Docker 작동 확인
- prompt.md 검토

---

## 6. 비용 통제

### 문제
- 야간 루프가 rate limit 도달 (한 시간 만에)
- 의도치 않은 큰 토큰 사용

### 해결 패턴
- 환경변수 일일 한도: `DAILY_BUDGET_USD=20`
- Anthropic Console monthly limit 별도 설정
- iteration 당 토큰 추적 (50K 초과 시 BLOCKED)
- prompt.md 체크리스트로 작업 범위 제한

---

## 7. 위험 신호 자동 감지

### Ralph Loop 권장 6가지 차단 조건

자율 루프가 즉시 정지해야 하는 신호:
1. 같은 테스트 3 iteration 연속 실패
2. 한 iteration에서 30+ 파일 변경 시도
3. 결제·인증·DB 마이그레이션 자동 변경 필요
4. PROGRESS.md가 5 iteration째 동일 (진척 없음)
5. `.env` 파일이 staged 발견
6. main 머지 흔적 (commit log)

### 감지 시 동작
- 응답에 `<promise>BLOCKED</promise>` 출력
- learnings.md에 이유 기록
- 외부 루프 종료
- 사용자 호출

---

## 8. 프롬프트 설계 (Prompt Engineering for Loops)

### 효과적인 prompt.md 구조

```markdown
# Loop Task

## 목표
<1-2 문장 명확한 목표>

## 성공 기준 (verification)
- [ ] 객관적 명령 1
- [ ] 객관적 명령 2

## 작업 절차 (매 iteration)
1. PROGRESS.md 읽기
2. 미완 항목 1개 선택
3. verification 실행
4. 통과 시 [x] 표시

## 작업 단위 체크리스트
- [ ] 할 일 1
- [ ] 할 일 2

## 종료 조건
모든 [x] + 모든 verification 통과 → `<promise>COMPLETE</promise>`

## 절대 금지
- 체크리스트 외 작업 추가
- verification 없이 COMPLETE
```

### 핵심
- "객관적 verification"이 핵심. "잘 됐어요" 같은 주관 종료 금지.
- 체크리스트는 5분 단위로 잘게 쪼갬.
- 절대 금지 사항 명시.

---

## 9. 본 프로젝트에 적용된 자동화 인벤토리

| 카테고리 | 도구 | 위치 |
|---|---|---|
| 외부 메모리 | PROGRESS·learnings·decisions·goals | 루트 + `goals/` |
| 검증 | harness.mjs (72개 점검) | `scripts/` |
| 외부 루프 | po_loop.sh | `automation/` |
| 야간 sandbox | Dockerfile.claude-overnight | 루트 |
| 안전 가이드 | OVERNIGHT_SAFE.md | `docs/` |
| 슬래시 명령 | check, pavr, fix-bug, restart 등 | `.claude/commands/` |
| 시드 단일 소스 | dashboardSeed.ts | `lib/data/` |
| 분석 스크립트 | parse_perflist, parse_signage_lists, batch_vision_analysis | `scripts/` |
| AI 호출 | recommendSignage.ts (Gemini REST) | `lib/ai/` |

---

## 10. 다음 자동화 후보 (현재 미구현)

본 프로젝트에서 추가 가능한 자동화 패턴:

### A. PreToolUse hook 적용
- `scripts/hooks/validate-bash.sh` — 위험 명령 차단
- `scripts/hooks/scan-secrets.sh` — `.env` 누출 차단
- `.claude/settings.json`에 등록

### B. 비용 추적
- `make cost-today` — Anthropic Console API로 어제 비용 조회
- iteration 당 토큰 카운트 누적

### C. CI/CD 통합
- GitHub Actions에서 PR 만들 때 자동 verification
- Vercel deploy preview 자동 생성
- harness.mjs를 GitHub Action에서도 실행

### D. RAG / 임베딩 (시드 17건 → 100건+)
- `SEED_PERFLIST` 데이터가 누적되면 가중치 점수에서 임베딩 기반 검색으로 전환
- pgvector 또는 Supabase Vector 활용

### E. 멀티 에이전트
- `mice-reviewer` — 명세 일치·시드 무결성 검증
- `mice-canvas-expert` — Fabric.js 캔버스 버그 전문
- 각자 좁은 책임 → 컨텍스트 절약

### F. 자가 개선 루프
- 매 N개 commit마다 learnings.md를 재구성
- 반복되는 실패 패턴을 PreToolUse hook으로 승격
- 자주 쓰는 명령을 슬래시 명령으로 추출

---

## 참고 자료

- Anthropic Claude Code 공식 문서: https://docs.claude.com/claude-code
- Ralph Loop 패턴 (커뮤니티): 외부 메모리 + verification 루프 표준화
- 본 프로젝트 사고 사례: `docs/OVERNIGHT_SAFE.md`
