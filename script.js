const ROWS = 8;
const COLS = 8;
const TOTAL_CELLS = ROWS * COLS;
const GEM_TYPES = 6;
const BEST_SCORE_KEY = 'still_gem_timed_best';
const TIMED_LIMIT = 60;

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const timerEl = document.getElementById('timer');
const timerGroupEl = document.getElementById('timer-group');
const bestGroupEl = document.getElementById('best-group');
const modeZenBtn = document.getElementById('mode-zen');
const modeTimedBtn = document.getElementById('mode-timed');
const restartBtn = document.getElementById('restart-btn');
const overlayEl = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const finalBestEl = document.getElementById('final-best');
const overlayRestartBtn = document.getElementById('overlay-restart-btn');

let currentMode = 'zen';
let grid = new Array(TOTAL_CELLS).fill(null);
let dropOffsets = new Array(TOTAL_CELLS).fill(0);
let selectedCell = null;
let score = 0;
let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
let timeLeft = TIMED_LIMIT;
let timerInterval = null;
let isGameOver = false;
let isProcessing = false;
let touchStartX = 0;
let touchStartY = 0;
let touchStartCell = null;
let svgUid = 0;

function toIdx(r, c) {
  return r * COLS + c;
}

function getGem(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
  return grid.at(toIdx(r, c));
}

function setGem(r, c, val) {
  grid.splice(toIdx(r, c), 1, val);
}

function getDrop(r, c) {
  return dropOffsets.at(toIdx(r, c));
}

function setDrop(r, c, val) {
  dropOffsets.splice(toIdx(r, c), 1, val);
}

const MARBLE_PALETTE = [
  { top: '#5ce1ff', mid: '#0095e8', deep: '#002c59', glow: '#38bdf8', rim: '#bae6fd' },
  { top: '#ff9e44', mid: '#d94e00', deep: '#4a1200', glow: '#fb923c', rim: '#fed7aa' },
  { top: '#4ade80', mid: '#0d7a32', deep: '#022910', glow: '#22c55e', rim: '#bbf7d0' },
  { top: '#ff6b8b', mid: '#c81d4e', deep: '#450417', glow: '#f43f5e', rim: '#fecdd3' },
  { top: '#d896ff', mid: '#7e22ce', deep: '#29064a', glow: '#c084fc', rim: '#e9d5ff' },
  { top: '#fde047', mid: '#ca8a04', deep: '#422800', glow: '#facc15', rim: '#fef08a' }
];

function getGemSVG(gem) {
  const p = MARBLE_PALETTE.at(gem.type);
  const uid = ++svgUid;
  const bodyId = `mb-body-${uid}`;
  const causticId = `mb-caustic-${uid}`;
  const shadowId = `mb-shadow-${uid}`;

  let specialOverlay = '';
  if (gem.special === 'row') {
    specialOverlay = `
      <line x1="12" y1="48" x2="88" y2="48" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.88"/>
      <circle cx="50" cy="48" r="39" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.75"/>
    `;
  } else if (gem.special === 'col') {
    specialOverlay = `
      <line x1="50" y1="10" x2="50" y2="86" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.88"/>
      <circle cx="50" cy="48" r="39" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.75"/>
    `;
  }

  return `<svg class="gem" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="${bodyId}" cx="38%" cy="32%" r="65%" fx="34%" fy="26%">
        <stop offset="0%" stop-color="${p.top}" stop-opacity="0.96"/>
        <stop offset="58%" stop-color="${p.mid}" stop-opacity="0.88"/>
        <stop offset="88%" stop-color="${p.deep}" stop-opacity="0.96"/>
        <stop offset="100%" stop-color="${p.mid}" stop-opacity="0.92"/>
      </radialGradient>
      <radialGradient id="${causticId}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
        <stop offset="45%" stop-color="${p.glow}" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="${p.glow}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${shadowId}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.55"/>
        <stop offset="70%" stop-color="${p.glow}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <ellipse cx="50" cy="91" rx="30" ry="7" fill="url(#${shadowId})"/>
    <circle cx="50" cy="48" r="40" fill="url(#${bodyId})" stroke="${p.rim}" stroke-width="1.2" stroke-opacity="0.55"/>
    <ellipse cx="50" cy="76" rx="22" ry="9" fill="url(#${causticId})"/>
    <path d="M 33 21 A 28 28 0 0 1 46 17 L 47 22 A 23 23 0 0 0 36 25 Z" fill="#ffffff" fill-opacity="0.88"/>
    <path d="M 50 17 A 28 28 0 0 1 62 21 L 59 25 A 23 23 0 0 0 49 22 Z" fill="#ffffff" fill-opacity="0.82"/>
    <ellipse cx="26" cy="31" rx="3.5" ry="6" transform="rotate(28 26 31)" fill="#ffffff" fill-opacity="0.45"/>
    ${specialOverlay}
  </svg>`;
}

function setMode(mode) {
  currentMode = mode;
  modeZenBtn.classList.toggle('active', mode === 'zen');
  modeTimedBtn.classList.toggle('active', mode === 'timed');

  if (mode === 'timed') {
    timerGroupEl.classList.remove('hidden');
    bestGroupEl.classList.remove('hidden');
  } else {
    timerGroupEl.classList.add('hidden');
    bestGroupEl.classList.add('hidden');
  }
  initGame();
}

function initGame() {
  clearInterval(timerInterval);
  score = 0;
  timeLeft = TIMED_LIMIT;
  isGameOver = false;
  selectedCell = null;
  isProcessing = false;

  scoreEl.textContent = '0';
  bestScoreEl.textContent = bestScore.toLocaleString();
  timerEl.textContent = timeLeft;
  timerEl.classList.remove('urgent');
  overlayEl.classList.add('hidden');

  createInitialGrid();
  ensurePlayableBoard();
  dropOffsets.fill(0);
  renderBoard();

  if (currentMode === 'timed') {
    startTimer();
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 10) {
      timerEl.classList.add('urgent');
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endTimedGame();
    }
  }, 1000);
}

function endTimedGame() {
  isGameOver = true;
  selectedCell = null;
  renderBoard();
  finalScoreEl.textContent = score.toLocaleString();
  finalBestEl.textContent = `BEST ${bestScore.toLocaleString()}`;
  overlayEl.classList.remove('hidden');
}

function createInitialGrid() {
  grid.fill(null);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let type;
      do {
        type = Math.floor(Math.random() * GEM_TYPES);
      } while (
        (c >= 2 && getGem(r, c - 1).type === type && getGem(r, c - 2).type === type) ||
        (r >= 2 && getGem(r - 1, c).type === type && getGem(r - 2, c).type === type)
      );
      setGem(r, c, { type, special: null });
    }
  }
}
function renderBoard(animateDrops = false) {
  boardEl.innerHTML = '';
  const fallingGems = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
        cell.classList.add('selected');
      }

      const gem = getGem(r, c);
      if (gem !== null) {
        cell.innerHTML = getGemSVG(gem);
        const dropCount = getDrop(r, c);
        if (animateDrops && dropCount > 0) {
          const gemEl = cell.querySelector('.gem');
          const offsetPercent = dropCount * 115;
          gemEl.style.transition = 'none';
          gemEl.style.transform = `translateY(-${offsetPercent}%)`;
          fallingGems.push(gemEl);
        }
      }

      cell.addEventListener('touchstart', (e) => handleTouchStart(e, r, c), { passive: false });
      cell.addEventListener('touchend', (e) => handleTouchEnd(e), { passive: false });
      cell.addEventListener('mousedown', () => handleCellSelect(r, c));

      boardEl.appendChild(cell);
    }
  }

  if (fallingGems.length > 0) {
    boardEl.offsetHeight;
    fallingGems.forEach((gemEl) => {
      gemEl.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      gemEl.style.transform = 'translateY(0)';
    });
  }
}

function handleTouchStart(e, r, c) {
  e.preventDefault();
  if (isProcessing || isGameOver) return;
  const touch = e.changedTouches.item(0);
  if (!touch) return;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartCell = { r, c };
}

function handleTouchEnd(e) {
  e.preventDefault();
  if (isProcessing || isGameOver || !touchStartCell) return;
  const touch = e.changedTouches.item(0);
  if (!touch) return;
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const threshold = 18;

  const startR = touchStartCell.r;
  const startC = touchStartCell.c;
  touchStartCell = null;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    handleCellSelect(startR, startC);
    return;
  }

  let targetR = startR;
  let targetC = startC;

  if (Math.abs(dx) > Math.abs(dy)) {
    targetC += dx > 0 ? 1 : -1;
  } else {
    targetR += dy > 0 ? 1 : -1;
  }

  if (targetR >= 0 && targetR < ROWS && targetC >= 0 && targetC < COLS) {
    selectedCell = null;
    attemptSwap(startR, startC, targetR, targetC);
  }
}

function handleCellSelect(r, c) {
  if (isProcessing || isGameOver) return;

  if (!selectedCell) {
    selectedCell = { r, c };
    renderBoard();
    return;
  }

  if (selectedCell.r === r && selectedCell.c === c) {
    selectedCell = null;
    renderBoard();
    return;
  }

  const isAdjacent =
    Math.abs(selectedCell.r - r) + Math.abs(selectedCell.c - c) === 1;

  if (!isAdjacent) {
    selectedCell = { r, c };
    renderBoard();
    return;
  }

  const r1 = selectedCell.r, c1 = selectedCell.c;
  selectedCell = null;
  attemptSwap(r1, c1, r, c);
}

async function attemptSwap(r1, c1, r2, c2) {
  isProcessing = true;
  swap(r1, c1, r2, c2);
  renderBoard();
  await sleep(170);

  const matchData = analyzeMatches();
  if (matchData.matchedCells.length === 0) {
    swap(r1, c1, r2, c2);
    renderBoard();
    await sleep(140);
    isProcessing = false;
    return;
  }

  await processMatches(matchData, { r: r2, c: c2 });
  ensurePlayableBoard();
  renderBoard();
  isProcessing = false;
}

function swap(r1, c1, r2, c2) {
  const temp = getGem(r1, c1);
  setGem(r1, c1, getGem(r2, c2));
  setGem(r2, c2, temp);
}

function analyzeMatches() {
  const matchedMap = new Map();
  const specialSpawns = [];

  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const gem = getGem(r, c);
      if (!gem) { c++; continue; }
      let end = c + 1;
      while (end < COLS && getGem(r, end) && getGem(r, end).type === gem.type) {
        end++;
      }
      const len = end - c;
      if (len >= 3) {
        const group = [];
        for (let k = c; k < end; k++) {
          matchedMap.set(`${r},${k}`, { r, c: k });
          group.push({ r, c: k });
        }
        if (len >= 4) {
          specialSpawns.push({ group, type: gem.type, special: 'col' });
        }
      }
      c = end;
    }
  }

  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const gem = getGem(r, c);
      if (!gem) { r++; continue; }
      let end = r + 1;
      while (end < ROWS && getGem(end, c) && getGem(end, c).type === gem.type) {
        end++;
      }
      const len = end - r;
      if (len >= 3) {
        const group = [];
        for (let k = r; k < end; k++) {
          matchedMap.set(`${k},${c}`, { r: k, c });
          group.push({ r: k, c });
        }
        if (len >= 4) {
          specialSpawns.push({ group, type: gem.type, special: 'row' });
        }
      }
      r = end;
    }
  }

  return {
    matchedCells: Array.from(matchedMap.values()),
    specialSpawns
  };
}

function expandWithSpecials(initialCells) {
  const finalMap = new Map();
  const queue = [...initialCells];

  while (queue.length > 0) {
    const { r, c } = queue.shift();
    const key = `${r},${c}`;
    if (finalMap.has(key)) continue;
    finalMap.set(key, { r, c });

    const gem = getGem(r, c);
    if (!gem || !gem.special) continue;

    if (gem.special === 'row') {
      for (let col = 0; col < COLS; col++) {
        if (!finalMap.has(`${r},${col}`)) queue.push({ r, c: col });
      }
    } else if (gem.special === 'col') {
      for (let row = 0; row < ROWS; row++) {
        if (!finalMap.has(`${row},${c}`)) queue.push({ r: row, c });
      }
    }
  }

  return Array.from(finalMap.values());
}

async function processMatches(initialMatchData, swapTarget = null) {
  let matchData = initialMatchData;
  let combo = 1;

  while (matchData.matchedCells.length > 0) {
    const allToClear = expandWithSpecials(matchData.matchedCells);

    const spawnsToCreate = [];
    matchData.specialSpawns.forEach(({ group, type, special }) => {
      let pos = group.at(0);
      if (swapTarget) {
        const found = group.find(p => p.r === swapTarget.r && p.c === swapTarget.c);
        if (found) pos = found;
      }
      spawnsToCreate.push({ r: pos.r, c: pos.c, type, special });
    });

    allToClear.forEach(({ r, c }) => {
      const cell = boardEl.children.item(toIdx(r, c));
      const gem = cell ? cell.querySelector('.gem') : null;
      if (gem) gem.classList.add('matched');
    });

    updateScore(allToClear.length * 10 * combo);
    await sleep(200);

    allToClear.forEach(({ r, c }) => {
      setGem(r, c, null);
    });

    spawnsToCreate.forEach(({ r, c, type, special }) => {
      setGem(r, c, { type, special });
    });

    applyGravityAndRefill();
    renderBoard(true);
    await sleep(310);

    swapTarget = null;
    matchData = analyzeMatches();
    combo++;
  }
}

function applyGravityAndRefill() {
  dropOffsets.fill(0);
  for (let c = 0; c < COLS; c++) {
    let emptyRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      const gem = getGem(r, c);
      if (gem !== null) {
        setGem(emptyRow, c, gem);
        setDrop(emptyRow, c, emptyRow - r);
        if (emptyRow !== r) {
          setGem(r, c, null);
        }
        emptyRow--;
      }
    }
    const newCount = emptyRow + 1;
    for (let r = emptyRow; r >= 0; r--) {
      setGem(r, c, { type: Math.floor(Math.random() * GEM_TYPES), special: null });
      setDrop(r, c, newCount);
    }
  }
}

function hasValidMove() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) {
        swap(r, c, r, c + 1);
        const match = analyzeMatches().matchedCells.length > 0;
        swap(r, c, r, c + 1);
        if (match) return true;
      }
      if (r + 1 < ROWS) {
        swap(r, c, r + 1, c);
        const match = analyzeMatches().matchedCells.length > 0;
        swap(r, c, r + 1, c);
        if (match) return true;
      }
    }
  }
  return false;
}

function ensurePlayableBoard() {
  while (!hasValidMove()) {
    createInitialGrid();
  }
}

function updateScore(points) {
  score += points;
  scoreEl.textContent = score.toLocaleString();
  if (currentMode === 'timed' && score > bestScore) {
    bestScore = score;
    bestScoreEl.textContent = bestScore.toLocaleString();
    localStorage.setItem(BEST_SCORE_KEY, bestScore);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

modeZenBtn.addEventListener('click', () => setMode('zen'));
modeTimedBtn.addEventListener('click', () => setMode('timed'));
restartBtn.addEventListener('click', initGame);
overlayRestartBtn.addEventListener('click', initGame);

setMode('zen');
