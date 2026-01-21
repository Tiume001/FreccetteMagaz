// App Logic for Freccette Scorekeeper

const STORAGE_KEY = 'freccette_pro_v1';
const MAX_PLAYERS = 5;

// State management
let state = {
    players: [],
    activePlayerId: null
};

let currentInput = '0';

// DOM Elements
const playersContainer = document.getElementById('players-container');
const addPlayerSection = document.getElementById('add-player-section');
const newPlayerInput = document.getElementById('new-player-name');
const addPlayerBtn = document.getElementById('add-player-btn');

const inputControls = document.getElementById('input-controls');
const closeInputBtn = document.getElementById('close-input-btn');
const activePlayerNameEl = document.getElementById('active-player-name');
const numBtns = document.querySelectorAll('.num-btn[data-val]');
const undoBtn = document.getElementById('undo-btn');
const confirmBtn = document.getElementById('confirm-score-btn');
const currentInputDisplay = document.getElementById('current-input-value');

const resetBtn = document.getElementById('reset-btn');
const resetModal = document.getElementById('reset-modal');
const resetScoresBtn = document.getElementById('reset-scores-modal-btn');
const resetAllBtn = document.getElementById('reset-all-modal-btn');
const cancelResetBtn = document.getElementById('cancel-reset-btn');

// Initialization
window.onload = () => {
    loadState();
    renderPlayers();
    updateUIState();
};

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load state', e);
        }
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Core Logic

function addPlayer() {
    const name = newPlayerInput.value.trim();
    if (!name) return;
    if (state.players.length >= MAX_PLAYERS) {
        alert('Massimo 5 giocatori!');
        return;
    }

    const newPlayer = {
        id: Date.now(),
        name: name,
        score: 0,
        history: [] // For potential undo history later
    };

    state.players.push(newPlayer);
    newPlayerInput.value = '';
    saveState();
    renderPlayers();
    updateUIState();
}

function selectPlayer(id) {
    state.activePlayerId = id;
    const player = state.players.find(p => p.id === id);
    if (!player) return;

    activePlayerNameEl.textContent = `Punti per: ${player.name}`;
    currentInput = '0';
    updateInputDisplay();
    
    // Show controls
    inputControls.classList.remove('hidden');
    // Add visual active state to card
    renderPlayers(); 
}

function applyScore() {
    if (!state.activePlayerId) return;
    
    const points = parseInt(currentInput, 10);
    if (isNaN(points)) return;

    const playerIndex = state.players.findIndex(p => p.id === state.activePlayerId);
    if (playerIndex !== -1) {
        state.players[playerIndex].score += points;
        state.players[playerIndex].history.push(points);
        saveState();
        renderPlayers();
    }

    // Close controls after adding
    inputControls.classList.add('hidden');
    state.activePlayerId = null;
    currentInput = '0';
    updateInputDisplay();
    renderPlayers(); // Remove active highlight
}

function resetGame(mode) {
    if (mode === 'scores') {
        state.players = state.players.map(p => ({ ...p, score: 0, history: [] }));
    } else if (mode === 'all') {
        state.players = [];
        state.activePlayerId = null;
    }
    
    saveState();
    renderPlayers();
    updateUIState();
    closeModal();
    inputControls.classList.add('hidden');
}

// UI Rendering

function renderPlayers() {
    playersContainer.innerHTML = '';
    
    state.players.forEach(player => {
        const card = document.createElement('div');
        card.className = `player-card ${player.id === state.activePlayerId ? 'active' : ''}`;
        card.onclick = () => selectPlayer(player.id);
        
        card.innerHTML = `
            <div class="player-info">
                <h2>${escapeHtml(player.name)}</h2>
                <div style="font-size: 0.8rem; opacity: 0.7;">Tocca per aggiungere</div>
            </div>
            <div class="player-score">${player.score}</div>
        `;
        
        playersContainer.appendChild(card);
    });
}

function updateUIState() {
    if (state.players.length >= MAX_PLAYERS) {
        addPlayerSection.style.display = 'none';
    } else {
        addPlayerSection.style.display = 'flex';
    }
}

function updateInputDisplay() {
    currentInputDisplay.textContent = currentInput === '' ? '0' : currentInput;
}

// Numpad Logic
function handleNumInput(val) {
    if (currentInput === '0') {
        currentInput = val;
    } else {
        if (currentInput.length < 4) { // Limit input length
            currentInput += val;
        }
    }
    updateInputDisplay();
}

function handleUndo() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateInputDisplay();
}

// Event Listeners

addPlayerBtn.addEventListener('click', addPlayer);
newPlayerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addPlayer();
});

closeInputBtn.addEventListener('click', () => {
    inputControls.classList.add('hidden');
    state.activePlayerId = null;
    renderPlayers();
});

numBtns.forEach(btn => {
    btn.addEventListener('click', () => handleNumInput(btn.dataset.val));
});

undoBtn.addEventListener('click', handleUndo);
confirmBtn.addEventListener('click', applyScore);

// Reset Logic
resetBtn.addEventListener('click', () => {
    resetModal.classList.remove('hidden');
});

cancelResetBtn.addEventListener('click', closeModal);

resetScoresBtn.addEventListener('click', () => resetGame('scores'));
resetAllBtn.addEventListener('click', () => resetGame('all'));

function closeModal() {
    resetModal.classList.add('hidden');
}

// Start helper
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
