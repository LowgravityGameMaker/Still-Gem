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
let ignoreNextClick = false;
let svgUid = 0;

function getGemSVG(type) {
  const id = `gem-${type}-${++svgUid}`;

  switch (type) {
    case 0: // 루비
      return `<svg class="gem" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff9aa2" stop-opacity="0.95"/>
            <stop offset="45%" stop-color="#e05663" stop-opacity="0.72"/>
            <stop offset="100%" stop-color="#8a1c27" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        <polygon points="50,5 95,50 50,95 5,50" fill="url(#${id})" stroke="#ffc2c7" stroke-width="2" stroke-opacity="0.75"/>
        <polygon points="50,24 76,50 50,76 24,50" fill="#ffffff" fill-opacity="0.22"/>
        <polygon points="50,5 76,50 50,24" fill="#ffffff" fill-opacity="0.45"/>
        <polygon points="50,5 24,50 50,24" fill="#ffffff" fill-opacity="0.25"/>
        <polygon points="50,95 76,50 50,76" fill="#000000" fill-opacity="0.28"/>
      </svg>`;

    case 1: // 사파이어
      return `<svg class="gem" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="${id}" x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stop-color="#a3d5ff" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#4a9be0" stop-opacity="0.72"/>
            <stop offset="100%" stop-color="#1b4978" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="42" fill="url(#${id})" stroke="#cce7ff" stroke-width="2" stroke-opacity="0.75"/>
        <circle cx="50" cy="50" r="25" fill="#ffffff" fill-opacity="0.18"/>
        <path d="M 22 36 A 33 33 0 0 1 70 20 A 37 37 0 0 0 22 36 Z" fill="#ffffff" fill-opacity="0.55"/>
        <ellipse cx="35" cy="29" rx="9" ry="4.5" transform="rotate(-32 35 29)" fill="#ffffff" fill-opacity="0.65"/>
      </svg>`;

    case 2: // 에메랄드
      return `<svg class="gem" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#c3eba4" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#7eb356" stop-opacity="0.72"/>
            <stop offset="100%" stop-color="#385e1e" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        <polygon points="24,8 76,8 92,24 92,76 76,92 24,92 8,76 8,24" fill="url(#${id})" stroke="#dcf7c6" stroke-width="2" stroke-opacity="0.75"/>
        <rect x="25" y="25" width="50" height="50" rx="4" fill="#ffffff" fill-opacity="0.2"/>
        <polygon points="24,8 76,8 75,25 25,25" fill="#ffffff" fill-opacity="0.45"/>
        <polygon points="8,24 24,8 25,25 25,75 8,76" fill="#ffffff" fill-opacity="0.25"/>
        <polygon points="24,92 76,92 75,75 25,75" fill="#000000" fill-opacity="0.28"/>
      </svg>`;

    case 3: // 토파즈
      return `<svg class="gem" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffe8b3" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#d9aa52" stop-opacity="0.72"/>
            <stop offset="100%" stop-color="#7a5514" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        <polygon points="50,6 90,28 90,72 50,94 10,72 10,28" fill="url(#${id})" stroke="#fff1cc" stroke-width="2" stroke-opacity="0.75"/>
        <polygon points="50,25 73,38 73,62 50,75 27,62 27,38" fill="#ffffff" fill-opacity="0.22"/>
        <polygon points="50,6 90,28 73,38 50,25 27,38 10,28" fill="#ffffff" fill-opacity="0.45"/>
        <polygon points="50,94 90,72 73,62 50,75" fill="#000000" fill-opacity="0.26"/>
      </svg>`;

    case 4: // 자수정
      return `<svg class="gem" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="${id}" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stop-color="#eabaff" stop-opacity="0.95"/>
            <stop offset="55%" stop-color="#b262cc" stop-opacity="0.72"/>
            <stop offset="100%" stop-color="#58206b" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        <polygon points="50,8 94,84 6,84" fill="url(#${id})" stroke="#f5d6ff" stroke-width="2" stroke-opacity="0.75"/>
        <polygon points="50,34 72,72 28,72" fill="#ffffff" fill-opacity="0.22"/>
        <polygon points="50,8 72,72 50,34" fill="#ffffff" fill-opacity="0.42"/>
        <polygon points="50,8 28,72 50,34" fill="#ffffff" fill-opacity="0.25"/>
        <polygon points="6,84 94,84 72,72 28,72" fill="#000000" fill-opacity="0.28"/>
      </svg>`;

    case 5: // 아쿠아마린
      return `<svg class="gem" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#b0f0f7" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#48a8b5" stop-opacity="0.72"/>
            <stop offset="100%" stop-color="#195259" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        <polygon points="31,8 69,8 92,31 92,69 69,92 31,92 8,69 8,31" fill="url(#${id})" stroke="#d1f9fc" stroke-width="2" stroke-opacity="0.75"/>
        <polygon points="36,26 64,26 74,36 74,64 64,74 36,74 26,64 26,36" fill="#ffffff" fill-opacity="0.22"/>
        <polygon points="31,8 69,8 64,26 36,26" fill="#ffffff" fill-opacity="0.48"/>
        <polygon points="8,31 31,8 36,26 26,36" fill="#ffffff" fill-opacity="0.32"/>
        <polygon points="31,92 69,92 64,74 36,74" fill="#000000" fill-opacity="0.28"/>
      </svg>`;
  }
}

const GEM_TYPES = 6;

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
        type = Math.floor(Math.random() * GEM_TYPES);
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
        cell.innerHTML = getGemSVG(grid[r][c]);
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
  const touch = e.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartCell = { r, c };
}

function handleTouchEnd(e) {
  if (isProcessing || !touchStartCell) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const threshold = 20;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    touchStartCell = null;
    return;
  }

  ignoreNextClick = true;
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
  if (ignoreNextClick) {
    ignoreNextClick = false;
    return;
  }
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
      grid[r][c] = Math.floor(Math.random() * GEM_TYPES);
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
