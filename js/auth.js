// js/auth.js 전체 코드를 아래 내용으로 대체하세요

// 가상 도메인 설정 (아이디를 이메일처럼 변환)
const DOMAIN = "@novel.me";

// --- [추가] 프로필 사진 미리보기 로직 ---
const profileImageInput = document.getElementById('profile-image');
const profilePreview = document.getElementById('profile-preview');

if (profileImageInput && profilePreview) {
    profileImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                // 선택한 파일을 base64 문자열로 변환하여 이미지 src에 넣음
                profilePreview.src = event.target.result;
            }
            reader.readAsDataURL(file);
        }
    });
}


// --- [회원가입 로직] ---
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const nickname = document.getElementById('nickname').value;
        const password = document.getElementById('password').value;
        const profileFile = profileImageInput.files[0]; // 선택한 파일 가져오기

        // 1. 아이디를 이메일 형식으로 변환
        const fakeEmail = username + DOMAIN;

        // [참고] 실제 서비스에서는 profileFile을 Supabase Storage에 업로드하고
        // 그 URL을 아래 메타데이터에 담아야 합니다. 
        // 지금은 일단 메타데이터에 닉네임만 저장하는 기본 로직을 유지합니다.

        // 2. Supabase 회원가입 호출
        const { data, error } = await supabase.auth.signUp({
            email: fakeEmail,
            password: password,
            options: {
                data: { 
                    display_name: nickname,
                    // avatar_url: storageUrl // (나중에 구현할 이미지 URL)
                } 
            }
        });

        if (error) {
            alert("회원가입 실패: " + error.message);
        } else {
            alert("가입을 환영합니다! 로그인 해주세요.");
            location.href = "login.html";
        }
    });
}

// --- [로그인 로직] ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // 1. 아이디를 이메일 형식으로 변환
        const fakeEmail = username + DOMAIN;

        // 2. Supabase 로그인 호출
        const { data, error } = await supabase.auth.signInWithPassword({
            email: fakeEmail,
            password: password,
        });

        if (error) {
    alert("로그인 실패: 아이디 또는 비밀번호를 확인하세요.");
} else {
    alert("반갑습니다, 작가님!");
    location.href = "viewer.html"; // 로그인 후 뷰어/관리 페이지로 이동
}
    });
}