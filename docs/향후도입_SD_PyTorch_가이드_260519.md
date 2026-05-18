# 향후 도입 가이드: Stable Diffusion·PyTorch·KoSBi

> 5/19 광범위 조사 결과 도입 후보 5건 = `lib/ai/v3/visionRoadmap.ts` 시드 + 본 문서 = 실 도입 시 가이드 SOT.

---

## 1. Stable Diffusion 3.5 + ControlNet 시안 자동 1차안 (D-7 우선)

### 적용 영역

- 디자이너 컴펌 시간 단축 (현재 외주 디자이너 시안 = 일~주 단위)
- 환경장식물 12 카테고리 규격 강제 (Canny edge)
- 한국어 텍스트 렌더링 (SD 3.5·Z-Image-Turbo·GLM-Image 2026 breakthrough)

### tech stack

- **Stable Diffusion 3.5 Large** = 텍스트 렌더링 향상·SD 1.5·SDXL 대비 signage/poster 인쇄 가능
- **ControlNet (Canny edge)** = 12 카테고리 규격 강제·레이아웃 보장
- **Hugging Face Diffusers** = Python·PyTorch 통합 라이브러리
- **Gradio·Vercel AI Gateway** = 배포·MCP 통합 가능
- **양자화 (8-bit·4-bit)** = 저비용 GPU 운영

### 도입 단계

1. **POC (D-7)**: RunPod·Modal·HuggingFace Spaces에 SD 3.5 + ControlNet 1 시안 생성 시험
2. **검증 (D-14)**: 12 카테고리 5건 × 5 행사장 = 25 시안 자동 생성·디자이너 검토
3. **운영 (D-30)**: Vercel AI Gateway 연결·사용자 위자드에 "1차안 자동 생성" 버튼 추가

### 비용 추정

- 1 시안 약 50원 (RunPod A100·30초·환율 1,400원)
- 1 프로젝트 = 12 시안 = 약 600원 (현재 AI 추천 25원 + 시안 600원 = 약 625원)
- 디자이너 컴펌 시간 = 일 → 분 단위 단축 = 가치 압도적

### Blocker

- GPU 환경 (RunPod·Modal·Vercel AI Gateway 결정)
- 디자이너 직접 컴펌 (1차안 품질 검증)
- 곽 이사 컴펌 (예산·도입 결정)

---

## 2. pytorch-image-models 시안 자동 분류 (D-7 우선)

### 적용 영역

- 사용자 시안 업로드 → 12 카테고리 자동 매핑
- 현재 수동 입력 영역 자동화
- design_items.category 자동 채움 (사용자 부담 ↓)

### tech stack

- **PyTorch + Hugging Face Transformers v5** (2025-12 PyTorch 주력)
- **pytorch-image-models** = ResNet·EfficientNet·ViT·Swin Transformer·ConvNeXt
- **HuggingFace Spaces·Gradio** = 데모·배포

### 도입 단계

1. **데이터셋 (D-7)**: 200건 .ai 시안 카탈로그 (5/15 Agent 2 결과) + 라벨링 (12 카테고리)
2. **fine-tuning (D-14)**: ViT·Swin 사전학습 모델 → 12 카테고리 분류 fine-tune·정확도 측정
3. **운영 (D-30)**: HuggingFace Spaces 또는 Vercel AI Gateway 연결

### 비용 추정

- 월 약 10,000원 (HF Spaces 또는 Vercel Edge inference)
- 정확도 목표 = top-1 90%+ (12 카테고리·간단 분류 영역)

### Blocker

- 학습 데이터 (200건 시안 라벨링·디자이너 협력)
- HuggingFace Spaces 또는 GPU 환경
- 곽 이사 컴펌

---

## 3. KoSBi 한국어 안전 검증 (분기 영역)

### 적용 영역

- AI 추천 응답 = 한국어 안전·비안전 분류
- 비안전 응답 = 자동 차단·정정
- Korea AI Basic Act pre-emptive safety 정합

### tech stack

- **NAVER AI KoSBi** (Korean Safety Benchmarks·GitHub)
- 68k 데이터셋 (34.2k 안전·33.8k 비안전 문장)
- **HuggingFace Spaces** = 분류 모델 호출

### 도입 단계

1. **POC (분기)**: KoSBi 분류 모델 = AI 추천 응답 100건 검증·정확도 측정
2. **검증 (분기 후)**: 비안전 응답 자동 차단·정정 룰 추가
3. **운영 (Q3)**: 라이브 도입·Korea AI Basic Act 정합 표시

### 비용 추정

- 월 약 5,000원 (분류 모델 호출)
- 신뢰성 ↑ + 회사 AI 정책 정합

### Blocker

- KoSBi 데이터셋 사용 권한 (NAVER GitHub 라이선스 확인)
- 한국 AI Basic Act 시행 1개월 전 즉시 알림 룰 (분기 갱신 영역)

---

## 4. Behance·Pinterest 시안 영감 큐레이션 (D-30)

### 적용 영역

- 환경장식물 카테고리별 글로벌 시안 영감
- 디자이너 참고 자료 라이브러리
- 노션 디자인 갤러리 동기화

### tech stack

- **Behance API**·**Pinterest API**
- **Notion API** = 디자인 라이브러리 동기화

### 도입 단계

1. **POC (D-30)**: 12 카테고리 × 키워드 검색 = 시안 100건 큐레이션
2. **검증 (D-60)**: 디자이너 영감 활용도 측정
3. **운영 (분기)**: 노션 디자인 갤러리 동기화·매주 갱신

### 비용 추정

- 월 약 30,000원 (API + 노션 스토리지)

### Blocker

- API 인증 (Behance·Pinterest 개발자 등록)
- 저작권 검토 (참고용·재사용 X)
- 디자인팀 컴펌

---

## 5. NIST AI RMF 4단계 표시 (즉시·완료)

### 적용 결과

- 코드 영역 = recommendSignage SYSTEM_INSTRUCTION 본문 + LearningManagerClient UI 카드 + AdminAiClient 안내 박스
- 곽 이사 보고 신뢰성 ↑
- 5/19 push 13~14 완료

---

## 관련 자료

- 시드 SOT: `lib/ai/v3/visionRoadmap.ts` (5건 도입 후보 메타)
- 메모리: `reference-환경장식물-광범위조사-260519` (8건 WebSearch 결과)
- 회의 자료: `docs/회의자료_환경장식물_v3_260520.md`
- 노션 갱신: `docs/노션갱신_가이드_v3_260519.md`

---

> 본 가이드 = 내부 메모용 (도입 결정 = 곽 이사 컴펌·예산 결정 영역). 5/19 광범위 조사 결과 영구 박제.
