-- 5/22 김연아 대리님 명시 = 엑셀 SOT 영역 정합 = signage_types 17 카테고리 (12 + 5 신규)
-- 이전 12 카테고리 (signage_types 기존) + 5/22 신규 5건 = 시상보드·Q방·디지털 사이니지·폼보드·피켓보드

INSERT INTO public.signage_types (id, name, default_width_mm, default_height_mm, default_material, category, layout, notes, sort_order, is_standard)
VALUES
  ('award_board',    '시상보드',       1200, 1800, '폼보드 5T', '시상·공식행사', '세로', '5/22 엑셀 SOT 영역 추가. 공식행사·공모전형 영역 시상 영역.', 13, true),
  ('q_room',         'Q방',           600,  1800, '폼보드',   '등록·안내',    '세로', '5/22 엑셀 SOT 영역 추가. 등록·대기 영역 안내 영역.', 14, true),
  ('digital_signage','디지털 사이니지', 1080, 1920, 'LED',     '디지털·전광판', '세로', '5/22 엑셀 SOT 영역 추가. 로비·외벽 영역 디지털 영역.', 15, true),
  ('foam_board',     '폼보드',         600,  900,  '폼보드 5T', '부대시설 안내', '세로', '5/22 엑셀 SOT 영역 추가. 부대시설 장소·POP 영역.', 16, true),
  ('picket_board',   '피켓보드',       300,  450,  '폼보드 3T', '영접영송',    '세로', '5/22 엑셀 SOT 영역 추가. 영접영송 영역·입출국 일자 고려 영역.', 17, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  default_width_mm = EXCLUDED.default_width_mm,
  default_height_mm = EXCLUDED.default_height_mm,
  default_material = EXCLUDED.default_material,
  category = EXCLUDED.category,
  layout = EXCLUDED.layout,
  notes = EXCLUDED.notes,
  sort_order = EXCLUDED.sort_order;

-- signage_types.name 정합 (5/22 엑셀 SOT 영역)
UPDATE public.signage_types SET name = '통천 배너' WHERE id = 'chunchen_banner' AND name = '통천';
UPDATE public.signage_types SET name = '동선 안내 배너' WHERE id = 'route_banner' AND name = '동선 배너';
