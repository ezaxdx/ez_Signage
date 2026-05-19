// 자동 생성 — 폴더 학습 자료 인덱스 (G드라이브 SOT, 2026-05-19)
// 생성 스크립트: scripts/extract_learning_seeds.mjs
// 출처: G:/내 드라이브/.../05. 제작물 리스트 가이드/AI 학습자료/L1_행사장
// 변경 시 = 폴더 reorganize 후 npm run extract:learning 재실행

export interface EventLearningEntry {
  venue_folder: string    // L1 폴더명 (G드라이브 SOT)
  venue_key: string       // VENUE_LIST 매핑 키 (lib/venueIntel.ts)
  l2_hall: string         // L2 홀명
  event_code: string      // 6자리 행사 코드
  event_name: string      // 행사명
  area: string            // 면적 (㎡)
  learn_count: number     // 학습 파일 수
  sample_files: string    // 예시 파일 (최대 3개)
}

export const EVENT_LEARNING_INDEX: EventLearningEntry[] = [
  {"venue_folder":"그랜드하얏트서울","venue_key":"그랜드하얏트 서울","l2_hall":"(L2 미상)","event_code":"","event_name":"그랜드볼룸_포이어_살롱_남산홀","area":"","learn_count":141,"sample_files":"POP_A3_세로.jpg / A4 POP_투자상담회 등록데스크 안내.pptx / A4 POP_투자상담회 등록데스크 안내_2.jpg"},
  {"venue_folder":"더 플라자 호텔 서울","venue_key":"더플라자 호텔 서울","l2_hall":"(L2 미상)","event_code":"","event_name":"그랜드볼룸","area":"","learn_count":16,"sample_files":"0529_한아프리카_농업컨퍼런스_DID_시안-01.jpg / 0603_한아프리카_농업컨퍼런스_DID_시안_전달.ai / 0529_한아프리카_농업컨퍼런스_DID_시안-02.jpg"},
  {"venue_folder":"송도컨벤시아","venue_key":"송도컨벤시아","l2_hall":"(L2 미상)","event_code":"","event_name":"183000-1 KOREA MICE EXPO 2018","area":"","learn_count":2,"sample_files":"KME_환경제작물리스트_0613-환영리셉션.xlsx / KME 2018_제작물 최종 리스트_180612_수정_수정.pptx"},
  {"venue_folder":"송도컨벤시아","venue_key":"송도컨벤시아","l2_hall":"(L2 미상)","event_code":"193100","event_name":"KOREA MICE EXPO 2019","area":"","learn_count":29,"sample_files":"개막식 안내-2.jpg / KME PITCHING 1090x1920 0608-1.jpg / KME2019_DID.jpg"},
  {"venue_folder":"COEX","venue_key":"코엑스","l2_hall":"별마당도서관","event_code":"182090","event_name":"공정경제 전략회의","area":"","learn_count":9,"sample_files":"X배너.pdf / X배너_추가_발주-화장실위치안내-1장.pdf / 포디움타이틀.pdf"},
  {"venue_folder":"COEX","venue_key":"코엑스","l2_hall":"B홀, 그랜드볼룸, 컨퍼런스룸(북), 컨퍼런스룸E, 컨퍼런스룸(남)","event_code":"183080","event_name":"NextRise 2022, Seoul 221030","area":"","learn_count":2,"sample_files":"채용설명회_가로현수막.jpg / 채용설명회_세로현수막.jpg"},
  {"venue_folder":"COEX","venue_key":"코엑스","l2_hall":"D2홀","event_code":"183080","event_name":"2018 스마트국토엑스포","area":"","learn_count":15,"sample_files":"2018 스마트국토엑스포_제작물리스트_0909.xlsx / MOU 통천_305호.png / 포디움타이틀.png"},
  {"venue_folder":"COEX","venue_key":"코엑스","l2_hall":"B홀, 컨퍼런스룸(201-203호)","event_code":"183090","event_name":"BCWW 2018","area":"","learn_count":1,"sample_files":"BCWW 2018_제작물리스트_20180820_Final_VER02 (1).xlsx"},
  {"venue_folder":"COEX","venue_key":"코엑스","l2_hall":"C1,C2,컨퍼런스룸(남)","event_code":"193700","event_name":"2019 스마트국토엑스포","area":"","learn_count":20,"sample_files":"2019 스마트국토엑스포_구역푯말 시안.pptx / 코엑스 가로DID.jpg / 장관면담장 I배너_0805.jpg"},
  {"venue_folder":"COEX","venue_key":"코엑스","l2_hall":"B홀,SS","event_code":"193800","event_name":"2019 국제방송영상마켓(BCWW 2019)","area":"","learn_count":8,"sample_files":"GBR_전시장천장현수막_ 5000x3750_최종.pdf / 190814_통천배너.pdf / 190814_천정배너.pdf"},
  {"venue_folder":"COEX","venue_key":"코엑스","l2_hall":"그랜드볼룸,이셈볼룸 일대","event_code":"231004","event_name":"제33차 아시아광고대회 (AdAsia 2023 Seoul)","area":"","learn_count":5,"sample_files":"통천.jpg / 가로등.jpg / 231017_애드아시아 사인물 통합.pdf"},
  {"venue_folder":"COEX","venue_key":"코엑스","l2_hall":"그랜드볼룸 외","event_code":"231009","event_name":"콘텐츠 IP 마켓 2023","area":"2,149㎡","learn_count":20,"sample_files":"9. 아이배너_1500x2000.jpg / 1. 103호 입구_난간 드롭배너_15000x1800.jpg / 7. 104호 파티션_통천현수막_10,000x2500.jpg"},
  {"venue_folder":"COEX","venue_key":"코엑스","l2_hall":"컨퍼런스룸(북),아셈볼룸,오디토리움 외","event_code":"232030","event_name":"2023 웹툰 잡 페스타","area":"1,579㎡","learn_count":13,"sample_files":"231123 2023웹툰잡페스타_X배너(룸사인안내) (1).ai / 231122 2023웹툰잡페스타_포디움타이틀.ai / 231126 2023웹툰잡페스타_키오스크로고시트컷팅.ai"},
  {"venue_folder":"DDP","venue_key":"DDP","l2_hall":"제작물학습","event_code":"191400","event_name":"제1회 대한민국 정부혁신박람회","area":"","learn_count":18,"sample_files":"안전발명챌린지 외2 안내배너.jpg / 개막식장 동선.jpg / 개막식 포디움.jpg"},
  {"venue_folder":"ICC 제주","venue_key":"ICC JEJU","l2_hall":"(L2 미상)","event_code":"","event_name":"1센터(중회의실, 전시장, 소회의실, 대회의실)","area":"","learn_count":19,"sample_files":"listimage_20240617144006.6fec764c3856b0ee63424bb67c9b3b85.gif.jpg / jpgdo.jpg / 전시장-도면추가-바닥전기.png"},
  {"venue_folder":"KINTEX","venue_key":"킨텍스","l2_hall":"(L2 미상)","event_code":"182070","event_name":"제2회 월드 스마트시티 위크","area":"","learn_count":20,"sample_files":"X배너_WSCW_0073 (1).jpg / X배너_WSCW_0157 (1).jpg / X배너_WSCW_0168 (2).jpg"},
  {"venue_folder":"KINTEX","venue_key":"킨텍스","l2_hall":"킨텍스 제1전시장 3,4,5홀","event_code":"222020","event_name":"제6회 월드 스마트시티 엑스포(WSCE 2022)","area":"","learn_count":6,"sample_files":"가로등배너.pdf.추가203438.pdf / 가로등배너.pdf / 제작물 디자인-현수막 및 x배너 (1).pdf.추가203438.pdf"},
  {"venue_folder":"KINTEX","venue_key":"킨텍스","l2_hall":"킨텍스 제2전시장 9B홀","event_code":"232033","event_name":"2023 대한민국 순환경제 페스티벌","area":"6,729㎡","learn_count":1,"sample_files":"3.요약본_231126_11시_대한민국 순환경제 페스티벌_환경연출물_13시.pptx"},
]

export const EVENT_LEARNING_TOTAL = 18
export const EVENT_LEARNING_FILE_TOTAL = 345
