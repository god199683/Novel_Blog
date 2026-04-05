// ── 사이드바 트리 (무한 계층, 드래그앤드롭, 도구상자) ──

function initSidebar() {
    var STORAGE_KEY = 'sidebar-tree';
    var DEFAULT_CATEGORY = { id: '_all', type: 'category', name: '전체', open: true, children: [], fixed: true };
    var selectMode = false;
    var selectedIds = {};

    function loadTree() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            if (!data.find(function (n) { return n.id === '_all'; })) {
                data.unshift(JSON.parse(JSON.stringify(DEFAULT_CATEGORY)));
            }
            return data;
        } catch (e) { return [JSON.parse(JSON.stringify(DEFAULT_CATEGORY))]; }
    }
    function saveTree(tree) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tree)); saveTreeToSupabase(tree); }

    // Supabase 동기화 (novels 테이블의 특수 레코드에 저장)
    var TREE_RECORD_TITLE = '__sidebar_tree__';
    var _saveTimer = null;
    async function _doSaveTreeToSupabase(treeData) {
        if (!window.sb) return;
        try {
            var sess = await sb.auth.getSession();
            var uid = sess.data.session ? sess.data.session.user.id : null;
            if (!uid) return;
            var treeJson = JSON.stringify(treeData);
            var existing = await sb.from('novels').select('id').eq('user_id', uid).eq('title', TREE_RECORD_TITLE).single();
            if (existing.data) {
                await sb.from('novels').update({ content: treeJson }).eq('id', existing.data.id);
            } else {
                await sb.from('novels').insert([{
                    user_id: uid,
                    title: TREE_RECORD_TITLE,
                    content: treeJson,
                    status: 'draft',
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (e) { console.warn('saveTree error:', e); }
    }
    function saveTreeToSupabase(treeData) {
        clearTimeout(_saveTimer);
        _saveTimer = setTimeout(function () { _doSaveTreeToSupabase(treeData); }, 3000);
    }

    async function loadTreeFromSupabase() {
        if (!window.sb) return null;
        try {
            var sess = await sb.auth.getSession();
            var uid = sess.data.session ? sess.data.session.user.id : null;
            if (!uid) return null;
            var res = await sb.from('novels').select('content').eq('user_id', uid).eq('title', TREE_RECORD_TITLE).single();
            if (!res.error && res.data && res.data.content) {
                return JSON.parse(res.data.content);
            }
        } catch (e) { /* 무시 */ }
        return null;
    }

    async function syncTreeFromNovels() {
        if (!window.sb) return null;
        try {
            var sess = await sb.auth.getSession();
            var uid = sess.data.session ? sess.data.session.user.id : null;
            if (!uid) return null;
            var res = await sb.from('novels').select('id, title, subtitle').eq('user_id', uid).neq('title', TREE_RECORD_TITLE).order('created_at', { ascending: true });
            if (!res.error && res.data && res.data.length > 0) {
                var allCat = JSON.parse(JSON.stringify(DEFAULT_CATEGORY));
                res.data.forEach(function (n) {
                    var node = { id: 'novel_' + n.id, type: 'memo', name: n.title || '제목 없음' };
                    if (n.subtitle) node.subtitle = n.subtitle;
                    allCat.children.push(node);
                });
                return [allCat];
            }
        } catch (e) { /* 무시 */ }
        return null;
    }
    function genId() { return '_' + Math.random().toString(36).substr(2, 9); }

    // ── DOM ──
    var sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.innerHTML =
        '<div class="sidebar-header">' +
            '<span class="sidebar-title">Category</span>' +
            '<div class="sidebar-header-actions">' +
                '<button class="sidebar-hdr-btn" id="btn-toolbox" title="도구 상자">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>' +
                '</button>' +
                '<button class="sidebar-hdr-btn" id="btn-add-list" title="항목 추가">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' +
                '</button>' +
            '</div>' +
        '</div>' +
        '<div class="toolbox-panel" id="toolbox-panel"></div>' +
        '<div class="sidebar-tree" id="sidebar-tree"></div>';

    var toggle = document.createElement('button');
    toggle.className = 'sidebar-toggle';
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';

    document.body.prepend(toggle);
    document.body.prepend(sidebar);
    document.body.classList.add('has-sidebar');

    var saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') { sidebar.classList.add('collapsed'); document.body.classList.add('sidebar-closed'); }
    toggle.addEventListener('click', function () {
        sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-closed');
        localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
    });

    var treeContainer = sidebar.querySelector('#sidebar-tree');
    var tree = loadTree();

    // ── 도구상자 ──
    var toolboxPanel = sidebar.querySelector('#toolbox-panel');
    var toolboxBtn = sidebar.querySelector('#btn-toolbox');

    var TOOL_ICONS = {
        select: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>',
        selectAll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>',
        deselectAll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
        deleteAll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        deleteSelected: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
        sortAsc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/></svg>',
        sortDesc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="4" x2="12" y2="20"/><polyline points="18 14 12 20 6 14"/></svg>'
    };

    toolboxPanel.innerHTML =
        '<button class="toolbox-btn" id="tool-select" title="선택 모드">' + TOOL_ICONS.select + '</button>' +
        '<button class="toolbox-btn" id="tool-select-all" title="전체 선택">' + TOOL_ICONS.selectAll + '</button>' +
        '<button class="toolbox-btn" id="tool-deselect" title="선택 해제">' + TOOL_ICONS.deselectAll + '</button>' +
        '<button class="toolbox-btn" id="tool-delete-all" title="전체 삭제">' + TOOL_ICONS.deleteAll + '</button>' +
        '<button class="toolbox-btn" id="tool-delete-sel" title="선택 삭제">' + TOOL_ICONS.deleteSelected + '</button>' +
        '<button class="toolbox-btn" id="tool-sort-asc" title="오름차순">' + TOOL_ICONS.sortAsc + '</button>' +
        '<button class="toolbox-btn" id="tool-sort-desc" title="내림차순">' + TOOL_ICONS.sortDesc + '</button>';

    // 도구상자 토글 (다시 클릭해야 닫힘)
    toolboxBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = toolboxPanel.classList.toggle('show');
        toolboxBtn.classList.toggle('active', isOpen);
        if (!isOpen) {
            selectMode = false;
            selectedIds = {};
            toolboxPanel.querySelector('#tool-select').classList.remove('active');
            renderTree();
        }
    });

    // 선택 모드
    toolboxPanel.querySelector('#tool-select').addEventListener('click', function () {
        selectMode = !selectMode;
        this.classList.toggle('active', selectMode);
        if (!selectMode) selectedIds = {};
        renderTree();
    });

    // 전체 선택
    toolboxPanel.querySelector('#tool-select-all').addEventListener('click', function () {
        selectMode = true;
        toolboxPanel.querySelector('#tool-select').classList.add('active');
        selectedIds = {};
        collectNonFixedIds(tree, selectedIds);
        renderTree();
    });

    // 선택 해제
    toolboxPanel.querySelector('#tool-deselect').addEventListener('click', function () {
        selectedIds = {};
        renderTree();
    });

    // 전체 삭제 (고정 항목 제외, Supabase 동기화)
    toolboxPanel.querySelector('#tool-delete-all').addEventListener('click', async function () {
        if (!confirm('기본 카테고리를 제외한 모든 항목을 삭제하시겠습니까?')) return;
        var novelIds = [];
        tree.forEach(function (n) { novelIds = novelIds.concat(collectNovelIds(n)); });
        deleteNonFixed(tree);
        selectedIds = {};
        renderTree();
        if (novelIds.length > 0 && window.sb) {
            for (var i = 0; i < novelIds.length; i++) { await sb.from('novels').delete().eq('id', novelIds[i]); }
            window.dispatchEvent(new CustomEvent('novels-changed'));
        }
    });

    // 선택 항목 삭제 (Supabase 동기화)
    toolboxPanel.querySelector('#tool-delete-sel').addEventListener('click', async function () {
        var ids = Object.keys(selectedIds);
        if (ids.length === 0) return;
        if (!confirm(ids.length + '개 항목을 삭제하시겠습니까?')) return;
        var novelIds = [];
        ids.forEach(function (id) {
            var node = findNodeById(tree, id);
            if (node) novelIds = novelIds.concat(collectNovelIds(node));
            removeNode(tree, id);
        });
        selectedIds = {};
        renderTree();
        if (novelIds.length > 0 && window.sb) {
            for (var i = 0; i < novelIds.length; i++) { await sb.from('novels').delete().eq('id', novelIds[i]); }
            window.dispatchEvent(new CustomEvent('novels-changed'));
        }
    });

    // 오름차순 정렬
    toolboxPanel.querySelector('#tool-sort-asc').addEventListener('click', function () {
        sortTree(tree, 1);
        renderTree();
    });

    // 내림차순 정렬
    toolboxPanel.querySelector('#tool-sort-desc').addEventListener('click', function () {
        sortTree(tree, -1);
        renderTree();
    });

    function selectAllChildren(nodes, select) {
        nodes.forEach(function (n) {
            if (!n.fixed) {
                if (select) selectedIds[n.id] = true;
                else delete selectedIds[n.id];
            }
            if (n.children) selectAllChildren(n.children, select);
        });
    }

    function collectNonFixedIds(nodes, map) {
        nodes.forEach(function (n) {
            if (!n.fixed) map[n.id] = true;
            if (n.children) collectNonFixedIds(n.children, map);
        });
    }

    function deleteNonFixed(nodes) {
        for (var i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].fixed) {
                if (nodes[i].children) deleteNonFixed(nodes[i].children);
            } else {
                nodes.splice(i, 1);
            }
        }
    }

    function sortTree(nodes, dir) {
        // 고정 항목은 제자리, 나머지만 정렬
        var fixedIndices = [];
        var movable = [];
        nodes.forEach(function (n, i) {
            if (n.fixed) fixedIndices.push(i);
            else movable.push(n);
        });
        movable.sort(function (a, b) { return a.name.localeCompare(b.name) * dir; });
        var mi = 0;
        for (var i = 0; i < nodes.length; i++) {
            if (fixedIndices.indexOf(i) === -1) {
                nodes[i] = movable[mi++];
            }
        }
        nodes.forEach(function (n) {
            if (n.children && n.children.length > 0) sortTree(n.children, dir);
        });
    }

    // ── 목록 버튼 (그룹 드롭다운) ──
    sidebar.querySelector('#btn-add-list').addEventListener('click', function (e) {
        e.stopPropagation();
        var existing = document.querySelector('.tree-add-menu');
        if (existing) { closeAddMenu(); return; }
        var menu = document.createElement('div');
        menu.className = 'tree-add-menu tree-grouped-menu';
        menu.innerHTML =
            '<div class="menu-group-label">소설 관리</div>' +
            '<button data-action="manage-page">소설 관리 페이지</button>' +
            '<div class="menu-group-divider"></div>' +
            '<div class="menu-group-label">추가</div>' +
            '<button data-action="add-category">카테고리 추가</button>' +
            '<button data-action="add-folder">폴더 추가</button>' +
            '<div class="menu-group-divider"></div>' +
            '<div class="menu-group-label">내보내기 및 불러오기</div>' +
            '<button data-action="export-all">전체 내보내기</button>' +
            '<button data-action="export-selected">선택 사항 내보내기</button>' +
            '<button data-action="import">불러오기</button>';
        var rect = e.target.closest('.sidebar-hdr-btn').getBoundingClientRect();
        menu.style.top = rect.bottom + 4 + 'px';
        menu.style.left = rect.left + 'px';
        menu.addEventListener('click', function (ev) {
            var action = ev.target.dataset.action;
            if (!action) return;
            if (action === 'add-category') {
                closeAddMenu();
                showNamePrompt('카테고리 이름', function (name) {
                    tree.push({ id: genId(), type: 'category', name: name, open: true, children: [] });
                    renderTree();
                });
            } else if (action === 'add-folder') {
                closeAddMenu();
                showFolderAddDialog(function (name, parentId) {
                    var newFolder = { id: genId(), type: 'folder', name: name, open: true, children: [] };
                    if (parentId) {
                        var parent = findNodeById(tree, parentId);
                        if (parent) { if (!parent.children) parent.children = []; parent.children.push(newFolder); parent.open = true; }
                        else tree.push(newFolder);
                    } else {
                        tree.push(newFolder);
                    }
                    renderTree();
                });
            } else if (action === 'export-all') {
                closeAddMenu();
                var allNovelIds = [];
                function gatherAll(nodes) { nodes.forEach(function (n) { if (n.id && n.id.indexOf('novel_') === 0) allNovelIds.push(n.id.replace('novel_', '')); if (n.children) gatherAll(n.children); }); }
                gatherAll(tree);
                showExportFormatDialog(allNovelIds);
            } else if (action === 'export-selected') {
                var ids = Object.keys(selectedIds);
                if (ids.length === 0) { alert('선택된 항목이 없습니다.'); return; }
                closeAddMenu();
                var selNovelIds = [];
                ids.forEach(function (id) { var n = findNodeById(tree, id); if (n) selNovelIds = selNovelIds.concat(collectNovelIds(n)); });
                showExportFormatDialog(selNovelIds);
            } else if (action === 'import') {
                closeAddMenu();
                var input = document.createElement('input'); input.type = 'file'; input.accept = '.txt,.doc,.docx,.html,.htm';
                input.addEventListener('change', function () {
                    var file = input.files[0]; if (!file) return;
                    importNovelFile(file);
                });
                input.click();
            } else if (action === 'manage-page') {
                closeAddMenu();
                window.location.href = 'manage.html';
            } else {
                closeAddMenu();
            }
        });
        document.body.appendChild(menu);
        setTimeout(function () { document.addEventListener('click', closeAddMenu, { once: true }); }, 0);
    });

    function extractNodes(nodes, ids) {
        var result = [];
        nodes.forEach(function (n) {
            if (ids.indexOf(n.id) !== -1) { result.push(JSON.parse(JSON.stringify(n))); }
            else if (n.children) {
                var childResult = extractNodes(n.children, ids);
                childResult.forEach(function (c) { result.push(c); });
            }
        });
        return result;
    }

    // ── 아이콘 ──
    var ICONS = {
        folder: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
        memo: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        chevron: '<svg class="tree-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
    };

    // ── 렌더링 ──
    function renderTree(skipSave) {
        treeContainer.innerHTML = '';
        renderNodes(tree, treeContainer, 0);
        if (!skipSave) saveTree(tree);
    }

    function renderNodes(nodes, parent, depth) {
        nodes.forEach(function (node) {
            var li = document.createElement('div');
            li.className = 'tree-item';
            li.dataset.id = node.id;
            li.dataset.type = node.type;
            if (!node.fixed) li.draggable = true;

            var hasChildren = node.children && node.children.length > 0;
            var isContainer = node.type === 'category' || node.type === 'folder';
            var isOpen = node.open !== false;

            var guides = '';
            for (var g = 0; g < depth; g++) guides += '<span class="tree-guide"></span>';

            var chevronHtml = isContainer
                ? '<span class="tree-toggle' + (isOpen ? ' open' : '') + '">' + ICONS.chevron + '</span>'
                : '<span class="tree-toggle-placeholder"></span>';

            var iconHtml = node.type !== 'category' ? '<span class="tree-icon">' + ICONS[node.type] + '</span>' : '';

            // 체크박스 (선택 모드일 때, 고정 아닌 항목만)
            var checkboxHtml = '';
            if (selectMode && !node.fixed) {
                checkboxHtml = '<input type="checkbox" class="tree-checkbox" ' + (selectedIds[node.id] ? 'checked' : '') + '>';
            }

            var row = document.createElement('div');
            row.className = 'tree-row';
            row.innerHTML =
                guides + chevronHtml + checkboxHtml + iconHtml +
                '<span class="tree-label' + (node.type === 'category' ? ' tree-label-category' : '') + '">' + escapeHtml(node.name) +
                    (node.subtitle ? '<span class="tree-subtitle">' + escapeHtml(node.subtitle) + '</span>' : '') +
                '</span>' +
                '<span class="tree-actions">' +
                    (isContainer ? '<button class="tree-btn tree-btn-add" title="하위 추가">+</button>' : '') +
                    (!node.fixed ? '<button class="tree-btn tree-btn-del" title="삭제">&times;</button>' : '') +
                '</span>';

            li.appendChild(row);

            // 체크박스 이벤트 (상위 선택 시 하위도 모두 선택/해제)
            var cb = row.querySelector('.tree-checkbox');
            if (cb) {
                cb.addEventListener('change', function (e) {
                    e.stopPropagation();
                    if (cb.checked) {
                        selectedIds[node.id] = true;
                        if (node.children) selectAllChildren(node.children, true);
                    } else {
                        delete selectedIds[node.id];
                        if (node.children) selectAllChildren(node.children, false);
                    }
                    renderTree(true);
                });
            }

            var toggleEl = row.querySelector('.tree-toggle');
            if (toggleEl) {
                toggleEl.addEventListener('click', function (e) { e.stopPropagation(); node.open = !isOpen; renderTree(true); });
            }

            // 메모(소설) 클릭 시 뷰어로 이동 또는 콜백 호출
            row.addEventListener('click', function (e) {
                if (e.target.closest('.tree-btn') || e.target.closest('.tree-toggle') || e.target.closest('.tree-checkbox')) return;
                if (node.type === 'memo') {
                    document.querySelectorAll('.tree-row.selected').forEach(function (r) { r.classList.remove('selected'); });
                    row.classList.add('selected');
                    if (window.sidebarTree && window.sidebarTree.onNodeClick) {
                        window.sidebarTree.onNodeClick(node);
                    } else if (node.id && node.id.indexOf('novel_') === 0) {
                        // 뷰어 페이지가 아닌 경우 뷰어로 이동
                        var nid = node.id.replace('novel_', '');
                        window.location.href = 'viewer?novel=' + nid;
                    }
                }
            });

            var labelEl = row.querySelector('.tree-label');
            if (!node.fixed) {
                labelEl.addEventListener('dblclick', function (e) { e.stopPropagation(); startRename(node, labelEl); });
            }

            var addBtn = row.querySelector('.tree-btn-add');
            if (addBtn) {
                addBtn.addEventListener('click', function (e) { e.stopPropagation(); showAddMenu(node, li); });
            }

            var delBtn = row.querySelector('.tree-btn-del');
            if (delBtn) {
                delBtn.addEventListener('click', async function (e) {
                    e.stopPropagation();
                    if (confirm('"' + node.name + '" 삭제?')) {
                        // 소설 노드면 Supabase에서도 삭제
                        await deleteNodeWithSupabase(node);
                        removeNode(tree, node.id); delete selectedIds[node.id]; renderTree();
                        window.dispatchEvent(new CustomEvent('novels-changed'));
                    }
                });
            }

            if (!node.fixed) setupDragDrop(li, node, row);
            setupDropTarget(li, node, row);

            parent.appendChild(li);

            if (isContainer && hasChildren && isOpen) {
                var cc = document.createElement('div');
                cc.className = 'tree-children';
                li.appendChild(cc);
                renderNodes(node.children, cc, depth + 1);
            }
        });
    }

    // ── 드래그앤드롭 ──
    var dragNode = null;
    function setupDragDrop(li, node) {
        li.addEventListener('dragstart', function (e) {
            e.stopPropagation(); dragNode = node; li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', node.id);
        });
        li.addEventListener('dragend', function () { li.classList.remove('dragging'); clearDrop(); dragNode = null; });
    }
    function setupDropTarget(li, node, row) {
        row.addEventListener('dragover', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (!dragNode || dragNode.id === node.id || isDescendant(dragNode, node.id)) return;
            // 카테고리는 다른 카테고리 안으로 들어갈 수 없음
            if (dragNode.type === 'category' && (node.type === 'category' || node.type === 'folder')) {
                clearDrop();
                var rect2 = row.getBoundingClientRect(), y2 = e.clientY - rect2.top, zone2 = rect2.height / 2;
                if (y2 < zone2) row.classList.add('drop-before');
                else row.classList.add('drop-after');
                return;
            }
            clearDrop();
            var rect = row.getBoundingClientRect(), y = e.clientY - rect.top, zone = rect.height / 3;
            if (node.fixed) { row.classList.add('drop-inside'); }
            else if (y < zone) row.classList.add('drop-before');
            else if (y > zone * 2) row.classList.add('drop-after');
            else if (node.type === 'category' || node.type === 'folder') row.classList.add('drop-inside');
            else row.classList.add('drop-after');
        });
        row.addEventListener('dragleave', function () { row.classList.remove('drop-before', 'drop-after', 'drop-inside'); });
        row.addEventListener('drop', function (e) {
            e.preventDefault(); e.stopPropagation();
            if (!dragNode || dragNode.id === node.id || isDescendant(dragNode, node.id)) return;
            var rect = row.getBoundingClientRect(), y = e.clientY - rect.top, zone = rect.height / 3;
            removeNode(tree, dragNode.id);
            // 카테고리는 다른 카테고리/폴더 안으로 들어갈 수 없음
            if (dragNode.type === 'category' && (node.type === 'category' || node.type === 'folder')) {
                var zone2 = rect.height / 2;
                if (y < zone2) insertBefore(tree, dragNode, node.id);
                else insertAfter(tree, dragNode, node.id);
                clearDrop(); renderTree(); return;
            }
            if (node.fixed) { if (!node.children) node.children = []; node.children.push(dragNode); node.open = true; }
            else if (y < zone) insertBefore(tree, dragNode, node.id);
            else if (y > zone * 2) insertAfter(tree, dragNode, node.id);
            else if (node.type === 'category' || node.type === 'folder') { if (!node.children) node.children = []; node.children.push(dragNode); node.open = true; }
            else insertAfter(tree, dragNode, node.id);
            clearDrop(); renderTree();
        });
    }
    function clearDrop() {
        treeContainer.querySelectorAll('.drop-before,.drop-after,.drop-inside').forEach(function (el) {
            el.classList.remove('drop-before', 'drop-after', 'drop-inside');
        });
    }

    // ── 유틸 ──
    function findParentList(nodes, id) {
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) return { list: nodes, index: i };
            if (nodes[i].children) { var r = findParentList(nodes[i].children, id); if (r) return r; }
        }
        return null;
    }
    function removeNode(nodes, id) {
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
            if (nodes[i].children && removeNode(nodes[i].children, id)) return true;
        }
        return false;
    }
    function insertBefore(nodes, n, id) { var f = findParentList(nodes, id); if (f) f.list.splice(f.index, 0, n); }
    function insertAfter(nodes, n, id) { var f = findParentList(nodes, id); if (f) f.list.splice(f.index + 1, 0, n); }
    function isDescendant(node, id) {
        if (!node.children) return false;
        for (var i = 0; i < node.children.length; i++) {
            if (node.children[i].id === id || isDescendant(node.children[i], id)) return true;
        }
        return false;
    }

    function startRename(node, labelEl) {
        var input = document.createElement('input');
        input.type = 'text'; input.className = 'tree-rename-input'; input.value = node.name;
        labelEl.innerHTML = ''; labelEl.appendChild(input); input.focus(); input.select();
        function finish() { var v = input.value.trim(); if (v) node.name = v; renderTree(); }
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); finish(); } if (e.key === 'Escape') renderTree(true); });
    }

    function showAddMenu(parentNode, anchorEl) {
        closeAddMenu();
        var menu = document.createElement('div');
        menu.className = 'tree-add-menu';
        menu.innerHTML = '<button data-type="folder">폴더 추가</button><button data-type="memo">메모 추가</button>';
        var rect = anchorEl.querySelector('.tree-btn-add').getBoundingClientRect();
        menu.style.top = rect.bottom + 4 + 'px'; menu.style.left = rect.left + 'px';
        menu.addEventListener('click', function (e) {
            var t = e.target.dataset.type; if (!t) return;
            if (!parentNode.children) parentNode.children = [];
            var names = { category: '새 분류', folder: '새 폴더', memo: '새 메모' };
            parentNode.children.push({ id: genId(), type: t, name: names[t], open: true, children: t !== 'memo' ? [] : undefined });
            parentNode.open = true; closeAddMenu(); renderTree();
        });
        document.body.appendChild(menu);
        setTimeout(function () { document.addEventListener('click', closeAddMenu, { once: true }); }, 0);
    }

    function closeAddMenu() { var m = document.querySelector('.tree-add-menu'); if (m) m.remove(); }
    function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function findNodeById(nodes, id) {
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) return nodes[i];
            if (nodes[i].children) { var r = findNodeById(nodes[i].children, id); if (r) return r; }
        }
        return null;
    }

    // ── Supabase 삭제 헬퍼 ──
    function collectNovelIds(node) {
        var ids = [];
        if (node.id && node.id.indexOf('novel_') === 0) {
            ids.push(node.id.replace('novel_', ''));
        }
        if (node.children) {
            node.children.forEach(function (c) { ids = ids.concat(collectNovelIds(c)); });
        }
        return ids;
    }

    async function deleteNodeWithSupabase(node) {
        var ids = collectNovelIds(node);
        if (ids.length > 0 && window.sb) {
            for (var i = 0; i < ids.length; i++) {
                await sb.from('novels').delete().eq('id', ids[i]);
            }
        }
    }

    function stripHtml(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html || '';
        return tmp.textContent || tmp.innerText || '';
    }

    // ── 내보내기 형식 선택 모달 ──
    function showExportFormatDialog(novelIds) {
        if (!novelIds.length) { alert('내보낼 소설이 없습니다.'); return; }
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML =
            '<div class="modal-dialog">' +
                '<div class="modal-title">내보내기 형식 선택</div>' +
                '<div class="modal-novel-list">' +
                    '<button class="modal-novel-item" data-format="txt">TXT (텍스트)</button>' +
                    '<button class="modal-novel-item" data-format="pdf">PDF</button>' +
                    '<button class="modal-novel-item" data-format="word">Word (.docx)</button>' +
                '</div>' +
                '<div class="modal-actions"><button class="modal-btn modal-btn-cancel">취소</button></div>' +
            '</div>';
        document.body.appendChild(overlay);
        function close() { overlay.remove(); }
        overlay.querySelector('.modal-btn-cancel').addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        overlay.querySelector('.modal-novel-list').addEventListener('click', function (e) {
            var btn = e.target.closest('[data-format]');
            if (!btn) return;
            close();
            exportNovels(novelIds, btn.dataset.format);
        });
    }

    // ── docx 라이브러리 동적 로드 ──
    function loadDocxLib() {
        return new Promise(function (resolve, reject) {
            if (window.docx) { resolve(); return; }
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/docx@8/build/index.umd.js';
            s.onload = resolve;
            s.onerror = function () { reject(new Error('docx 라이브러리 로드 실패')); };
            document.head.appendChild(s);
        });
    }

    function rgbToHex(rgb) {
        if (!rgb) return undefined;
        if (rgb.charAt(0) === '#') return rgb.replace('#', '');
        var match = rgb.match(/\d+/g);
        if (!match || match.length < 3) return undefined;
        return ((1 << 24) + (parseInt(match[0]) << 16) + (parseInt(match[1]) << 8) + parseInt(match[2])).toString(16).slice(1);
    }

    function htmlToDocxParagraphs(container) {
        var paragraphs = [];

        function extractRuns(node, inherited) {
            var runs = [];
            inherited = inherited || {};
            for (var i = 0; i < node.childNodes.length; i++) {
                var child = node.childNodes[i];
                if (child.nodeType === 3) {
                    var text = child.textContent;
                    if (text) {
                        var opts = { text: text, font: 'Malgun Gothic', size: 22 };
                        if (inherited.bold) opts.bold = true;
                        if (inherited.italic) opts.italics = true;
                        if (inherited.underline) opts.underline = { type: docx.UnderlineType.SINGLE };
                        if (inherited.color) opts.color = inherited.color;
                        runs.push(new docx.TextRun(opts));
                    }
                } else if (child.nodeType === 1) {
                    var tag = child.tagName.toLowerCase();
                    var styles = Object.assign({}, inherited);
                    if (tag === 'b' || tag === 'strong') styles.bold = true;
                    if (tag === 'i' || tag === 'em') styles.italic = true;
                    if (tag === 'u') styles.underline = true;
                    if (child.style && child.style.color) styles.color = rgbToHex(child.style.color);
                    if (tag === 'font' && child.getAttribute('color')) styles.color = child.getAttribute('color').replace('#', '');
                    if (tag === 'br') {
                        runs.push(new docx.TextRun({ break: 1 }));
                    } else {
                        runs = runs.concat(extractRuns(child, styles));
                    }
                }
            }
            return runs;
        }

        function getAlignment(el) {
            var align = el.style && el.style.textAlign;
            if (align === 'center') return docx.AlignmentType.CENTER;
            if (align === 'right') return docx.AlignmentType.RIGHT;
            if (align === 'justify') return docx.AlignmentType.JUSTIFIED;
            return undefined;
        }

        var els = container.children;
        if (els.length === 0 && container.textContent) {
            container.textContent.split('\n').forEach(function (line) {
                paragraphs.push(new docx.Paragraph({
                    children: [new docx.TextRun({ text: line, font: 'Malgun Gothic', size: 22 })],
                    spacing: { line: 360 }
                }));
            });
            return paragraphs;
        }

        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var tag = el.tagName.toLowerCase();
            if (tag === 'hr') {
                paragraphs.push(new docx.Paragraph({
                    border: { bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
                    spacing: { before: 200, after: 200 }
                }));
                continue;
            }
            var runs = extractRuns(el, {});
            if (runs.length === 0) runs.push(new docx.TextRun({ text: el.textContent || '', font: 'Malgun Gothic', size: 22 }));
            var paraOpts = { children: runs, spacing: { line: 360 } };
            var alignment = getAlignment(el);
            if (alignment) paraOpts.alignment = alignment;
            if (tag === 'h1') paraOpts.heading = docx.HeadingLevel.HEADING_1;
            if (tag === 'h2') paraOpts.heading = docx.HeadingLevel.HEADING_2;
            if (tag === 'h3') paraOpts.heading = docx.HeadingLevel.HEADING_3;
            if (tag === 'blockquote') paraOpts.indent = { left: 720 };
            paragraphs.push(new docx.Paragraph(paraOpts));
        }
        return paragraphs;
    }

    // ── 소설 내보내기 (TXT / PDF / Word) ──
    async function exportNovels(novelIds, format) {
        if (!novelIds.length || !window.sb) { alert('내보낼 소설이 없습니다.'); return; }
        var result = await sb.from('novels').select('*').in('id', novelIds);
        if (result.error || !result.data || !result.data.length) { alert('소설을 불러올 수 없습니다.'); return; }
        var data = result.data;

        if (format === 'txt') {
            var output = '';
            data.forEach(function (n, i) {
                if (i > 0) output += '\n==============\n';
                output += '제목 : ' + (n.title || '') + '\n';
                if (n.subtitle) output += '부제목 : ' + n.subtitle + '\n';
                output += '\n';
                output += stripHtml(n.content);
            });
            var blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'novels-export.txt'; a.click();
        } else if (format === 'pdf') {
            // PDF: 새 창에서 HTML 렌더링 후 인쇄
            var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>소설 내보내기</title>' +
                '<style>body{font-family:"Malgun Gothic","맑은 고딕",sans-serif;padding:40px;color:#2c3e50;line-height:1.8;}' +
                '.novel{margin-bottom:3em;page-break-after:always;}' +
                '.novel:last-child{page-break-after:auto;}' +
                'h1{font-size:1.5em;border-bottom:2px solid #3a9ad9;padding-bottom:8px;margin-bottom:1em;}' +
                '@media print{body{padding:20px;}}</style></head><body>';
            data.forEach(function (n) {
                html += '<div class="novel"><h1>' + escapeHtml(n.title || '제목 없음') + '</h1>';
                html += '<div>' + (n.content || '') + '</div></div>';
            });
            html += '<script>window.onload=function(){window.print();}<\/script></body></html>';
            var w = window.open('', '_blank');
            w.document.write(html);
            w.document.close();
        } else if (format === 'word') {
            // Word: docx 라이브러리로 실제 .docx 생성
            try {
                await loadDocxLib();
            } catch (e) { alert('Word 내보내기 라이브러리를 불러올 수 없습니다.'); return; }

            var children = [];
            data.forEach(function (n, idx) {
                if (idx > 0) {
                    children.push(new docx.Paragraph({ children: [new docx.TextRun('')], pageBreakBefore: true }));
                }
                children.push(new docx.Paragraph({
                    children: [new docx.TextRun({ text: n.title || '제목 없음', bold: true, size: 36, font: 'Malgun Gothic' })],
                    spacing: { after: 300 },
                    border: { bottom: { style: docx.BorderStyle.SINGLE, size: 2, color: '3A9AD9' } }
                }));
                var tmp = document.createElement('div');
                tmp.innerHTML = n.content || '';
                var paras = htmlToDocxParagraphs(tmp);
                paras.forEach(function (p) { children.push(p); });
            });

            var doc = new docx.Document({
                sections: [{ properties: {}, children: children }]
            });
            var blob = await docx.Packer.toBlob(doc);
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'novels-export.docx'; a.click();
        }
    }

    // ── 소설 불러오기 (TXT / PDF / Word) ──
    async function importNovelFile(file) {
        if (!window.sb) return;
        var sess = await sb.auth.getSession();
        var session = sess.data.session;
        if (!session) { alert('로그인이 필요합니다.'); return; }

        var ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'txt') {
            var reader = new FileReader();
            reader.onload = async function (ev) {
                var text = ev.target.result;
                var sections = text.split('\n==============\n');
                var lastNovelId = null;
                var validCount = 0;
                for (var s = 0; s < sections.length; s++) {
                    var sec = sections[s].trim();
                    if (!sec) continue;
                    var title = '', subtitle = '', content = sec;
                    var lines = sec.split('\n');
                    var cStart = 0;
                    if (lines[0] && lines[0].indexOf('제목 : ') === 0) {
                        title = lines[0].substring('제목 : '.length).trim();
                        cStart = 1;
                    } else if (lines[0]) {
                        // 첫 줄을 제목으로 사용
                        title = lines[0].trim();
                        cStart = 1;
                    }
                    if (lines[cStart] && lines[cStart].indexOf('부제목 : ') === 0) {
                        subtitle = lines[cStart].substring('부제목 : '.length).trim();
                        cStart++;
                    } else if (lines[cStart] && cStart === 1 && lines[cStart].trim() && lines[cStart].trim().length < 50) {
                        // 두 번째 줄이 짧으면 부제목으로 간주
                        subtitle = lines[cStart].trim();
                        cStart++;
                    }
                    if (lines[cStart] && lines[cStart].trim() === '') cStart++;
                    content = lines.slice(cStart).join('\n').trim();
                    if (!title) title = '제목 없음';
                    lastNovelId = await saveImportedNovel(session, title, '<p>' + content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>', subtitle);
                    validCount++;
                }
                saveTree(tree);
                renderTree(true);
                window.dispatchEvent(new CustomEvent('novels-changed'));
                alert('불러오기 완료 (' + validCount + '편)');
            };
            reader.readAsText(file);
        } else if (ext === 'doc' || ext === 'docx' || ext === 'html' || ext === 'htm') {
            var reader = new FileReader();
            reader.onload = async function (ev) {
                var htmlContent = ev.target.result;
                var parser = new DOMParser();
                var doc = parser.parseFromString(htmlContent, 'text/html');
                var novels = doc.querySelectorAll('.novel');
                var lastNovelId = null;
                var importCount = 0;
                if (novels.length > 0) {
                    for (var i = 0; i < novels.length; i++) {
                        var h1 = novels[i].querySelector('h1');
                        var title = h1 ? h1.textContent.trim() : '제목 없음';
                        if (h1) h1.remove();
                        var div = novels[i].querySelector('div');
                        var content = div ? div.innerHTML : novels[i].innerHTML;
                        lastNovelId = await saveImportedNovel(session, title, content);
                        importCount++;
                    }
                } else {
                    var title = doc.title || file.name.replace(/\.[^.]+$/, '') || '제목 없음';
                    var body = doc.body ? doc.body.innerHTML : htmlContent;
                    lastNovelId = await saveImportedNovel(session, title, body);
                    importCount = 1;
                }
                saveTree(tree);
                renderTree(true);
                window.dispatchEvent(new CustomEvent('novels-changed'));
                alert('불러오기 완료 (' + importCount + '편)');
            };
            reader.readAsText(file);
        } else if (ext === 'pdf') {
            alert('PDF 불러오기는 텍스트 기반 PDF만 지원합니다.\nTXT 또는 Word 형식을 권장합니다.');
            return;
        } else {
            alert('지원하지 않는 파일 형식입니다.\nTXT, DOC, DOCX, HTML 파일을 사용하세요.');
            return;
        }
    }

    async function saveImportedNovel(session, title, content, subtitle) {
        var novel = {
            user_id: session.user.id,
            title: title || '제목 없음',
            content: content || '',
            status: 'draft',
            created_at: new Date().toISOString()
        };
        if (subtitle) novel.subtitle = subtitle;
        var res = await sb.from('novels').insert([novel]).select();
        if (res.error) {
            // subtitle 컬럼이 없을 경우 subtitle 제외 후 재시도
            if (subtitle && res.error.message && res.error.message.indexOf('subtitle') !== -1) {
                delete novel.subtitle;
                res = await sb.from('novels').insert([novel]).select();
            }
            if (res.error) {
                console.error('불러오기 저장 실패:', res.error);
                return null;
            }
        }
        if (res.data && res.data[0]) {
            var novelId = res.data[0].id;
            var node = { id: 'novel_' + novelId, type: 'memo', name: title || '제목 없음' };
            if (subtitle) node.subtitle = subtitle;
            var allCat = findNodeById(tree, '_all');
            if (allCat) { allCat.children.push(node); } else tree.push(node);
            return novelId;
        }
        return null;
    }

    // ── 소설 선택 모달 (수정용) ──
    function showNovelPicker(callback) {
        var novels = [];
        function collectNovels(nodes) {
            nodes.forEach(function (n) {
                if (n.id && n.id.indexOf('novel_') === 0) novels.push({ id: n.id.replace('novel_', ''), name: n.name });
                if (n.children) collectNovels(n.children);
            });
        }
        collectNovels(tree);
        if (novels.length === 0) { alert('편집할 소설이 없습니다.'); return; }

        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        var listHtml = '';
        novels.forEach(function (n) {
            listHtml += '<button class="modal-novel-item" data-id="' + n.id + '">' + escapeHtml(n.name) + '</button>';
        });
        overlay.innerHTML =
            '<div class="modal-dialog">' +
                '<div class="modal-title">편집할 소설 선택</div>' +
                '<div class="modal-novel-list">' + listHtml + '</div>' +
                '<div class="modal-actions"><button class="modal-btn modal-btn-cancel">취소</button></div>' +
            '</div>';
        document.body.appendChild(overlay);
        function close() { overlay.remove(); }
        overlay.querySelector('.modal-btn-cancel').addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        overlay.querySelector('.modal-novel-list').addEventListener('click', function (e) {
            var btn = e.target.closest('.modal-novel-item');
            if (btn) { close(); callback(btn.dataset.id); }
        });
    }

    // 이름 입력 프롬프트 (모달)
    function showNamePrompt(title, callback) {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML =
            '<div class="modal-dialog">' +
                '<div class="modal-title">' + title + '</div>' +
                '<input type="text" class="modal-input" placeholder="이름 입력" autofocus>' +
                '<div class="modal-actions">' +
                    '<button class="modal-btn modal-btn-cancel">취소</button>' +
                    '<button class="modal-btn modal-btn-confirm">확인</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        var input = overlay.querySelector('.modal-input');
        input.focus();
        function close() { overlay.remove(); }
        overlay.querySelector('.modal-btn-cancel').addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        overlay.querySelector('.modal-btn-confirm').addEventListener('click', function () {
            var v = input.value.trim();
            if (v) { callback(v); }
            close();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { var v = input.value.trim(); if (v) callback(v); close(); }
            if (e.key === 'Escape') close();
        });
    }

    // 폴더 추가 다이얼로그 (이름 + 카테고리 선택)
    function showFolderAddDialog(callback) {
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        var options = '<option value="">최상위</option>';
        collectContainers(tree, options = [], 0);
        var optHtml = '<option value="">최상위</option>';
        options.forEach(function (o) { optHtml += '<option value="' + o.id + '">' + o.indent + escapeHtml(o.name) + '</option>'; });
        overlay.innerHTML =
            '<div class="modal-dialog">' +
                '<div class="modal-title">폴더 추가</div>' +
                '<input type="text" class="modal-input" placeholder="폴더 이름" autofocus>' +
                '<label class="modal-label">위치</label>' +
                '<select class="modal-select">' + optHtml + '</select>' +
                '<div class="modal-actions">' +
                    '<button class="modal-btn modal-btn-cancel">취소</button>' +
                    '<button class="modal-btn modal-btn-confirm">확인</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        var input = overlay.querySelector('.modal-input');
        var select = overlay.querySelector('.modal-select');
        input.focus();
        function close() { overlay.remove(); }
        overlay.querySelector('.modal-btn-cancel').addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        overlay.querySelector('.modal-btn-confirm').addEventListener('click', function () {
            var v = input.value.trim();
            if (v) callback(v, select.value || null);
            close();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { var v = input.value.trim(); if (v) callback(v, select.value || null); close(); }
            if (e.key === 'Escape') close();
        });
    }

    function collectContainers(nodes, result, depth) {
        nodes.forEach(function (n) {
            if (n.type === 'category' || n.type === 'folder') {
                var indent = '';
                for (var i = 0; i < depth; i++) indent += '\u00A0\u00A0';
                result.push({ id: n.id, name: n.name, indent: indent });
                if (n.children) collectContainers(n.children, result, depth + 1);
            }
        });
    }

    // 외부에서 트리 데이터 접근용 API
    window.sidebarTree = {
        getTree: function () { return tree; },
        getContainers: function () {
            var result = [];
            collectContainers(tree, result, 0);
            return result;
        },
        addNovelNode: function (parentId, novelId, title, subtitle) {
            var node = { id: 'novel_' + novelId, type: 'memo', name: title };
            if (subtitle) node.subtitle = subtitle;
            if (parentId) {
                var parent = findNodeById(tree, parentId);
                if (parent) { if (!parent.children) parent.children = []; parent.children.push(node); parent.open = true; }
                else tree.push(node);
            } else {
                var allCat = findNodeById(tree, '_all');
                if (allCat) { allCat.children.push(node); }
                else tree.push(node);
            }
            renderTree();
        },
        removeNode: function (nodeId) {
            removeNode(tree, nodeId);
            delete selectedIds[nodeId];
            renderTree();
        },
        updateNovelTitle: function (novelId, newTitle) {
            var node = findNodeById(tree, 'novel_' + novelId);
            if (node) {
                node.name = newTitle;
                saveTree(tree);
                renderTree(true);
            }
        }
    };

    renderTree(true);

    // Supabase 동기화 함수

    // 트리 내 중복 소설 ID 제거 (첫 번째만 유지)
    function deduplicateTree(nodes) {
        var seen = {};
        function walk(list) {
            for (var i = list.length - 1; i >= 0; i--) {
                var n = list[i];
                if (n.id && n.id.indexOf('novel_') === 0) {
                    if (seen[n.id]) {
                        list.splice(i, 1);
                    } else {
                        seen[n.id] = true;
                    }
                }
                if (n.children) walk(n.children);
            }
        }
        walk(nodes);
    }

    function getExistingNovelIds(nodes) {
        var ids = {};
        (function walk(list) {
            list.forEach(function (n) {
                if (n.id && n.id.indexOf('novel_') === 0) ids[n.id] = true;
                if (n.children) walk(n.children);
            });
        })(nodes);
        return ids;
    }

    // 두 트리를 병합: cloud 기반 + local에만 있는 카테고리/폴더 보존
    function mergeTrees(cloudTree, localTree) {
        var merged = JSON.parse(JSON.stringify(cloudTree));
        // 클라우드에 존재하는 최상위 노드 ID 수집
        var cloudIds = {};
        merged.forEach(function (n) { if (n.id) cloudIds[n.id] = true; });
        // 로컬에만 있는 최상위 카테고리/폴더를 병합
        localTree.forEach(function (n) {
            if (n.id && !cloudIds[n.id] && n.type !== 'memo') {
                merged.push(JSON.parse(JSON.stringify(n)));
            }
        });
        // 클라우드의 각 카테고리 내부에도 로컬 서브 카테고리/폴더 병합
        merged.forEach(function (cloudNode) {
            if (!cloudNode.children) return;
            var localNode = localTree.find(function (l) { return l.id === cloudNode.id; });
            if (!localNode || !localNode.children) return;
            var cloudChildIds = {};
            cloudNode.children.forEach(function (c) { if (c.id) cloudChildIds[c.id] = true; });
            localNode.children.forEach(function (c) {
                if (c.id && !cloudChildIds[c.id] && c.type !== 'memo') {
                    cloudNode.children.push(JSON.parse(JSON.stringify(c)));
                }
            });
        });
        return merged;
    }

    async function syncFromSupabase() {
        if (!window.sb) return;
        try {
            var sess = await sb.auth.getSession();
            var uid = sess.data.session ? sess.data.session.user.id : null;
            if (!uid) return;

            // 1. Supabase에서 클라우드 트리 로드
            var cloudTree = await loadTreeFromSupabase();
            if (cloudTree && cloudTree.length > 0) {
                // 로컬 트리와 병합 (카테고리/폴더 보존)
                var localCopy = JSON.parse(JSON.stringify(tree));
                var merged = mergeTrees(cloudTree, localCopy);
                tree.length = 0;
                merged.forEach(function (n) { tree.push(n); });
                if (!tree.find(function (n) { return n.id === '_all'; })) {
                    tree.unshift(JSON.parse(JSON.stringify(DEFAULT_CATEGORY)));
                }
            }

            // 2. 중복 제거
            deduplicateTree(tree);

            // 3. DB의 모든 소설 조회 (트리 데이터 레코드 제외)
            var res = await sb.from('novels').select('id, title, subtitle').eq('user_id', uid).neq('title', TREE_RECORD_TITLE).order('created_at', { ascending: true });
            if (res.error || !res.data || res.data.length === 0) {
                saveTree(tree);
                renderTree(true);
                return;
            }

            // 4. 트리에 없는 소설 추가 + 기존 노드 부제목 업데이트
            var existingIds = getExistingNovelIds(tree);
            var allCat = findNodeById(tree, '_all');
            if (!allCat) { allCat = JSON.parse(JSON.stringify(DEFAULT_CATEGORY)); tree.unshift(allCat); }

            res.data.forEach(function (n) {
                var nodeId = 'novel_' + n.id;
                if (!existingIds[nodeId]) {
                    var newNode = { id: nodeId, type: 'memo', name: n.title || '제목 없음' };
                    if (n.subtitle) newNode.subtitle = n.subtitle;
                    allCat.children.push(newNode);
                } else {
                    var existing = findNodeById(tree, nodeId);
                    if (existing && n.subtitle && !existing.subtitle) {
                        existing.subtitle = n.subtitle;
                    }
                }
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
            _doSaveTreeToSupabase(tree);  // 즉시 저장 (디바운스 없이)
            renderTree(true);
        } catch (e) { console.warn('sidebar sync error:', e); }
    }

    // 초기 동기화
    syncFromSupabase();
    if (window.sb) {
        sb.auth.onAuthStateChange(function (event, session) {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                syncFromSupabase();
            }
        });
    }

    // 페이지 포커스 시 재동기화 (다른 기기/탭에서 변경된 내용 반영)
    window.addEventListener('focus', syncFromSupabase);
}

initSidebar();
