// 로그인 상태 확인 및 UI 업데이트
async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    if (session) {
        const user = session.user;
        const nickname = user.user_metadata?.nickname || user.user_metadata?.user_id || '사용자';
        const avatarUrl = user.user_metadata?.avatar_url || '';

        const avatarHtml = avatarUrl
            ? '<img src="' + avatarUrl + '" alt="프로필" class="nav-avatar">'
            : '<svg class="nav-avatar-default" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#7a9ab5" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

        navLinks.innerHTML =
            '<li class="nav-profile-wrap">' +
                '<button class="nav-profile" id="nav-profile-btn">' +
                    avatarHtml +
                    '<span class="nav-nickname">' + nickname + '</span>' +
                    '<svg class="nav-caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' +
                '</button>' +
                '<div class="nav-dropdown" id="nav-dropdown">' +
                    '<button class="nav-dropdown-item" id="btn-away">자리비움</button>' +
                    '<button class="nav-dropdown-item" id="btn-account">계정 관리</button>' +
                    '<div class="nav-dropdown-divider"></div>' +
                    '<button class="nav-dropdown-item nav-dropdown-danger" id="btn-logout">로그아웃</button>' +
                '</div>' +
            '</li>';

        // 드롭다운 토글
        const profileBtn = document.getElementById('nav-profile-btn');
        const dropdown = document.getElementById('nav-dropdown');

        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });

        // 로그아웃
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await sb.auth.signOut();
            window.location.href = 'index.html';
        });

        // 자리비움 오버레이
        document.getElementById('btn-away').addEventListener('click', () => {
            dropdown.classList.remove('show');
            showAwayOverlay();
        });

        // 계정 관리
        document.getElementById('btn-account').addEventListener('click', () => {
            dropdown.classList.remove('show');
            showAccountModal();
        });
    }
}

checkAuth();

// ── 자리비움 오버레이 ──
function showAwayOverlay() {
    const storedPin = localStorage.getItem('away-pin') || '';
    const overlay = document.createElement('div');
    overlay.className = 'away-overlay';
    overlay.innerHTML =
        '<div class="away-message">자리비움 모드</div>' +
        '<input type="password" class="away-pin-input" placeholder="PIN" maxlength="6" autofocus>' +
        '<button class="away-confirm-btn">확인</button>' +
        (storedPin ? '' : '<div class="away-message">PIN이 설정되지 않았습니다. Enter를 누르면 돌아갑니다.</div>');
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.away-pin-input');
    const confirmBtn = overlay.querySelector('.away-confirm-btn');
    input.focus();

    function tryUnlock() {
        if (!storedPin) {
            overlay.remove(); return;
        }
        if (input.value === storedPin) {
            overlay.remove();
        } else {
            input.value = '';
            input.style.borderColor = '#dc2626';
            setTimeout(() => { input.style.borderColor = ''; }, 800);
        }
    }

    confirmBtn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
}

// ── 계정 관리 모달 (PIN 설정) ──
function showAccountModal() {
    const currentPin = localStorage.getItem('away-pin') || '';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
        '<div class="modal-dialog">' +
            '<div class="modal-title">계정 관리</div>' +
            '<label class="modal-label">자리비움 PIN (6자리 숫자)</label>' +
            '<input type="password" class="modal-input" id="pin-input" placeholder="6자리 숫자 입력" maxlength="6" value="' + currentPin + '">' +
            '<div class="modal-actions">' +
                '<button class="modal-btn modal-btn-cancel" id="pin-cancel">취소</button>' +
                '<button class="modal-btn modal-btn-confirm" id="pin-save">저장</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(overlay);

    const pinInput = overlay.querySelector('#pin-input');
    pinInput.focus();
    pinInput.addEventListener('input', () => {
        pinInput.value = pinInput.value.replace(/[^0-9]/g, '');
    });

    overlay.querySelector('#pin-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#pin-save').addEventListener('click', () => {
        const val = pinInput.value.trim();
        if (val && val.length !== 6) {
            alert('PIN은 6자리 숫자여야 합니다.');
            return;
        }
        if (val) {
            localStorage.setItem('away-pin', val);
        } else {
            localStorage.removeItem('away-pin');
        }
        overlay.remove();
    });
    pinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') overlay.querySelector('#pin-save').click();
        if (e.key === 'Escape') overlay.remove();
    });
}
