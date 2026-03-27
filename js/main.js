// Supabase 라이브러리 로드 (CDN 방식)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://smmirfcmpufnhsemduoc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbWlyZmNtcHVmbmhzZW1kdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU1MzEsImV4cCI6MjA5MDE5MTUzMX0.fYe_LLqL-FxYyxexY3inl1rU_au3v8ffeVGt-3iG5lM

'
const supabase = createClient(supabaseUrl, supabaseKey)

// 연결 확인용 테스트
console.log("Supabase connected!");