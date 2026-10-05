# AGENTS.md

## What this is

Course project (`03-asteroids`): an Asteroids clone in pure HTML5 Canvas. All logic lives
in a single `game.js` (~600 lines, no modules). `README.md` is the original spec, in Spanish.

Four tracked files, nothing else: `index.html`, `game.js`, `favicon.svg`, `README.md`.

## Current state

- **No tooling whatsoever**: no `package.json`, no build step, no test runner, no linter or
  formatter, no `.gitignore`, no CI. Don't assume `npm test`, `lint`, or a typechecker
  exist — there is nothing to run. Verification is "open it in a browser and look".
  If you add tooling, add its commands here and a `.gitignore` in the same change.
- `index.html:24` loads `game.js` as a **classic script** (no `type="module"`). There are
  no imports and no `fetch`, so **opening `index.html` over `file://` works** — a server is
  optional. The README's `npx serve .` needs a network download; `python3 -m http.server`
  works offline.
- `game.js:1` is `'use strict'`, which only matters because it's a classic script. State
  bindings (`score`, `state`, `asteroids`, `ship`) are reachable by **bare name** in the
  devtools console, but not as `window.*` (top-level `let`/`const` skip the global object).
  Function declarations (`initGame`, `update`) do land on `window`. This is the fastest way
  to inspect a bug — use it before rewriting anything.

## Traps

- **Canvas size is duplicated.** `index.html:23` sets `width="800" height="600"` and
  `game.js:5-6` declares `const W = 800; const H = 600;`. Change one and the world
  coordinates no longer match the surface. Nothing is responsive; the CSS only adds a border.
- **Three parallel arrays are indexed by size, with index 0 unused** (`game.js:67-69`):
  `RADII = [0,16,30,50]`, `SPEEDS = [0,85,55,32]`, `POINTS = [0,100,50,20]`. Size **1 is the
  smallest**, so bigger means a lower index — the reverse of how the README's scoring table
  reads. Adding a size means editing all three in lockstep. Every asteroid spawns as size 3
  (`game.js:374`); smaller ones only come from `split()`.
- **Two effects are per-frame, not per-second**, so they change with refresh rate: ship drag
  (`DRAG = 0.987`, `game.js:206-207`) and the thruster flame flicker (`Math.random() > 0.35`,
  `game.js:255`). Tune `ROT`/`THRUST`/`DRAG` at 60 Hz. `dt` is clamped to `0.05`
  (`game.js:599`), so below ~20 fps the game slows down instead of teleporting.
- **Collision is center-distance only**, no swept test: bullets are 520 px/s and can tunnel
  through a small asteroid on a slow frame. The ship's hitbox is generous
  (`ship.radius + a.radius * 0.82`, `game.js:517`). There is **no wrap-aware collision** — two
  objects on opposite edges do not touch, even though both wrap. That matches the arcade
  original; don't "fix" it without asking.
- **`pressed()` is edge-triggered and self-clearing** (`game.js:20-24`), used by `Space` and
  `KeyS`. Holding a key is `keys[...]`, which is level-triggered — use `keys` for
  rotation/thrust and `pressed` for one-shots, never the reverse. Consequence of the early
  returns in the `dead` state: a Space tap during the 2 s death pause is never consumed and
  fires a bullet the instant you respawn.
- **State machine** is `'playing' | 'dead' | 'gameover'` (`game.js:362`). Death pauses 2 s,
  then `ship.reset()` — which recenters the ship, zeroes velocity, and grants 3 s of
  invincibility. Clearing a level is just `asteroids.length === 0` (`game.js:525`), which
  calls `nextLevel()` → same reset + `3 + level` fresh size-3 asteroids. Lives carry over;
  level 1 spawns 4.
- **Ship appearance is data, not code** (`game.js:153-183`): the `SKINS` table holds
  `hull` (a polygon in nose-toward-`+x` space), `color` and `flame`. `Ship.draw()`,
  `Ship.tryShoot()` and `drawLifeIcon()` all read `skin()`; adding a skin means adding an
  object, and nothing else. Three consequences: the boost **overrides** the hull color with
  `'#4df'` (`game.js:241`) so a boosted ship ignores its skin; the muzzle position is
  derived per skin (`Math.max(...hull.map(v => v[0])) + 1`, `game.js:227`), so the classic
  hull's 21 is a coincidence of its data, not a constant; and `skinIndex` lives at module
  level, outside `initGame()` and `ship.reset()`, which is why a skin survives respawns and
  game restarts. `loadSkin`/`saveSkin` wrap `localStorage` in `try`/`catch` — don't drop the
  `catch`, Safari and private mode throw `SecurityError` and a throw at startup kills the game.
  The `S` handler is the **first** thing in `update()` (`game.js:438`) precisely so the
  early returns can't strand the keypress; the HUD hint is bottom-left in `drawHUD()`.

## Known deviations from the README

- **Power-ups and the shooting star ("estrella fugaz") now exist** (`PowerUp`,
  `SHOOTING_*`; the README bullet describing them is accurate). Don't trust older notes
  claiming otherwise.
- The README omits the `NIVEL`/lives HUD and the skins feature, both of which ship.
- The README's scoring table is accurate and matches `POINTS`.

## Conventions

- 2-space indent, single quotes, semicolons, `'use strict'` at the top of `game.js`.
- Comments are sparse and **Spanish**, mainly the `// ── Section ──` banner dividers that
  organize the file (Input, Utils, Bullet, Asteroid, Ship, …). Match that style; don't add
  dense commentary or translate the existing ones.
- HUD strings are currently **mixed** — `SCORE` and `GAME OVER` are English, `NIVEL`,
  `PUNTAJE`, `ESPACIO PARA REINICIAR`, `PIEL` are Spanish. Keep whichever a given string
  already is; don't normalize the set.
- Don't add a framework, bundler, or build step without asking. This is deliberate.

## Git

- Branch `main`, remote `origin` → `github.com/daniel-luna/opencode-asteroids`. No CI
  workflows, so a push triggers nothing. Feature work happens in `opencode worktree`s
  (e.g. branch `skins` for the ship-skins feature). Don't commit unless explicitly asked.