const $ = (id) => document.getElementById(id);

const boardEl = $('board');
const csvInputEl = $('csv-input');
const newGameBtnEl = $('new-game-btn');
const overlayEl = $('clue-overlay');
const clueTextEl = $('clue-text');
const clueHintEl = $('clue-hint');
const activeGameNameEl = $('active-game-name');
const pickerModalEl = $('picker-modal');
const pickerCardEl = $('picker-card');

const GAMES_KEY = 'jeopardy-games';
const MAX_GAMES = 3;

let activeClue = null;
let activeCell = null;
let showingAnswer = false;
let activeGameId = null;
let usedKeys = new Set();
let pendingOverwriteId = null;

function clueKey(clue) {
     return `${clue.category}::${clue.value}`;
}

function escapeHtml(str) {
     const div = document.createElement('div');
     div.textContent = str;
     return div.innerHTML;
}

function loadGames() {
     try {
          const raw = localStorage.getItem(GAMES_KEY);
          const games = raw ? JSON.parse(raw) : [];
          return Array.isArray(games) ? games : [];
     } catch (err) {
          return [];
     }
}

function saveGames(games) {
     try {
          localStorage.setItem(GAMES_KEY, JSON.stringify(games.slice(0, MAX_GAMES)));
     } catch (err) {
          // private browsing / storage disabled — progress just won't persist
     }
}

function persistActiveUsedKeys() {
     if (!activeGameId) return;
     const games = loadGames();
     const game = games.find(g => g.id === activeGameId);
     if (!game) return;
     game.usedKeys = [...usedKeys];
     game.updatedAt = Date.now();
     saveGames(games);
}

// Handles quoted fields (so clue text can contain commas/newlines).
function parseCSV(text) {
     const rows = [];
     let row = [], field = '', inQuotes = false;
     for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (inQuotes) {
               if (c === '"') {
                    if (text[i + 1] === '"') { field += '"'; i++; }
                    else inQuotes = false;
               } else {
                    field += c;
               }
          } else if (c === '"') {
               inQuotes = true;
          } else if (c === ',') {
               row.push(field); field = '';
          } else if (c === '\n' || c === '\r') {
               if (c === '\r' && text[i + 1] === '\n') i++;
               row.push(field); field = '';
               if (row.some(f => f.trim() !== '')) rows.push(row);
               row = [];
          } else {
               field += c;
          }
     }
     if (field !== '' || row.length) row.push(field);
     if (row.some(f => f.trim() !== '')) rows.push(row);
     return rows;
}

function rowsToClues(rows) {
     if (!rows.length) throw new Error('CSV is empty');
     const header = rows[0].map(h => h.trim().toLowerCase());
     const idx = ['category', 'value', 'question', 'answer'].map(name => header.indexOf(name));
     if (idx.includes(-1)) throw new Error('CSV header must have category, value, question, answer columns');
     return rows.slice(1).map(r => ({
          category: (r[idx[0]] || '').trim(),
          value: Number(r[idx[1]]),
          question: (r[idx[2]] || '').trim(),
          answer: (r[idx[3]] || '').trim(),
     })).filter(clue => clue.category && clue.question && !Number.isNaN(clue.value));
}

function groupByCategory(clues) {
     const categories = [...new Set(clues.map(c => c.category))];
     return categories.map(category => ({
          category,
          clues: clues.filter(c => c.category === category).sort((a, b) => a.value - b.value),
     }));
}

function createBoardCell(className, text = '') {
     const cell = document.createElement('div');
     cell.className = className;
     cell.textContent = text;
     return cell;
}

function resetBoardGrid(columnCount, rowCount) {
     boardEl.innerHTML = '';
     boardEl.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
     boardEl.style.gridTemplateRows = `0.85fr repeat(${rowCount}, 1fr)`;
}

function renderBoard(groups, usedKeysToApply = new Set()) {
     const maxRows = Math.max(...groups.map(g => g.clues.length));
     resetBoardGrid(groups.length, maxRows);

     groups.forEach(group => boardEl.appendChild(createBoardCell('category', group.category)));

     for (let row = 0; row < maxRows; row++) {
          groups.forEach(group => {
               const clue = group.clues[row];
               if (clue && usedKeysToApply.has(clueKey(clue))) {
                    boardEl.appendChild(createBoardCell('value-cell used'));
               } else if (clue) {
                    const cell = createBoardCell('value-cell', `$${clue.value}`);
                    cell.addEventListener('click', () => openClue(clue, cell));
                    boardEl.appendChild(cell);
               } else {
                    boardEl.appendChild(createBoardCell('value-cell empty'));
               }
          });
     }
}

function renderPlaceholderBoard() {
     const categoryCount = 6;
     const values = [200, 400, 600, 800, 1000];
     resetBoardGrid(categoryCount, values.length);

     for (let i = 0; i < categoryCount; i++) {
          boardEl.appendChild(createBoardCell('category', 'Jeopardy!'));
     }
     values.forEach(value => {
          for (let i = 0; i < categoryCount; i++) {
               boardEl.appendChild(createBoardCell('value-cell placeholder', `$${value}`));
          }
     });
}

function setOverlayOrigin(cell) {
     const rect = cell.getBoundingClientRect();
     const x = rect.left + rect.width / 2;
     const y = rect.top + rect.height / 2;
     overlayEl.style.transformOrigin = `${x}px ${y}px`;
}

function openClue(clue, cell) {
     activeClue = clue;
     activeCell = cell;
     showingAnswer = false;
     clueTextEl.textContent = clue.question;
     clueHintEl.textContent = 'Click for the answer';
     setOverlayOrigin(cell);
     overlayEl.classList.add('visible');
}

function advanceClue() {
     if (!showingAnswer) {
          showingAnswer = true;
          clueTextEl.textContent = activeClue.answer;
          clueHintEl.textContent = 'Click to close';
     } else {
          closeClue();
     }
}

function closeClue() {
     activeCell.textContent = '';
     activeCell.classList.add('used');
     setOverlayOrigin(activeCell); // scale back down toward the tile that was just answered
     activeCell.replaceWith(activeCell.cloneNode(true)); // drops the click listener so a used cell can't reopen
     overlayEl.classList.remove('visible');
     usedKeys.add(clueKey(activeClue));
     persistActiveUsedKeys();
     activeClue = null;
     activeCell = null;
     showingAnswer = false;
}

overlayEl.addEventListener('click', advanceClue);

document.addEventListener('keydown', (e) => {
     if (!overlayEl.classList.contains('visible')) return;
     if (e.key === 'Escape') closeClue();
     else if (e.key === 'Enter' || e.key === ' ') advanceClue();
});

// --- Game picker modal ---

function openPicker() {
     pickerModalEl.classList.remove('hidden');
     renderPickerList();
}

function closePicker() {
     pickerModalEl.classList.add('hidden');
}

function activateGame(game) {
     try {
          const clues = rowsToClues(parseCSV(game.csvText));
          if (!clues.length) throw new Error('empty saved game');
          activeGameId = game.id;
          usedKeys = new Set(game.usedKeys || []);
          renderBoard(groupByCategory(clues), usedKeys);
          activeGameNameEl.textContent = game.name;
     } catch (err) {
          saveGames(loadGames().filter(g => g.id !== game.id));
          renderPlaceholderBoard();
          openPicker();
     }
}

function resumeGame(id) {
     const game = loadGames().find(g => g.id === id);
     if (!game) return;
     activateGame(game);
     closePicker();
}

function startGame(name, csvText, overwriteId) {
     const games = loadGames();
     const newGame = {
          id: overwriteId || String(Date.now()),
          name,
          csvText,
          usedKeys: [],
          updatedAt: Date.now(),
     };
     const nextGames = overwriteId
          ? games.map(g => (g.id === overwriteId ? newGame : g))
          : [...games, newGame];
     saveGames(nextGames);
     activateGame(newGame);
     closePicker();
}

function renderGameRow(game, action) {
     const current = action === 'resume' && game.id === activeGameId
          ? ' <span class="picker-row-current">(current)</span>'
          : '';
     return `
          <button type="button" class="picker-row" data-${action}="${game.id}">
               <span class="picker-row-name">${escapeHtml(game.name)}${current}</span>
               <span class="picker-row-date">${new Date(game.updatedAt).toLocaleString()}</span>
          </button>
     `;
}

function renderPickerList() {
     const games = loadGames();
     const rows = games.map(g => renderGameRow(g, 'resume')).join('');

     pickerCardEl.innerHTML = `
          <h2 class="modal-title">${games.length ? 'Choose a Game' : 'Welcome to Jeopardy!'}</h2>
          ${games.length ? `<div class="picker-list">${rows}</div>` : '<p class="modal-text">Start your first game to get going.</p>'}
          <button type="button" class="btn modal-primary" id="picker-start-new">+ Start New Game</button>
     `;

     pickerCardEl.querySelectorAll('[data-resume]').forEach(btn => {
          btn.addEventListener('click', () => resumeGame(btn.dataset.resume));
     });
     $('picker-start-new').addEventListener('click', () => {
          if (games.length >= MAX_GAMES) {
               renderPickerOverwrite(games);
          } else {
               renderPickerCsvStep(null);
          }
     });
}

function renderPickerOverwrite(games) {
     const rows = games.map(g => renderGameRow(g, 'overwrite')).join('');

     pickerCardEl.innerHTML = `
          <h2 class="modal-title">Replace Which Game?</h2>
          <p class="modal-text">You can save up to ${MAX_GAMES} games at a time. Pick one to replace.</p>
          <div class="picker-list">${rows}</div>
          <button type="button" class="btn modal-secondary" id="picker-back">Back</button>
     `;

     pickerCardEl.querySelectorAll('[data-overwrite]').forEach(btn => {
          btn.addEventListener('click', () => renderPickerCsvStep(btn.dataset.overwrite));
     });
     $('picker-back').addEventListener('click', renderPickerList);
}

function renderPickerCsvStep(overwriteId) {
     pendingOverwriteId = overwriteId;
     pickerCardEl.innerHTML = `
          <h2 class="modal-title">Choose Your Questions File</h2>
          <p class="modal-text">Pick a CSV file with your categories, values, questions, and answers.</p>
          <p class="modal-error" id="picker-csv-error"></p>
          <button type="button" class="btn modal-primary" id="picker-choose-file">Choose CSV File...</button>
          <button type="button" class="btn modal-secondary" id="picker-back">Back</button>
     `;
     $('picker-choose-file').addEventListener('click', () => csvInputEl.click());
     $('picker-back').addEventListener('click', renderPickerList);
}

function renderPickerNameStep(csvText, suggestedName, overwriteId) {
     pickerCardEl.innerHTML = `
          <h2 class="modal-title">Name This Game</h2>
          <p class="modal-text">e.g. the class period — this just helps you find it again later.</p>
          <input type="text" class="modal-input" id="picker-name-input" maxlength="60">
          <button type="button" class="btn modal-primary" id="picker-start-game">Start Game</button>
          <button type="button" class="btn modal-secondary" id="picker-back">Back</button>
     `;
     const nameInput = $('picker-name-input');
     nameInput.value = suggestedName;
     nameInput.focus();
     nameInput.select();
     $('picker-start-game').addEventListener('click', () => {
          const name = nameInput.value.trim() || 'Untitled Game';
          startGame(name, csvText, overwriteId);
     });
     $('picker-back').addEventListener('click', () => renderPickerCsvStep(overwriteId));
}

csvInputEl.addEventListener('change', (e) => {
     const file = e.target.files[0];
     e.target.value = ''; // allow re-selecting the same file later
     if (!file) return;
     const reader = new FileReader();
     reader.onload = () => {
          try {
               const clues = rowsToClues(parseCSV(reader.result));
               if (!clues.length) throw new Error('No valid clues found in that file');
               renderPickerNameStep(reader.result, file.name.replace(/\.csv$/i, ''), pendingOverwriteId);
          } catch (err) {
               $('picker-csv-error').textContent = `Could not read that file: ${err.message}`;
          }
     };
     reader.readAsText(file);
});

newGameBtnEl.addEventListener('click', openPicker);

renderPlaceholderBoard();
openPicker();
