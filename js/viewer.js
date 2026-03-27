// js/viewer.js에 추가

const profileTrigger = document.getElementById('profile-trigger');
const dropdownMenu = document.getElementById('dropdown-menu');
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
const toggleIcon = document.getElementById('toggle-icon');
const lockScreen = document.getElementById('lock-screen');
const lockPasswordInput = document.getElementById('lock-password');
const btnUnlock = document.getElementById('btn-unlock');
const lockError = document.getElementById('lock-error');
const btnAway = document.getElementById('btn-away');

toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');

// 아이콘 방향 변경 (디테일)
    if (sidebar.classList.contains('collapsed')) {
        toggleIcon.innerText = "▶";
    } else {
        toggleIcon.innerText = "◀";
    }
});

// 1. 프로필 클릭 시 드롭다운 토글
profileTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
});
// 2. 외부 클릭 시 드롭다운 닫기
window.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
});

// 3. 자리비움 기능
btnAway.addEventListener('click', () => {
    profileInfo.classList.toggle('away');
    const isAway = profileInfo.classList.contains('away');
    btnAway.innerText = isAway ? "자리비움 해제" : "자리비움";
});

// 4. 로그아웃 (기존 로직 연결)
document.getElementById('btn-logout').onclick = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        alert("로그아웃 되었습니다.");
        location.href = "index.html";
    }
};

// 기존 loadUserContent() 함수에서 닉네임 표시 부분 확인
// document.getElementById('user-display-name').innerText = user.user_metadata.display_name;

// 1. 자리비움 클릭 시 잠금 화면 표시
btnAway.addEventListener('click', () => {
    lockScreen.style.display = 'flex';
    lockPasswordInput.value = ''; // 이전 입력값 초기화
    lockError.style.display = 'none';
    dropdownMenu.classList.remove('show'); // 드롭다운 닫기
});

// 2. 잠금 해제 버튼 클릭 시 비밀번호 검증
btnUnlock.addEventListener('click', async () => {
    const password = lockPasswordInput.value;
    
    if (!password) {
        alert("비밀번호를 입력해주세요.");
        return;
    }

    // 현재 사용자의 이메일(가상 이메일 포함) 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();

    // Supabase에 다시 로그인을 시도하여 비밀번호가 맞는지 확인
    const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
    });

    if (error) {
        // 비밀번호가 틀린 경우
        lockError.style.display = 'block';
        lockPasswordInput.value = '';
        lockPasswordInput.focus();
    } else {
        // 비밀번호가 일치하여 로그인에 다시 성공한 경우
        lockScreen.style.display = 'none';
        alert("잠금이 해제되었습니다.");
    }
});

// 엔터 키 입력 시에도 잠금 해제 작동
lockPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnUnlock.click();
});