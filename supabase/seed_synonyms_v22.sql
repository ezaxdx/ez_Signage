-- 5/22 김연아 대리님 명시 = 엑셀 SOT 영역 동의어 정합 (신규 5건 → 독립 카테고리)

INSERT INTO public.signage_aliases (alias_name, canonical_name, note) VALUES
  -- 시상보드 (award_board)
  ('기념촬영보드', '시상보드',     '5/22 엑셀 SOT 영역 = 포토존 보드'),
  ('포토월',       '시상보드',     '5/22 엑셀 SOT 영역 = 포토 영역 보드'),
  -- Q방 (q_room)
  ('큐방',         'Q방',          '5/22 엑셀 SOT 영역 = Q방 한글 표기'),
  ('큐방시트',     'Q방',          '5/22 엑셀 SOT 영역 = Q방 시트 형태'),
  ('Q룸',          'Q방',          '5/22 엑셀 SOT 영역 = Q방 영문 표기'),
  -- 디지털 사이니지 (digital_signage)
  ('디지털사이니지', '디지털 사이니지', '5/22 엑셀 SOT 영역 = 공백 없는 표기'),
  ('DID',          '디지털 사이니지', '5/22 엑셀 SOT 영역 = Digital Information Display'),
  ('LED 사이니지', '디지털 사이니지', '5/22 엑셀 SOT 영역 = LED 패널'),
  ('전광판',       '디지털 사이니지', '5/22 엑셀 SOT 영역 = 한글 표기'),
  -- 폼보드 (foam_board)
  ('폼포드',       '폼보드',       '5/22 엑셀 SOT 영역 = 오타 표기'),
  ('안내폼보드',   '폼보드',       '5/22 엑셀 SOT 영역 = 안내용 폼보드'),
  ('컨설팅폼보드', '폼보드',       '5/22 엑셀 SOT 영역 = 4단계 안내 폼보드'),
  -- 피켓보드 (picket_board)
  ('영접피켓',     '피켓보드',     '5/22 엑셀 SOT 영역 = 영접용 피켓'),
  ('입출국피켓',   '피켓보드',     '5/22 엑셀 SOT 영역 = 입출국 피켓'),
  -- 표준명 정합 (5/22)
  ('통천',         '통천 배너',    '5/22 엑셀 SOT 영역 정합 = 정확 명칭'),
  ('동선 배너',    '동선 안내 배너', '5/22 엑셀 SOT 영역 정합 = 정확 명칭')
ON CONFLICT (alias_name) DO UPDATE SET
  canonical_name = EXCLUDED.canonical_name,
  note = EXCLUDED.note;

-- 이전 동의어 영역 표준명 영역 정합 (시상보드·기념촬영보드·큐방·폼보드 영역 영역 영역 영역 영역 update)
UPDATE public.signage_aliases SET canonical_name = '시상보드' WHERE alias_name = '시상보드' AND canonical_name != '시상보드';
UPDATE public.signage_aliases SET canonical_name = '시상보드' WHERE alias_name = '기념촬영보드' AND canonical_name = 'A3 가로';
UPDATE public.signage_aliases SET canonical_name = 'Q방'     WHERE alias_name IN ('큐방', '큐방시트', '셔틀버스 큐방시트') AND canonical_name = 'A4 가로';
