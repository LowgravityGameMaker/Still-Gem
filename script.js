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

// 6가지 차분한 톤의 순수 SVG 기하학 보석
const GEMS = [
  `<svg class="gem" viewBox="0 0 100 100"><polygon points="50,8 92,50 50,92 8,50" fill="#e06c75"/><polygon points="50,24 76,50 50,76 24,50" fill="#eb8b92" opacity="0.5"/></svg>`,
  `<svg class="gem" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#61afef"/><circle cx="50" cy="50" r="24" fill="#8cc6f5" opacity="0.45"/></svg>`,
  `<svg class="gem" viewBox="0 0 100 100"><rect x="14" y="14" width="72" height="72" rx="16" fill="#98c379"/><rect x="28" y="28" width="44" height="44" rx="8" fill="#b5d69c" opacity="0.45"/></svg>`,
  `<svg class="gem" viewBox="0 0 100 100"><polygon points="50,8 88,29 88,71 50,92 12,71 12,29" fill="#e5c07b"/><polygon points="50,24 74,37 74,63 50,76 26,63 26,37" fill="#edd29f" opacity="0.5"/></svg>`,
  `<svg class="gem" viewBox="0 0 100 100"><polygon points="50,12 90,82 10,82" fill="#c678dd"/><polygon points="50,34 72,72 28,72" fill="#d79ee8" opacity="0.45"/></svg>`,
  `<svg class="gem" viewBox="0 0 100 100"><polygon points="32,10 68,10 90,32 90,68 68,90 32,90 10,68 10,32" fill="#56b6c2"/><rect x="30" y="30" width="40" height="40" rx="6" fill="#7ecad4" opacity="0.45"/></svg>`
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

      // 터치 스와이프 및 클릭 이벤트 연결
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
  const threshold = 24; // 스와이프 인식 최소 거리(px)

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    touchStartCell = null;
    return; // 짧은 터치는 click 이벤트로 넘김
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

// 유효한 수가 있는지 검사하고 없으면 자동 재배치
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
