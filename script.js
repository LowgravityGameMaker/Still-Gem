const ROWS = 8;
const COLS = 8;
const TOTAL_CELLS = ROWS * COLS;
const GEM_TYPES = 6;
const BEST_SCORE_KEY = 'still_gem_timed_best';
const TIMED_LIMIT = 60;

const boardEl = document.getElementById('board');
const fxLayerEl = document.getElementById('fx-layer');
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

// 6가지 서로 다른 보석 형태 + 투명 유리 깊이와 굴절광
const GEM_SPECS = [
  // 0: 아쿠아 블루 (브릴리언트 라운드 컷)
  {
    top: '#8ae8ff', mid: '#1ea7e8', deep: '#0c4a7a', glow: '#7dd3fc', rim: '#bae6fd',
    shape: `<circle cx="50" cy="49" r="39" `,
    inner: `<circle cx="50" cy="49" r="24" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.28"/>`
  },
  // 1: 로즈 루비 (페어/물방울 컷)
  {
    top: '#ff9eb5', mid: '#e13b64', deep: '#6e102b', glow: '#fda4af', rim: '#fecdd3',
    shape: `<path d="M50,9 C68,32 85,48 85,65 C85,83 69,92 50,92 C31,92 15,83 15,65 C15,48 32,32 50,9 Z" `,
    inner: `<path d="M50,24 C61,40 71,50 71,63 C71,74 61,80 50,80 C39,80 29,74 29,63 C29,50 39,40 50,24 Z" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.28"/>`
  },
  // 2: 에메랄드 (에메랄드 팔각 컷)
  {
    top: '#86efac', mid: '#16a34a', deep: '#064e24', glow: '#6ee7b7', rim: '#bbf7d0',
    shape: `<polygon points="27,10 73,10 88,25 88,75 73,90 27,90 12,75 12,25" `,
    inner: `<polygon points="33,23 67,23 76,32 76,68 67,77 33,77 24,68 24,32" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.28"/>`
  },
  // 3: 앰버 토파즈 (쿠션 라운드 사각 컷)
  {
    top: '#fde08d', mid: '#e08e1b', deep: '#6b3804', glow: '#fcd34d', rim: '#fef08a',
    shape: `<rect x="13" y="13" width="74" height="74" rx="22" `,
    inner: `<rect x="25" y="25" width="50" height="50" rx="14" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.28"/>`
  },
  // 4: 아메시스트 (트릴리언트 삼각 컷)
  {
    top: '#e5b8ff', mid: '#9333ea', deep: '#3b0764', glow: '#d8b4fe', rim: '#f3e8ff',
    shape: `<path d="M50,10 Q66,10 89,75 Q93,87 80,87 L20,87 Q7,87 11,75 Q34,10 50,10 Z" `,
    inner: `<polygon points="50,28 73,75 27,75" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.28"/>`
  },
  // 5: 시트린 골드 (마퀴즈 셔틀 컷)
  {
    top: '#fef08a', mid: '#ca8a04', deep: '#573602', glow: '#fde047', rim: '#fef9c3',
    shape: `<path d="M50,7 C76,25 86,40 86,50 C86,60 76,75 50,93 C24,75 14,60 14,50 C14,40 24,25 50,7 Z" `,
    inner: `<path d="M50,22 C66,34 72,43 72,50 C72,57 66,66 50,78 C34,66 28,57 28,50 C28,43 34,34 50,22 Z" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.28"/>`
  }
];

function getGemSVG(gem) {
  const s = GEM_SPECS.at(gem.type);
  const uid = ++svgUid;
  const bodyId = `g-body-${uid}`;
  const causticId = `g-caustic-${uid}`;

  let specialOverlay = '';
  if (gem.special === 'row') {
    specialOverlay = `<line x1="14" y1="50" x2="86" y2="50" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" opacity="0.9"/>`;
  } else if (gem.special === 'col') {
    specialOverlay = `<line x1="50" y1="14" x2="50" y2="86" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" opacity="0.9"/>`;
  } else if (gem.special === 'bomb') {
    specialOverlay = `
      <circle cx="50" cy="50" r="11" fill="#ffffff" fill-opacity="0.85"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.8"/>
    `;
  }

  return `<svg class="gem" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="${bodyId}" cx="36%" cy="30%" r="68%" fx="32%" fy="24%">
        <stop offset="0%" stop-color="${s.top}" stop-opacity="0.92"/>
        <stop offset="55%" stop-color="${s.mid}" stop-opacity="0.78"/>
        <stop offset="88%" stop-color="${s.deep}" stop-opacity="0.94"/>
        <stop offset="100%" stop-color="${s.mid}" stop-opacity="0.88"/>
      </radialGradient>
      <radialGradient id="${causticId}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
        <stop offset="50%" stop-color="${s.glow}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${s.glow}" stop-opacity="0"/>
      </radialGradient>
    </defs>

    ${s.shape} fill="url(#${bodyId})" stroke="${s.rim}" stroke-width="1.5" stroke-opacity="0.65"/>
    ${s.inner}
    <ellipse cx="50" cy="74" rx="18" ry="7" fill="url(#${causticId})"/>
    <path d="M 35 23 A 26 26 0 0 1 46 20 L 47 24 A 21 21 0 0 0 38 27 Z" fill="#ffffff" fill-opacity="0.88"/>
    <path d="M 50 20 A 26 26 0 0 1 60 23 L 58 27 A 21 21 0 0 0 49 24 Z" fill="#ffffff" fill-opacity="0.82"/>
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
  fxLayerEl.innerHTML = '';

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
      gemEl.style.transition = 'transform 0.34s cubic-bezier(0.34, 1.35, 0.64, 1)';
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

async function animateVisualSwap(r1, c1, r2, c2) {
  const cell1 = boardEl.children.item(toIdx(r1, c1));
  const cell2 = boardEl.children.item(toIdx(r2, c2));
  const gem1 = cell1 ? cell1.querySelector('.gem') : null;
  const gem2 = cell2 ? cell2.querySelector('.gem') : null;

  const dx = (c2 - c1) * 115;
  const dy = (r2 - r1) * 115;

  if (gem1) {
    gem1.style.transition = 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)';
    gem1.style.transform = `translate(${dx}%, ${dy}%)`;
  }
  if (gem2) {
    gem2.style.transition = 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1)';
    gem2.style.transform = `translate(${-dx}%, ${-dy}%)`;
  }
  await sleep(165);
}

async function attemptSwap(r1, c1, r2, c2) {
  isProcessing = true;
  await animateVisualSwap(r1, c1, r2, c2);
  swap(r1, c1, r2, c2);
  renderBoard();

  const matchData = analyzeMatches();
  if (matchData.matchedCells.length === 0) {
    await animateVisualSwap(r1, c1, r2, c2);
    swap(r1, c1, r2, c2);
    renderBoard();
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
  const hGroups = [];
  const vGroups = [];

  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const gem = getGem(r, c);
      if (!gem) { c++; continue; }
      let end = c + 1;
      while (end < COLS && getGem(r, end) && getGem(r, end).type === gem.type) {
        end++;
      }
      if (end - c >= 3) {
        const group = [];
        for (let k = c; k < end; k++) {
          matchedMap.set(`${r},${k}`, { r, c: k });
          group.push({ r, c: k });
        }
        hGroups.push({ group, type: gem.type });
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
      if (end - r >= 3) {
        const group = [];
        for (let k = r; k < end; k++) {
          matchedMap.set(`${k},${c}`, { r: k, c });
          group.push({ r: k, c });
        }
        vGroups.push({ group, type: gem.type });
      }
      r = end;
    }
  }

  const specialSpawns = [];
  const usedGroups = new Set();

  hGroups.forEach((hg, hi) => {
    vGroups.forEach((vg, vi) => {
      if (hg.type !== vg.type) return;
      const intersect = hg.group.find(hp => vg.group.some(vp => vp.r === hp.r && vp.c === hp.c));
      if (intersect) {
        usedGroups.add(`h${hi}`);
        usedGroups.add(`v${vi}`);
        specialSpawns.push({
          group: [intersect],
          type: hg.type,
          special: 'bomb'
        });
      }
    });
  });

  hGroups.forEach((hg, hi) => {
    if (usedGroups.has(`h${hi}`)) return;
    if (hg.group.length >= 5) {
      specialSpawns.push({ group: hg.group, type: hg.type, special: 'bomb' });
    } else if (hg.group.length === 4) {
      specialSpawns.push({ group: hg.group, type: hg.type, special: 'col' });
    }
  });

  vGroups.forEach((vg, vi) => {
    if (usedGroups.has(`v${vi}`)) return;
    if (vg.group.length >= 5) {
      specialSpawns.push({ group: vg.group, type: vg.type, special: 'bomb' });
    } else if (vg.group.length === 4) {
      specialSpawns.push({ group: vg.group, type: vg.type, special: 'row' });
    }
  });

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
    } else if (gem.special === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !finalMap.has(`${nr},${nc}`)) {
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }
  }

  return Array.from(finalMap.values());
}

function spawnRippleFX(cells, combo) {
  cells.forEach(({ r, c }) => {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = `${(c + 0.5) * 12.5}%`;
    ripple.style.top = `${(r + 0.5) * 12.5}%`;
    fxLayerEl.appendChild(ripple);
    setTimeout(() => ripple.remove(), 450);
  });

  if (combo >= 2 && cells.length > 0) {
    const center = cells.at(Math.floor(cells.length / 2));
    const badge = document.createElement('div');
    badge.className = 'combo-float';
    badge.textContent = `${combo}x`;
    badge.style.left = `${(center.c + 0.5) * 12.5}%`;
    badge.style.top = `${(center.r + 0.5) * 12.5}%`;
    fxLayerEl.appendChild(badge);
    setTimeout(() => badge.remove(), 680);
  }
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

    spawnRippleFX(allToClear, combo);

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
    await sleep(340);

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
