const ROWS = 8;
const COLS = 8;
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart-btn');

let grid = [];
let selectedCell = null;
let score = 0;
let isProcessing = false;

// 6가지 차분한 톤의 순수 SVG 기하학 보석
const GEMS = [
  // 0: 루비 (차분한 로즈 레드 - 다이아몬드형)
  `<svg class="gem" viewBox="0 0 100 100"><polygon points="50,8 92,50 50,92 8,50" fill="#e06c75"/><polygon points="50,24 76,50 50,76 24,50" fill="#eb8b92" opacity="0.5"/></svg>`,
  // 1: 사파이어 (차분한 스틸 블루 - 원형)
  `<svg class="gem" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#61afef"/><circle cx="50" cy="50" r="24" fill="#8cc6f5" opacity="0.45"/></svg>`,
  // 2: 에메랄드 (차분한 세이지 그린 - 둥근 사각형)
  `<svg class="gem" viewBox="0 0 100 100"><rect x="14" y="14" width="72" height="72" rx="16" fill="#98c379"/><rect x="28" y="28" width="44" height="44" rx="8" fill="#b5d69c" opacity="0.45"/></svg>`,
  // 3: 토파즈 (차분한 앰버 옐로우 - 육각형)
  `<svg class="gem" viewBox="0 0 100 100"><polygon points="50,8 88,29 88,71 50,92 12,71 12,29" fill="#e5c07b"/><polygon points="50,24 74,37 74,63 50,76 26,63 26,37" fill="#edd29f" opacity="0.5"/></svg>`,
  // 4: 자수정 (차분한 라벤더 퍼플 - 삼각형)
  `<svg class="gem" viewBox="0 0 100 100"><polygon points="50,12 90,82 10,82" fill="#c678dd"/><polygon points="50,34 72,72 28,72" fill="#d79ee8" opacity="0.45"/></svg>`,
  // 5: 아쿠아마린 (차분한 틸 민트 - 팔각형)
  `<svg class="gem" viewBox="0 0 100 100"><polygon points="32,10 68,10 90,32 90,68 68,90 32,90 10,68 10,32" fill="#56b6c2"/><rect x="30" y="30" width="40" height="40" rx="6" fill="#7ecad4" opacity="0.45"/></svg>`
];

function initGame() {
  score = 0;
  updateScore(0);
  selectedCell = null;
  isProcessing = false;
  createInitialGrid();
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
      cell.addEventListener('click', () => handleCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }
}

async function handleCellClick(r, c) {
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

  isProcessing = true;
  const r1 = selectedCell.r, c1 = selectedCell.c;
  selectedCell = null;

  swap(r1, c1, r, c);
  renderBoard();
  await sleep(180);

  const matches = findMatches();
  if (matches.length === 0) {
    swap(r1, c1, r, c);
    renderBoard();
    await sleep(150);
    isProcessing = false;
    return;
  }

  await processMatches(matches);
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

function updateScore(points) {
  score += points;
  scoreEl.textContent = score.toLocaleString();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

restartBtn.addEventListener('click', initGame);
initGame();
