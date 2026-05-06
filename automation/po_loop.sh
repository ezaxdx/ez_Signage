#!/usr/bin/env bash
# PO 무중단 자율 루프. STOP 파일이 생길 때까지 Claude Code를 반복 호출.
# 사용: ./automation/po_loop.sh "명령 내용"
# 정지: touch /tmp/po-stop  또는 Ctrl+C

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

STOP_FILE="${PO_STOP_FILE:-/tmp/po-stop}"
MAX_CYCLES="${PO_MAX_CYCLES:-100}"
INTERVAL_SECONDS="${PO_INTERVAL:-30}"
LOG_DIR="${HOME}/.claude-orchestrator"
LOG_FILE="${LOG_DIR}/po-loop.log"
mkdir -p "$LOG_DIR"

PROMPT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max) MAX_CYCLES="$2"; shift 2 ;;
    --interval) INTERVAL_SECONDS="$2"; shift 2 ;;
    *) PROMPT="$1"; shift ;;
  esac
done

[[ -z "$PROMPT" ]] && { echo "사용: $0 '명령'"; exit 1; }
command -v claude >/dev/null || { echo "claude CLI 필요"; exit 1; }
[[ -f "$STOP_FILE" ]] && { echo "stop 파일 먼저 삭제: rm $STOP_FILE"; exit 1; }

cycle=0
trap 'echo ""; echo "Ctrl+C — 다음 사이클부터 정지"; touch "$STOP_FILE"' INT TERM

echo "=== PO Loop 시작 ==="
echo "  명령: $PROMPT"
echo "  최대: $MAX_CYCLES 사이클, 간격: ${INTERVAL_SECONDS}초"
echo "  정지: touch $STOP_FILE"

while [[ $cycle -lt $MAX_CYCLES ]]; do
  if [[ -f "$STOP_FILE" ]]; then
    echo "[$(date +%H:%M:%S)] STOP 감지 — 종료"
    rm -f "$STOP_FILE"
    break
  fi
  cycle=$((cycle + 1))
  echo "[$(date +%H:%M:%S)] === 사이클 $cycle/$MAX_CYCLES ==="

  cycle_prompt="[사이클 $cycle/$MAX_CYCLES] $PROMPT

이전 사이클 결과를 PROGRESS.md에서 확인하고 다음 단계만 진행하세요.
이번 사이클이 끝나면 응답을 종료. 다음 사이클은 외부 루프가 시작합니다.
완료된 작업이 더 없으면 'COMPLETED'라고만 출력하세요."

  if claude -p "$cycle_prompt" 2>&1 | tee -a "$LOG_FILE" | grep -q "^COMPLETED$"; then
    echo "[$(date +%H:%M:%S)] COMPLETED — 모든 작업 끝, 종료"
    break
  fi

  if [[ $cycle -lt $MAX_CYCLES ]]; then
    for ((i=0; i<INTERVAL_SECONDS; i++)); do
      [[ -f "$STOP_FILE" ]] && break 2
      sleep 1
    done
  fi
done

echo "=== PO Loop 종료 ($cycle 사이클 완료) ==="
