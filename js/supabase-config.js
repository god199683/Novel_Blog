// js/supabase-config.js
const supabaseUrl = https://smmirfcmpufnhsemduoc.supabase.co
const supabaseKey = sb_publishable_9N3fMtORoQRA7nsFCOLXGw__S9IHkbs

// CDN 버전 2 기준 초기화 방식
const { createClient } = supabase;
const _supabase = createClient(supabaseUrl, supabaseKey);

// 다른 파일에서 사용할 수 있도록 전역 변수로 할당
window.supabase = _supabase;

console.log("Supabase 연결 설정 완료");