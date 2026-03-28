// 로그인 상태 확인 및 UI 업데이트
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    if (session) {
        const user = session.user;
        const nickname = user.user_metadata?.nickname || user.user_metadata?.user_id || '사용자';
        navLinks.innerHTML =
            '<li><span class="welcome-text">' + nickname + '님</span></li>' +
            '<li><a href="#" class="login-btn" id="logout-btn">로그아웃</a></li>';

        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            await sb.auth.signOut();
            location.reload();
        });
    }
}

checkAuth();
