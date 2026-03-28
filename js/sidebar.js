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
    function saveTree(tree) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tree)); }
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

    // 전체 삭제 (고정 항목 제외)
    toolboxPanel.querySelector('#tool-delete-all').addEventListener('click', function () {
        if (!confirm('기본 카테고리를 제외한 모든 항목을 삭제하시겠습니까?')) return;
        deleteNonFixed(tree);
        selectedIds = {};
        renderTree();
    });

    // 선택 항목 삭제
    toolboxPanel.querySelector('#tool-delete-sel').addEventListener('click', function () {
        var ids = Object.keys(selectedIds);
        if (ids.length === 0) return;
        if (!confirm(ids.length + '개 항목을 삭제하시겠습니까?')) return;
        ids.forEach(function (id) { removeNode(tree, id); });
        selectedIds = {};
        renderTree();
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
        closeAddMenu();
        var menu = document.createElement('div');
        menu.className = 'tree-add-menu tree-grouped-menu';
        menu.innerHTML =
            '<div class="menu-group-label">소설 관리</div>' +
            '<button data-action="edit">수정</button>' +
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
                var blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' });
                var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'sidebar-tree.json'; a.click(); closeAddMenu();
            } else if (action === 'export-selected') {
                var ids = Object.keys(selectedIds);
                if (ids.length === 0) { alert('선택된 항목이 없습니다.'); return; }
                var selected = extractNodes(tree, ids);
                var blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
                var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'sidebar-selected.json'; a.click(); closeAddMenu();
            } else if (action === 'import') {
                var input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
                input.addEventListener('change', function () {
                    var file = input.files[0]; if (!file) return;
                    var reader = new FileReader();
                    reader.onload = function (ev) {
                        try {
                            var imported = JSON.parse(ev.target.result);
                            if (Array.isArray(imported)) { imported.forEach(function (n) { tree.push(n); }); renderTree(); }
                        } catch (err) { alert('파일 형식이 올바르지 않습니다.'); }
                    };
                    reader.readAsText(file);
                });
                input.click(); closeAddMenu();
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
    function renderTree() {
        treeContainer.innerHTML = '';
        renderNodes(tree, treeContainer, 0);
        saveTree(tree);
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
                '<span class="tree-label' + (node.type === 'category' ? ' tree-label-category' : '') + '">' + escapeHtml(node.name) + '</span>' +
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
                    renderTree();
                });
            }

            var toggleEl = row.querySelector('.tree-toggle');
            if (toggleEl) {
                toggleEl.addEventListener('click', function (e) { e.stopPropagation(); node.open = !isOpen; renderTree(); });
            }

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
                delBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (confirm('"' + node.name + '" 삭제?')) { removeNode(tree, node.id); delete selectedIds[node.id]; renderTree(); }
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
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); finish(); } if (e.key === 'Escape') renderTree(); });
    }

    function showAddMenu(parentNode, anchorEl) {
        closeAddMenu();
        var menu = document.createElement('div');
        menu.className = 'tree-add-menu';
        menu.innerHTML = '<button data-type="category">분류 추가</button><button data-type="folder">폴더 추가</button><button data-type="memo">메모 추가</button>';
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
        addNovelNode: function (parentId, novelId, title) {
            var node = { id: 'novel_' + novelId, type: 'memo', name: title };
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
        }
    };

    renderTree();
}

initSidebar();
