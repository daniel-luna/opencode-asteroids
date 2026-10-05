# AGENTS.md

## What this is

Course project (`03-asteroids`): an Asteroids clone in pure HTML5 Canvas. All logic lives
in a single `game.js` (~700 lines, no modules). `README.md` is the original spec, in Spanish.

Five tracked files, nothing else: `index.html`, `game.js`, `favicon.svg`, `README.md`,
`AGENTS.md`.

## Current state

- **No tooling whatsoever**: no `package.json`, no build step, no test runner, no linter or
  formatter, no CI. The only auxiliary file is a `.gitignore` for `.worktrees/`. Don't
  assume `npm test`, `lint`, or a typechecker exist — there is nothing to run. Verification is
  "open it in a browser and look". `node --check game.js` is the one useful smoke test
  (parse only). If you add tooling, add its commands here and a `.gitignore` in the same change.
- `index.html:24` loads `game.js` as a **classic script** (no `type="module"`). There are
  no imports and no `fetch`, so **opening `index.html` over `file://` works** — a server is
  optional. The README's `npx serve .` needs a network download; `python3 -m http.server`
  works offline.
- `game.js:1` is `'use strict'`, which only matters because it's a classic script. State
  bindings (`score`, `state`, `asteroids`, `ship`, `skinIndex`) are reachable by **bare name**
  in the devtools console, but not as `window.*` (top-level `let`/`const` skip the global
  object). Function declarations (`initGame`, `update`) do land on `window`. This is the
  fastest way to inspect a bug — use it before rewriting anything.

## Traps

- **Canvas size is duplicated.** `index.html:23` sets `width="800" height="600"` and
  `game.js:5-6` declares `const W = 800; const H = 600;`. Change one and the world
  coordinates no longer match the surface. Nothing is responsive; the CSS only adds a border.
- **Three parallel arrays are indexed by size, with index 0 unused** (`game.js:67-69`):
  `RADII = [0,16,30,50]`, `SPEEDS = [0,85,55,32]`, `POINTS = [0,100,50,20]`. Size **1 is the
  smallest**, so bigger means a lower index — the reverse of how the README's scoring table
  reads. Adding a size means editing all three in lockstep. Every asteroid spawns as size 3
  (`game.js:453`); smaller ones only come from `split()`.
- **Two effects are per-frame, not per-second**, so they change with refresh rate: ship drag
  (`DRAG = 0.987`, `game.js:212`) and the thruster flame flicker (`Math.random() > 0.35`,
  `game.js:307`). Tune `ROT`/`THRUST`/`DRAG` at 60 Hz. `dt` is clamped to `0.05`
  (`game.js:694`), so below ~20 fps the game slows down instead of teleporting.
- **Collision is center-distance only**, no swept test: bullets are 520 px/s and can tunnel
  through a small asteroid on a slow frame. The ship's hitbox is generous
  (`ship.radius + a.radius * 0.82`, `game.js:601`). There is **no wrap-aware collision** — two
  objects on opposite edges do not touch, even though both wrap. That matches the arcade
  original; don't "fix" it without asking.
- **One bullet per asteroid per frame.** The bullet/asteroid loop (`game.js:566-582`) sets
  `a.dead = true` on the first hit, so a second bullet crossing the same rock in that frame
  does nothing. This is why triple shot widens *coverage* — the outer beams reach rocks beside
  and behind the first hit — rather than tripling damage on a single rock. The ship/asteroid
  loop uses `break` for the same reason: one death per frame.
- **`pressed()` is edge-triggered and self-clearing** (`game.js:20-24`), used by `Space` and
  `KeyS`. Holding a key is `keys[...]`, which is level-triggered — use `keys` for
  rotation/thrust and `pressed` for one-shots, never the reverse. Consequence of the early
  returns in the `dead` state: a Space tap during the 2 s death pause is never consumed and
  fires a bullet the instant you respawn.
- **State machine** is `'playing' | 'dead' | 'gameover'` (`game.js:441`). Death pauses 2 s,
  then `ship.reset()` (`game.js:537`) — which recenters the ship, zeroes velocity, and grants
  3 s of invincibility. Clearing a level is just `asteroids.length === 0` (`game.js:610`),
  which calls `nextLevel()` → same reset + `3 + level` fresh size-3 asteroids. Lives carry
  over; level 1 spawns 4.
- **Power-ups share one drop pool and are three kinds of one thing.** `PU_KINDS`
  (`game.js:357`) is `['boost', 'triple', 'shield']` and the drop rolls it **uniformly**
  (`game.js:579`); `PU_DROP_CHANCE` and `PU_MAX` (`game.js:354-355`) are a single pool covering
  all three, so the cap is 2 power-ups on screen *in total*, not 2 of each. Adding a fourth
  kind means touching the table, the kind→color chain in `PowerUp.draw()`
  (`game.js:380-382`), the glyph branches (`game.js:396-415`), the pickup chain
  (`game.js:591-593`), the HUD and the README. `ship.boost`, `ship.triple` and `ship.shield`
  are independent, and re-picking a power-up **refreshes** it rather than stacking. All three
  are zeroed by `killShip()` and by `ship.reset()`.
- **The shield shares the `invincible` field.** `Ship.absorb()` spends a charge *and* sets
  `invincible = SHIELD_GRACE` (`game.js:244-249`), so raising the grace also lengthens the
  respawn-style blink, and the ship is briefly unkillable after every absorbed hit. That
  grace is the only thing stopping a sustained overlap from draining all charges in
  consecutive frames — don't replace it with a separate timer without re-checking that. It
  also means the shield protects against *any* future damage source, so wire new ones
  through `absorb()` (`game.js:602`). A shield pickup taken at `SHIELD_MAX` charges is
  silently wasted (`Math.min` at `game.js:592`), and `SHIELD_MAX` is read in four places:
  `reset()`, the charge marks (`game.js:269-270`), the pickup cap and the HUD — bump all of
  them together. `drawShield()` (`game.js:251-280`) draws *before* the invincibility blink
  early-return, so the ring stays visible on the frames the hull blinks out.
- **Ship appearance is data, not code** (`game.js:156-163`): the `SKINS` table holds
  `hull` (a polygon in nose-toward-`+x` space), `color` and `flame`. `Ship.draw()`,
  `Ship.tryShoot()` and `drawLifeIcon()` all read `skin()`; adding a skin means adding an
  object, and nothing else. Three consequences: the boost and triple-shot **override** the
  hull color (`game.js:291-293`, `boost` > `triple` > skin), so a boosted ship ignores its
  skin; the muzzle position is derived per skin
  (`Math.max(...hull.map(v => v[0])) + 1`, `game.js:233`) and then offset perpendicular to the
  angle for triple shot (`game.js:239`), so the classic hull's 21 is a coincidence of its
  data, not a constant; and `skinIndex` lives at module level (`game.js:165`), outside
  `initGame()` and `ship.reset()`, which is why a skin survives respawns and game restarts.
  `loadSkin`/`saveSkin` (`game.js:168-177`) wrap `localStorage` in `try`/`catch` — don't drop
  the `catch`, Safari and private mode throw `SecurityError` and a throw at startup kills the
  game. The `S` handler is the **first** thing in `update()` (`game.js:520`) precisely so the
  early returns can't strand the keypress; the HUD hint is bottom-left in `drawHUD()`.
- **Shooting is edge-triggered and rate-limited.** `tryShoot()` returns `[]` unless
  `shootCooldown` has expired (`0.2`s, `game.js:231`), so triple shot is 3 bullets per
  *volley*, not 3x the fire rate.
- **The HUD rows are hand-spaced.** `VELOCIDAD` / `TRIPLE` / `ESCUDO` sit at y = 48 / 66 / 84
  (`game.js:646`, `651`, `656`) and `PIEL` is bottom-left at `(14, H - 14)`. The three timers
  are independent, so all three rows can be visible at once; a fourth power-up needs a new
  y, not a repackaged one.

## Known deviations from the README

- The README's *Descripción* advertises power-ups and a shooting-star asteroid ("estrella
  fugaz"), and both ship in `game.js`, along with the skins feature. The README still
  **under-documents** them: the *Características* list has no bullet for the estrella fugaz
  (its `SHOOTING_BONUS` of +50 and 6 s TTL ship in code only), and it omits the
  `NIVEL`/lives HUD. Trust the code.
- The README's scoring table is accurate and matches `POINTS`.

## Conventions

- 2-space indent, single quotes, semicolons, `'use strict'` at the top of `game.js`.
- Comments are sparse and **Spanish**, mainly the `// ── Section ──` banner dividers that
  organize the file (Input, Utils, Bullet, Asteroid, Ship, …). Match that style; don't add
  dense commentary or translate the existing ones.
- HUD strings are currently **mixed** — `SCORE` and `GAME OVER` are English, `NIVEL`,
  `VELOCIDAD`, `TRIPLE`, `ESCUDO`, `PUNTAJE`, `ESPACIO PARA REINICIAR`, `PIEL` are Spanish.
  Keep whichever a given string already is; don't normalize the set.
- Don't add a framework, bundler, or build step without asking. This is deliberate.

## Git

- `main` tracks `origin` → `github.com/daniel-luna/opencode-asteroids`. No CI workflows, so a
  push triggers nothing.
- **One feature per branch, each in its own git worktree** (`.worktrees/<name>`), merged back
  when done. `shield`, `skins` and `triple-shot` were merged into `03-union-worktree` with
  `--no-ff`; they overlapped heavily in `game.js` (all three rewrote `PowerUp`), so those
  merges needed hand-resolved conflicts, not just `--theirs`. Don't commit unless explicitly
  asked.
