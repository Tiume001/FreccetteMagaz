// App Logic for Freccette Scorekeeper

const STORAGE_KEY = 'freccette_pro_v1';
const MAX_PLAYERS = 5;

// State management
let state = {
    players: [],
    activePlayerId: null,
    targetScore: 301,
    inputMode: 'total', // 'total' or 'granular'
    gameActive: false,

    // Granular State
    dartValues: ['', '', ''],
    activeDartIndex: 0
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

// Setup Elements
const setupModal = document.getElementById('setup-modal');
const startBtn = document.getElementById('start-game-btn');
const targetBtns = document.querySelectorAll('.target-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const customTargetInput = document.getElementById('custom-target-input');

// Granular Elements
const granularInputContainer = document.getElementById('granular-input-container');
const dartInputs = document.querySelectorAll('.dart-input');
const granularSumDisplay = document.getElementById('granular-sum');

// Initialization
window.onload = () => {
    loadState();
    renderPlayers();
    loadState();
    initSetup();
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

// Game Logic
function selectPlayer(id) {
    // Strict Turn Order
    if (state.gameActive && state.activePlayerId && id !== state.activePlayerId) {
        // Optional: Add visual feedback (like a shake animation or alert)
        // alert("Non è il tuo turno!");
        return;
    }

    state.activePlayerId = id;
    const player = state.players.find(p => p.id === id);
    if (!player) return;

    activePlayerNameEl.textContent = `Punti per: ${player.name}`;

    // Reset inputs
    currentInput = '';
    state.dartValues = ['', '', ''];
    state.activeDartIndex = 0;

    // Toggle UI based on mode
    if (state.inputMode === 'granular') {
        currentInputDisplay.classList.add('hidden');
        granularInputContainer.classList.remove('hidden');
        setActiveDart(0);
    } else {
        currentInputDisplay.classList.remove('hidden');
        granularInputContainer.classList.add('hidden');
        updateInputDisplay();
    }

    // Show controls
    inputControls.classList.remove('hidden');
    renderPlayers();
}

function setActiveDart(index) {
    state.activeDartIndex = index;
    dartInputs.forEach((el, idx) => {
        if (idx === index) el.classList.add('active');
        else el.classList.remove('active');
    });
}

function applyScore() {
    if (!state.activePlayerId) return;

    let points = 0;

    if (state.inputMode === 'granular') {
        const d1 = parseInt(state.dartValues[0]) || 0;
        const d2 = parseInt(state.dartValues[1]) || 0;
        const d3 = parseInt(state.dartValues[2]) || 0;
        points = d1 + d2 + d3;
    } else {
        points = parseInt(currentInput, 10);
    }

    if (isNaN(points)) points = 0; // Handle empty input as 0

    const playerIndex = state.players.findIndex(p => p.id === state.activePlayerId);
    if (playerIndex !== -1) {
        const currentPlayer = state.players[playerIndex];
        const projectedScore = currentPlayer.score + points;

        if (projectedScore > state.targetScore) {
            // Bust!
            alert('SBALLATO! Il punteggio supera il target.');
            // Do not add points.
            // Maybe add a 0 to history to mark the turn?
            state.players[playerIndex].history.push(0);
        } else {
            state.players[playerIndex].score += points;
            state.players[playerIndex].history.push(points);
        }

        saveState();
        renderPlayers();
    }

    // Close controls after adding
    inputControls.classList.add('hidden');

    // Auto-advance turn (visual only)
    const players = state.players;
    if (players.length > 0) {
        // Find current index again just to be safe
        const pIdx = players.findIndex(p => p.id === state.activePlayerId);

        let nextIndex = 0;
        if (pIdx !== -1) {
            nextIndex = (pIdx + 1) % players.length;
        }
        state.activePlayerId = players[nextIndex].id;
    } else {
        state.activePlayerId = null;
    }

    currentInput = '0'; // Reset default
    state.dartValues = ['', '', '']; // Reset granular
    updateInputDisplay(); // Reset default
    renderPlayers();
}

function deletePlayer(id, event) {
    if (event) event.stopPropagation();

    if (confirm('Sei sicuro di voler eliminare questo giocatore?')) {
        const wasActive = state.activePlayerId === id;

        // Find next player index before deleting (if active)
        let nextId = null;
        if (wasActive) {
            const pIdx = state.players.findIndex(p => p.id === id);

            if (state.players.length > 1) {
                // Determine next player.
                // If we are deleting the last player (index N-1), the next one is 0.
                // If we are deleting index 0, next is 1.
                // Since this player is removed, the player at (pIdx + 1) will shift.
                // Actually, if we allow nextId calculation based on current array:
                const nextIdx = (pIdx + 1) % state.players.length;

                // But wait, if we delete pIdx, the element at nextIdx (if nextIdx > pIdx) shifts down.
                // The safest is to rely on ID.
                const nextPlayer = state.players[nextIdx];
                if (nextPlayer.id !== id) {
                    nextId = nextPlayer.id;
                }
            }
        }

        state.players = state.players.filter(p => p.id !== id);

        if (wasActive) {
            state.activePlayerId = nextId;
            inputControls.classList.add('hidden');
        }

        saveState();
        renderPlayers();
        updateUIState();
    }
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

    // If resetting all, show setup modal again
    if (mode === 'all') {
        setupModal.classList.remove('hidden');
    }
}

// Setup Logic
function initSetup() {
    targetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            targetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const val = btn.dataset.target;
            if (val === 'custom') {
                customTargetInput.classList.remove('hidden');
                customTargetInput.focus();
            } else {
                customTargetInput.classList.add('hidden');
                state.targetScore = parseInt(val);
            }
        });
    });

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.inputMode = btn.dataset.mode;
        });
    });

    startBtn.addEventListener('click', () => {
        const activeTargetBtn = document.querySelector('.target-btn.active');
        if (activeTargetBtn.dataset.target === 'custom') {
            const customVal = parseInt(customTargetInput.value);
            if (!customVal || customVal <= 0) {
                alert('Inserisci un target valido');
                return;
            }
            state.targetScore = customVal;
        } else {
            state.targetScore = parseInt(activeTargetBtn.dataset.target);
        }

        state.gameActive = true;
        // Initialize active player if needed
        if (state.players.length > 0 && !state.activePlayerId) {
            state.activePlayerId = state.players[0].id;
        }

        setupModal.classList.add('hidden');
        saveState();
        renderPlayers();
    });

    // Initial check
    if (!state.gameActive && state.players.length === 0) {
        setupModal.classList.remove('hidden');
    }

    // Granular Input Click Listeners
    dartInputs.forEach((el, idx) => {
        el.addEventListener('click', () => {
            setActiveDart(idx);
        });
    });
}

// UI Rendering

function renderPlayers() {
    playersContainer.innerHTML = '';

    state.players.forEach(player => {
        const card = document.createElement('div');
        card.className = `player-card ${player.id === state.activePlayerId ? 'active' : ''}`;
        card.onclick = () => selectPlayer(player.id);

        const missing = state.targetScore - player.score;
        const missingText = missing <= 0 ? 'VITTORIA!' : `Mancano: ${missing}`;
        const isWinner = missing <= 0;

        card.innerHTML = `
            <div class="player-info">
                <h2>${escapeHtml(player.name)}</h2>
                <div style="font-size: 0.8rem; opacity: 0.7;">${isWinner ? '🏆 Vincitore!' : 'Tocca per aggiungere'}</div>
            </div>
            <div class="score-container" style="text-align:right; margin-right: 10px;">
                <div class="player-score">${player.score}</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top:-5px;">${missingText}</div>
            </div>
            <button class="delete-player-btn" onclick="deletePlayer(${player.id}, event)">×</button>
        `;

        if (isWinner) {
            card.classList.add('winner');
            card.style.borderColor = 'var(--success-color)';
        }

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
    if (state.inputMode === 'granular') {
        let currentVal = state.dartValues[state.activeDartIndex];
        if (currentVal.length < 3) { // Max 3 digits per dart (e.g. 180 is max theoretically but single dart is max 60, allows typing though)
            state.dartValues[state.activeDartIndex] += val;
            updateGranularDisplay();

            // Auto advance if reasonable length? No, let user click or manual advance.
            // Actually, single dart max is 60. 2 digits usually enough. 
            // But if user types "2", waits, types "0" -> "20".
            // Let's NOT auto-advance for now to avoid confusion.
        }
    } else {
        if (currentInput === '0' || currentInput === '') {
            currentInput = val;
        } else {
            if (currentInput.length < 4) { // Limit input length
                currentInput += val;
            }
        }
        updateInputDisplay();
    }
}

function handleUndo() {
    if (state.inputMode === 'granular') {
        let currentVal = state.dartValues[state.activeDartIndex];
        if (currentVal.length > 0) {
            state.dartValues[state.activeDartIndex] = currentVal.slice(0, -1);
        }
        updateGranularDisplay();
    } else {
        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
        } else {
            currentInput = '0';
        }
        updateInputDisplay();
    }
}

function updateGranularDisplay() {
    let sum = 0;
    dartInputs.forEach((el, idx) => {
        const val = state.dartValues[idx];
        el.textContent = val === '' ? '_' : val;
        if (val) el.classList.add('filled');
        else el.classList.remove('filled');

        sum += (parseInt(val) || 0);
    });
    granularSumDisplay.textContent = sum;
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
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}
