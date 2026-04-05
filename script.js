let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let history = JSON.parse(localStorage.getItem('history')) || {};

const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const historyContent = document.getElementById('history-content');

// --- 1. 드래그 앤 드롭 설정 (SortableJS) ---
const sortable = new Sortable(list, {
    handle: '.drag-handle', // ☰ 아이콘으로만 드래그 가능
    animation: 250,         // 비켜날 때의 애니메이션 속도
    ghostClass: 'sortable-ghost',
    onEnd: function() {
        // 드래그가 끝나면 DOM 순서대로 배열 재정렬
        const currentOrderIds = Array.from(list.children).map(li => parseInt(li.dataset.id));
        tasks = currentOrderIds.map(id => tasks.find(t => t.id === id));
        saveToLocalStorage();
    }
});

// --- 2. 3 AM 리셋 로직 ---
function checkAndReset() {
    const now = new Date();
    const lastReset = localStorage.getItem('lastReset');
    
    let resetTime = new Date();
    resetTime.setHours(3, 0, 0, 0);

    // 새벽 0~3시 사이라면 '어제의 3시'가 기준점임
    if (now.getHours() < 3) {
        resetTime.setDate(resetTime.getDate() - 1);
    }

    if (!lastReset || new Date(lastReset) < resetTime) {
        if (tasks.length > 0) saveToHistory(); // 리셋 전 기록 저장

        // 고정(pinned)된 것만 남기고 상태는 미완료로 초기화
        tasks = tasks.filter(t => t.pinned).map(t => ({...t, completed: false}));
        
        localStorage.setItem('lastReset', now.toISOString());
        saveAndRender();
    }
}

function saveToHistory() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' });
    
    // 이미 해당 날짜 기록이 있으면 덮어씌우지 않음 (필요시 수정 가능)
    history[dateStr] = [...tasks];
    localStorage.setItem('history', JSON.stringify(history));
}

// --- 3. 할 일 CRUD ---
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
        const newTask = {
            id: Date.now(),
            text: input.value.trim(),
            completed: false,
            pinned: false
        };
        tasks.push(newTask);
        input.value = '';
        saveAndRender();
    }
});

function toggleTask(id) {
    tasks = tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t);
    saveAndRender();
}

function togglePin(id, e) {
    e.stopPropagation();
    tasks = tasks.map(t => t.id === id ? {...t, pinned: !t.pinned} : t);
    saveAndRender();
}

function deleteTask(id, e) {
    e.stopPropagation();
    tasks = tasks.filter(t => t.id !== id);
    saveAndRender();
}

function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function saveAndRender() {
    saveToLocalStorage();
    render();
}

function render() {
    list.innerHTML = '';
    tasks.forEach(t => {
        const li = document.createElement('li');
        li.className = `todo-item ${t.completed ? 'completed' : ''}`;
        li.dataset.id = t.id;
        li.innerHTML = `
            <div class="drag-handle"><i class="fas fa-bars"></i></div>
            <button class="btn-pin ${t.pinned ? 'active' : ''}" onclick="togglePin(${t.id}, event)">
                <i class="fas fa-thumbtack"></i>
            </button>
            <span onclick="toggleTask(${t.id})">${t.text}</span>
            <button class="btn-delete" onclick="deleteTask(${t.id}, event)">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        list.appendChild(li);
    });
}

// --- 4. 히스토리 UI ---
document.getElementById('history-btn').onclick = () => {
    document.getElementById('history-sidebar').classList.add('open');
    renderHistory();
};

document.getElementById('close-sidebar').onclick = () => {
    document.getElementById('history-sidebar').classList.remove('open');
};

function renderHistory() {
    historyContent.innerHTML = '';
    const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));

    if (dates.length === 0) {
        historyContent.innerHTML = '<p style="color:#777; text-align:center;">저장된 기록이 없습니다.</p>';
        return;
    }

    dates.forEach(date => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'history-day';
        dayDiv.innerHTML = `
            <h4 style="display:flex; justify-content:space-between;">
                ${date} 
                <button onclick="deleteHistory('${date}')" style="color:var(--danger-color); font-size:0.8rem;">삭제</button>
            </h4>
            <ul style="padding-left: 20px; font-size: 0.9rem;">
                ${history[date].map(t => `
                    <li style="margin-bottom:4px; text-decoration: ${t.completed ? 'line-through' : 'none'}; color: ${t.completed ? '#666' : '#ccc'}">
                        ${t.pinned ? '📌' : '•'} ${t.text}
                    </li>
                `).join('')}
            </ul>
        `;
        historyContent.appendChild(dayDiv);
    });
}

function deleteHistory(date) {
    if(confirm(`${date} 기록을 영구 삭제할까요?`)) {
        delete history[date];
        localStorage.setItem('history', JSON.stringify(history));
        renderHistory();
    }
}

// 초기 실행
checkAndReset();
render();