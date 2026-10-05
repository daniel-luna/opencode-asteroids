'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
// Distancia con envoltura toroidal: para la recogida de power-ups
const wrapDist = (a, b) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.hypot(Math.min(dx, W - dx), Math.min(dy, H - dy));
};
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3, type = 'asteroid') {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.type = type;        // 'asteroid' | 'shooting'
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    let speed = SPEEDS[size] + rand(-15, 15);
    if (this.type === 'shooting') {
      speed = SPEEDS[size] * SHOOTING_SPEED_MUL + rand(-20, 20);
      this.ttl = SHOOTING_TTL;
    }
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    if (this.type === 'shooting') {
      this.ttl -= dt;
      if (this.ttl <= 0) { this.dead = true; return; }
    }
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.type === 'shooting') return []; // explota sin fragmentos
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1, 'asteroid'),
      new Asteroid(this.x, this.y, this.size - 1, 'asteroid'),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === 'shooting') {
      const v = Math.hypot(this.vx, this.vy);
      if (v > 1) {
        const tx = -this.vx / v;
        const ty = -this.vy / v;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.28)';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(tx * 18, ty * 18);
        ctx.lineTo(tx * 4,  ty * 4);
        ctx.stroke();
      }
      ctx.strokeStyle = '#ffd700';
    } else {
      ctx.strokeStyle = '#fff';
    }
    ctx.rotate(this.rot);
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
// Apariencia de la nave: polígono del casco en espacio local (nariz hacia +x,
// Ship.draw() ya lo rotó con el ángulo de la nave), color y color de la llama.
// Añadir una skin = añadir un objeto.
const SKINS = [
  { id: 'classic', name: 'CLÁSICA',   color: '#fff',       flame: 'rgba(255,130,0,0.85)', hull: [[ 20, 0], [-12, -9], [ -7,  0], [-12,  9]] },
  { id: 'gold',    name: 'DORADA',    color: '#ffd700',    flame: 'rgba(255,170,0,0.85)', hull: [[ 22, 0], [ -6,-11], [-13,  0], [ -6, 11]] },
  { id: 'crimson', name: 'ESCARLATA', color: '#ff5470',    flame: 'rgba(255, 60,80,0.85)', hull: [[ 20, 0], [-14, -7], [ -6, -7], [-10,  0], [ -6,  7], [-14,  7]] },
  { id: 'neon',    name: 'NEÓN',      color: '#39ff9e',    flame: 'rgba(120,255,200,0.85)', hull: [[ 23, 0], [ -3, -6], [-16, -4], [ -9,  0], [-16,  4], [ -3,  6]] },
  { id: 'steel',   name: 'ACERO',     color: '#8fa3b8',    flame: 'rgba(200,215,230,0.85)', hull: [[ 19, 0], [  4, -9], [-13, -9], [ -8,  0], [-13,  9], [  4,  9]] },
];

const SKIN_KEY = 'asteroids.skin';
let skinIndex = 0;
const skin = () => SKINS[skinIndex];

function loadSkin() {
  try {
    const i = SKINS.findIndex(s => s.id === localStorage.getItem(SKIN_KEY));
    if (i >= 0) skinIndex = i;
  } catch (e) { /* localStorage puede estar bloqueado (file://, modo privado) */ }
}

function saveSkin() {
  try { localStorage.setItem(SKIN_KEY, skin().id); } catch (e) { /* sin persistencia */ }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const BOOST_TIME = 5;   // duración del power-up de velocidad

class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.boost         = 0;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.boost         > 0) this.boost         -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = this.boost > 0 ? 520 : 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    // La bala nace en la punta del casco de la skin activa
    const NOSE = Math.max(...skin().hull.map(v => v[0])) + 1;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = this.boost > 0 ? '#4df' : skin().color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Casco de la skin activa
    const hull = skin().hull;
    ctx.beginPath();
    ctx.moveTo(hull[0][0], hull[0][1]);
    for (let i = 1; i < hull.length; i++)
      ctx.lineTo(hull[i][0], hull[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && (this.boost > 0 || Math.random() > 0.35)) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = skin().flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up (velocidad) ───────────────────────────────────────────────────────
const PU_LIFE        = 10;    // segundos en pantalla
const PU_DROP_CHANCE = 0.25;  // probabilidad al destruir un fragmento pequeño
const PU_MAX         = 2;     // power-ups simultáneos
const PU_RADIUS      = 10;

class PowerUp {
  constructor(x, y) {
    this.x      = x;
    this.y      = y;
    this.ttl    = PU_LIFE;
    this.radius = PU_RADIUS;
    this.dead   = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / PU_LIFE;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.lineJoin = 'round';

    // Anillo que encoge con el tiempo restante
    ctx.strokeStyle = `rgba(77, 221, 255, ${(alpha * 0.7).toFixed(2)})`;
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, PU_RADIUS + 6 * alpha, 0, Math.PI * 2);
    ctx.stroke();

    // Galones hacia adelante
    ctx.strokeStyle = `rgba(77, 221, 255, ${alpha.toFixed(2)})`;
    ctx.lineWidth   = 1.5;
    for (let i = 0; i < 2; i++) {
      const ox = -4 + i * 5;
      ctx.beginPath();
      ctx.moveTo(ox, -4);
      ctx.lineTo(ox + 4, 0);
      ctx.lineTo(ox, 4);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Estrella fugaz ─────────────────────────────────────────────────────────────
const SHOOTING_SPEED_MUL = 1.8;      // multiplicador sobre velocidad base
const SHOOTING_TTL        = 6.0;      // segundos antes de desaparecer
const SHOOTING_SPAWN_MIN  = 8.0;      // intervalo mínimo entre spawns (s)
const SHOOTING_SPAWN_MAX  = 14.0;     // intervalo máximo
const SHOOTING_SPAWN_CHANCE = 0.5;    // probabilidad al cumplirse intervalo
const SHOOTING_SAFE_DIST  = 160;      // distancia mínima al centro/nave en spawn
const SHOOTING_BONUS      = 50;       // puntos extra sobre los de su tamaño

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let shootingTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  const SAFE = SHOOTING_SAFE_DIST;
  let x, y;
  let tries = 0;
  do {
    x = rand(0, W);
    y = rand(0, H);
    tries++;
    const dCenter = Math.hypot(x - W / 2, y - H / 2);
    const dShip   = ship ? dist({x, y}, ship) : dCenter;
    if (dCenter >= SAFE && dShip >= SAFE) break;
  } while (tries < 40);
  const size = randInt(1, 2);
  asteroids.push(new Asteroid(x, y, size, 'shooting'));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  shootingTimer = rand(SHOOTING_SPAWN_MIN, SHOOTING_SPAWN_MAX);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  shootingTimer = rand(SHOOTING_SPAWN_MIN, SHOOTING_SPAWN_MAX);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.boost = 0;
  powerups  = [];
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambio de skin (antes de los estados con retorno temprano: funciona siempre)
  if (pressed('KeyS')) {
    skinIndex = (skinIndex + 1) % SKINS.length;
    saveSkin();
  }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Estrella fugaz
  shootingTimer -= dt;
  if (shootingTimer <= 0) {
    if (Math.random() < SHOOTING_SPAWN_CHANCE) spawnShootingStar();
    shootingTimer = rand(SHOOTING_SPAWN_MIN, SHOOTING_SPAWN_MAX);
  }

  // Bala vs asteroide
  const newAsteroids = [];
  const newPowerups  = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size] + (a.type === 'shooting' ? SHOOTING_BONUS : 0);
        explode(a.x, a.y, a.type === 'shooting' ? 10 : a.size * 5);
        newAsteroids.push(...a.split());
        if (a.type !== 'shooting' &&
            a.size === 1 &&
            Math.random() < PU_DROP_CHANCE &&
            powerups.length + newPowerups.length < PU_MAX)
          newPowerups.push(new PowerUp(a.x, a.y));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);
  powerups  = powerups.concat(newPowerups);

  // Recogida del power-up de velocidad
  for (const p of powerups) {
    if (wrapDist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      ship.boost = BOOST_TIME;
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin().color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.boost > 0) {
    ctx.fillStyle = '#4df';
    ctx.fillText(`VELOCIDAD x2  ${ship.boost.toFixed(1)}s`, W / 2, 48);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(`PIEL ${skinIndex + 1}/${SKINS.length}  ${skin().name}  ·  S`, 14, H - 14);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

loadSkin();
initGame();
requestAnimationFrame(loop);
