// js/auth.js

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {

    // 1. 프로필 이미지 미리보기 및 클릭 이벤트
   const profileInput = document.getElementById('profile-image'); // 숨겨진 input
    const previewImg = document.getElementById('preview-img');     // 보여지는 이미지
    const signupForm = document.getElementById('signup-form');

if (profileInput && previewImg) {
        
        // A. 이미지를 클릭하면 파일 선택창이 뜨도록 연결
        previewImg.addEventListener('click', () => {
            profileInput.click();
        });

        // B. 파일이 선택되면 이미지를 읽어서 프리뷰에 표시
        profileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            
            if (file) {
                // 이미지 파일인지 확인
                if (!file.type.startsWith('image/')) {
                    alert('이미지 파일만 선택 가능합니다.');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    // 선택한 이미지로 교체
                    previewImg.src = event.target.result;
                    
                    // 안내 문구 숨기기 (선택 사항)
                    const hint = document.querySelector('.profile-hint');
                    if (hint) hint.style.opacity = '0.5';
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

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const nickname = document.getElementById('nickname').value;
            const profileFile = profileInput.files[0];

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

// 아이디를 가짜 이메일 형식으로 변환 (Supabase 연동용)
            const fakeEmail = `${username}@novel.blog`;

            try {
                let avatarUrl = null;

                // 이미지가 있다면 스토리지 업로드
                if (profileFile) {
                    const fileExt = profileFile.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    const filePath = `avatars/${fileName}`;

                    const { error: uploadError } = await window.supabase.storage
                        .from('profile_pictures')
                        .upload(filePath, profileFile);

                    if (uploadError) throw uploadError;

                    const { data: urlData } = window.supabase.storage
                        .from('profile_pictures')
                        .getPublicUrl(filePath);
                    
                    avatarUrl = urlData.publicUrl;
                }

                // 가입 실행
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

                alert("회원가입 성공!");
                window.location.href = 'login.html';

            } catch (err) {
                alert("실패: " + err.message);
            }
        });
    }
});