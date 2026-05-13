-- v9.20: signage_types 테이블에 layout 컬럼 추가 + 최신 13종 시드 동기화
-- PM 실행 필요: Supabase Studio → SQL Editor에서 전체 실행

ALTER TABLE public.signage_types
  ADD COLUMN IF NOT EXISTS layout text CHECK (layout IN ('세로', '가로', '정사각'));

-- 기존 행 업데이트
UPDATE public.signage_types SET layout = '세로'  WHERE name IN ('X배너','I배너','가로등 배너','세로 현수막','통천 배너','A4 세로','A3 세로','폼보드');
UPDATE public.signage_types SET layout = '가로'  WHERE name IN ('가로 현수막','포디움 타이틀','A4 가로','A3 가로','시트지');

-- 최신 13종 upsert (코드와 동기화)
INSERT INTO public.signage_types (name, category, default_width_mm, default_height_mm, default_material, is_standard, sort_order, layout, notes)
VALUES
  ('X배너',        '배너',   600,  1800, 'PET',       true,  1,  '세로', '입구·등록'),
  ('I배너',        '배너',   600,  1600, 'PET',       true,  2,  '세로', '실내 안내'),
  ('가로등 배너',  '배너',   600,  1800, '현수막',    true,  3,  '세로', '외부 동선'),
  ('가로 현수막',  '현수막', 5000,  900, '현수막',    true,  4,  '가로', '메인·외벽'),
  ('세로 현수막',  '현수막',  900, 5000, '현수막',    true,  5,  '세로', '로비·천장'),
  ('통천 배너',    '현수막', 1000, 5000, '현수막',    true,  6,  '세로', '천장 대형'),
  ('포디움 타이틀','기타',    600,  200, '스티커',    true,  7,  '가로', '연단'),
  ('A4 세로',      '기타',   210,  297, '인쇄',      true,  8,  '세로', '소형 안내'),
  ('A4 가로',      '기타',   297,  210, '인쇄',      true,  9,  '가로', '소형 안내'),
  ('A3 세로',      '기타',   297,  420, '인쇄',      true, 10,  '세로', '중형 안내'),
  ('A3 가로',      '기타',   420,  297, '인쇄',      true, 11,  '가로', '중형 안내'),
  ('폼보드',       '기타',   600,  900, '폼보드 5T', true, 12,  '세로', '스탠드POP·L보드·큐방 포함'),
  ('시트지',       '기타',  1650,  920, '시트지',    true, 13,  '가로', '출입구 유리창 부착')
ON CONFLICT (name) DO UPDATE
  SET default_width_mm   = EXCLUDED.default_width_mm,
      default_height_mm  = EXCLUDED.default_height_mm,
      default_material   = EXCLUDED.default_material,
      layout             = EXCLUDED.layout,
      notes              = EXCLUDED.notes,
      updated_at         = now();
