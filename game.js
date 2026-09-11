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
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code))
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
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
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
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
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

// ── PowerUp ───────────────────────────────────────────────────────────────────
const POWERUP_TTL = 8;
const POWERUP_DRIFT = 22;

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 11;
    this.ttl = POWERUP_TTL;
    this.dead = false;
    this.vy = POWERUP_DRIFT;
    this.pulse = rand(0, Math.PI * 2);
  }

  update(dt) {
    this.y = wrap(this.y + this.vy * dt, H);
    this.x = wrap(this.x + Math.sin(this.pulse) * 6 * dt, W);
    this.pulse += dt * 4;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const blink = this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0;
    if (blink) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.pulse * 0.5) * 0.2);
    ctx.strokeStyle = '#ffd21f';
    ctx.fillStyle   = '#ffd21f';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';

    const isTriple = this.type === 'triple';
    ctx.strokeStyle = isTriple ? '#00e5ff' : '#ffd21f';
    ctx.fillStyle   = isTriple ? '#00e5ff' : '#ffd21f';

    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
    ctx.stroke();

    if (isTriple) {
      // 3 líneas paralelas (triple disparo)
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.lineTo(-4, 8);
      ctx.moveTo( 0, -8);
      ctx.lineTo( 0, 8);
      ctx.moveTo( 4, -8);
      ctx.lineTo( 4, 8);
      ctx.stroke();
    } else {
      // Rayo dorado (velocidad)
      ctx.beginPath();
      ctx.moveTo(-6, -9);
      ctx.lineTo( 2, -2);
      ctx.lineTo(-2,  0);
      ctx.lineTo( 6,  9);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function randomPowerUp() {
  const margin = 60;
  const type = Math.random() < 0.5 ? 'speed' : 'triple';
  return new PowerUp(rand(margin, W - margin), rand(margin, H - margin), type);
}

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKINS = [
  {
    id: 'clasica',
    name: 'CLASICA',
    boostStroke: '#ffd21f',
    scale: 1,
    scoreMulti: 1,
    shapes: [
      { points: [[20, 0], [-12, -9], [-7, 0], [-12, 9]], stroke: '#fff' },
    ],
    flame: { thrust: 'rgba(255,130,0,0.85)', boost: 'rgba(255,210,31,0.9)' },
  },
  {
    id: 'dardo',
    name: 'DARDO',
    boostStroke: '#ffd21f',
    scale: 1,
    scoreMulti: 1,
    shapes: [
      { points: [[24, 0], [-10, -5], [-6, 0], [-10, 5]], stroke: '#7fd4ff' },
      { points: [[16, 0], [-4, -2]], stroke: 'rgba(127,212,255,0.55)', lineWidth: 1, closed: false },
    ],
    flame: { thrust: 'rgba(0,220,255,0.85)', boost: 'rgba(255,210,31,0.9)' },
  },
  {
    id: 'bravucon',
    name: 'BRAVUCON',
    boostStroke: '#ffd21f',
    scale: 1,
    scoreMulti: 1,
    shapes: [
      { points: [[18, 0], [-15, -13], [-9, 0], [-15, 13]], stroke: '#fff', lineWidth: 1.8 },
      { points: [[11, 0], [-9, -7], [-5, 0], [-9, 7]], stroke: '#ffd21f', lineWidth: 1.2, fill: 'rgba(255,210,31,0.2)' },
    ],
    flame: { thrust: 'rgba(255,140,60,0.85)', boost: 'rgba(255,210,31,0.9)' },
  },
  {
    id: 'dorada',
    name: 'DORADA',
    boostStroke: '#ffd700',
    scale: 2,
    scoreMulti: 2,
    shapes: [
      { points: [[20, 0], [-12, -9], [-7, 0], [-12, 9]], stroke: '#ffd700', lineWidth: 2, fill: 'rgba(255,215,0,0.15)' },
      { points: [[8, 0], [-5, -3], [-3, 0], [-5, 3]], stroke: 'rgba(255,215,0,0.6)', lineWidth: 1, fill: 'rgba(255,215,0,0.2)' },
    ],
    flame: { thrust: 'rgba(255,215,0,0.85)', boost: 'rgba(255,255,180,0.9)' },
  },
];

let selectedSkin = 0;
(function loadSkin() {
  const saved = localStorage.getItem('asteroids.skin');
  const idx = SKINS.findIndex(s => s.id === saved);
  if (idx !== -1) selectedSkin = idx;
})();

function setSkin(i) {
  selectedSkin = (i + SKINS.length) % SKINS.length;
  localStorage.setItem('asteroids.skin', SKINS[selectedSkin].id);
  skinToast = SKINS[selectedSkin].name;
  skinToastTimer = 1.5;
  ship.radius = 12 * (SKINS[selectedSkin].scale || 1);
}

function drawShipShapes(skin, scale, boost) {
  const s = scale * (skin.scale || 1);
  ctx.save();
  if (s !== 1) ctx.scale(s, s);
  for (const sh of skin.shapes) {
    ctx.beginPath();
    ctx.moveTo(sh.points[0][0], sh.points[0][1]);
    for (let i = 1; i < sh.points.length; i++)
      ctx.lineTo(sh.points[i][0], sh.points[i][1]);
    if (sh.closed !== false) ctx.closePath();
    ctx.strokeStyle = boost ? skin.boostStroke : sh.stroke;
    ctx.lineWidth   = (sh.lineWidth || 1.5) / s;
    ctx.lineJoin    = 'round';
    if (sh.fill) { ctx.fillStyle = sh.fill; ctx.fill(); }
    ctx.stroke();
  }
  ctx.restore();
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12 * (SKINS[selectedSkin].scale || 1);
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = false;
    this.boostTimer    = 0;
    this.tripleShot    = false;
    this.tripleTimer   = 0;
    this.shieldActive   = false;
    this.shieldTimer    = 0;
    this.shieldCooldown = 0;
    this.dead           = false;
  }

  activateSpeedBoost() {
    this.speedBoost = true;
    this.boostTimer = 5;
  }

  activateTripleShot() {
    this.tripleShot = true;
    this.tripleTimer = 5;
  }

  activateShield() {
    if (this.shieldCooldown > 0 || this.shieldActive || this.dead) return;
    this.shieldActive = true;
    this.shieldTimer = 3;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.boostTimer    > 0) this.boostTimer    -= dt;
    if (this.boostTimer    <= 0) this.speedBoost   = false;
    if (this.tripleTimer   > 0) this.tripleTimer   -= dt;
    if (this.tripleTimer   <= 0) this.tripleShot    = false;
    if (this.shieldTimer   > 0) this.shieldTimer   -= dt;
    if (this.shieldTimer   <= 0 && this.shieldActive) {
      this.shieldActive = false;
      this.shieldCooldown = 8;
    }
    if (this.shieldCooldown > 0) this.shieldCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const BOOST  = this.speedBoost ? 2 : 1;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * BOOST * dt;
      this.vy += Math.sin(this.angle) * THRUST * BOOST * dt;
    }

    const drag = this.speedBoost ? 0.995 : DRAG;
    this.vx *= drag;
    this.vy *= drag;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);

    // Estela dorada durante el boost
    if (this.speedBoost && this.thrusting && Math.random() > 0.3) {
      const back = Math.PI + this.angle;
      const scale = SKINS[selectedSkin].scale || 1;
      const ox = this.x + Math.cos(back) * 12 * scale;
      const oy = this.y + Math.sin(back) * 12 * scale;
      const p = new Particle(ox, oy, '255,210,31');
      p.vx = Math.cos(back) * rand(50, 130);
      p.vy = Math.sin(back) * rand(50, 130);
      p.life = rand(0.2, 0.4);
      p.ttl  = p.life;
      particles.push(p);
    }
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21 * (SKINS[selectedSkin].scale || 1);
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot) {
      const SPREAD = 0.15;
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[selectedSkin];
    const skinScale = skin.scale || 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    drawShipShapes(skin, 1, this.speedBoost);

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const flame = this.speedBoost ? skin.flame.boost : skin.flame.thrust;
      ctx.beginPath();
      ctx.moveTo(-8 * skinScale, -4 * skinScale);
      ctx.lineTo(-8 * skinScale - rand(6, 14) * skinScale, 0);
      ctx.lineTo(-8 * skinScale, 4 * skinScale);
      ctx.strokeStyle = flame;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // Escudo visual
    if (this.shieldActive) {
      const pulse = 0.3 + Math.sin(Date.now() * 0.008) * 0.12;
      ctx.beginPath();
      ctx.arc(0, 0, 22 * skinScale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 180, 255, ${pulse.toFixed(2)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(0, 220, 255, ${(pulse + 0.2).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = '255,255,255') {
    this.x  = x;
    this.y  = y;
    this.color = color;
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
    ctx.strokeStyle = `rgba(${this.color},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerUpTimer;
let skinToast = null;
let skinToastTimer = 0;
let menuOpen  = false;
let menuIndex = 0;

const POWERUP_CHANCE = 0.15;
const POWERUP_SPAWN_INTERVAL = 10;

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
  powerUpTimer = POWERUP_SPAWN_INTERVAL;
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  powerUpTimer = POWERUP_SPAWN_INTERVAL;
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8, color) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function addScore(size) {
  score += POINTS[size] * (SKINS[selectedSkin].scoreMulti || 1);
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
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
  if (skinToastTimer > 0) skinToastTimer -= dt;

  if (menuOpen) {
    if (pressed('Escape') || pressed('KeyM')) menuOpen = false;
    if (pressed('ArrowUp'))   menuIndex = (menuIndex - 1 + SKINS.length) % SKINS.length;
    if (pressed('ArrowDown')) menuIndex = (menuIndex + 1) % SKINS.length;
    if (pressed('Space') || pressed('Enter')) {
      setSkin(menuIndex);
      menuOpen = false;
    }
    return;
  }

  if (pressed('KeyC')) setSkin(selectedSkin + 1);
  if (pressed('KeyM')) { menuIndex = selectedSkin; menuOpen = true; }

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
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Escudo
  if (pressed('ShiftLeft')) {
    ship.activateShield();
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  powerups.forEach(p => p.update(dt));
  particles.forEach(p => p.update(dt));

  // Spawn aleatorio de powerups
  powerUpTimer -= dt;
  if (powerUpTimer <= 0) {
    powerups.push(randomPowerUp());
    powerUpTimer = POWERUP_SPAWN_INTERVAL + rand(-3, 3);
  }

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        addScore(a.size);
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < POWERUP_CHANCE) powerups.push(randomPowerUp());
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    const shieldSplits = [];
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldActive) {
          a.dead = true;
          addScore(a.size);
          explode(a.x, a.y, a.size * 5, '0,180,255');
          ship.shieldActive = false;
          ship.shieldCooldown = 8;
          shieldSplits.push(...a.split());
          break;
        } else {
          killShip();
          break;
        }
      }
    }
    asteroids = asteroids.filter(a => !a.dead).concat(shieldSplits);
  }

  // Nave vs powerup
  for (const p of powerups) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      if (p.type === 'speed') {
        ship.activateSpeedBoost();
        explode(p.x, p.y, 6, '255,210,31');
      } else if (p.type === 'triple') {
        ship.activateTripleShot();
        explode(p.x, p.y, 6, '0,229,255');
      }
      p.dead = true;
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  drawShipShapes(SKINS[selectedSkin], 0.5 / (SKINS[selectedSkin].scale || 1), false);
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

  // Indicadores de estado (velocidad, triple, escudo)
  let hudY = 42;

  if (ship.speedBoost && ship.boostTimer > 0) {
    const x = 14, w = 150, h = 8;
    const frac = ship.boostTimer / 5;

    ctx.fillStyle = 'rgba(255,210,31,0.25)';
    ctx.fillRect(x, hudY, w, h);
    ctx.fillStyle = '#ffd21f';
    ctx.fillRect(x, hudY, w * frac, h);
    ctx.strokeStyle = 'rgba(255,210,31,0.7)';
    ctx.strokeRect(x, hudY, w, h);

    ctx.fillStyle = '#ffd21f';
    ctx.font = '11px monospace';
    ctx.fillText(`VELOCIDAD x2  ${ship.boostTimer.toFixed(1)}s`, x, hudY + h + 14);
    hudY += h + 26;
  }

  if (ship.tripleShot && ship.tripleTimer > 0) {
    const x = 14, w = 150, h = 8;
    const frac = ship.tripleTimer / 5;

    ctx.fillStyle = 'rgba(0,229,255,0.25)';
    ctx.fillRect(x, hudY, w, h);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(x, hudY, w * frac, h);
    ctx.strokeStyle = 'rgba(0,229,255,0.7)';
    ctx.strokeRect(x, hudY, w, h);

    ctx.fillStyle = '#00e5ff';
    ctx.font = '11px monospace';
    ctx.fillText(`TRIPLE DISPARO X3  ${ship.tripleTimer.toFixed(1)}s`, x, hudY + h + 14);
    hudY += h + 26;
  }

  if (ship.shieldActive) {
    const x = 14, w = 150, h = 8;
    const frac = ship.shieldTimer / 3;
    const blink = Math.floor(Date.now() * 0.008) % 2 === 0;
    const alpha = blink ? 0.5 : 0.8;

    ctx.fillStyle = 'rgba(0,180,255,0.25)';
    ctx.fillRect(x, hudY, w, h);
    ctx.fillStyle = `rgba(0,200,255,${alpha.toFixed(2)})`;
    ctx.fillRect(x, hudY, w * frac, h);
    ctx.strokeStyle = 'rgba(0,220,255,0.7)';
    ctx.strokeRect(x, hudY, w, h);

    ctx.fillStyle = '#0dc8ff';
    ctx.font = '11px monospace';
    ctx.fillText(`ESCUDO  ${ship.shieldTimer.toFixed(1)}s`, x, hudY + h + 14);
    hudY += h + 26;
  } else if (ship.shieldCooldown > 0) {
    const x = 14, w = 150, h = 8;
    const frac = ship.shieldCooldown / 8;

    ctx.fillStyle = 'rgba(0,180,255,0.12)';
    ctx.fillRect(x, hudY, w, h);
    ctx.fillStyle = 'rgba(0,180,255,0.35)';
    ctx.fillRect(x, hudY, w * frac, h);
    ctx.strokeStyle = 'rgba(0,180,255,0.3)';
    ctx.strokeRect(x, hudY, w, h);

    ctx.fillStyle = 'rgba(0,180,255,0.5)';
    ctx.font = '11px monospace';
    ctx.fillText(`ESCUDO  ${ship.shieldCooldown.toFixed(1)}s`, x, hudY + h + 14);
  }

  // Aviso de skin
  if (skinToastTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px monospace';
    ctx.fillText(`SKIN: ${skinToast}`, W / 2, 46);
  }
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

  if (menuOpen) drawSkinMenu();
}

function drawSkinMenu() {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('SELECCIONAR SKIN', W / 2, 86);

  const rowH  = 54;
  const startY = 150;
  ctx.font = '16px monospace';

  for (let i = 0; i < SKINS.length; i++) {
    const y       = startY + i * rowH;
    const hover   = i === menuIndex;
    const current = i === selectedSkin;

    if (hover) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(W / 2 - 180, y - 20, 360, rowH);
    }

    ctx.save();
    ctx.translate(W / 2 - 150, y);
    ctx.rotate(-Math.PI / 2);
    drawShipShapes(SKINS[i], 0.8, false);
    ctx.restore();

    ctx.textAlign = 'left';
    if (hover) {
      ctx.fillStyle = '#ffd21f';
      ctx.fillText('>', W / 2 - 180, y + 5);
    }
    ctx.fillStyle = hover ? '#ffd21f' : 'rgba(255,255,255,0.85)';
    ctx.fillText(SKINS[i].name, W / 2 - 95, y + 5);
    if ((SKINS[i].scoreMulti || 1) > 1) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '11px monospace';
      ctx.fillText('PUNTOS x2', W / 2 - 95, y + 20);
      ctx.font = '16px monospace';
    }
    if (current && !hover) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px monospace';
      ctx.fillText('ACTUAL', W / 2 + 95, y + 5);
      ctx.font = '16px monospace';
    }
  }

  ctx.textAlign = 'center';
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('ARRIBA/ABAJO MOVER · ESPACIO SELECCIONAR · M / ESC CERRAR', W / 2, startY + SKINS.length * rowH + 16);
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

initGame();
requestAnimationFrame(loop);
