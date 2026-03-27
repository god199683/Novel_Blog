// js/supabase-config.js
const supabaseUrl = https://smmirfcmpufnhsemduoc.supabase.co;
const supabaseKey = sb_publishable_9N3fMtORoQRA7nsFCOLXGw__S9IHkbs;

// CDN 버전 2 기준 초기화 방식
const { createClient } = supabase;
window.supabaseClient = createClient(supabaseUrl, supabaseKey);

console.log("Supabase 클라이언트 초기화 완료");