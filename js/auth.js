// js/auth.js

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    // 1. 프로필 이미지 미리보기 및 클릭 이벤트
    const profileInput = document.getElementById('profile-image');
    const previewImg = document.getElementById('preview-img');
    const profileText = document.querySelector('.profile-hint'); // 텍스트 숨기기용

    if (profileInput && previewImg) {
        // [추가] 이미지를 클릭하면 파일 선택창이 뜨도록 설정
        previewImg.addEventListener('click', () => {
            profileInput.click();
        });

        // 파일 선택 시 미리보기 로직
        profileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // 이미지 파일인지 확인 (안전장치)
                if (!file.type.startsWith('image/')) {
                    alert('이미지 파일만 업로드 가능합니다.');
                    profileInput.value = ''; // 선택 초기화
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImg.src = event.target.result; // 이미지 변경
                    
                    // [추가] 사진 선택 시 아래 텍스트 숨기기 (깔끔하게)
                    if (profileText) profileText.style.display = 'none'; 
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 2. 회원가입 제출 로직 (기존과 동일)
    const signupForm = document.getElementById('signup-form');

   if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // [변경] 이메일 대신 아이디(username)를 가져옵니다.
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const nickname = document.getElementById('nickname').value;
        const profileFile = profileInput ? profileInput.files[0] : null;

            // 비밀번호 길이 체크 (안전장치)
            if (password.length < 6) {
                alert('비밀번호는 6자리 이상이어야 합니다.');
                return;
            }

            // 가입 중 버튼 비활성화 (중복 클릭 방지)
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '가입 중...';
            }

      const fakeEmail = `${username}@novel.blog`;

        try {
            let avatarUrl = null;

                // 이미지가 선택된 경우 스토리지에 먼저 업로드
                if (profileFile) {
                    const fileExt = profileFile.name.split('.').pop();
                    // 유니크한 파일명 생성 (에러 방지)
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = `avatars/${fileName}`;

                    // Supabase Storage 업로드 ('profile_pictures' Public 버킷 필수)
                    const { error: uploadError } = await window.supabase.storage
                        .from('profile_pictures')
                        .upload(filePath, profileFile);

                    if (uploadError)

// Supabase 회원가입 실행
            const { data, error } = await window.supabase.auth.signUp({
                email: fakeEmail, // 변환된 가짜 이메일 사용
                password: password,
                options: {
                    data: {
                        username: username, // 실제 아이디 저장
                        display_name: nickname,
                        avatar_url: avatarUrl
                    }
                }
            });

            if (error) throw error;

            alert("회원가입이 완료되었습니다!");
            window.location.href = 'login.html';

        } catch (err) {
            console.error("에러 발생:", err.message);
            alert("가입 실패: " + err.message);
        }
    });
}