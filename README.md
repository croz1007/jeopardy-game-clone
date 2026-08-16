# Jeopardy

A Jeopardy-style game board for the classroom. Load your own questions from
a CSV file and play — no installation, no accounts, no internet connection
required.

## How to open the game

1. Find the `index.html` file in this folder.
2. Double-click it. It opens in your web browser (Chrome, Edge, Safari, etc.).
3. A screen pops up asking you to choose a game or start a new one — see
   below for both.

## Starting a game

The first time you open the game (or any time you have no saved games yet),
you'll see a welcome screen with a **+ Start New Game** button. Click it,
then:

1. **Choose a CSV file** — pick your questions file (see "Making your own
   questions file" below). If something's wrong with the file, you'll see
   an error and can pick a different one.
2. **Name the game** — give it a name you'll recognize later, like
   `Period 3` or `Chapter 5 Review`. It's pre-filled with the file's name,
   but you can change it.
3. Click **Start Game** and you're playing.

## Choosing or switching games

Once you have at least one saved game, opening `index.html` shows a list of
your saved games instead of the welcome screen. Click any game to resume it
right where it was left off, or click **+ Start New Game** to add another.

You can also click the **New Game** button in the top right at any time —
even mid-game — to bring this same screen back up, whether to switch to a
different saved game or start a new one.

**Up to 3 games can be saved at a time.** If you already have 3 and start a
new one, you'll be asked which of the 3 to replace — pick one, and it's
cleared to make room for the new game.

## Making your own questions file

Start from the included example instead of building a file from scratch:

1. Find `data/sample-data.csv` in this folder and make a copy of it (rename
   the copy to whatever you like, e.g. `my-class-trivia.csv`).
2. Open your copy in Excel, Google Sheets, Numbers, or even Notepad.
3. Replace the categories, questions, and answers with your own, following
   the same layout — one row per clue, same four columns.
4. Save the file — if your program asks for a format, choose **CSV**
   (in Excel or Sheets: File → Save As / Download → CSV).
5. Use it when starting a new game (see above).

A few tips:

- Every row with the same **category** groups into one column on the board.
- **value** is just the number (no `$`) — the tile shows it automatically.
- **answer** is revealed when a tile is clicked a second time. The real show
  phrases answers as questions (e.g. `What is Au?`), but that's just a fun
  convention — not required.
- You don't have to stick to 6 categories or 5 values — add or delete rows
  and the board resizes to fit.
- If any of your text has a comma in it, wrap that entry in quotes, like
  `"Painters, sculptors, and other artists"`.

## How to play

1. Click any point-value tile to show the clue full-screen.
2. Click anywhere to reveal the answer.
3. Click again to close it and return to the board.
4. A tile that's been used goes blank (with a faint outline marking the spot) and can't be picked again, just like the real show.

## If class ends mid-game

Each saved game remembers its progress automatically — if the page gets
closed, refreshed, or the computer restarts, reopening `index.html` and
resuming that game picks up right where it was left off, with the same
tiles still blanked out. This is saved in the browser on that computer, so
it won't follow you to a different computer or browser.

Note: this version is just the board — keeping score and taking turns is up
to the players for now.
