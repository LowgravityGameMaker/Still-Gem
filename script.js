const ROWS = 8;
const COLS = 8;
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart-btn');

let grid = [];
let selectedCell = null;
let score = 0;
let isProcessing = false;
let touchStartX = 0;
let touchStartY = 0;
let touchStartCell = null;

// 6가지 반투명 유리 질감 & 다면체 광택 SVG 보석
const GEMS = [
  // 0: 루비
  `<svg class="gem" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g-ruby" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff8a93" stop-opacity="0.9"/>
        <stop offset="50%" stop-color="#e05663" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#9e2a36" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <polygon points="50,6 94,50 50,94 6,50" fill="url(#g-ruby)" stroke="#ffb3b9" stroke-width="1.5" stroke-opacity="0.6"/>
    <polygon points="50,24 76,50 50,76 24,50" fill="#ffffff" fill-opacity="0.16"/>
    <polygon points="50,6 76,50 50,24" fill="#ffffff" fill-opacity="0.32"/>
    <polygon points="50,6 24,50 50,24" fill="#ffffff" fill-opacity="0.18"/>
    <polygon points="50,94 76,50 50,76" fill="#000000" fill-opacity="0.22"/>
  </svg>`,

  // 1: 사파이어
  `<svg class="gem" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g-sapphire" x1="15%" y1="10%" x2="85%" y2="90%">
        <stop offset="0%" stop-color="#8ecaff" stop-opacity="0.92"/>
        <stop offset="55%" stop-color="#4a9be0" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#235c94" stop-opacity="0.92"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="41" fill="url(#g-sapphire)" stroke="#b8dfff" stroke-width="1.5" stroke-opacity="0.6"/>
    <circle cx="50" cy="50" r="26" fill="#ffffff" fill-opacity="0.12"/>
    <path d="M 24 34 A 32 32 0 0 1 68 20 A 36 36 0 0 0 24 34 Z" fill="#ffffff" fill-opacity="0.45"/>
    <ellipse cx="36" cy="30" rx="8" ry="4" transform="rotate(-32 36 30)" fill="#ffffff" fill-opacity="0.5"/>
  </svg>`,

  // 2: 에메랄드
  `<svg class="gem" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#b4e391" stop-opacity="0.9"/>
        <stop offset="50%" stop-color="#7eb356" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#477329" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <polygon points="24,10 76,10 90,24 90,76 76,90 24,90 10,76 10,24" fill="url(#g-emerald)" stroke="#d2f2ba" stroke-width="1.5" stroke-opacity="0.6"/>
    <rect x="26" y="26" width="48" height="48" rx="4" fill="#ffffff" fill-opacity="0.14"/>
    <polygon points="24,10 76,10 74,26 26,26" fill="#ffffff" fill-opacity="0.32"/>
    <polygon points="10,24 24,10 26,26 26,74 10,76" fill="#ffffff" fill-opacity="0.16"/>
    <polygon points="24,90 76,90 74,74 26,74" fill="#000000" fill-opacity="0.22"/>
  </svg>`,

  // 3: 토파즈
  `<svg class="gem" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g-topaz" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffe09e" stop-opacity="0.92"/>
        <stop offset="50%" stop-color="#d9aa52" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#8f6720" stop-opacity="0.92"/>
      </linearGradient>
    </defs>
    <polygon points="50,7 89,29 89,71 50,93 11,71 11,29" fill="url(#g-topaz)" stroke="#ffebb8" stroke-width="1.5" stroke-opacity="0.6"/>
    <polygon points="50,25 73,38 73,62 50,75 27,62 27,38" fill="#ffffff" fill-opacity="0.16"/>
    <polygon points="50,7 89,29 73,38 50,25 27,38 11,29" fill="#ffffff" fill-opacity="0.3"/>
    <polygon points="50,93 89,71 73,62 50,75" fill="#000000" fill-opacity="0.2"/>
  </svg>`,

  // 4: 자수정
  `<svg class="gem" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g-amethyst" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#e3a8f5" stop-opacity="0.9"/>
        <stop offset="55%" stop-color="#b262cc" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#6b2c80" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <polygon points="50,10 92,83 8,83" fill="url(#g-amethyst)" stroke="#f0c9fc" stroke-width="1.5" stroke-opacity="0.6"/>
    <polygon points="50,34 72,72 28,72" fill="#ffffff" fill-opacity="0.16"/>
    <polygon points="50,10 72,72 50,34" fill="#ffffff" fill-opacity="0.28"/>
    <polygon points="50,10 28,72 50,34" fill="#ffffff" fill-opacity="0.18"/>
    <polygon points="8,83 92,83 72,72 28,72" fill="#000000" fill-opacity="0.22"/>
  </svg>`,

  // 5: 아쿠아마린
  `<svg class="gem" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g-aqua" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#9be7f0" stop-opacity="0.92"/>
        <stop offset="50%" stop-color="#48a8b5" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#21656e" stop-opacity="0.92"/>
      </linearGradient>
    </defs>
    <polygon points="31,9 69,9 91,31 91,69 69,91 31,91 9,69 9,31" fill="url(#g-aqua)" stroke="#c2f4fa" stroke-width="1.5" stroke-opacity="0.6"/>
    <polygon points="36,26 64,26 74,36 74,64 64,74 36,74 26,64 26,36" fill="#ffffff" fill-opacity="0.16"/>
    <polygon points="31,9 69,9 64,26 36,26" fill="#ffffff" fill-opacity="0.34"/>
    <polygon points="9,31 31,9 36,26 26,36" fill="#ffffff" fill-opacity="0.24"/>
    <polygon points="31,91 69,91 64,74 36,74" fill="#000000" fill-opacity="0.22"/>
  </svg>`
];

function initGame() {
  score = 0;
  updateScore(0);
  selectedCell = null;
  isProcessing = false;
  createInitialGrid();
  ensurePlayableBoard();
  renderBoard();
}

function createInitialGrid() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let type;
      do {
        type = Math.floor(Math.random() * GEMS.length);
      } while (
        (c >= 2 && grid[r][c - 1] === type && grid[r][c - 2] === type) ||
        (r >= 2 && grid[r - 1][c] === type && grid[r - 2][c] === type)
      );
      grid[r][c] = type;
    }
  }
}
function renderBoard() {
  boardEl.innerHTML = '';
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
        cell.innerHTML = GEMS[grid[r][c]];
      }

      cell.addEventListener('touchstart', (e) => handleTouchStart(e, r, c), { passive: true });
      cell.addEventListener('touchend', (e) => handleTouchEnd(e), { passive: true });
      cell.addEventListener('click', () => handleCellClick(r, c));

      boardEl.appendChild(cell);
    }
  }
}

function handleTouchStart(e, r, c) {
  if (isProcessing) return;
  const touch = e.changedTouches;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartCell = { r, c };
}

function handleTouchEnd(e) {
  if (isProcessing || !touchStartCell) return;
  const touch = e.changedTouches;
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const threshold = 24;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    touchStartCell = null;
    return;
  }

  let targetR = touchStartCell.r;
  let targetC = touchStartCell.c;

  if (Math.abs(dx) > Math.abs(dy)) {
    targetC += dx > 0 ? 1 : -1;
  } else {
    targetR += dy > 0 ? 1 : -1;
  }

  const startR = touchStartCell.r;
  const startC = touchStartCell.c;
  touchStartCell = null;

  if (targetR >= 0 && targetR < ROWS && targetC >= 0 && targetC < COLS) {
    selectedCell = null;
    attemptSwap(startR, startC, targetR, targetC);
  }
}

function handleCellClick(r, c) {
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

  const matches = findMatches();
  if (matches.length === 0) {
    swap(r1, c1, r2, c2);
    renderBoard();
    await sleep(150);
    isProcessing = false;
    return;
  }

  await processMatches(matches);
  ensurePlayableBoard();
  renderBoard();
  isProcessing = false;
}

function swap(r1, c1, r2, c2) {
  const temp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = temp;
}

function findMatches() {
  const matchedSet = new Set();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 2; c++) {
      const type = grid[r][c];
      if (type !== null && type === grid[r][c + 1] && type === grid[r][c + 2]) {
        let k = c;
        while (k < COLS && grid[r][k] === type) {
          matchedSet.add(`${r},${k}`);
          k++;
        }
      }
    }
  }

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 2; r++) {
      const type = grid[r][c];
      if (type !== null && type === grid[r + 1][c] && type === grid[r + 2][c]) {
        let k = r;
        while (k < ROWS && grid[k][c] === type) {
          matchedSet.add(`${k},${c}`);
          k++;
        }
      }
    }
  }

  return Array.from(matchedSet).map(str => {
    const [r, c] = str.split(',').map(Number);
    return { r, c };
  });
}

async function processMatches(initialMatches) {
  let matches = initialMatches;
  let combo = 1;

  while (matches.length > 0) {
    matches.forEach(({ r, c }) => {
      const cell = boardEl.children[r * COLS + c];
      const gem = cell.querySelector('.gem');
      if (gem) gem.classList.add('matched');
    });

    updateScore(matches.length * 10 * combo);
    await sleep(220);

    matches.forEach(({ r, c }) => {
      grid[r][c] = null;
    });

    applyGravityAndRefill();
    renderBoard();
    await sleep(220);

    matches = findMatches();
    combo++;
  }
}

function applyGravityAndRefill() {
  for (let c = 0; c < COLS; c++) {
    let emptyRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] !== null) {
        grid[emptyRow][c] = grid[r][c];
        if (emptyRow !== r) {
          grid[r][c] = null;
        }
        emptyRow--;
      }
    }
    for (let r = emptyRow; r >= 0; r--) {
      grid[r][c] = Math.floor(Math.random() * GEMS.length);
    }
  }
}

function hasValidMove() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) {
        swap(r, c, r, c + 1);
        const match = findMatches().length > 0;
        swap(r, c, r, c + 1);
        if (match) return true;
      }
      if (r + 1 < ROWS) {
        swap(r, c, r + 1, c);
        const match = findMatches().length > 0;
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
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

restartBtn.addEventListener('click', initGame);
initGame();
