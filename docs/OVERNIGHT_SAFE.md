# Overnight 무중단 안전 실행 가이드

야간 자율 실행은 사고 사례가 실재합니다. 반드시 격리 환경에서 실행하세요.

## 사고 사례 (조사 결과)

- **2025년 10월**: `rm -rf` 가 `/` 부터 실행되어 사용자 머신 전체 파괴 (`--dangerously-skip-permissions` 없이도)
- **2025년 11월**: `~` 디렉터리가 잘못 생성된 상태에서 `rm -rf *` 가 home 디렉터리 폭파
- **여러 케이스**: Stripe live 키, `.env` 파일이 git에 푸시
- **비용**: rate limit 도달까지 1시간 (Max plan에서 두 프로젝트 동시 루프)

## 3계층 격리 (필수)

### 계층 1: Docker sandbox (가장 강함)
모든 야간 실행은 `Dockerfile.claude-overnight` 안에서.
- 비root 사용자
- `-v $(pwd):/workspace`로 프로젝트 디렉터리만 마운트
- `--rm` 종료 후 자동 삭제
- 환경변수만 명시적 주입

### 계층 2: git 브랜치 격리
모든 자동 변경은 새 브랜치로:
- `auto/<timestamp>` 형식
- main 푸시 절대 금지 (이미 CLAUDE.md §20에 명시)
- PR 검토 후 사용자가 수동으로만 머지

### 계층 3: PreToolUse hook (적용 시)
`scripts/hooks/validate-bash.sh`, `scan-secrets.sh`가 sandbox 없을 때도 결정론적 차단.

## 별도 머신 권장 (Mac Mini 패턴)

진지하게 야간 자동화 운영하면 별도 머신 권장:
- 중고 Mac Mini M1/M2 50-80만원
- 메인 머신과 격리
- 어차피 잘 때만 도는 거라 성능 최소도 충분

## Pre-flight 체크리스트 (잠들기 전)

```bash
# 1. git 상태
git status                  # 깨끗해야 함
git pull                    # main 최신화

# 2. verification 명령 수동 실행
npm test                    # 또는 pytest
npm run lint
npm run build
npx tsc --noEmit
node scripts/harness.mjs    # 본 프로젝트 전용

# 3. 환경 변수
echo "ANTHROPIC_API_KEY length: ${#ANTHROPIC_API_KEY}"
echo "DAILY_BUDGET_USD: $DAILY_BUDGET_USD"

# 4. Docker 작동 확인
docker --version
ls Dockerfile.claude-overnight    # 있어야 함

# 5. prompt.md 검토
cat prompt.md                # 작업 단위 체크리스트 명확한가
                             # 성공 기준 객관적인가
                             # 절대 금지 사항 포함됐나
```

하나라도 실패하면 시작하지 말 것.

## 시작 명령

```bash
# Docker 이미지 빌드 (최초 1회)
docker build -f Dockerfile.claude-overnight -t claude-overnight .

# 야간 실행
docker run -it --rm \
  --name claude-overnight-$(date +%s) \
  -v $(pwd):/workspace \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e DAILY_BUDGET_USD="${DAILY_BUDGET_USD:-20}" \
  claude-overnight \
  bash -c '/ralph-loop "$(cat prompt.md)" --max-iterations 20 --completion-promise "COMPLETE"'

# 정지 (다른 터미널)
docker stop $(docker ps -q --filter ancestor=claude-overnight)
```

## 깨어났을 때 검토 명령

```bash
git log --oneline -20             # 무엇이 변경됐나
git diff main...HEAD --stat       # 변경 규모
cat PROGRESS.md | tail -30        # 진행 기록
cat learnings.md | tail -20       # 실패 패턴
make cost-today                   # 어제 비용 (구현 필요)
docker logs $(docker ps -aq --filter ancestor=claude-overnight) | tail -100
```

## 위험 신호 (즉시 정지)

다음 중 하나라도 발견되면 즉시 `docker stop`:
- 100파일 이상 변경
- `.env` 파일이 staged
- `package.json`의 `dependencies`가 5개 이상 변경
- `git log`에 main 머지 흔적
- `learnings.md`에 같은 실패 3회 연속

## 비용 통제

```bash
# 환경변수로 일일 한도 설정
DAILY_BUDGET_USD=20 docker run ... claude-overnight

# Anthropic Console에서 monthly limit 별도 설정 권장
# https://console.anthropic.com/settings/limits
```

## 다음 단계 (이 프로젝트 적용 시)

1. Docker Desktop 설치 (Windows 11) 또는 별도 머신 준비
2. `Dockerfile.claude-overnight` 빌드 테스트
3. 작은 작업 (`README 오타 수정` 같은 것)으로 첫 실행
4. PROGRESS.md / learnings.md 패턴 확인
5. 점차 큰 작업으로 확대

⚠️ 본 프로젝트는 Supabase·결제 통합이 없어 비교적 안전하지만,
   `migration_v4_pm_removal.sql` 같은 DB 변경은 절대 자동 실행 금지.
