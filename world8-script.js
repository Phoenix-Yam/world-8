document.addEventListener('DOMContentLoaded', () => {
    // --- 定数と要素 ---
    const DRAG_THRESHOLD = 10; 

    // 必須のDOM要素
    const circuit = document.getElementById("circuit-mode-container");
    const palette = document.getElementById('panel-palette');
    const workspace = document.getElementById('workspace');
    const canvas = document.getElementById('circuit-canvas');
    const ctx = canvas.getContext('2d');
    const checkButton = document.getElementById('check-button');
    const nextQuestButton = document.getElementById('next-quest-button'); 
    const resultDisplay = document.getElementById('result-display');
    const h1Element = document.querySelector('h1');
    const deleteButton = document.getElementById('delete-selected-button'); 
    const questTitleElement = document.getElementById('current-quest-title'); 
    
    // 名詞チェッカー関連要素
    const nounCheckerToggle = document.getElementById('noun-checker-toggle'); 
    const nounCheckerArea = document.getElementById('noun-checker-area');
    const nounButtons = document.querySelectorAll('.noun-button');
    const nounSegments = document.querySelectorAll('.noun-panel-segment');
    const nounResultText = document.getElementById('noun-checker-result-text');

    const gojuonPalette = document.getElementById('gojuon-palette');
    const singleWordSlot = document.getElementById('single-word-slot'); 
    
    // 状態変数
    let connections = []; 
    let isDrawingLine = false;
    let lineStartPanel = null;
    let selectedPanel = null; 
    let selectedConnection = null; 
    let fixedWordPanel = null; 
    let fixedGoalPanel = null; 
    let activeNounPanelId = null; 
    
    // 🔴 修正: 前のサイトでクリアした単語を初期値として設定 🔴
    let clearedWords = new Set(['こうら', 'べる', 'はんど', 'かもん', 'むだあし', 'ふうき']);
    
    // 🔴 依頼のデータ構造 🔴
    const QUESTS = {
        '3-2': { 
            title: '依頼3-2：黒い犬を届けよう', 
            // 修正: required_nodesにはJが一つしか必要ないため、重複を削除
            paths: [ { required_connections: [['がらすけーす', 'L'], ['L', 'H'], ['H', 'J'], ['がらすけーす', 'A'], ['A', 'K'], ['K', 'J'], ['J', 'GOAL']], required_nodes: ['がらすけーす', 'L', 'H', 'J', 'A', 'K', 'GOAL'] } ], 
            required_word: 'がらすけーす'
        }
    };
    
    const QUEST_ORDER = ['3-2']; // このサイトの依頼順序

    // 🔴 単語パネルの定義 🔴
    const ALL_GOJUON_KEYS = ['こうら', 'べる', 'はんど', 'かもん', 'ふうき','しわす', 'がらすけーす', 'むだあし', 'へら'];
    const CLEARED_WORD_MAPPING = { '3-2': 'がらすけーす' };
    
    // 🔴 名詞チェッカーのロジックマップ 🔴
    const IMAGE_MAPPING = {
        'A': 'https://picsum.photos/id/10/450/450', 'B': 'https://picsum.photos/id/11/450/450', 'C': 'https://picsum.photos/id/12/450/450',
        'D': 'https://picsum.photos/id/13/450/450', 'E': 'https://picsum.photos/id/14/450/450', 'F': 'https://picsum.photos/id/15/450/450',
        'G': 'https://picsum.photos/id/16/450/450', 'H': 'https://picsum.photos/id/17/450/450', 'I': 'https://picsum.photos/id/18/450/450',
        'J': 'https://picsum.photos/id/19/450/450', 'K': 'https://picsum.photos/id/20/450/450', 'L': 'https://picsum.photos/id/21/450/450',
        'M': 'https://picsum.photos/id/22/450/450',
    };
    const NOUN_CHECKER_RESULTS = {
        'A': { 9: 'いぬ：白いポメラニアン' }, 'B': { 5: 'くく：黒い犬。泳ぐのが苦手で、水に溺れてしまう。' }, 
        'C': { 3: 'う' },
        'D': { 1: 'キセカ：許容電圧を超えると、過電流により切れてしまう。', 7:'セカイ：すべて単一であり、複製することはできない。'}, 
        'E': { 6: 'あ' }, 'F': { 7: 'い' },
        'G': { 9: 'え' }, 'H': { 1: 'お' }, 
        'I': { 2: 'フラワー：ライフセーバーをしており、流されている人を見たら絶対に助ける。心優しい人が大好き。' },
        'J': { 4: 'カトウ：とても心優しく、猫が川に流れているのを見たら、自分は流されてでも猫を救い出す。' }, 
        'K': { 8: 'き' }, 'L': { 3: 'く' },
        'M': { 7: 'さ' }
    };


    let currentQuestId = QUEST_ORDER[0]; 
    questTitleElement.textContent = QUESTS[currentQuestId].title;
    canvas.width = workspace.clientWidth;
    canvas.height = workspace.clientHeight;

    // -----------------------------------------------------
    // 🔴 固定パネルロジック (単語パネル / ゴールパネル) 🔴
    // -----------------------------------------------------
    function createFixedWordPanel() {
        const panel = document.createElement('div');
        panel.className = 'panel gojuon-panel'; 
        panel.id = 'fixed-word-panel';
        panel.textContent = ''; 
        panel.dataset.originalId = ' '; 
        panel.dataset.type = 'gojuon';
        panel.style.cursor = 'default';
        document.getElementById('fixed-word-panel-container').appendChild(panel);
        fixedWordPanel = panel;
        singleWordSlot.textContent = '';
        singleWordSlot.dataset.slotText = '';
        addPanelEventListeners(fixedWordPanel, false); 
    }

    function createFixedGoalPanel() {
        const panel = document.getElementById('fixed-goal-panel');
        if (!panel) return;
        fixedGoalPanel = panel;
        addPanelEventListeners(fixedGoalPanel, false, true); 
    }

    function updateFixedWordPanelChar(newChar) {
        if (!fixedWordPanel) return;
        fixedWordPanel.textContent = newChar;
        fixedWordPanel.dataset.originalId = newChar;
        singleWordSlot.textContent = newChar;
        singleWordSlot.dataset.slotText = newChar;
        connections = connections.filter(c => c.startId !== newChar && c.endId !== newChar);
        redrawLines();
        resultDisplay.textContent = `単語パネルが「${newChar}」にセットされました。`;
        resultDisplay.style.backgroundColor = '#e2e3e5';
        resultDisplay.color = '#333';
    }
    
    function resetFixedWordPanel(isInitialLoad = false) {
        if (!fixedWordPanel) return;

        const nextRequiredWord = QUESTS[currentQuestId].required_word;
        
        fixedWordPanel.textContent = '';
        fixedWordPanel.dataset.originalId = ' '; 
        singleWordSlot.textContent = '';
        singleWordSlot.dataset.slotText = '';
        
        connections = [];
        redrawLines();

        if (isInitialLoad) {
             resultDisplay.textContent = `現在の依頼は「${QUESTS[currentQuestId].title}」です。単語パネルに「${nextRequiredWord}」をセットしてください。`;
        } else {
             resultDisplay.textContent = `次の依頼のために、単語パネルに「${nextRequiredWord}」をセットしてください。`;
        }
        resultDisplay.style.backgroundColor = '#f0f0ff';
        resultDisplay.color = '#005f73';
    }
    // -----------------------------------------------------

    // --- 接続点計算、選択、削除、再描画の共通ロジック ---
    function getClosestBoundaryPoint(x1, y1, x2, y2, w, h) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const halfW = w / 2;
        const halfH = h / 2;
        const ratioX = halfW / Math.abs(dx);
        const ratioY = halfH / Math.abs(dy);
        const ratio = Math.min(ratioX, ratioY);
        if (Math.abs(dx) < 0.001) { return { x: x1, y: y1 + Math.sign(dy) * halfH }; }
        if (Math.abs(dy) < 0.001) { return { x: x1 + Math.sign(dx) * halfW, y: y1 }; }
        return { x: x1 + dx * ratio, y: y1 + dy * ratio };
    }
    function deselectPanel() {
        if (selectedPanel) { selectedPanel.classList.remove('active-selected'); }
        selectedPanel = null;
        updateDeleteButtonVisibility(); 
    }
    function deselectConnection() {
        if (selectedConnection) { selectedConnection.classList.remove('active-selected-line'); }
        selectedConnection = null;
        updateDeleteButtonVisibility(); 
    }
    function updateDeleteButtonVisibility() {
        if (selectedPanel && selectedPanel.id !== 'fixed-word-panel' && selectedPanel.id !== 'fixed-goal-panel' || selectedConnection) { deleteButton.style.display = 'inline-block'; } 
        else { deleteButton.style.display = 'none'; }
    }
    function deletePanel(panel) {
        const panelIdToRemove = panel.dataset.originalId;
        if (panel.id === 'fixed-word-panel' || panel.id === 'fixed-goal-panel') {
             resultDisplay.textContent = '❌ 固定されたパネルは削除できません。';
             resultDisplay.style.backgroundColor = '#f8d7da';
             resultDisplay.color = '#721c24';
             return;
        }
        connections = connections.filter(c => c.startId !== panelIdToRemove && c.endId !== panelIdToRemove);
        if (selectedPanel === panel) { deselectPanel(); }
        deselectConnection(); 
        const palettePanel = document.getElementById(`panel-${panelIdToRemove}`);
        if (palettePanel) {
            palettePanel.classList.remove('placed-on-workspace');
        }
        panel.remove();
        redrawLines();
        resultDisplay.textContent = `${panelIdToRemove}パネルを削除しました。`;
        resultDisplay.style.backgroundColor = '#fff3cd'; 
        resultDisplay.color = '#856404';
    }
    function deleteConnection(connectionElement) {
        const startId = connectionElement.dataset.startId;
        const endId = connectionElement.dataset.endId;
        const connStart = startId < endId ? startId : endId;
        const connEnd = startId < endId ? endId : startId;
        connections = connections.filter(c => !(c.startId === connStart && c.endId === connEnd));
        deselectConnection();
        connectionElement.remove();
        redrawLines(); 
        resultDisplay.textContent = `${connStart}-${connEnd}間の接続を削除しました。`;
        resultDisplay.style.backgroundColor = '#fff3cd'; 
        resultDisplay.color = '#856404';
    }
    function redrawLines() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const workspaceRect = workspace.getBoundingClientRect();
        document.querySelectorAll('#workspace .connection-line').forEach(el => el.remove());
        connections.forEach(conn => {
            const startPanel = document.querySelector(`#workspace .panel[data-original-id="${conn.startId}"]`);
            const endPanel = document.querySelector(`#workspace .panel[data-original-id="${conn.endId}"]`);
            if (!startPanel || !endPanel) return; 
            const startRect = startPanel.getBoundingClientRect();
            const endRect = endPanel.getBoundingClientRect();
            const startCenterX = startRect.left + startRect.width / 2 - workspaceRect.left;
            const startCenterY = startRect.top + startRect.height / 2 - workspaceRect.top;
            const endCenterX = endRect.left + endRect.width / 2 - workspaceRect.left;
            const endCenterY = endRect.top + endRect.height / 2 - workspaceRect.top;
            const startPoint = getClosestBoundaryPoint(startCenterX, startCenterY, endCenterX, endCenterY, startRect.width, startRect.height);
            const endPoint = getClosestBoundaryPoint(endCenterX, endCenterY, startCenterX, startCenterY, endRect.width, endRect.height);
            const startX = startPoint.x;
            const startY = startPoint.y;
            const endX = endPoint.x;
            const endY = endPoint.y;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.stroke();
            const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
            const lineEl = document.createElement('div');
            lineEl.className = 'connection-line';
            lineEl.dataset.startId = conn.startId;
            lineEl.dataset.endId = conn.endId;
            lineEl.style.width = `${distance}px`;
            lineEl.style.height = '15px'; 
            lineEl.style.left = `${startX}px`;
            lineEl.style.top = `${startY - 7.5}px`; 
            lineEl.style.transform = `rotate(${angle}deg)`;
            lineEl.style.transformOrigin = '0 50%'; 
            lineEl.addEventListener('click', handleConnectionClick);
            if (selectedConnection && selectedConnection.dataset.startId === conn.startId && selectedConnection.dataset.endId === conn.endId) {
                lineEl.classList.add('active-selected-line');
                selectedConnection = lineEl;
            }
            workspace.appendChild(lineEl);
        });
    }
    function handleConnectionClick(e) {
        e.stopPropagation(); 
        deselectPanel(); 
        const connectionEl = e.target;
        if (selectedConnection === connectionEl) {
            deselectConnection();
            resultDisplay.textContent = '接続の選択を解除しました。';
        } else {
            deselectConnection();
            selectedConnection = connectionEl;
            connectionEl.classList.add('active-selected-line');
            const startId = connectionEl.dataset.startId;
            const endId = connectionEl.dataset.endId;
            resultDisplay.textContent = `${startId}-${endId}の接続を選択しました。Deleteキーで削除できます。`;
            resultDisplay.style.backgroundColor = '#add8e6';
            resultDisplay.color = '#005f73';
        }
        updateDeleteButtonVisibility(); 
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') { return; }
            e.preventDefault(); 
            if (selectedConnection) { deleteConnection(selectedConnection); } 
            else if (selectedPanel) { deletePanel(selectedPanel); }
        }
    });
    deleteButton.addEventListener('click', () => {
        if (selectedConnection) { deleteConnection(selectedConnection); } 
        else if (selectedPanel) { deletePanel(selectedPanel); }
    });
    workspace.addEventListener('click', (e) => {
        if (e.target === workspace || e.target === canvas) {
            deselectPanel();
            deselectConnection(); 
            resultDisplay.textContent = '操作説明を見て、回路を作成してください。';
            resultDisplay.style.backgroundColor = '#e2e3e5';
            resultDisplay.color = '#333';
        }
    });
    function addPanelEventListeners(panel, isPalettePanel = false, isFixedGoalPanel = false) {
        let isDraggingPanel = false;
        let offsetX, offsetY;
        let startX, startY; 
        panel.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                startX = e.clientX;
                startY = e.clientY;
                offsetX = e.clientX - panel.getBoundingClientRect().left;
                offsetY = e.clientY - panel.getBoundingClientRect().top;
                panel.style.zIndex = 1000;
                e.stopPropagation(); 
                deselectConnection(); 
            }
        });
        panel.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            e.preventDefault(); 
            startX = touch.clientX;
            startY = touch.clientY;
            offsetX = touch.clientX - panel.getBoundingClientRect().left;
            offsetY = touch.clientY - panel.getBoundingClientRect().top;
            panel.style.zIndex = 1000;
            e.stopPropagation(); 
            deselectConnection(); 
        });
        document.addEventListener('mousemove', (e) => {
            if (e.buttons !== 1 || startX === undefined) return;
            if (!isDraggingPanel && (Math.abs(e.clientX - startX) > DRAG_THRESHOLD || Math.abs(e.clientY - startY) > DRAG_THRESHOLD)) {
                isDraggingPanel = true;
            }
            if (!isDraggingPanel) return; 
            if (isPalettePanel) { return; } 
            else {
                if (panel.id === 'fixed-word-panel' || panel.id === 'fixed-goal-panel') { return; }
                const workspaceRect = workspace.getBoundingClientRect();
                let newX = e.clientX - workspaceRect.left - offsetX;
                let newY = e.clientY - workspaceRect.top - offsetY;
                newX = Math.max(0, Math.min(newX, workspaceRect.width - panel.offsetWidth));
                newY = Math.max(0, Math.min(newY, workspaceRect.height - panel.offsetHeight));
                panel.style.left = `${newX}px`;
                panel.style.top = `${newY}px`;
                redrawLines(); 
            }
        });
        document.addEventListener('touchmove', (e) => {
            if (startX === undefined) return;
            const touch = e.touches[0];
            if (!isDraggingPanel && (Math.abs(touch.clientX - startX) > DRAG_THRESHOLD || Math.abs(touch.clientY - startY) > DRAG_THRESHOLD)) {
                isDraggingPanel = true;
            }
            if (!isDraggingPanel) return; 
            if (isPalettePanel) { return; } 
            else {
                if (panel.id === 'fixed-word-panel' || panel.id === 'fixed-goal-panel') { return; }
                const workspaceRect = workspace.getBoundingClientRect();
                let newX = touch.clientX - workspaceRect.left - offsetX;
                let newY = touch.clientY - workspaceRect.top - offsetY;
                newX = Math.max(0, Math.min(newX, workspaceRect.width - panel.offsetWidth));
                newY = Math.max(0, Math.min(newY, workspaceRect.height - panel.offsetHeight));
                panel.style.left = `${newX}px`;
                panel.style.top = `${newY}px`;
                redrawLines(); 
            }
        });
        document.addEventListener('mouseup', (e) => {
            if (startX === undefined) return; 
            if (isDraggingPanel) {
                isDraggingPanel = false; 
                panel.style.zIndex = 10;
                if (!isPalettePanel) { redrawLines(); }
            } else {
                if (isPalettePanel) {
                    if (panel.dataset.type === 'gojuon') {
                        if (fixedWordPanel.dataset.originalId !== panel.dataset.originalId) { updateFixedWordPanelChar(panel.dataset.originalId); }
                    } else { placePanel(panel); }
                } else { handlePanelClick(panel); }
            }
            startX = undefined;
            startY = undefined;
        });
        document.addEventListener('touchend', (e) => {
            if (startX === undefined) return; 
            if (isDraggingPanel) {
                isDraggingPanel = false; 
                panel.style.zIndex = 10;
                if (!isPalettePanel) { redrawLines(); }
            } else {
                if (isPalettePanel) {
                    if (panel.dataset.type === 'gojuon') {
                        if (fixedWordPanel.dataset.originalId !== panel.dataset.originalId) { updateFixedWordPanelChar(panel.dataset.originalId); }
                    } else { placePanel(panel); }
                } else { handlePanelClick(panel); }
            }
            startX = undefined;
            startY = undefined;
        });
        function placePanel(originalPanel) {
            let originalPanelId = originalPanel.id.replace('panel-', '');
            const existingPanel = document.querySelector(`#workspace .panel[data-original-id="${originalPanelId}"]`);
            if (existingPanel) {
                resultDisplay.textContent = `❌ ${originalPanelId}パネルは既に盤面にあります。削除してから配置してください。`;
                resultDisplay.style.backgroundColor = '#f8d7da';
                resultDisplay.color = '#721c24';
                selectPanel(existingPanel);
                return;
            }
            const newPanel = originalPanel.cloneNode(true);
            newPanel.id = `placed-panel-${originalPanelId}-${Date.now()}`;
            newPanel.dataset.originalId = originalPanelId; 
            newPanel.style.position = 'absolute';
            newPanel.dataset.type = 'world';
            originalPanel.classList.add('placed-on-workspace');
            const workspaceRect = workspace.getBoundingClientRect();
            const targetX = (workspaceRect.width / 2) - (newPanel.offsetWidth / 2);
            const targetY = (workspaceRect.height / 2) - (newPanel.offsetHeight / 2);
            newPanel.style.left = `${targetX}px`;
            newPanel.style.top = `${targetY}px`;
            addPanelEventListeners(newPanel, false); 
            workspace.appendChild(newPanel);
            selectPanel(newPanel);
            resultDisplay.textContent = `${originalPanelId}パネルを配置しました。移動・接続が可能です。`;
            resultDisplay.style.backgroundColor = '#e2e3e5';
            resultDisplay.color = '#333';
        }
        function selectPanel(panel) {
            deselectPanel();
            deselectConnection(); 
            selectedPanel = panel;
            panel.classList.add('active-selected');
            updateDeleteButtonVisibility(); 
        }
        function handlePanelClick(panel) {
            selectPanel(panel);
            if (!isDrawingLine) {
                isDrawingLine = true;
                lineStartPanel = panel;
                panel.classList.add('selected-for-line');
                resultDisplay.textContent = '接続する次のパネルをクリックしてください。';
                resultDisplay.style.backgroundColor = '#e2e3e5';
                resultDisplay.color = '#333';
            } else if (lineStartPanel && lineStartPanel !== panel) {
                const startId = lineStartPanel.dataset.originalId;
                const endId = panel.dataset.originalId;
                const connStart = startId < endId ? startId : endId;
                const connEnd = startId < endId ? endId : startId;
                const existing = connections.some(c => c.startId === connStart && c.endId === connEnd);
                if (!existing) {
                    connections.push({ startId: connStart, endId: connEnd });
                    redrawLines(); 
                }
                lineStartPanel.classList.remove('selected-for-line');
                isDrawingLine = false;
                lineStartPanel = null;
                selectPanel(panel); 
                resultDisplay.textContent = '接続が完了しました。';
                resultDisplay.style.backgroundColor = '#e2e3e5';
                resultDisplay.color = '#333';
            } else if (lineStartPanel === panel) {
                lineStartPanel.classList.remove('selected-for-line');
                isDrawingLine = false;
                lineStartPanel = null;
                resultDisplay.textContent = '接続をキャンセルしました。';
                resultDisplay.style.backgroundColor = '#e2e3e5';
                resultDisplay.color = '#333';
            }
        }
    }
    // --- 世界パネルのアンロック制御 (不要だが、構造を維持) ---
    function updatePanelPalette(currentQuestId) { /* 処理なし */ }

    // 🔴 単語パネル生成/更新ロジック 🔴
    function updateGojuonPalette() {
        const keysToDisplay = ALL_GOJUON_KEYS.filter(key => !clearedWords.has(key));
        gojuonPalette.innerHTML = '';
        keysToDisplay.forEach(char => {
            const panel = document.createElement('div');
            panel.className = 'panel gojuon-panel'; 
            panel.textContent = char;
            panel.dataset.originalId = char; 
            panel.dataset.type = 'gojuon';
            panel.style.backgroundColor = '#add8e6'; 
            addPanelEventListeners(panel, true); 
            gojuonPalette.appendChild(panel);
        });
    }

    // 🔴 判定ボタンのクリックイベント（依頼システム） 🔴
    document.getElementById('check-button').addEventListener('click', () => {
        deselectPanel();
        deselectConnection();

        const currentQuest = QUESTS[currentQuestId];
        const currentConnections = connections; 
        
        const placedPanelsOnWorkspace = document.querySelectorAll('#workspace .panel');
        const placedNodesWithFixed = Array.from(placedPanelsOnWorkspace)
            .map(p => p.dataset.originalId)
            .filter(id => id !== ' '); 
        
        let isQuestComplete = false;
        let successfulPathCount = 0;

        // 1. 必須単語パネルの文字チェック
        const requiredWordId = currentQuest.required_word;
        const placedWordPanel = fixedWordPanel; 
        
        if (placedWordPanel.dataset.originalId === ' ') {
             resultDisplay.textContent = `❌ 不正解です。単語パネルに「${requiredWordId}」をセットしてください。`;
             resultDisplay.style.backgroundColor = '#f8d7da'; 
             resultDisplay.color = '#721c24';
             return;
        }
        if (placedWordPanel.dataset.originalId !== requiredWordId) {
             resultDisplay.textContent = `❌ 不正解です。現在必要な単語は「${requiredWordId}」です。`;
             resultDisplay.style.backgroundColor = '#f8d7da'; 
             resultDisplay.color = '#721c24';
             return;
        }


        // 2. 接続とノードのチェック
        for (const path of currentQuest.paths) {
            const isPathSuccess = checkConnections(
                path.required_connections, 
                path.required_nodes, 
                currentConnections,
                placedNodesWithFixed 
            );
            
            if (isPathSuccess) { successfulPathCount++; }
        }
        
        // 3. 最終判定
        if (successfulPathCount > 0) {
            let totalRequiredConnections = 0;
            currentQuest.paths.forEach(path => { totalRequiredConnections += path.required_connections.length; });
            
            if (currentConnections.length === totalRequiredConnections) { isQuestComplete = true; }
        }

        if (isQuestComplete) {
            // 成功時の処理
            resultDisplay.textContent = `✅ 依頼達成！${currentQuest.title}を完了しました。`;
            resultDisplay.style.backgroundColor = '#d4edda'; 
            resultDisplay.color = '#155724';
            
            const clearedWord = CLEARED_WORD_MAPPING[currentQuestId];
            if (clearedWord) {
                clearedWords.add(clearedWord);
            }

            updateGojuonPalette(); 
            
            const currentIndex = QUEST_ORDER.indexOf(currentQuestId);
            
            if (currentIndex < QUEST_ORDER.length - 1) {
                // このサイトに次の依頼がある場合のロジック (今回は実行されない)
                const nextQuestId = QUEST_ORDER[currentIndex + 1];
                currentQuestId = nextQuestId;
                questTitleElement.textContent = QUESTS[currentQuestId].title;
                
                setTimeout(() => {
                    document.querySelectorAll('#workspace .panel[data-type="world"]').forEach(p => {
                        const panelId = p.dataset.originalId;
                        const palettePanel = document.getElementById(`panel-${panelId}`);
                        if (palettePanel) {
                            palettePanel.classList.remove('placed-on-workspace');
                        }
                        p.remove(); 
                    }); 
                    resetFixedWordPanel();
                    resultDisplay.textContent = '次の依頼を開始しました。';
                    resultDisplay.style.backgroundColor = '#e2e3e5';
                    resultDisplay.color = '#333';
                }, 1500); 
                
            } else {
                // サイト内の全依頼完了
                questTitleElement.textContent = '依頼3-2完了！';
                resultDisplay.textContent = '🎉 依頼3-2を完了しました！次の依頼へ進んでください。';
                checkButton.classList.add('hidden');
                nextQuestButton.classList.remove('hidden');
            }
        } else {
            // 失敗時の処理
            resultDisplay.textContent = '❌ 不正解です。接続の組み合わせや、使用しているパネルが間違っています。';
            resultDisplay.style.backgroundColor = '#f8d7da'; 
            resultDisplay.color = '#721c24';
        }
    });

    // 🔴 次のサイトへ進むボタンのイベント 🔴
    nextQuestButton.addEventListener('click', () => {
        window.location.href = '../quest_4/index.html';
    });

    // ------------------------------------
    // 🔴 名詞チェッカー機能のロジック 🔴
    // ------------------------------------
    // 名詞チェッカーの開閉トグル
    if (nounCheckerToggle) {
        nounCheckerToggle.addEventListener('click', () => {
            nounCheckerArea.classList.toggle('hidden');
            circuit.classList.toggle('hidden');
            h1Element.classList.toggle('hidden');
            palette.classList.toggle('hidden');
            workspace.classList.toggle('hidden');
            if (nounCheckerArea.classList.contains('hidden')) {
                nounCheckerToggle.textContent = '名詞チェッカーを開く/閉じる';
            } else {
                nounCheckerToggle.textContent = '世界のつなぎ方に戻る';
            }
            window.dispatchEvent(new Event('resize'));
        });
    }

    // --- 名詞チェッカー パネルボタンクリックイベント ---
    nounButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.noun-button.active').forEach(btn => btn.classList.remove('active'));
            const panelId = button.dataset.panelId;
            const imageUrl = IMAGE_MAPPING[panelId];
            activeNounPanelId = panelId;
            button.classList.add('active'); 
            if (imageUrl) {
                nounSegments.forEach(segment => {
                    segment.style.backgroundImage = `url('${imageUrl}')`;
                });
                nounResultText.textContent = `パネル ${panelId} が選択されました。画像をクリックしてください。`;
                nounResultText.style.color = '#333';
            } else {
                nounSegments.forEach(segment => {
                    segment.style.backgroundImage = 'none';
                });
                nounResultText.textContent = '画像URLが設定されていません。';
                nounResultText.style.color = 'red';
            }
        });
    });

    // --- 名詞チェッカー 3x3セグメントクリックイベント ---
    nounSegments.forEach(segment => {
        segment.addEventListener('click', () => {
            const clickIndex = parseInt(segment.dataset.index);
            if (!activeNounPanelId) {
                nounResultText.textContent = 'まずA～Mのパネルを選択してください。';
                nounResultText.style.color = 'red';
                return;
            }
            const resultsForPanel = NOUN_CHECKER_RESULTS[activeNounPanelId];
            if (resultsForPanel && resultsForPanel[clickIndex]) {
                nounResultText.textContent = resultsForPanel[clickIndex];
                nounResultText.style.color = 'blue';
            } else {
                nounResultText.textContent = '該当する結果はありません。';
                nounResultText.style.color = 'red';
            }
        });
    });
    // ------------------------------------


    // --- 接続チェックコア関数 ---
    function checkConnections(required_connections, required_nodes, current_connections, placed_nodes) {
        let isConnected = true;
        for (const [node1, node2] of required_connections) {
            const connStart = node1 < node2 ? node1 : node2;
            const connEnd = node1 < node2 ? node2 : node1;
            const isFound = current_connections.some(c => c.startId === connStart && c.endId === connEnd);
            if (!isFound) { isConnected = false; break; }
        }
        if (!isConnected) return false;
        const requiredSet = new Set(required_nodes);
        const placedSet = new Set(placed_nodes);
        if (requiredSet.size !== placedSet.size) return false;
        const hasAllRequiredNodes = required_nodes.every(node => placedSet.has(node));
        if (!hasAllRequiredNodes) return false;
        const hasExtraNodes = placed_nodes.some(node => !requiredSet.has(node));
        if (hasExtraNodes) return false;
        return true;
    }
    // ------------------------------------
    
    // 初期化時の処理
    window.addEventListener('resize', () => {
        canvas.width = workspace.clientWidth;
        canvas.height = workspace.clientHeight;
        redrawLines();
    });
    
    // サイト起動時の初期化
    createFixedWordPanel(); 
    createFixedGoalPanel(); 
    updateGojuonPalette(); 
    resetFixedWordPanel(true);
    palette.querySelectorAll('.panel').forEach(panel => {
        addPanelEventListeners(panel, true); 
    });
    redrawLines();
});