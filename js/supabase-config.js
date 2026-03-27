// js/supabase-config.js
const supabaseUrl = 'https://smmirfcmpufnhsemduoc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbWlyZmNtcHVmbmhzZW1kdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU1MzEsImV4cCI6MjA5MDE5MTUzMX0.fYe_LLqL-FxYyxexY3inl1rU_au3v8ffeVGt-3iG5lM'; // <--- 이 부분이 엄청 길어도 정상입니다!

const { createClient } = supabase;
window.supabaseClient = createClient(supabaseUrl, supabaseKey);