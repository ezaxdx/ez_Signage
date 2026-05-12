// seed_venues.mjs — 행사장 도면 일괄 등록
// 실행: node scripts/seed_venues.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://ujpftfiemlijfdpluyfp.supabase.co';
const env = fs.readFileSync('.env.local', 'utf8');
const SERVICE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const FLOOR_PLAN_ROOT = 'C:\\Users\\EZPMP\\Desktop\\클로드 코드 활동용\\제작물 디자인 의뢰 가이드\\참고자료\\도면';

// 행사장 메타데이터
const VENUE_META = {
  'BEXCO':          { region: '부산', venue_type: '컨벤션센터' },
  'CECO':           { region: '창원', venue_type: '컨벤션센터' },
  'COEX':           { region: '서울', venue_type: '컨벤션센터' },
  'DCC':            { region: '대전', venue_type: '컨벤션센터' },
  'DDP':            { region: '서울', venue_type: '전시장' },
  'EXCO':           { region: '대구', venue_type: '컨벤션센터' },
  'GSCO':           { region: '광양', venue_type: '컨벤션센터' },
  'GUMICO':         { region: '구미', venue_type: '컨벤션센터' },
  'HICO':           { region: '경주', venue_type: '컨벤션센터' },
  'ICC 제주':        { region: '제주', venue_type: '컨벤션센터' },
  'KINTEX':         { region: '고양', venue_type: '전시장' },
  'KSPO DOME':      { region: '서울', venue_type: '공공시설' },
  'SETEC':          { region: '서울', venue_type: '전시장' },
  'UECO':           { region: '울산', venue_type: '컨벤션센터' },
  '그랜드하얏트서울':   { region: '서울', venue_type: '호텔' },
  '김대중컨벤션센터':   { region: '광주', venue_type: '컨벤션센터' },
  '더 플라자 호텔 서울': { region: '서울', venue_type: '호텔' },
  '라한호텔  라한셀렉트': { region: '경주', venue_type: '호텔' },
  '롯데호텔 서울':     { region: '서울', venue_type: '호텔' },
  '소노캄 모음':       { region: '강원', venue_type: '호텔' },
  '송도컨벤시아':      { region: '인천', venue_type: '컨벤션센터' },
  '수원컨벤션센터':    { region: '수원', venue_type: '컨벤션센터' },
  '시그니엘 서울':     { region: '서울', venue_type: '호텔' },
  '신라호텔 서울신라호텔': { region: '서울', venue_type: '호텔' },
  '안동국제컨벤션센터':  { region: '안동', venue_type: '컨벤션센터' },
  '여수엑스포컨벤션센터': { region: '여수', venue_type: '컨벤션센터' },
  '정부세종컨벤션센터':  { region: '세종', venue_type: '컨벤션센터' },
  '제주신라호텔':      { region: '제주', venue_type: '호텔' },
  '조선팰리스 강남(그랜드인터콘티넨탈 파르나스': { region: '서울', venue_type: '호텔' },
};

// 폴더에서 첫 번째 JPG/PNG 재귀 탐색
function findFirstImage(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && /\.(jpg|jpeg|png)$/i.test(e.name)) return full;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const found = findFirstImage(path.join(dir, e.name));
      if (found) return found;
    }
  }
  return null;
}

// Storage에 이미지 업로드
async function uploadImage(localPath, storagePath) {
  const buf = fs.readFileSync(localPath);
  const mime = localPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const { error } = await supabase.storage
    .from('design-images')
    .upload(storagePath, buf, { contentType: mime, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('design-images').getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  const venueDirs = fs.readdirSync(FLOOR_PLAN_ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  console.log(`행사장 ${venueDirs.length}개 처리 시작...\n`);

  for (const dirName of venueDirs) {
    const meta = VENUE_META[dirName] || { region: null, venue_type: '기타' };
    const venueName = dirName.trim();
    const venueDir = path.join(FLOOR_PLAN_ROOT, dirName);
    const imgPath = findFirstImage(venueDir);

    process.stdout.write(`[${venueName}] `);

    // 1. venues 테이블 upsert
    const { data: venue, error: venueErr } = await supabase
      .from('venues')
      .upsert({ name: venueName, region: meta.region, venue_type: meta.venue_type }, { onConflict: 'name' })
      .select('id')
      .single();

    if (venueErr) {
      console.log(`❌ venues 삽입 실패: ${venueErr.message}`);
      continue;
    }

    // 2. 도면 이미지 업로드
    let floorPlanUrl = null;
    if (imgPath) {
      try {
        const ext = path.extname(imgPath);
        const storagePath = `floor-plans/${venue.id}/main${ext}`;
        floorPlanUrl = await uploadImage(imgPath, storagePath);

        // venues.floor_plan_url 업데이트
        await supabase.from('venues').update({ floor_plan_url: floorPlanUrl }).eq('id', venue.id);
      } catch (e) {
        console.log(`⚠️  이미지 업로드 실패: ${e.message}`);
      }
    }

    // 3. learning_jobs 생성 (이미지 있는 경우만)
    if (floorPlanUrl) {
      const { error: jobErr } = await supabase.from('learning_jobs').insert({
        job_type: 'floor_plan_analyze',
        venue_id: venue.id,
        source_url: floorPlanUrl,
        status: 'queued',
      });
      if (jobErr && !jobErr.message.includes('duplicate')) {
        console.log(`⚠️  learning_job 생성 실패: ${jobErr.message}`);
      }
    }

    const imgStatus = floorPlanUrl ? '✅ 도면 업로드됨' : '⚠️  도면 없음 (DB만 등록)';
    console.log(imgStatus);
  }

  console.log('\n완료!');

  // 최종 집계
  const { count } = await supabase.from('venues').select('*', { count: 'exact', head: true });
  const { count: jobCount } = await supabase.from('learning_jobs').select('*', { count: 'exact', head: true });
  console.log(`venues: ${count}개 / learning_jobs: ${jobCount}개`);
}

main().catch(console.error);
