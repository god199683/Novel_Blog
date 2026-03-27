// js/auth.js

// 1. 프로필 이미지 미리보기 로직
const profileInput = document.getElementById('profile-image');
const previewImg = document.getElementById('preview-img');

if (profileInput) {
    profileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// 2. 회원가입 제출 로직
const signupForm = document.getElementById('signup-form');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const nickname = document.getElementById('nickname').value;
        const profileFile = profileInput.files[0];

        try {
            let avatarUrl = null;

            // 이미지가 선택된 경우 스토리지에 먼저 업로드
            if (profileFile) {
                const fileExt = profileFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await window.supabase.storage
                    .from('profile_pictures') // 스토리지 버킷 이름 확인!
                    .upload(filePath, profileFile);

                if (uploadError) throw uploadError;

                // 공개 URL 가져오기
                const { data: urlData } = window.supabase.storage
                    .from('profile_pictures')
                    .getPublicUrl(filePath);
                
                avatarUrl = urlData.publicUrl;
            }

            // Supabase 회원가입 실행
            const { data, error } = await window.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        display_name: nickname,
                        avatar_url: avatarUrl
                    }
                }
            });

            if (error) throw error;

            alert("가입 성공! 이메일을 확인하여 인증을 완료해주세요.");
            window.location.href = 'login.html';

        } catch (err) {
            console.error("에러 발생:", err.message);
            alert("가입 실패: " + err.message);
        }
    });
}