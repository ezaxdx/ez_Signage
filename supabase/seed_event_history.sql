-- 5/22 사용자 명시 = SEED_EVENT_HISTORY 44건 → event_history INSERT (is_seed=true)
-- 실행 = migration_v13_event_history.sql 영역 후 실행
-- 중복 방지 = ON CONFLICT (project_code) DO NOTHING

INSERT INTO public.event_history (project_code, project_name, year, venue, category_tag, program_parts, signage_breakdown, analyzed_item_count, is_seed, source) VALUES
('183080', '2018 스마트국토엑스포', 2018, '코엑스 D2·컨퍼런스룸', '일반', ARRAY['40.05','40.04','40.19','40.18'], '[{"category":"코엑스 D2","quantity":25,"sizes":"60×180cm"},{"category":"코엑스 컨퍼런스룸","quantity":13},{"category":"개막식장","quantity":11},{"category":"인터컨티넨탈 코엑스","quantity":6}]'::jsonb, 41, true, 'seed'),
('193800', '2019 국제방송영상마켓 (BCWW 2019)', 2019, '코엑스', '일반', ARRAY['40.05','40.06','40.19','40.17'], '[]'::jsonb, NULL, true, 'seed'),
('193700', '2019 스마트국토엑스포', 2019, '코엑스', '일반', ARRAY['40.05','40.04','40.19','40.18'], '[]'::jsonb, NULL, true, 'seed'),
('183090', 'BCWW 2018', 2018, '코엑스 Hall B', '일반', ARRAY['40.05','40.06','40.19','40.17'], '[{"category":"행사장 조성","quantity":59},{"category":"전시장 Hall B","quantity":9},{"category":"네트워킹 리셉션","quantity":7},{"category":"VIP 오찬장","quantity":7},{"category":"부대행사","quantity":6},{"category":"VIP 대기실","quantity":4}]'::jsonb, 36, true, 'seed'),
('221030', 'NextRise 2022, Seoul', 2022, '코엑스', '일반', ARRAY['40.05','40.06','40.07','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('182090', '공정경제 전략회의', 2018, '코엑스', '일반', ARRAY['40.04','40.08','40.18'], '[]'::jsonb, NULL, true, 'seed'),
('231009', '콘텐츠 IP 마켓 2023', 2023, '코엑스 그랜드볼룸', '일반', ARRAY['40.05','40.06','40.19','40.17'], '[]'::jsonb, NULL, true, 'seed'),
('231004', '제33차 아시아광고대회 (AdAsia 2023 Seoul)', 2023, '코엑스 그랜드볼룸·아셈볼룸·오디토리움', '일반', ARRAY['40.04','40.08','40.18','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('232030', '2023 웹툰 잡 페스타', 2023, '코엑스 컨퍼런스룸·아셈볼룸', '일반', ARRAY['40.05','40.10','40.19','40.17'], '[]'::jsonb, NULL, true, 'seed'),
('182070', '제2회 월드 스마트시티 위크', 2018, '킨텍스', '일반', ARRAY['40.05','40.04','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('222020', '제6회 월드 스마트시티 엑스포 (WSCE 2022)', 2022, '킨텍스 제1전시장 3·4·5홀', '핵심', ARRAY['40.05','40.04','40.19','40.18'], '[]'::jsonb, NULL, true, 'seed'),
('232033', '2023 대한민국 순환경제 페스티벌', 2023, '킨텍스 제2전시장 9B홀', '핵심', ARRAY['40.05','40.10','40.19','40.17'], '[]'::jsonb, NULL, true, 'seed'),
('183000-1', 'KOREA MICE EXPO 2018', 2018, '송도컨벤시아', '일반', ARRAY['40.05','40.04','40.06','40.08','40.19'], '[{"category":"행사 현수막","quantity":100},{"category":"유도사인","quantity":32},{"category":"행사 룸사인","quantity":17},{"category":"폴대배너","quantity":15},{"category":"포디움 타이틀","quantity":13},{"category":"Q방","quantity":7}]'::jsonb, 62, true, 'seed'),
('193100', 'KOREA MICE EXPO 2019', 2019, '송도컨벤시아', '일반', ARRAY['40.05','40.04','40.06','40.08','40.19'], '[{"category":"전시장","quantity":6},{"category":"개막식","quantity":6},{"category":"환영만찬","quantity":6},{"category":"지역홍보·베뉴설명회","quantity":5},{"category":"참가자관리","quantity":4}]'::jsonb, 9, true, 'seed'),
('251004', 'APEC 중소기업 장관회의', 2025, 'ICC JEJU 및 인근호텔', '일반', ARRAY['40.04','40.08','40.18','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('223060', '2022 제주 IUCN리더스포럼', 2022, '제주국제컨벤션센터 (ICC JEJU)', '일반', ARRAY['40.04','40.08','40.18'], '[]'::jsonb, NULL, true, 'seed'),
('183060', '제2회 세계리더스보전포럼', 2018, '제주국제컨벤션센터 (ICC JEJU)', '일반', ARRAY['40.04','40.08','40.18','40.19'], '[{"category":"참가자안내","quantity":22},{"category":"안내","quantity":9},{"category":"전문가세션","quantity":2},{"category":"VIP 의전·접견 사무실","quantity":4},{"category":"프레스 센터","quantity":1}]'::jsonb, 33, true, 'seed'),
('245006', 'SPP 국제콘텐츠마켓 2024', 2024, '그랜드하얏트 서울', '일반', ARRAY['40.06','40.04','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('242008', '2024 국제농업협력 정책 홍보 및 행사', 2024, '더플라자 호텔 서울 그랜드볼룸', '일반', ARRAY['40.04','40.17','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('241014', '제17차 한-중앙아 협력 포럼', 2024, '롯데호텔 서울', '일반', ARRAY['40.04','40.18','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('252016', '환경 협력 네트워크 구축 주한공관장 초청 간담회', 2025, '롯데호텔 서울', '일반', ARRAY['40.04','40.18'], '[]'::jsonb, NULL, true, 'seed'),
('241011', '제16차 한·베트남 환경장관회의', 2024, '웨스틴 조선 서울 라일락+튤립', '일반', ARRAY['40.04','40.08','40.18'], '[]'::jsonb, NULL, true, 'seed'),
('183300-1', 'BIXPO 2018 행사 (본계약)', 2018, '광주 김대중컨벤션센터', '일반', ARRAY['40.05','40.04','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('201100', '제13회 광주비엔날레', 2020, '광주비엔날레전시관', '일반', ARRAY['40.05','40.17','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('182120', '중소기업 스마트 제조혁신 전략보고회', 2018, '경남도청 대회의실', '일반', ARRAY['40.04','40.08'], '[]'::jsonb, NULL, true, 'seed'),
('251014', '2025년 APEC 경제행사 대행 용역', 2025, '경주', '일반', ARRAY['40.04','40.08','40.18','40.11'], '[]'::jsonb, NULL, true, 'seed'),
('193910', '4차 산업혁명시대, 관광과 박물관', 2019, '국립중앙박물관', '일반', ARRAY['40.04','40.05'], '[]'::jsonb, NULL, true, 'seed'),
('182040', '2018 실패박람회', 2018, '광화문 광장', '일반', ARRAY['40.05','40.10','40.17','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('192400', '2019 실패박람회', 2019, '광화문 광장', '일반', ARRAY['40.05','40.10','40.17','40.19'], '[]'::jsonb, NULL, true, 'seed'),
('192000', '제100주년 3.1절 중앙기념식', 2019, '광화문 광장·세종로공원', '일반', ARRAY['40.08','40.18','40.19'], '[{"category":"행사장 (등록·음수대·방한용품)","quantity":46},{"category":"야외 (주차장·운영요원)","quantity":28},{"category":"실내","quantity":4}]'::jsonb, 52, true, 'seed'),
('191400', '제1회 대한민국 정부혁신박람회', 2019, '동대문디자인플라자 (DDP) 알림1·2관', '일반', ARRAY['40.05','40.08','40.10','40.17','40.19'], '[]'::jsonb, 22, true, 'seed'),
('191600', '농식품 청년해외개척단 8기 발대식', 2019, '서울스퀘어', '일반', ARRAY['40.08','40.18'], '[]'::jsonb, NULL, true, 'seed'),
('191200', '2019 대한민국 식품대전', 2019, 'aT센터', '일반', ARRAY['40.05','40.19','40.17'], '[]'::jsonb, NULL, true, 'seed'),
('252006', '2025 대한민국 정부 박람회', 2025, '오스코 (OSCO)', '일반', ARRAY['40.05','40.08','40.19','40.17'], '[]'::jsonb, NULL, true, 'seed'),
('193960', '2020 평창평화포럼', 2020, '평창 알펜시아', '핵심', ARRAY['40.04','40.18','40.19'], '[{"category":"세로현수막","quantity":174},{"category":"X배너","quantity":30},{"category":"가로현수막","quantity":15},{"category":"통천현수막","quantity":7},{"category":"큐방","quantity":7},{"category":"포디움 타이틀","quantity":5}]'::jsonb, 251, true, 'seed'),
('252026', 'UNFCCC COP30 한국홍보관', 2025, '브라질 벨렘', '해외', ARRAY['40.05','40.17'], '[]'::jsonb, NULL, true, 'seed'),
('181000', '2018 KFP 한국수산식품홍보관 (K-FISH)', 2018, '미분류', '미분류', ARRAY['40.05','40.17'], '[]'::jsonb, NULL, true, 'seed'),
('183900', '2018 SW교육 성과발표회 및 시상식', 2018, '미분류', '미분류', ARRAY['40.08','40.04'], '[]'::jsonb, NULL, true, 'seed'),
('193200', '2019 홍콩 트래블마트 및 기업설명회', 2019, '미분류', '미분류', ARRAY['40.06','40.05'], '[]'::jsonb, NULL, true, 'seed'),
('193000', '2019년 야영장 담당공무원 안전관리 실무교육', 2019, '미분류', '미분류', ARRAY['40.04'], '[]'::jsonb, NULL, true, 'seed'),
('193600', '한일 우정상 수여식 행사', 2019, '미분류', '미분류', ARRAY['40.08','40.18'], '[]'::jsonb, NULL, true, 'seed'),
('203130', '2020 국제방송영상마켓 (BCWW) 및 글로벌 포맷마켓 온오프라인', 2020, '온라인+오프라인', '일반', ARRAY['40.05','40.06','40.17'], '[]'::jsonb, NULL, true, 'seed'),
('202140-1', '2020 글로벌 코리아 박람회 LH전시부스 및 LH로드쇼 (LH GBC)', 2020, '복합', '일반', ARRAY['40.05','40.17','40.11'], '[]'::jsonb, NULL, true, 'seed'),
('251015', '2035 국가 온실가스 감축목표 대국민 공개 논의', 2025, '미정', '일반', ARRAY['40.04','40.10'], '[]'::jsonb, NULL, true, 'seed')
ON CONFLICT (project_code) DO NOTHING;

-- 검증
-- SELECT COUNT(*) FROM event_history WHERE is_seed = true;  -- 44
-- SELECT venue, COUNT(*) FROM event_history WHERE deleted_at IS NULL GROUP BY venue;
