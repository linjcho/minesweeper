// Board size and number of bombs for each difficulty
const LEVELS = {
  easy:   { rows: 9,  cols: 9,  bombs: 10 },
  medium: { rows: 16, cols: 16, bombs: 40 },
  hard:   { rows: 16, cols: 30, bombs: 100 },
};

const boardEl = document.getElementById('board');
const bombsEl = document.getElementById('bombs');
const timerEl = document.getElementById('timer');
const messageEl = document.getElementById('message');
const levelsEl = document.getElementById('levels');
const restartBtn = document.getElementById('restart');
const themeBtn = document.getElementById('theme');

let level = 'easy';
let rows, cols, bombCount;
let grid = [];
let started = false;
let gameOver = false;
let flags = 0;
let opened = 0;
let seconds = 0;
let timerId = null;

function newGame() {
  stopTimer();
  rows = LEVELS[level].rows;
  cols = LEVELS[level].cols;
  bombCount = LEVELS[level].bombs;

  grid = [];
  started = false;
  gameOver = false;
  flags = 0;
  opened = 0;
  seconds = 0;

  timerEl.textContent = 0;
  bombsEl.textContent = bombCount;
  messageEl.textContent = '';
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 28px)`;

  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r;
      el.dataset.c = c;
      boardEl.appendChild(el);
      grid[r][c] = { r, c, el, bomb: false, open: false, flag: false, count: 0 };
    }
  }
}

function placeBombs(safeR, safeC) {
  let placed = 0;
  while (placed < bombCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const nearStart = Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1;
    if (grid[r][c].bomb || nearStart) continue;
    grid[r][c].bomb = true;
    placed++;
  }

  for (const row of grid) {
    for (const cell of row) {
      cell.count = getNeighbors(cell).filter(n => n.bomb).length;
    }
  }
}

function getNeighbors(cell) {
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const row = grid[cell.r + dr];
      if (row && row[cell.c + dc]) result.push(row[cell.c + dc]);
    }
  }
  return result;
}

function render(cell) {
  const el = cell.el;
  el.className = 'cell';
  el.textContent = '';

  if (cell.open) {
    el.classList.add('open');
    if (cell.bomb) {
      el.classList.add('bomb');
    } else if (cell.count > 0) {
      el.textContent = cell.count;
      el.dataset.n = cell.count;
    }
  } else if (cell.flag) {
    el.classList.add('flag');
  }
}

function revealCell(cell) {
  if (gameOver || cell.open || cell.flag) return;

  cell.open = true;
  render(cell);

  if (cell.bomb) {
    endGame(false, cell);
    return;
  }

  opened++;
  if (cell.count === 0) {
    getNeighbors(cell).forEach(revealCell);
  }
}

function toggleFlag(cell) {
  if (gameOver || cell.open) return;
  cell.flag = !cell.flag;
  flags += cell.flag ? 1 : -1;
  bombsEl.textContent = bombCount - flags;
  render(cell);
}

function endGame(won, hitCell) {
  gameOver = true;
  stopTimer();

  for (const row of grid) {
    for (const cell of row) {
      if (won && cell.bomb && !cell.flag) {
        cell.flag = true;
        render(cell);
      }
      if (!won && cell.bomb && !cell.flag) {
        cell.open = true;
        render(cell);
      }
      if (!won && !cell.bomb && cell.flag) {
        cell.el.classList.add('wrong');
      }
    }
  }

  if (won) {
    bombsEl.textContent = 0;
    messageEl.textContent = `You win! Cleared in ${seconds} seconds.`;
  } else {
    hitCell.el.classList.add('boom');
    messageEl.textContent = 'Boom! You hit a bomb. Press New game to try again.';
  }
}

function startTimer() {
  timerId = setInterval(() => {
    seconds++;
    timerEl.textContent = seconds;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  localStorage.setItem('theme', theme);
}

function getCellFromEvent(event) {
  const el = event.target.closest('.cell');
  return el ? grid[el.dataset.r][el.dataset.c] : null;
}

boardEl.addEventListener('click', (event) => {
  const cell = getCellFromEvent(event);
  if (!cell || gameOver || cell.flag) return;

  if (!started) {
    placeBombs(cell.r, cell.c);
    started = true;
    startTimer();
  }

  revealCell(cell);

  if (!gameOver && opened === rows * cols - bombCount) {
    endGame(true);
  }
});

boardEl.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const cell = getCellFromEvent(event);
  if (cell) toggleFlag(cell);
});

levelsEl.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  level = button.dataset.level;
  levelsEl.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
  newGame();
});

restartBtn.addEventListener('click', newGame);

themeBtn.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme;
  setTheme(current === 'dark' ? 'light' : 'dark');
});

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

newGame();