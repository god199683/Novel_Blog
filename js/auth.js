// js/auth.js

// 페이지가 완전히 로드된 후 실행되도록 보장합니다.
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. 요소 가져오기 (ID가 HTML과 일치하는지 꼭 확인하세요!)
    const profileInput = document.getElementById('profile-image');
    const previewImg = document.getElementById('preview-img');
    const signupForm = document.getElementById('signup-form');

    // 2. 미리보기 및 클릭 이벤트 로직
    if (profileInput && previewImg) {
        // 이미지를 클릭하면 파일 창이 뜨게 함
        previewImg.addEventListener('click', function() {
            profileInput.click();
        });

        // 파일이 선택되면 실행
        profileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    previewImg.src = event.target.result;
                    console.log("미리보기 업데이트 완료");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 3. 회원가입 제출 로직
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const nickname = document.getElementById('nickname').value;
            const profileFile = profileInput ? profileInput.files[0] : null;

            // 아이디를 이메일 형식으로 변환 (Supabase 연동용)
            const fakeEmail = username + "@novel.blog";

            try {
                let avatarUrl = null;

                // 사진이 있을 경우 업로드
                if (profileFile) {
                    const fileExt = profileFile.name.split('.').pop();
                    const fileName = Date.now() + "." + fileExt;
                    const filePath = "avatars/" + fileName;

                    const { error: uploadError } = await window.supabase.storage
                        .from('profile_pictures')
                        .upload(filePath, profileFile);

                    if (uploadError) throw uploadError;

                    const { data: urlData } = window.supabase.storage
                        .from('profile_pictures')
                        .getPublicUrl(filePath);
                    
                    avatarUrl = urlData.publicUrl;
                }

                // Supabase 가입 실행
                const { data, error } = await window.supabase.auth.signUp({
                    email: fakeEmail,
                    password: password,
                    options: {
                        data: {
                            username: username,
                            display_name: nickname,
                            avatar_url: avatarUrl
                        }
                    }
                });

                if (error) throw error;

                alert("회원가입이 완료되었습니다!");
                window.location.href = 'login.html';

            } catch (err) {
                console.error("가입 에러:", err.message);
                alert("가입 실패: " + err.message);
            }
        });
    }
});