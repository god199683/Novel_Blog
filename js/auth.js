// js/auth.js

// 페이지가 완전히 로드된 후 실행되도록 보장합니다.
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. 요소 가져오기 (ID가 HTML과 일치하는지 꼭 확인하세요!)
    const profileInput = document.getElementById('profile-image');
    const previewImg = document.getElementById('preview-img');
    const signupForm = document.getElementById('signup-form');

    // 2. 미리보기 로직 (중복 제거 버전)
    // HTML의 <label for="profile-image"> 덕분에 이미지를 클릭하면 파일 창이 자동으로 열립니다.
    // 자바스크립트에서는 파일이 "선택되었을 때"의 로직만 구현하면 됩니다.
    if (profileInput && previewImg) {
        
        // [수정] 이미지를 클릭했을 때 profileInput.click()을 호출하는 중복 코드를 제거했습니다.
        // 이 코드가 있으면 label의 기본 동작과 겹쳐서 문제를 일으킬 수 있습니다.

        // 파일이 바뀌었을 때 실행 (한 번만 선택해도 작동함)
        profileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // 이미지 파일인지 확인
                if (!file.type.startsWith('image/')) {
                    alert('이미지 파일만 선택 가능합니다.');
                    profileInput.value = ''; // 선택 초기화
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(event) {
                    previewImg.src = event.target.result; // 이미지 교체
                    console.log("미리보기 업데이트 완료");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 3. 회원가입 제출 로직 (이전과 동일)
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const nickname = document.getElementById('nickname').value;
            const profileFile = profileInput ? profileInput.files[0] : null;

            // 아이디 기반 가짜 이메일
            const fakeEmail = username + "@novel.blog";

            try {
                let avatarUrl = null;

                // 사진이 있을 경우 업로드
                if (profileFile) {
                    const fileExt = profileFile.name.split('.').pop();
                    const fileName = Date.now() + "." + fileExt;
                    const filePath = "avatars/" + fileName;

                    const { error: uploadError } = await window.supabaseClient.storage
                        .from('profile_pictures')
                        .upload(filePath, profileFile);

                    if (uploadError) throw uploadError;

                    const { data: urlData } = window.supabaseClient.storage
                        .from('profile_pictures')
                        .getPublicUrl(filePath);
                    
                    avatarUrl = urlData.publicUrl;
                }

                // Supabase 가입 실행
                const { data, error } = await window.supabaseClient.auth.signUp({
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