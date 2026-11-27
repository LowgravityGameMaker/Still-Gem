const ROWS = 8;
const COLS = 8;
const GEM_TYPES = 6;
const BEST_SCORE_KEY = 'still_gem_best_score';

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const restartBtn = document.getElementById('restart-btn');

// grid[r][c]는 { type: 0~5, special: null | 'row' | 'col' } 형태
let grid = [];
let dropOffsets = [];
let selectedCell = null;
let score = 0;
let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
let isProcessing = false;
let touchStartX = 0;
let touchStartY = 0;
let touchStartCell = null;
let svgUid = 0;

// 사진 속 투명한 색유리 구슬(Glass Marble) 질감 팔레트
const MARBLE_PALETTE = [
  // 0: 시안 블루 (맑고 깊은 하늘빛 유리구슬)
  { top: '#5ce1ff', mid: '#0095e8', deep: '#002c59', glow: '#38bdf8', rim: '#bae6fd' },
  // 1: 앰버 오렌지 (따뜻한 호박빛 유리구슬)
  { top: '#ff9e44', mid: '#d94e00', deep: '#4a1200', glow: '#fb923c', rim: '#fed7aa' },
  // 2: 에메랄드 그린 (깊은 숲빛 유리구슬)
  { top: '#4ade80', mid: '#0d7a32', deep: '#022910', glow: '#22c55e', rim: '#bbf7d0' },
  // 3: 루비 크림슨 (맑은 석류빛 유리구슬)
  { top: '#ff6b8b', mid: '#c81d4e', deep: '#450417', glow: '#f43f5e', rim: '#fecdd3' },
  // 4: 아메시스트 바이올렛 (깊은 자수정 유리구슬)
  { top: '#d896ff', mid: '#7e22ce', deep: '#29064a', glow: '#c084fc', rim: '#e9d5ff' },
  // 5: 골든 허니 (영롱한 꿀빛 유리구슬)
  { top: '#fde047', mid: '#ca8a04', deep: '#422800', glow: '#facc15', rim: '#fef08a' }
];

function getGemSVG(gem) {
  const p = MARBLE_PALETTE[gem.type];
  const uid = ++svgUid;
  const bodyId = `mb-body-${uid}`;
  const causticId = `mb-caustic-${uid}`;
  const shadowId = `mb-shadow-${uid}`;

  // 특수 보석(가로/세로 라인 제거)일 경우 은은한 유리 링 표시
  let specialOverlay = '';
  if (gem.special === 'row') {
    specialOverlay = `
      <line x1="12" y1="50" x2="88" y2="50" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
      <circle cx="50" cy="50" r="39" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.7"/>
    `;
  } else if (gem.special === 'col') {
    specialOverlay = `
      <line x1="50" y1="12" x2="50" y2="88" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
      <circle cx="50" cy="50" r="39" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.7"/>
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

    <!-- 바닥에 맺히는 색 그림자와 빛 투과 -->
    <ellipse cx="50" cy="91" rx="30" ry="7" fill="url(#${shadowId})"/>

    <!-- 유리구슬 본체 -->
    <circle cx="50" cy="48" r="40" fill="url(#${bodyId})" stroke="${p.rim}" stroke-width="1.2" stroke-opacity="0.55"/>

    <!-- 구슬 하단 내부로 굴절되어 모이는 영롱한 빛 -->
    <ellipse cx="50" cy="76" rx="22" ry="9" fill="url(#${causticId})"/>

    <!-- 상단 창문 반사광 (2중 하이라이트) -->
    <path d="M 33 21 A 28 28 0 0 1 46 17 L 47 22 A 23 23 0 0 0 36 25 Z" fill="#ffffff" fill-opacity="0.88"/>
    <path d="M 50 17 A 28 28 0 0 1 62 21 L 59 25 A 23 23 0 0 0 49 22 Z" fill="#ffffff" fill-opacity="0.82"/>
    <ellipse cx="26" cy="31" rx="3.5" ry="6" transform="rotate(28 26 31)" fill="#ffffff" fill-opacity="0.45"/>

    ${specialOverlay}
  </svg>`;
}
function initGame() {
  score = 0;
  updateScore(0);
  bestScoreEl.textContent = bestScore.toLocaleString();
  selectedCell = null;
  isProcessing = false;
  createInitialGrid();
  ensurePlayableBoard();
  resetDropOffsets();
  renderBoard();
}

function resetDropOffsets() {
  dropOffsets = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function createInitialGrid() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let type;
      do {
        type = Math.floor(Math.random() * GEM_TYPES);
      } while (
        (c >= 2 && grid[r][c - 1].type === type && grid[r][c - 2].type === type) ||
        (r >= 2 && grid[r - 1][c].type === type && grid[r - 2][c].type === type)
      );
      grid[r][c] = { type, special: null };
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

      if (grid[r][c] !== null) {
        cell.innerHTML = getGemSVG(grid[r][c]);
        if (animateDrops && dropOffsets[r][c] > 0) {
          const gemEl = cell.querySelector('.gem');
          const offsetPercent = dropOffsets[r][c] * 115;
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fallingGems.forEach((gemEl) => {
          gemEl.style.transition = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)';
          gemEl.style.transform = 'translateY(0)';
        });
      });
    });
  }
}

function handleTouchStart(e, r, c) {
  e.preventDefault();
  if (isProcessing) return;
  const touch = e.changedTouches;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartCell = { r, c };
}

function handleTouchEnd(e) {
  e.preventDefault();
  if (isProcessing || !touchStartCell) return;
  const touch = e.changedTouches;
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
  if (isProcessing) return;

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
  await sleep(180);

  const matchData = analyzeMatches();
  if (matchData.matchedCells.length === 0) {
    swap(r1, c1, r2, c2);
    renderBoard();
    await sleep(150);
    isProcessing = false;
    return;
  }

  await processMatches(matchData, { r: r2, c: c2 });
  ensurePlayableBoard();
  renderBoard();
  isProcessing = false;
}

function swap(r1, c1, r2, c2) {
  const temp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = temp;
}

function analyzeMatches() {
  const matchedMap = new Map();
  const specialSpawns = [];

  // 가로 매치 탐색
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const gem = grid[r][c];
      if (!gem) { c++; continue; }
      let end = c + 1;
      while (end < COLS && grid[r][end] && grid[r][end].type === gem.type) {
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

  // 세로 매치 탐색
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const gem = grid[r][c];
      if (!gem) { r++; continue; }
      let end = r + 1;
      while (end < ROWS && grid[end][c] && grid[end][c].type === gem.type) {
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

    const gem = grid[r][c];
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

    // 4개 이상 매치 시 생성될 특수 보석 위치 결정
    const spawnsToCreate = [];
    matchData.specialSpawns.forEach(({ group, type, special }) => {
      let pos = group;
      if (swapTarget) {
        const found = group.find(p => p.r === swapTarget.r && p.c === swapTarget.c);
        if (found) pos = found;
      }
      spawnsToCreate.push({ r: pos.r, c: pos.c, type, special });
    });

    allToClear.forEach(({ r, c }) => {
      const cell = boardEl.children[r * COLS + c];
      const gem = cell ? cell.querySelector('.gem') : null;
      if (gem) gem.classList.add('matched');
    });

    updateScore(allToClear.length * 10 * combo);
    await sleep(210);

    allToClear.forEach(({ r, c }) => {
      grid[r][c] = null;
    });

    // 특수 보석 배치
    spawnsToCreate.forEach(({ r, c, type, special }) => {
      grid[r][c] = { type, special };
    });

    applyGravityAndRefill();
    renderBoard(true);
    await sleep(290);

    swapTarget = null;
    matchData = analyzeMatches();
    combo++;
  }
}

function applyGravityAndRefill() {
  resetDropOffsets();
  for (let c = 0; c < COLS; c++) {
    let emptyRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] !== null) {
        grid[emptyRow][c] = grid[r][c];
        dropOffsets[emptyRow][c] = emptyRow - r;
        if (emptyRow !== r) {
          grid[r][c] = null;
        }
        emptyRow--;
      }
    }
    const newCount = emptyRow + 1;
    for (let r = emptyRow; r >= 0; r--) {
      grid[r][c] = { type: Math.floor(Math.random() * GEM_TYPES), special: null };
      dropOffsets[r][c] = newCount;
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
  if (score > bestScore) {
    bestScore = score;
    bestScoreEl.textContent = bestScore.toLocaleString();
    localStorage.setItem(BEST_SCORE_KEY, bestScore);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

restartBtn.addEventListener('click', initGame);
initGame();
