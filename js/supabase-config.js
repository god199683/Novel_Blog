// js/supabase-config.js

// 1. Supabase 프로젝트 URL과 anon 키를 입력하세요.
const supabaseUrl = https://smmirfcmpufnhsemduoc.supabase.co
const supabaseKey = sb_publishable_9N3fMtORoQRA7nsFCOLXGw__S9IHkbs

// 2. Supabase 클라이언트 초기화
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 연결 확인용 콘솔 로그 (나중에 지우셔도 됩니다)
console.log("Supabase 연결 준비 완료!", supabase);