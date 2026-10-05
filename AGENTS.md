# AGENTS.md

## What this is

Course project (`03-asteroids`): an Asteroids clone in pure HTML5 Canvas. All logic lives
in a single `game.js` (~600 lines, no modules). `README.md` is the original spec, in Spanish.

Five tracked files, nothing else: `index.html`, `game.js`, `favicon.svg`, `README.md`, `AGENTS.md`.

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
  (`game.js:370`); smaller ones only come from `split()`.
- **Two effects are per-frame, not per-second**, so they change with refresh rate: ship drag
  (`DRAG = 0.987`, `game.js:184`) and the thruster flame flicker (`Math.random() > 0.35`,
  `game.js:236`). Tune `ROT`/`THRUST`/`DRAG` at 60 Hz. `dt` is clamped to `0.05`
  (`game.js:593`), so below ~20 fps the game slows down instead of teleporting.
- **Collision is center-distance only**, no swept test: bullets are 520 px/s and can tunnel
  through a small asteroid on a slow frame. The ship's hitbox is generous
  (`ship.radius + a.radius * 0.82`, `game.js:510`). There is **no wrap-aware collision** — two
  objects on opposite edges do not touch, even though both wrap. That matches the arcade
  original; don't "fix" it without asking.
- **One bullet per asteroid per frame.** The bullet/asteroid loop (`game.js:476-492`) sets
  `a.dead = true` on the first hit, so a second bullet crossing the same rock in that frame
  does nothing. This is why triple shot widens *coverage* — the outer beams reach rocks beside
  and behind the first hit — rather than tripling damage on a single rock. The ship/asteroid
  loop uses `break` for the same reason: one death per frame.
- **`pressed()` is edge-triggered and self-clearing** (`game.js:20-24`), and only `Space`
  uses it. Holding a key is `keys[...]`, which is level-triggered — use `keys` for
  rotation/thrust and `pressed` for one-shots, never the reverse. Consequence of the early
  returns in the `dead` state: a Space tap during the 2 s death pause is never consumed and
  fires a bullet the instant you respawn.
- **State machine** is `'playing' | 'dead' | 'gameover'` (`game.js:358`). Death pauses 2 s,
  then `ship.reset()` — which recenters the ship, zeroes velocity, and grants 3 s of
  invincibility (`game.js:168`). Clearing a level is just `asteroids.length === 0`
  (`game.js:518`), which calls `nextLevel()` → same reset + `3 + level` fresh size-3
  asteroids. Lives carry over; level 1 spawns 4.
- **Power-ups share one drop pool.** `PU_DROP_CHANCE` and `PU_MAX` (`game.js:283-285`) are a
  single pool covering both kinds; `kind` is rolled 50/50 at spawn (`game.js:488-489`). So the
  cap is 2 power-ups on screen *in total*, not 2 of each. `ship.boost` and `ship.triple` are
  independent timers, and re-picking a power-up **refreshes** the timer rather than stacking
  it (`game.js:501`). Both are zeroed by `killShip()` (`game.js:422`) and by `ship.reset()`.
- **Shooting is edge-triggered and rate-limited.** `tryShoot()` returns `[]` unless
  `shootCooldown` has expired (`0.2`s, `game.js:203`), so triple shot is 3 bullets per *volley*,
  not 3x the fire rate.

## Known deviations from the README

- The README's *Descripción* advertises power-ups and a shooting-star asteroid ("estrella
  fugaz"), and both now exist in `game.js`. The README still **under-documents them**: the
  *Características* list has no bullet for the estrella fugaz (its `SHOOTING_BONUS` of +50 and
  6 s TTL ship in code only) and it omits the `NIVEL`/lives HUD. Trust the code.
- The README's scoring table is accurate and matches `POINTS`.

## Conventions

- 2-space indent, single quotes, semicolons, `'use strict'` at the top of `game.js`.
- Comments are sparse and **Spanish**, mainly the `// ── Section ──` banner dividers that
  organize the file (Input, Utils, Bullet, Asteroid, Ship, …). Match that style; don't add
  dense commentary or translate the existing ones.
- HUD strings are currently **mixed** — `SCORE` and `GAME OVER` are English, `NIVEL`,
  `VELOCIDAD`, `TRIPLE`, `PUNTAJE`, `ESPACIO PARA REINICIAR` are Spanish. Keep whichever a
  given string already is; don't normalize the set.
- Don't add a framework, bundler, or build step without asking. This is deliberate.

## Git

- `main` tracks `origin` → `github.com/daniel-luna/opencode-asteroids` (4 commits, no CI
  workflows, so a push triggers nothing).
- **One feature per branch, each in its own git worktree** (`.worktrees/<name>`), branched
  from `main` and merged back when done: `01-powerup-velocidad`, `02-estrella-fugaz`,
  `triple-shot`. Don't commit unless explicitly asked.