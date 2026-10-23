
// State Variables
let gridSize = 4; // Default 4x4
let totalTiles = 16;
let tiles = []; // Array storing current positions (0 = empty slot)
let moves = 0;
let timer = null;
let secondsElapsed = 0;
let isGameActive = false;
let isMuted = false;
let tileColors = {};

// Sound FX setup
let slideSynth;

function initAudio() {
  if (!slideSynth) {
    slideSynth = new Tone.MembraneSynth( {
    pitchDecay:
      0.01,
      octaves:
      2,
      oscillator: {
      type:
        "sine"
      }
      ,
      envelope: {
      attack:
      0.001, decay:
      0.1, sustain:
      0, release:
        0.1
      }
    }
    ).toDestination();
    slideSynth.volume.value = -12;
  }
}

function playSlideSound() {
  if (isMuted) return;
  try {
    if (Tone.context.state !== 'running') {
      Tone.start();
    }
    initAudio();
    slideSynth.triggerAttackRelease("C2", "8n");
  }
  catch (e) {
  }
}

function playWinSound() {
  if (isMuted) return;
  try {
    if (Tone.context.state !== 'running') {
      Tone.start();
    }
    const now = Tone.now();
    const poly = new Tone.PolySynth(Tone.Synth).toDestination();
    poly.volume.value = -8;
    poly.triggerAttackRelease(["C4", "E4", "G4", "C5"], "0.3", now);
    poly.triggerAttackRelease(["G4", "B4", "D5", "G5"], "0.5", now + 0.25);
  }
  catch (e) {
  }
}

function toggleSound() {
  isMuted = !isMuted;
  const icon = document.getElementById('soundIcon');
  if (isMuted) {
    icon.className = 'fa-solid fa-volume-xmark text-slate-500';
  } else {
    icon.className = 'fa-solid fa-volume-high text-slate-300';
  }
}

// Initialize grid size selector options (3x3 to 20x20)
function populateGridSizeOptions() {
  const select = document.getElementById('gridSizeSelect');
  select.innerHTML = '';
  for (let i = 3; i <= 20; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `$ {
      i
    }
    x $ {
      i
    }
    `;
    if (i === 4) opt.selected = true;
    select.appendChild(opt);
  }
}

function changeGridSize(newSize) {
  gridSize = parseInt(newSize, 10);
  formColors();
  totalTiles = gridSize * gridSize;
  createBoard();
  shuffleBoard();
}

// Initialize/Re-create DOM tiles
function createBoard() {
  const board = document.getElementById('puzzleBoard');
  board.innerHTML = '';

  // Initial solved order: [1, 2, ..., N^2-1, 0]
  tiles = Array.from( {
  length:
    totalTiles
  }
  , (_, i) => (i === totalTiles - 1 ? 0 : i + 1));

  // Dynamic font sizing calculation depending on grid dimension
  let fontSizeClass = "text-xl";
  if (gridSize >= 12) fontSizeClass = "text-[9px]";
  else if (gridSize >= 8) fontSizeClass = "text-xs";
  else if (gridSize >= 6) fontSizeClass = "text-sm";
  else if (gridSize >= 5) fontSizeClass = "text-base";

  for (let i = 1; i < totalTiles; i++) {
    const tile = document.createElement('div');
    tile.id = `tile-$ {
      i
    }
    `;
  tile.className = `puzzle-tile rounded-lg sm:
    rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border border-indigo-400/30 $ {
      fontSizeClass
    }
    `;

    const span = document.createElement('span');
    span.className = 'tile-text';
    span.innerText = i;
    tile.appendChild(span);

    // Smart click listener: Moves tile if adjacent to empty slot
    tile.addEventListener('click', () => handleTileClick(i));

    board.appendChild(tile);
  }

  updateBoardUI(false);
}



// Colorama
function formColors() {
  let t = 255, k=t*3/(gridSize-1), l=0;
  grid = [ {
  }
  ];
  for (let i=1; i<=gridSize*gridSize; i++) {
    grid[l][i] = [197, 53, 15];
    if (i%gridSize==0) {
      grid[l+1] = {};
      l++;
    }
  }

  for (let i=1; i<=gridSize; i++) {
    for (let j=1; j<=gridSize; j++) {
      tileColors[i+(j-1)*gridSize] = grid[j-1][i+(j-1)*gridSize];
    }
  }

  let pot = 0;
  for (let niv=0; niv<gridSize-1; niv++) {
    clr = [0, 0, 0];
    let rel = k*niv;
    if (pot>=t*2) {
      clr = [rel%255, 0, 255-rel%255];
    } else if (pot>=t) {
      clr = [0, 255-rel%255, rel%255];
    } else {
      clr = [255-rel%255, rel%255, 0];
    }
    // console.log(clr);
    for (let i=1; i<=gridSize-niv; i++) {
      tileColors[i+niv*(gridSize+1)] = clr;
      tileColors[1+(i-1)*gridSize+niv*(gridSize+1)] = clr;
    }
    pot += k;
  }


  // console.log(tileColors);
}

// Render current tiles state into positions
function updateBoardUI(animate = true) {
  const tileSizePercent = 100 / gridSize;
  const gapPercent = 0.5; // Slight visual margin

  tiles.forEach((value, index) => {
    if (value !== 0) {
      const tile = document.getElementById(`tile-$ {
        value
      }
      `);
      if (!tile) return;

      const row = Math.floor(index / gridSize);
      const col = index % gridSize;

      // Compute dynamic sizing and positioning
      tile.style.width = `calc($ {
        tileSizePercent
      }
      % - 2px)`;
      tile.style.height = `calc($ {
        tileSizePercent
      }
      % - 2px)`;
      // if (index==0) tile.style.background = `rgb(155,24,89)`;
      // else tile.style.background = ``;
      if (value!=0) {
        // console.log(value);
        let clr = tileColors[value];
        tile.style.background = `rgb(`+clr[0]+`, `+clr[1]+`, `+clr[2]+`)`;
      }

      const posX = col * 100;
      const posY = row * 100;

      if (!animate) {
        tile.style.transition = 'none';
      } else {
        tile.style.transition = 'transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)';
      }

      tile.style.transform = `translate3d($ {
        posX
      }
      %, $ {
        posY
      }
      %, 0)`;
    }
  }
  );
}

// Click handler: If tile is adjacent to empty space, slide it
function handleTileClick(tileValue) {
  const tileIndex = tiles.indexOf(tileValue);
  const emptyIndex = tiles.indexOf(0);

  if (canMove(tileIndex, emptyIndex)) {
    makeMove(tileIndex, emptyIndex);
  }
}

// Test adjacency (row or column offset by 1)
function canMove(idx1, idx2) {
  const row1 = Math.floor(idx1 / gridSize);
  const col1 = idx1 % gridSize;
  const row2 = Math.floor(idx2 / gridSize);
  const col2 = idx2 % gridSize;

  const isAdjacentRow = Math.abs(row1 - row2) === 1 && col1 === col2;
  const isAdjacentCol = Math.abs(col1 - col2) === 1 && row1 === row2;

  return isAdjacentRow || isAdjacentCol;
}

// Perform move logic
function makeMove(fromIndex, toIndex) {
  if (!isGameActive) {
    startTimer();
    isGameActive = true;
  }

  // Swap values
  [tiles[fromIndex], tiles[toIndex]] = [tiles[toIndex], tiles[fromIndex]];

  moves++;
  document.getElementById('movesCount').innerText = moves;

  playSlideSound();
  updateBoardUI(true);
  state = {
  gridSize:
  gridSize,
  totalTiles:
  totalTiles,
  tiles:
  tiles,
  moves:
  moves,
  secondsElapsed:
  secondsElapsed,
  isGameActive:
  isGameActive,
  isMuted:
  isMuted,
};
saveProgress(state);

if (checkVictory()) {
  handleVictory();
}
}

// Generic Solvability Check for ANY N x N board size:
// 1. Calculate inversion count.
// 2. If N is odd: Solvability requires Inversions to be EVEN.
// 3. If N is even: Solvability requires:
//    (Inversions + Row of empty slot from bottom [1-based]) to be EVEN.
function isSolvable(arr) {
  let inversions = 0;
  const flatTiles = arr.filter(val => val !== 0);

  for (let i = 0; i < flatTiles.length; i++) {
    for (let j = i + 1; j < flatTiles.length; j++) {
      if (flatTiles[i] > flatTiles[j]) {
        inversions++;
      }
    }
  }
  console.log("Inversions: "+inversions);
  if (gridSize % 2 !== 0) {
    // Odd grid size (3x3, 5x5, 7x7...)
    return inversions % 2 === 0;
  } else {
    // Even grid size (4x4, 6x6, 8x8...)
    const emptyIndex = arr.indexOf(0);
    const emptyRowFromTop = Math.floor(emptyIndex / gridSize);
    const emptyRowFromBottom = gridSize - emptyRowFromTop; // 1-based from bottom
    console.log("Line 0: "+emptyRowFromBottom);
    return (inversions + emptyRowFromBottom) % 2 !== 0;
  }
}

function isSolvedAlready(arr) {
  for (let i = 0; i < totalTiles - 1; i++) {
    if (arr[i] !== i + 1) return false;
  }
  return arr[totalTiles - 1] === 0;
}

// Shuffle board guaranteeing solvability
function shuffleBoard() {
  stopTimer();
  resetTimer();
  moves = 0;
  document.getElementById('movesCount').innerText = '0';
  isGameActive = false;

  do {
    // Fisher-Yates Shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
  } while (!isSolvable(tiles) || isSolvedAlready(tiles));

  updateBoardUI(true);
}

function resetBoard() {
  stopTimer();
  resetTimer();
  moves = 0;
  document.getElementById('movesCount').innerText = '0';
  isGameActive = false;

  tiles = Array.from( {
  length:
    totalTiles
  }
  , (_, i) => (i === totalTiles - 1 ? 0 : i + 1));
  updateBoardUI(true);
}

// Victory check
function checkVictory() {
  return isSolvedAlready(tiles);
}

function handleVictory() {
  stopTimer();
  isGameActive = false;
  playWinSound();

  try {
    confetti( {
    particleCount:
      120,
      spread:
      80,
      origin: {
      y:
        0.6
      }
    }
    );
  }
  catch (e) {
  }

  document.getElementById('modalGridDesc').innerText = `$ {
    gridSize
  }
  ×$ {
    gridSize
  }
  `;
  document.getElementById('finalMoves').innerText = moves;
  document.getElementById('finalTime').innerText = formatTime(secondsElapsed);

  const modal = document.getElementById('victoryModal');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.querySelector('.id-modal-card').classList.remove('scale-90');
  modal.querySelector('.id-modal-card').classList.add('scale-100');
}

function closeVictoryModal() {
  const modal = document.getElementById('victoryModal');
  modal.classList.add('opacity-0', 'pointer-events-none');
  modal.querySelector('.id-modal-card').classList.remove('scale-100');
  modal.querySelector('.id-modal-card').classList.add('scale-90');
}

// Timer
function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    secondsElapsed++;
    document.getElementById('timerText').innerText = formatTime(secondsElapsed);
  }
  , 1000);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function resetTimer() {
  secondsElapsed = 0;
  document.getElementById('timerText').innerText = '00:00';
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor(totalSeconds / 60)%60;
  const secs = totalSeconds % 60;
  let str = `${String(mins).padStart(2, '0')  }:${String(secs).padStart(2, '0')}`;
  if (hours>0)
  str=`$ {
    String(hours).padStart(2, '0')
  }
:
  `+str;
  return str;
}

// Save
// Objeto com o estado atual do seu jogo
function saveProgress(state) {
  // Converte o objeto do jogo em uma string JSON e salva
  localStorage.setItem('saved', JSON.stringify(state));
  console.log('Jogo salvo com sucesso!');
}
function loadProgress() {
  const dadosSalvos = localStorage.getItem('saved');

  if (dadosSalvos !== null) {
    // Converte a string JSON de volta para um objeto JavaScript
    const estadoCarregado = JSON.parse(dadosSalvos);
    console.log('Dados carregados:', estadoCarregado);
    return estadoCarregado;
  } else {
    console.log('Nenhum jogo salvo foi encontrado.');
    return null;
  }
}

// PC Keyboard Controls (Arrow Keys)
document.addEventListener('keydown', (e) => {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    return;
  }
  e.preventDefault();

  const emptyIndex = tiles.indexOf(0);
  const emptyRow = Math.floor(emptyIndex / gridSize);
  const emptyCol = emptyIndex % gridSize;

  let targetIndex = -1;

  // Pressing Arrow Up slides the tile BELOW the empty space UP into the empty slot.
  if (e.key === 'ArrowUp' && emptyRow < gridSize - 1) {
    targetIndex = emptyIndex + gridSize;
  }
  // Pressing Arrow Down slides the tile ABOVE the empty space DOWN into the empty slot.
  else if (e.key === 'ArrowDown' && emptyRow > 0) {
    targetIndex = emptyIndex - gridSize;
  }
  // Pressing Arrow Left slides the tile to the RIGHT of empty space LEFT into empty slot.
  else if (e.key === 'ArrowLeft' && emptyCol < gridSize - 1) {
    targetIndex = emptyIndex + 1;
  }
  // Pressing Arrow Right slides the tile to the LEFT of empty space RIGHT into empty slot.
  else if (e.key === 'ArrowRight' && emptyCol > 0) {
    targetIndex = emptyIndex - 1;
  }

  if (targetIndex !== -1 && targetIndex >= 0 && targetIndex < totalTiles) {
    makeMove(targetIndex, emptyIndex);
  }
}
);

// Window resize event handler
window.addEventListener('resize', () => updateBoardUI(false));

// On Load
window.onload = () => {
  populateGridSizeOptions();
  state = loadProgress();
  if (state==null) {
    createBoard();
    shuffleBoard();
  } else {
    //         state = {
    //         gridSize: gridSize,
    // totalTiles: totalTiles,
    // tiles: tiles,
    // moves: moves,
    // secondsElapsed: secondsElapsed,
    // isGameActive: isGameActive,
    // isMuted: isMuted,
    //     };
    gridSize = state.gridSize;
    totalTiles = state.totalTiles;
    secondsElapsed = state.secondsElapsed;
    tiles = state.tiles;
    moves = state.moves;
    isGameActive = state.isGameActive;
    isMuted = state.isMuted;
    createBoard();
    formColors();
  }
};
