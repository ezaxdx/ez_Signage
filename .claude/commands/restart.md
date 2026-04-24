---
description: dev 서버 클린 재시작 (node kill + .next 삭제 + npm run dev)
---

데이터 꼬임·화면 깨짐 증상 시 사용:

1. `taskkill //F //IM node.exe` (모든 node 종료)
2. `rm -rf .next` (빌드 캐시 초기화)
3. `npm run dev` 백그라운드 실행
4. 6초 대기 후 `curl http://localhost:3000/login` 확인
5. 포트·HTTP 상태 보고

브라우저는 Ctrl+Shift+R로 강제 새로고침해야 함을 사용자에게 안내.
