// ===== CANVAS =====
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
// Schaal alles mee met de schermHOOGTE, zodat het speelveld op telefoon
// (liggend = laag scherm) dezelfde verhouding heeft als op iPad/pc.
// Op breedte schalen werkte niet: liggend is het scherm juist breed maar laag.
function sizeFor() { return Math.max(0.42, Math.min(1, canvas.height / 760)); }
let SIZE = sizeFor();
function resizeGame() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  SIZE = sizeFor();
  recomputeBounds();
  if (typeof player !== 'undefined') applyScale();
  if (typeof makeVignette === 'function' && typeof vignetteGrad !== 'undefined') makeVignette();
}
window.addEventListener('resize', resizeGame);

// Performance: disable image smoothing voor snellere rendering
ctx.imageSmoothingEnabled = false;

// ===== SPRITES =====
const FRAME_W = 881, FRAME_H = 639, SCALE = 0.15;
const SPRITES = {
  run:        { img: new Image(), src: '__jet_pack_man_with_weapon_red_helmet_standing_run.png', cols:5, rows:3, total:15 },
  fly:        { img: new Image(), src: 'vlieg.png',           cols:5, rows:2, total:10 },
  die:        { img: new Image(), src: 'vliegdood.png',       cols:5, rows:1, total:5  },
  takeoff:    { img: new Image(), src: 'opstijgen.png',       cols:5, rows:2, total:10 },
  shootstand: { img: new Image(), src: 'staandschieten.png',  cols:5, rows:1, total:5  },
  shootfly:   { img: new Image(), src: 'vliegendschieten.png',cols:5, rows:2, total:10 },
};
Object.values(SPRITES).forEach(s => { s.img.src = s.src; });

// Verwissel de sprite-afbeeldingen naar een gekleurde skin (of terug naar origineel).
function applySuitColor(color) {
  const dir = color ? `skins/${color}/` : '';
  Object.values(SPRITES).forEach(s => { s.img.src = dir + s.src; });
}

// Raket sprite (122x374, wijst omhoog → draaien naar rechts in code)
const rocketImg = new Image();
rocketImg.src = 'raket.png';
// Origineel: 122 breed, 374 hoog → na 90° rotatie: 374 breed, 122 hoog
const ROCKET_W = 374 * 0.35; // schaal naar ~130px breed
const ROCKET_H = 122 * 0.35; // schaal naar ~43px hoog

// Exacte jetpack vlam positie gemeten via pixel analyse van vlieg.png
// Onderkant vlam: X=37.3% van links, Y=72.9% van boven
const JETPACK_X = 0.373;
const JETPACK_Y = 0.62;

// ===== CONSTANTEN =====
// Plafond- en vloer-marge schalen mee met de schermhoogte → het speelveld is
// op elk toestel dezelfde verhouding (geen vast plafond dat op telefoon te dik is).
let CEIL_Y    = 60;
let FLOOR_OFF = 80;
function recomputeBounds() {
  CEIL_Y    = Math.max(22, Math.min(64, Math.round(canvas.height * 0.055)));
  FLOOR_OFF = Math.max(46, Math.min(86, Math.round(canvas.height * 0.078)));
}
recomputeBounds();
const FLOOR_Y  = () => canvas.height - FLOOR_OFF;
const FOOT_OFF = () => player.height * 0.18;

// ===== GAME STATE =====
let gameState    = 'menu';
let coins        = 0;
let highScore    = parseInt(localStorage.getItem('jj_highscore') || '0');
let totalCoins   = parseInt(localStorage.getItem('kk_curuntie') || '0'); // gespaarde munten voor shop
let frameCount   = 0;
let gameSpeed    = 2.0;
let baseSpeed    = 2.0;

// ===== DELTA-TIME =====
// S is the time-scale factor normalised to 144 fps.
// At 144 fps S≈1, at 60 fps S≈2.4 — multiply every per-frame value by S.
let lastTime     = 0;
let S            = 1;

// ===== SPAWN TIMERS =====
let zapperTimer  = 0;
let coinTimer    = 0;
let speedUpTimer = 700;  // frames until next speed increase
let letterTimer  = 360;  // frames until first letter spawn
let powerupTimer = 450;  // frames until first powerup spawn

// ===== KOGEL =====
let bulletsLeft  = 1;       // aantal kogels over
let bullet       = { active:false, x:0, y:0, vx:14, r:5 };
let shootTimer   = 0;       // frames dat schietanimatie loopt
const SHOOT_ANIM_FRAMES = 8; // frames voor schietanimatie
let distance     = 0;

// ===== SLOMO & SHAKE =====
let slowMo        = false;
let slowMoTimer   = 0;
let slowMoFactor  = 1.0;
let shakeTimer    = 0;
let shakeIntensity= 0;
let shakeX        = 0;
let shakeY        = 0;

function triggerDeathEffects() {
  slowMo = true; slowMoTimer = 120; slowMoFactor = 0.25;
  shakeTimer = 80; shakeIntensity = 10;
  // Dramatische crash: witte flits + dubbele schokgolf + vonkenregen
  const cx = player.x + player.width/2, cy = player.y + player.height/2;
  screenFlash = 0.8;
  spawnRing(cx, cy, 'rgba(255,120,60,', 130);
  spawnRing(cx, cy, 'rgba(255,220,120,', 70);
  spawnSparks(cx, cy, '#ff8844', 16);
  spawnSparks(cx, cy, '#ffdd66', 10);
}
function updateSlowMoShake() {
  if (slowMoTimer > 0) {
    slowMoTimer -= S;
    if (slowMoTimer < 40) slowMoFactor = 0.25 + 0.75 * (1 - slowMoTimer / 40);
    if (slowMoTimer <= 0) { slowMo = false; slowMoFactor = 1.0; }
  }
  if (shakeTimer > 0) {
    shakeTimer -= S;
    const i = shakeIntensity * (shakeTimer / 80);
    shakeX = (Math.random()-0.5)*i*2; shakeY = (Math.random()-0.5)*i*2;
  } else { shakeX = 0; shakeY = 0; }
}

// ===== PLAYER =====
const player = {
  x:150, y:300, vy:0,
  gravity:0.08, thrustPower:0.11, maxUp:-2, maxDown:2.5,
  isThrusting:false, invincible:false,
  width: FRAME_W*SCALE*SIZE, height: FRAME_H*SCALE*SIZE,
  currentAnim:'run', currentFrame:0, frameTimer:0, frameRate:3,
  alive:true, onGround:false, dieFrameDone:false
};
// Poppetje-grootte én verticale snelheid schalen met SIZE, zodat het op telefoon
// even soepel en even "groot" speelt als op iPad/pc (zelfde verhouding).
const PHYS_BASE = { gravity:0.08, thrustPower:0.11, maxUp:-2, maxDown:2.5 };
function applyScale() {
  player.width       = FRAME_W*SCALE*SIZE;
  player.height      = FRAME_H*SCALE*SIZE;
  player.gravity     = PHYS_BASE.gravity     * SIZE;
  player.thrustPower = PHYS_BASE.thrustPower * SIZE;
  player.maxUp       = PHYS_BASE.maxUp       * SIZE;
  player.maxDown     = PHYS_BASE.maxDown     * SIZE;
}
applyScale();

// ===== POWERUPS =====
const POWERUP_TYPES = {
  magnet: { emoji:'🧲', color:'#ff4488', label:'Magneet',  duration:480 },
  shield: { emoji:'🛡️', color:'#44aaff', label:'Schild',   duration:0   },
  slowmo: { emoji:'🐢', color:'#aaffaa', label:'Slow-mo',  duration:360 },
  extrabullet: { emoji:'🔫', color:'#e74c3c', label:'+1 Kogel', duration:0 },
  rocket: { emoji:'🚀', color:'#ff6600', label:'Raket',    duration:600 }, // 600 frames (~10 sec)
};
let activePowerups = {};
let powerupObjects = [];
let rocketActive   = false;
let rocketY        = 0;
let rocketVy       = 0;
let shieldHit      = false;

// ===== JOB LETTERS SYSTEEM =====
const JOB_LETTERS = ['J', 'O', 'B'];
let collectedLetters = []; // welke letters al gepakt
let letterObjects    = []; // zwevende letters in het spel

function spawnLetter() {
  // Spawn de volgende benodigde letter
  const needed = JOB_LETTERS.filter(l => !collectedLetters.includes(l));
  if (needed.length === 0) return; // alle letters al gepakt
  const letter = needed[Math.floor(Math.random() * needed.length)];
  const y = CEIL_Y + 80 + Math.random() * (FLOOR_Y() - CEIL_Y - 180);
  letterObjects.push({
    letter, x: canvas.width + 60, y,
    phase: Math.random() * Math.PI * 2,
    collected: false,
    r: 28
  });
}

function drawLetters() {
  letterObjects.forEach(l => {
    if (l.collected) return;
    l.phase += 0.05 * slowMoFactor * S;
    const by = l.y + Math.sin(l.phase) * 6;

    ctx.save();

    // Buitenste pulse
    ctx.beginPath();
    ctx.arc(l.x, by, l.r + 6 + Math.sin(l.phase*2)*3, 0, Math.PI*2);
    ctx.strokeStyle = '#ffd700';
    ctx.globalAlpha = 0.2 + Math.sin(l.phase*2)*0.1;
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Achtergrond cirkel
    const bg = ctx.createRadialGradient(l.x-4, by-4, 2, l.x, by, l.r);
    bg.addColorStop(0,   'rgba(255,255,200,0.3)');
    bg.addColorStop(0.5, 'rgba(255,200,0,0.85)');
    bg.addColorStop(1,   'rgba(200,140,0,0.6)');
    ctx.beginPath();
    ctx.arc(l.x, by, l.r, 0, Math.PI*2);
    ctx.fillStyle   = bg;
    ctx.fill();

    // Rand
    ctx.strokeStyle = '#ffee44';
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Glans
    ctx.beginPath();
    ctx.ellipse(l.x - l.r*0.2, by - l.r*0.3, l.r*0.3, l.r*0.18, -0.3, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();

    // Letter zelf
    ctx.font         = `bold ${l.r * 1.3}px Arial Black, Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#3a1a00';
    ctx.fillText(l.letter, l.x + 1, by + 2); // schaduw
    ctx.fillStyle    = '#ffffff';
    ctx.fillText(l.letter, l.x, by);

    ctx.restore();
  });
}

function updateLetters() {
  // Spawn letter elke ~12 seconden (720 frames @ 144fps ≈ 5s)
  letterTimer -= S;
  if (letterTimer <= 0) { spawnLetter(); letterTimer = 720; }

  letterObjects.forEach(l => {
    l.x -= gameSpeed * slowMoFactor * S;
    if (l.collected || !player.alive) return;
    const dx = l.x - (player.x + player.width/2);
    const dy = l.y - (player.y + player.height/2);
    if (Math.sqrt(dx*dx + dy*dy) < l.r + 28) {
      l.collected = true;
      if (!collectedLetters.includes(l.letter)) {
        collectedLetters.push(l.letter);
        showLetterPopup(l.letter, l.x, l.y);
        // Check of J O B compleet is
        if (JOB_LETTERS.every(lt => collectedLetters.includes(lt))) {
          setTimeout(() => triggerJobRocket(), 400);
        }
      }
    }
  });
  letterObjects = letterObjects.filter(l => l.x > -60 && !l.collected);
}

function triggerJobRocket() {
  collectedLetters = []; // reset voor volgende ronde
  activatePowerup('rocket');
  showPowerupBanner('🚀', 'JOB RAKET!', '#ff6600');
  missionEvent('job', 1);
}

function showLetterPopup(letter, x, y) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; left:${x}px; top:${y}px;
    font-size:28px; font-weight:900; color:#ffd700;
    text-shadow: 0 0 10px #ff8800, 2px 2px 0 #000;
    pointer-events:none; z-index:300;
    animation: letterPop 1s ease-out forwards;
  `;
  el.textContent = `+${letter}`;
  document.body.appendChild(el);

  // CSS animatie
  if (!document.getElementById('letterPopStyle')) {
    const style = document.createElement('style');
    style.id = 'letterPopStyle';
    style.textContent = `@keyframes letterPop {
      0%   { transform: translateY(0) scale(1);   opacity: 1; }
      50%  { transform: translateY(-30px) scale(1.3); opacity: 1; }
      100% { transform: translateY(-60px) scale(0.8); opacity: 0; }
    }`;
    document.head.appendChild(style);
  }
  setTimeout(() => el.remove(), 1000);
}

// ===== JOB VOORTGANG HUD =====
function drawJobHUD() {
  const startX = canvas.width / 2 - 60;
  const y      = 18;

  JOB_LETTERS.forEach((letter, i) => {
    const x       = startX + i * 44;
    const got     = collectedLetters.includes(letter);
    ctx.save();

    // Cirkel achtergrond
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI*2);
    ctx.fillStyle   = got ? 'rgba(255,200,0,0.9)' : 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.strokeStyle = got ? '#ffd700' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Letter
    ctx.font         = `bold 18px Arial Black, Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = got ? '#3a1a00' : 'rgba(255,255,255,0.3)';
    ctx.fillText(letter, x, y);

    // Checkmark als gepakt
    if (got) {
      ctx.font      = '11px Arial';
      ctx.fillStyle = '#ff6600';
      ctx.fillText('✓', x + 10, y - 10);
    }

    ctx.restore();
  });
}

function spawnPowerupCapsule() {
  // Raket alleen via JOB letters, niet via capsules
  const types = Object.keys(POWERUP_TYPES).filter(t => t !== 'rocket');
  const type  = types[Math.floor(Math.random()*types.length)];
  const y     = CEIL_Y + 60 + Math.random()*(FLOOR_Y()-CEIL_Y-120);
  powerupObjects.push({ type, x:canvas.width+40, y, r:22, phase:Math.random()*Math.PI*2, collected:false });
}

function activatePowerup(type) {
  const p = POWERUP_TYPES[type];
  showPowerupBanner(p.emoji, p.label, p.color);
  if (type === 'shield') {
    activePowerups.shield = 1;
  } else if (type === 'slowmo') {
    activePowerups.slowmo = p.duration;
  } else if (type === 'extrabullet') {
    bulletsLeft++;  // +1 kogel, geen timer nodig
  } else if (type === 'rocket') {
    activePowerups.rocket = p.duration;
    rocketActive = true;
    rocketY  = player.y + player.height/2;
    rocketVy = 0;
    gameSpeed = baseSpeed * 5.0;
    triggerRocketTransform(player.x + player.width/2, player.y + player.height/2);
  } else {
    activePowerups[type] = p.duration;
  }
}

function deactivatePowerup(type) {
  delete activePowerups[type];
  if (type === 'rocket') { rocketActive = false; player.vy = rocketVy; gameSpeed = baseSpeed; }
  if (type === 'slowmo') { slowMoFactor = 1.0; }
}

function updatePowerupTick() {
  Object.keys(activePowerups).forEach(type => {
    if (type === 'shield') return;
    activePowerups[type] -= S;
    if (activePowerups[type] <= 0) deactivatePowerup(type);
  });

  // Slowmo factor
  if (activePowerups.slowmo) slowMoFactor = 0.45;
  else if (!slowMo)          slowMoFactor = 1.0;

  // Raket physics
  if (rocketActive) {
    gameSpeed = baseSpeed * 5.0; // continu afdwingen — niets kan dit resetten
    if (player.isThrusting) rocketVy = Math.max(rocketVy - 0.12*S, -1.8);
    else                     rocketVy = Math.min(rocketVy + 0.10*S,  1.8);
    rocketY  = Math.max(CEIL_Y+20, Math.min(rocketY + rocketVy*S, FLOOR_Y()-40));
    player.y = rocketY - player.height/2;
    player.vy = 0;
  }

  // Magneet
  const magnetRange = window._magnetRange || 220;
  if (activePowerups.magnet) {
    coinObjects.forEach(c => {
      if (c.collected) return;
      const dx = (player.x+player.width/2)  - c.x;
      const dy = (player.y+player.height/2) - c.y;
      if (Math.sqrt(dx*dx+dy*dy) < magnetRange) { c.x += dx*0.08*S; c.y += dy*0.08*S; }
    });
  }
}

function showPowerupBanner(emoji, label, color) {
  let b = document.getElementById('powerupBanner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'powerupBanner';
    Object.assign(b.style, {
      position:'fixed', top:'80px', left:'50%', transform:'translateX(-50%)',
      background:'rgba(0,0,0,0.85)', borderRadius:'40px',
      padding:'10px 28px', fontSize:'22px', fontWeight:'900',
      zIndex:'200', pointerEvents:'none', letterSpacing:'2px',
      transition:'opacity 0.5s'
    });
    document.body.appendChild(b);
  }
  b.style.border = `2px solid ${color}`;
  b.style.color  = color;
  b.style.boxShadow = `0 0 20px ${color}`;
  b.textContent  = `${emoji} ${label.toUpperCase()}!`;
  b.style.opacity = '1';
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.style.opacity = '0'; }, 2000);
}

// ===== ACHTERGROND =====
const bgMountains = [];
const bgTreesFar  = [];
const bgTreesMid  = [];
const bgTreesNear = [];
let bgOffsets     = { mount:0, far:0, mid:0, near:0 };

// Flora-kleuren per thema: [hue, sat%, licht%] basis — random offsets per object
const THEME_FLORA = {
  default: { mount:[130,38,22], far:[125,38,26], mid:[122,48,32], near:[115,20,12], trunk:'#3a2010', trunkNear:'#150800' },
  space:   { mount:[248,30,13], far:[252,26,17], mid:[256,32,21], near:[250,25,9],  trunk:'#1c1c34', trunkNear:'#0e0e1e' },
  ocean:   { mount:[205,45,15], far:[192,50,20], mid:[185,55,26], near:[195,40,10], trunk:'#0a3040', trunkNear:'#052030' },
  winter:  { mount:[210,25,45], far:[210,15,68], mid:[208,18,76], near:[212,15,55], trunk:'#4a3828', trunkNear:'#241a10' },
  volcano: { mount:[12,45,14],  far:[18,42,17],  mid:[24,48,21],  near:[15,35,8],   trunk:'#2a0e04', trunkNear:'#140602' },
};
function floraColor(base, hr, lr) { return `hsl(${base[0]+hr*25},${base[1]}%,${base[2]+lr*10}%)`; }
function currentFlora() { return THEME_FLORA[shopEquipped['theme']] || THEME_FLORA.default; }

function initBackground() {
  const w = canvas.width;
  // Bergen — minder dan voorheen (hr/lr = random kleur-offsets, thema-kleur bij tekenen)
  for (let i=0; i<12; i++) {
    bgMountains.push({ x: w/6*i+Math.random()*80, w:150+Math.random()*200, h:80+Math.random()*120,
      hr:Math.random(), lr:Math.random() });
  }
  // Bomen — minder voor betere performance
  for (let i=0; i<16; i++) {
    bgTreesFar.push({ x:w/8*i+Math.random()*60, th:30+Math.random()*25, tw:7,
      cr:18+Math.random()*14, hr:Math.random(), lr:Math.random() });
  }
  for (let i=0; i<12; i++) {
    bgTreesMid.push({ x:w/6*i+Math.random()*80, th:50+Math.random()*35, tw:11,
      cr:28+Math.random()*18, hr:Math.random(), lr:Math.random() });
  }
  for (let i=0; i<10; i++) {
    bgTreesNear.push({ x:w/5*i+Math.random()*100, th:70+Math.random()*50, tw:16,
      cr:42+Math.random()*24, hr:Math.random(), lr:Math.random() });
  }
}
initBackground();

// Vogels — minder voor performance
const birds = Array.from({length:3}, () => ({
  x: Math.random()*canvas.width, y:80+Math.random()*100,
  spd:1.5+Math.random()*2, phase:Math.random()*Math.PI*2, sz:3+Math.random()*4
}));

// Wolken — zachte parallax-laag
const bgClouds = Array.from({length:5}, (_, i) => ({
  x: Math.random()*2000, y: 70+Math.random()*130,
  w: 80+Math.random()*120, spd: 0.10+Math.random()*0.18, a: 0.5+Math.random()*0.5
}));
// Verre heuvels — extra diepte-laag achter de bergen
const bgHills = Array.from({length:7}, (_, i) => ({
  x: i*260+Math.random()*120, w: 320+Math.random()*260, h: 40+Math.random()*55
}));
let hillOffset = 0;

function drawClouds() {
  const theme = shopEquipped['theme'] || 'default';
  if (theme === 'space' || theme === 'ocean') return;
  const TINT = { default:'240,255,235', winter:'255,255,255', volcano:'60,25,10' };
  const tint = TINT[theme] || TINT.default;
  const baseA = theme === 'volcano' ? 0.22 : 0.045;
  const w = canvas.width;
  bgClouds.forEach(c => {
    c.x -= c.spd * gameSpeed * 0.5 * slowMoFactor * S;
    const dx = ((c.x % (w+400)) + w+400) % (w+400) - 200;
    ctx.save();
    ctx.fillStyle = `rgba(${tint},${baseA*c.a})`;
    ctx.beginPath();
    ctx.ellipse(dx, c.y, c.w, c.w*0.32, 0, 0, Math.PI*2);
    ctx.ellipse(dx-c.w*0.45, c.y+c.w*0.10, c.w*0.55, c.w*0.22, 0, 0, Math.PI*2);
    ctx.ellipse(dx+c.w*0.5, c.y+c.w*0.08, c.w*0.6, c.w*0.25, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });
}

function drawHills() {
  const w = canvas.width, floorY = FLOOR_Y();
  const theme = shopEquipped['theme'] || 'default';
  const COL = { default:'rgba(10,28,10,0.85)', space:'rgba(8,8,24,0.9)', ocean:'rgba(0,18,36,0.9)', winter:'rgba(120,150,185,0.5)', volcano:'rgba(30,6,0,0.9)' };
  hillOffset += gameSpeed*0.04*slowMoFactor*S;
  ctx.fillStyle = COL[theme] || COL.default;
  bgHills.forEach(hl => {
    const dx = ((hl.x - hillOffset) % (w+700) + w+700) % (w+700) - 350;
    ctx.beginPath();
    ctx.moveTo(dx-hl.w/2, floorY);
    ctx.quadraticCurveTo(dx, floorY-hl.h*2, dx+hl.w/2, floorY);
    ctx.closePath(); ctx.fill();
  });
}

// Vignette — gecachet per resize (subtiele donkere randen = meer sfeer/focus)
let vignetteGrad = null;
function makeVignette() {
  const w = canvas.width, h = canvas.height;
  vignetteGrad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.45, w/2, h/2, Math.max(w,h)*0.75);
  vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.34)');
}
makeVignette();

function drawBackground() {
  const w = canvas.width, h = canvas.height;
  const floorY = FLOOR_Y();
  const theme = shopEquipped['theme'] || 'default';

  // Lucht per thema
  const SKY = {
    default: ['#020802','#051205','#0d2a0d','#1a4a15'],
    space:   ['#000003','#030010','#050018','#080028'],
    ocean:   ['#000a18','#001528','#002040','#003055'],
    winter:  ['#0a1525','#12253a','#1a3550','#204565'],
    volcano: ['#0e0200','#220500','#380800','#500c00'],
  };
  const sc = SKY[theme] || SKY.default;
  const sky = ctx.createLinearGradient(0,0,0,floorY);
  sky.addColorStop(0,   sc[0]);
  sky.addColorStop(0.25,sc[1]);
  sky.addColorStop(0.6, sc[2]);
  sky.addColorStop(1,   sc[3]);
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,floorY);

  // Atmosferische mist onderaan (kleur per thema)
  const MIST = {
    default: 'rgba(20,60,15,',
    space:   'rgba(10,10,40,',
    ocean:   'rgba(0,30,60,',
    winter:  'rgba(180,210,240,',
    volcano: 'rgba(80,15,0,',
  };
  const mc = MIST[theme] || MIST.default;
  const mist = ctx.createLinearGradient(0, floorY-150, 0, floorY);
  mist.addColorStop(0, mc+'0)'); mist.addColorStop(1, mc+'0.4)');
  ctx.fillStyle = mist; ctx.fillRect(0, floorY-150, w, 150);

  // Zon / maan / lava gloed
  const sx=w*0.78, sy=CEIL_Y+55;
  const sg = ctx.createRadialGradient(sx,sy,0,sx,sy,180);
  sg.addColorStop(0,'rgba(255,230,100,0.22)');
  sg.addColorStop(0.5,'rgba(255,180,30,0.06)');
  sg.addColorStop(1,'rgba(255,140,0,0)');
  ctx.fillStyle=sg; ctx.fillRect(0,0,w,floorY);

  // Zon / hemellichaam per thema
  ctx.save();
  if (theme === 'space') {
    // Maan
    const moonG = ctx.createRadialGradient(sx-5,sy-5,0,sx,sy,22);
    moonG.addColorStop(0,'#ffffff'); moonG.addColorStop(0.5,'#dde8ff'); moonG.addColorStop(1,'#8899bb');
    ctx.fillStyle=moonG; ctx.beginPath(); ctx.arc(sx,sy,22,0,Math.PI*2); ctx.fill();
    // Krater
    ctx.fillStyle='rgba(100,120,160,0.35)'; ctx.beginPath(); ctx.arc(sx+6,sy+4,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(100,120,160,0.2)'; ctx.beginPath(); ctx.arc(sx-8,sy-6,4,0,Math.PI*2); ctx.fill();
  } else if (theme === 'ocean') {
    // Onderwaterlicht bundel
    const ug = ctx.createRadialGradient(sx,sy,0,sx,sy,160);
    ug.addColorStop(0,'rgba(100,200,255,0.15)'); ug.addColorStop(1,'rgba(0,100,200,0)');
    ctx.fillStyle=ug; ctx.fillRect(0,0,w,floorY);
  } else if (theme === 'volcano') {
    // Lavaglow aan de horizon
    const lg = ctx.createRadialGradient(w*0.5,floorY,0,w*0.5,floorY,w*0.6);
    lg.addColorStop(0,'rgba(255,60,0,0.3)'); lg.addColorStop(0.5,'rgba(200,30,0,0.1)'); lg.addColorStop(1,'rgba(100,0,0,0)');
    ctx.fillStyle=lg; ctx.fillRect(0,0,w,floorY);
    // Rode zon
    const sg2 = ctx.createRadialGradient(sx-4,sy-4,0,sx,sy,30);
    sg2.addColorStop(0,'#ffffff'); sg2.addColorStop(0.3,'#ffaa00'); sg2.addColorStop(1,'#cc2200');
    ctx.fillStyle=sg2; ctx.beginPath(); ctx.arc(sx,sy,30,0,Math.PI*2); ctx.fill();
  } else if (theme === 'winter') {
    // Bleke zon
    const wg = ctx.createRadialGradient(sx,sy,0,sx,sy,150);
    wg.addColorStop(0,'rgba(200,220,255,0.18)'); wg.addColorStop(1,'rgba(150,180,255,0)');
    ctx.fillStyle=wg; ctx.fillRect(0,0,w,floorY);
    const sg3 = ctx.createRadialGradient(sx-3,sy-3,0,sx,sy,22);
    sg3.addColorStop(0,'#ffffff'); sg3.addColorStop(0.5,'#ddeeff'); sg3.addColorStop(1,'#aaccee');
    ctx.fillStyle=sg3; ctx.beginPath(); ctx.arc(sx,sy,22,0,Math.PI*2); ctx.fill();
  } else {
    // Standaard zon
    const sunG = ctx.createRadialGradient(sx-4,sy-4,0,sx,sy,26);
    sunG.addColorStop(0,'#ffffff'); sunG.addColorStop(0.3,'#ffe566'); sunG.addColorStop(1,'#ffbb00');
    ctx.fillStyle=sunG; ctx.beginPath(); ctx.arc(sx,sy,26,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Vogels (bos/winter) · vissen (oceaan) · niets (space/vulkaan)
  if (theme === 'ocean') {
    birds.forEach(b => {
      b.x -= b.spd*slowMoFactor; b.phase += 0.1*slowMoFactor;
      if (b.x < -30) { b.x = w+30; b.y = 80+Math.random()*(floorY-200); }
      const fy = b.y + Math.sin(b.phase)*4;
      const hue = 180 + b.sz*30;
      ctx.save();
      ctx.fillStyle = `hsl(${hue},60%,55%)`;
      ctx.beginPath(); ctx.ellipse(b.x, fy, b.sz*2.2, b.sz*1.2, 0, 0, Math.PI*2); ctx.fill();
      // Staart
      ctx.beginPath(); ctx.moveTo(b.x+b.sz*2, fy); ctx.lineTo(b.x+b.sz*3.4, fy-b.sz*1.1); ctx.lineTo(b.x+b.sz*3.4, fy+b.sz*1.1); ctx.closePath(); ctx.fill();
      // Oog
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x-b.sz*1.1, fy-b.sz*0.3, b.sz*0.35, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x-b.sz*1.2, fy-b.sz*0.3, b.sz*0.18, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
  } else if (theme === 'space' || theme === 'volcano') {
    birds.forEach(b => { b.x -= b.spd*slowMoFactor; if(b.x<-20) b.x=w+20; });
  } else birds.forEach(b => {
    b.x -= b.spd*slowMoFactor; b.phase += 0.12*slowMoFactor;
    if (b.x < -20) b.x = w+20;
    ctx.save(); ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(b.x-b.sz*2,b.y); ctx.quadraticCurveTo(b.x-b.sz,b.y-Math.sin(b.phase)*b.sz*1.2,b.x,b.y);
    ctx.moveTo(b.x+b.sz*2,b.y); ctx.quadraticCurveTo(b.x+b.sz,b.y-Math.sin(b.phase)*b.sz*1.2,b.x,b.y);
    ctx.stroke(); ctx.restore();
  });

  // Wolken (zachte parallax) + verre heuvels (extra diepte)
  drawClouds();
  drawHills();

  // Bergen (kleur + details per thema)
  const flora = currentFlora();
  bgOffsets.mount += gameSpeed*0.08*slowMoFactor*S;
  bgMountains.forEach(m => {
    const dx = ((m.x - bgOffsets.mount) % (w+400) + w+400) % (w+400) - 200;
    ctx.fillStyle=floraColor(flora.mount, m.hr, m.lr); ctx.beginPath();
    ctx.moveTo(dx-m.w/2,floorY); ctx.lineTo(dx,floorY-m.h); ctx.lineTo(dx+m.w/2,floorY); ctx.closePath(); ctx.fill();
    if (theme === 'winter') {
      // Sneeuwtop
      ctx.fillStyle = 'rgba(240,248,255,0.85)'; ctx.beginPath();
      ctx.moveTo(dx, floorY-m.h); ctx.lineTo(dx-m.w*0.13, floorY-m.h*0.68); ctx.lineTo(dx+m.w*0.13, floorY-m.h*0.68); ctx.closePath(); ctx.fill();
    } else if (theme === 'volcano' && m.hr > 0.45) {
      // Gloeiende krater op de top
      const g = ctx.createRadialGradient(dx, floorY-m.h, 1, dx, floorY-m.h, m.w*0.22);
      g.addColorStop(0, 'rgba(255,130,20,0.9)'); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, floorY-m.h, m.w*0.22, 0, Math.PI*2); ctx.fill();
    }
  });

  // Decor ver + midden (per thema: bomen / planeten / koraal / iglo's / vulkanen)
  bgOffsets.far += gameSpeed*0.2*slowMoFactor*S;
  drawPropSet(bgTreesFar, bgOffsets.far, 0.55, 'far');
  bgOffsets.mid += gameSpeed*0.35*slowMoFactor*S;
  drawPropSet(bgTreesMid, bgOffsets.mid, 0.78, 'mid');
}

function drawPropSet(objs, offset, alpha, layer) {
  const w = canvas.width, floorY = FLOOR_Y();
  const theme = shopEquipped['theme'] || 'default';
  const flora = currentFlora();
  const wrap = layer === 'near' ? 800 : 600, half = wrap/2;
  objs.forEach(t => {
    const dx = ((t.x - offset) % (w+wrap) + w+wrap) % (w+wrap) - half;
    ctx.save(); ctx.globalAlpha = alpha;
    drawThemeProp(theme, flora, t, dx, floorY, layer);
    ctx.restore();
  });
}

function drawForegroundTrees() {
  bgOffsets.near += gameSpeed*0.6*slowMoFactor*S;
  drawPropSet(bgTreesNear, bgOffsets.near, 0.95, 'near');
}

// ── Decor-objecten per thema ──
function drawThemeProp(theme, flora, t, dx, floorY, layer) {
  const trunk = layer === 'near' ? flora.trunkNear : flora.trunk;
  const kind = t.hr;   // stabiele random per object → bepaalt het soort prop

  if (theme === 'winter') {
    if (kind < 0.5) {
      // Besneeuwde spar
      ctx.fillStyle = trunk; ctx.fillRect(dx-2, floorY-t.th*0.35, 4, t.th*0.35);
      const H = t.th + t.cr, W = t.cr*1.7;
      ctx.fillStyle = `hsl(158,28%,${16+t.lr*10}%)`;
      ctx.beginPath(); ctx.moveTo(dx, floorY-H); ctx.lineTo(dx-W/2, floorY-t.th*0.25); ctx.lineTo(dx+W/2, floorY-t.th*0.25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(240,248,255,0.92)';
      ctx.beginPath(); ctx.moveTo(dx, floorY-H); ctx.lineTo(dx-W*0.30, floorY-H+t.cr*0.95); ctx.lineTo(dx+W*0.30, floorY-H+t.cr*0.95); ctx.closePath(); ctx.fill();
    } else if (kind < 0.78) {
      // Iglo
      const r = t.cr*1.15;
      ctx.fillStyle = '#e9f3fb'; ctx.beginPath(); ctx.arc(dx, floorY, r, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(150,180,210,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(dx, floorY, r*0.62, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx-r, floorY); ctx.lineTo(dx+r, floorY); ctx.stroke();
      ctx.fillStyle = '#a8c0d4'; ctx.beginPath(); ctx.arc(dx+r*0.72, floorY, r*0.34, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#33506a'; ctx.beginPath(); ctx.arc(dx+r*0.72, floorY, r*0.20, Math.PI, 0); ctx.fill();
    } else if (kind < 0.92 || layer !== 'near') {
      // Sneeuwpop
      const s = t.cr*0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(dx, floorY-s*0.8, s, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(dx, floorY-s*2.05, s*0.68, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(dx-s*0.2, floorY-s*2.2, 1.6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(dx+s*0.2, floorY-s*2.2, 1.6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ff8c1a';
      ctx.beginPath(); ctx.moveTo(dx, floorY-s*2.05); ctx.lineTo(dx+s*0.55, floorY-s*1.98); ctx.lineTo(dx, floorY-s*1.9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a1a2a'; ctx.fillRect(dx-s*0.45, floorY-s*2.75, s*0.9, s*0.22);
      ctx.fillRect(dx-s*0.3, floorY-s*3.1, s*0.6, s*0.4);
    } else {
      // Pinguïn (alleen dichtbij)
      const s = t.cr*0.42;
      ctx.fillStyle = '#16202c';
      ctx.beginPath(); ctx.ellipse(dx, floorY-s, s*0.7, s, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f2f7fb';
      ctx.beginPath(); ctx.ellipse(dx, floorY-s*0.85, s*0.42, s*0.7, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffa020';
      ctx.beginPath(); ctx.moveTo(dx, floorY-s*1.55); ctx.lineTo(dx+s*0.42, floorY-s*1.45); ctx.lineTo(dx, floorY-s*1.32); ctx.closePath(); ctx.fill();
      ctx.fillRect(dx-s*0.42, floorY-2, s*0.34, 2.5); ctx.fillRect(dx+s*0.08, floorY-2, s*0.34, 2.5);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(dx-s*0.18, floorY-s*1.68, 1.8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(dx-s*0.18, floorY-s*1.68, 0.9, 0, Math.PI*2); ctx.fill();
    }

  } else if (theme === 'volcano') {
    if (kind < 0.42) {
      // Verbrande kale boom
      ctx.strokeStyle = trunk; ctx.lineWidth = Math.max(2, t.tw*0.5); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(dx, floorY); ctx.lineTo(dx, floorY-t.th); ctx.stroke();
      ctx.lineWidth = Math.max(1.4, t.tw*0.26);
      ctx.beginPath(); ctx.moveTo(dx, floorY-t.th*0.55); ctx.lineTo(dx-t.cr*0.7, floorY-t.th*0.95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx, floorY-t.th*0.75); ctx.lineTo(dx+t.cr*0.6, floorY-t.th*1.15); ctx.stroke();
    } else if (kind < 0.72) {
      // Donkere rotsen
      ctx.fillStyle = `hsl(12,25%,${9+t.lr*7}%)`;
      ctx.beginPath(); ctx.arc(dx, floorY, t.cr*0.75, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(dx+t.cr*0.6, floorY, t.cr*0.45, Math.PI, 0); ctx.fill();
    } else {
      // Mini-vulkaan met gloeiende krater
      const H = t.th + t.cr, W = t.cr*2.4;
      ctx.fillStyle = `hsl(10,30%,${11+t.lr*6}%)`;
      ctx.beginPath(); ctx.moveTo(dx-W/2, floorY); ctx.lineTo(dx-W*0.13, floorY-H); ctx.lineTo(dx+W*0.13, floorY-H); ctx.lineTo(dx+W/2, floorY); ctx.closePath(); ctx.fill();
      const g = ctx.createRadialGradient(dx, floorY-H, 1, dx, floorY-H, W*0.4);
      g.addColorStop(0, 'rgba(255,140,20,0.95)'); g.addColorStop(0.5, 'rgba(255,60,0,0.35)'); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, floorY-H, W*0.4, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,10,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dx-W*0.06, floorY-H); ctx.quadraticCurveTo(dx-W*0.18, floorY-H*0.55, dx-W*0.10, floorY-H*0.3); ctx.stroke();
    }

  } else if (theme === 'space') {
    if (layer === 'near') {
      // Maanrotsen met kraters
      ctx.fillStyle = `hsl(240,12%,${16+t.lr*8}%)`;
      ctx.beginPath(); ctx.arc(dx, floorY, t.cr*0.8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(10,10,25,0.5)';
      ctx.beginPath(); ctx.ellipse(dx-t.cr*0.25, floorY-t.cr*0.35, t.cr*0.16, t.cr*0.10, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(dx+t.cr*0.3, floorY-t.cr*0.2, t.cr*0.12, t.cr*0.08, 0, 0, Math.PI*2); ctx.fill();
    } else {
      // Zwevende planeten (+ ring bij sommige)
      const py = CEIL_Y + 50 + t.lr*(floorY - CEIL_Y - 180);
      const r = t.cr*(layer === 'far' ? 0.5 : 0.75);
      const hue = Math.floor(kind*360);
      const g = ctx.createRadialGradient(dx-r*0.35, py-r*0.35, r*0.15, dx, py, r);
      g.addColorStop(0, `hsl(${hue},55%,62%)`); g.addColorStop(1, `hsl(${hue},50%,26%)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, py, r, 0, Math.PI*2); ctx.fill();
      if (kind > 0.55) {
        ctx.strokeStyle = `hsla(${(hue+40)%360},60%,70%,0.75)`; ctx.lineWidth = Math.max(1.5, r*0.14);
        ctx.beginPath(); ctx.ellipse(dx, py, r*1.6, r*0.42, -0.35, 0, Math.PI*2); ctx.stroke();
      }
    }

  } else if (theme === 'ocean') {
    if (kind < 0.45) {
      // Wuivend zeewier (2-3 slierten)
      const sway = Math.sin(frameCount*0.02 + t.hr*7) * t.cr*0.35;
      ctx.strokeStyle = `hsl(155,55%,${20+t.lr*10}%)`; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.lineWidth = Math.max(2.5, t.tw*0.4);
        ctx.beginPath(); ctx.moveTo(dx+i*t.tw*0.8, floorY);
        ctx.quadraticCurveTo(dx+i*t.tw*0.8 + sway, floorY-t.th*0.8, dx+i*t.tw*0.5 + sway*1.6, floorY-t.th*1.3-i*8);
        ctx.stroke();
      }
    } else if (kind < 0.78) {
      // Vertakt koraal (roze/oranje)
      const hue = 335 + t.lr*55;
      ctx.strokeStyle = `hsl(${hue},60%,52%)`; ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(3, t.tw*0.55);
      ctx.beginPath(); ctx.moveTo(dx, floorY); ctx.lineTo(dx, floorY-t.th*0.7); ctx.stroke();
      ctx.lineWidth = Math.max(2, t.tw*0.35);
      ctx.beginPath(); ctx.moveTo(dx, floorY-t.th*0.42); ctx.lineTo(dx-t.cr*0.6, floorY-t.th*0.95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx, floorY-t.th*0.55); ctx.lineTo(dx+t.cr*0.55, floorY-t.th*1.05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx-t.cr*0.6, floorY-t.th*0.95); ctx.lineTo(dx-t.cr*0.85, floorY-t.th*1.25); ctx.stroke();
    } else {
      // Bol-koraal + zeester
      const hue = 15 + t.lr*40;
      ctx.fillStyle = `hsl(${hue},65%,48%)`;
      ctx.beginPath(); ctx.arc(dx, floorY, t.cr*0.65, Math.PI, 0); ctx.fill();
      ctx.fillStyle = `hsla(${hue},70%,65%,0.5)`;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(dx-t.cr*0.4+i*t.cr*0.27, floorY-t.cr*0.35-((i%2)*t.cr*0.14), t.cr*0.09, 0, Math.PI*2); ctx.fill(); }
      if (layer === 'near') {
        ctx.fillStyle = '#ffb020'; ctx.save(); ctx.translate(dx+t.cr*1.1, floorY-5);
        drawStar(ctx, 0, 0, 5, 9, 4); ctx.fill(); ctx.restore();
      }
    }

  } else {
    // Standaard bos-boom
    ctx.fillStyle = trunk;
    ctx.fillRect(dx-t.tw/2, floorY-t.th, t.tw, t.th);
    ctx.fillStyle = floraColor(layer === 'near' ? flora.near : layer === 'mid' ? flora.mid : flora.far, t.hr, t.lr);
    ctx.beginPath(); ctx.arc(dx, floorY-t.th-t.cr*0.6, t.cr, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(dx-t.cr*0.5, floorY-t.th-t.cr*0.25, t.cr*0.72, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(dx+t.cr*0.5, floorY-t.th-t.cr*0.25, t.cr*0.72, 0, Math.PI*2); ctx.fill();
    if (layer !== 'near') {
      // Zon-highlight op de kruin (subtiel, geeft diepte)
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = 'rgba(255,240,160,0.5)';
      ctx.beginPath(); ctx.arc(dx+t.cr*0.3, floorY-t.th-t.cr*0.85, t.cr*0.4, 0, Math.PI*2); ctx.fill();
    }
  }
}

function drawFloorCeil() {
  const w=canvas.width, h=canvas.height, floorY=FLOOR_Y();
  const theme = shopEquipped['theme'] || 'default';

  const THEME_FLOOR = {
    default: { g1:'#2d5a1b', g2:'#1e3d12', g3:'#0a1a06', grass:'#4aaa20', ceil:'#0a1a06', liana:'#2a5018' },
    space:   { g1:'#18182a', g2:'#10102a', g3:'#080815', grass:'#444466', ceil:'#000005', liana:'#22223a' },
    ocean:   { g1:'#00223a', g2:'#001a2e', g3:'#000f1e', grass:'#00bbbb', ceil:'#000a18', liana:'#005566' },
    winter:  { g1:'#c8dff0', g2:'#a8c8e0', g3:'#88b0cc', grass:'#ffffff', ceil:'#0a1525', liana:'#b0cce0' },
    volcano: { g1:'#2e0a00', g2:'#1e0600', g3:'#100200', grass:'#ff2200', ceil:'#0e0200', liana:'#3a1000' },
  };
  const t = THEME_FLOOR[theme] || THEME_FLOOR.default;

  // Vloer
  const fg=ctx.createLinearGradient(0,floorY,0,h);
  fg.addColorStop(0,t.g1); fg.addColorStop(0.2,t.g2); fg.addColorStop(1,t.g3);
  ctx.fillStyle=fg; ctx.fillRect(0,floorY,w,h-floorY);
  // Vulkaan: gloeiende lava rand
  if (theme === 'volcano') {
    const lv = ctx.createLinearGradient(0,floorY,0,floorY+12);
    lv.addColorStop(0,'#ff4400'); lv.addColorStop(1,'rgba(200,0,0,0)');
    ctx.fillStyle=lv; ctx.fillRect(0,floorY,w,12);
  }
  ctx.fillStyle=t.grass; ctx.fillRect(0,floorY,w,3);
  // Plafond
  ctx.fillStyle=t.ceil; ctx.fillRect(0,0,w,CEIL_Y);
  // Lianen / decoratie
  if (theme !== 'space') {
    ctx.strokeStyle=t.liana; ctx.lineWidth=3;
    for (let lx=(bgOffsets.far*0.5)%80; lx<w; lx+=80) {
      ctx.beginPath(); ctx.moveTo(lx,0);
      ctx.quadraticCurveTo(lx+15,CEIL_Y*0.6,lx+5,CEIL_Y); ctx.stroke();
    }
  }
  ctx.fillStyle=t.grass; ctx.fillRect(0,CEIL_Y-2,w,3);
}

// ===== THEMA PARTICLES =====
function spawnThemeParticle() {
  const theme = shopEquipped['theme'];
  if (!theme || theme === 'default') return;
  if (theme === 'space') {
    if (Math.random() > 0.985) {
      themeParticles.push({
        type:'shootingstar', x:canvas.width+20, y:CEIL_Y + Math.random()*(FLOOR_Y()-CEIL_Y)*0.6,
        vx:-10-Math.random()*8, vy:1.5+Math.random()*3,
        life:1, len:50+Math.random()*70
      });
    }
  } else if (theme === 'ocean') {
    if (Math.random() > 0.82) {
      themeParticles.push({
        type:'oceanbubble', x:Math.random()*canvas.width, y:FLOOR_Y(),
        vx:(Math.random()-0.5)*0.5, vy:-1.2-Math.random()*2,
        life:1, size:3+Math.random()*9
      });
    }
  } else if (theme === 'winter') {
    if (Math.random() > 0.65) {
      themeParticles.push({
        type:'snowflake', x:canvas.width + Math.random()*80, y:CEIL_Y + Math.random()*(FLOOR_Y()-CEIL_Y),
        vx:-0.5-Math.random()*0.8, vy:0.8+Math.random()*1.6,
        life:1, size:2+Math.random()*4, phase:Math.random()*Math.PI*2
      });
    }
  } else if (theme === 'volcano') {
    if (Math.random() > 0.78) {
      themeParticles.push({
        type:'ember', x:Math.random()*canvas.width, y:FLOOR_Y(),
        vx:(Math.random()-0.5)*2.5, vy:-3-Math.random()*5,
        life:1, size:1.5+Math.random()*3.5, hue:8+Math.random()*28
      });
    }
  }
}

function updateThemeParticles() {
  spawnThemeParticle();
  themeParticles.forEach(p => {
    p.x += p.vx * slowMoFactor * S;
    p.y += p.vy * slowMoFactor * S;
    if (p.type === 'snowflake') { p.phase += 0.04*S; p.x += Math.sin(p.phase)*0.4; }
    if (p.type === 'ember')     { p.vx += (Math.random()-0.5)*0.3; }
    p.life -= 0.006 * slowMoFactor * S;
  });
  themeParticles = themeParticles.filter(p =>
    p.life > 0 && p.y > CEIL_Y-20 && p.y < canvas.height+20 && p.x > -60
  );
}

function drawThemeParticles() {
  const theme = shopEquipped['theme'];
  if (!theme || theme === 'default') return;

  // Space: statische sterren
  if (theme === 'space') {
    const w = canvas.width;
    SPACE_STARS.forEach(s => {
      s.twinkle += 0.025 * S;
      const alpha = s.brightness * (0.6 + Math.sin(s.twinkle)*0.4);
      const sx = ((s.x - bgOffsets.mount * 0.5) % (w+400) + w+400) % (w+400) - 200;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(sx, s.y, s.size, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  themeParticles.forEach(p => {
    ctx.save();
    if (p.type === 'shootingstar') {
      const sg = ctx.createLinearGradient(p.x, p.y, p.x - p.vx*(p.len/10), p.y - p.vy*(p.len/10));
      sg.addColorStop(0,'rgba(255,255,220,0.95)'); sg.addColorStop(1,'rgba(255,255,200,0)');
      ctx.globalAlpha = p.life;
      ctx.strokeStyle = sg; ctx.lineWidth = 2.5 * p.life;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*(p.len/10),p.y-p.vy*(p.len/10)); ctx.stroke();
    } else if (p.type === 'oceanbubble') {
      ctx.globalAlpha = p.life * 0.35;
      ctx.fillStyle = 'rgba(80,190,255,0.25)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = p.life * 0.55;
      ctx.strokeStyle = 'rgba(140,225,255,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.stroke();
    } else if (p.type === 'snowflake') {
      ctx.globalAlpha = p.life * 0.85;
      ctx.fillStyle = 'rgba(220,240,255,0.9)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill();
    } else if (p.type === 'ember') {
      ctx.globalAlpha = p.life * 0.85;
      ctx.fillStyle = `hsl(${p.hue},100%,${50+p.life*20}%)`;
      ctx.shadowColor = `hsl(${p.hue},100%,55%)`; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
}

// ===== ZAPPERS =====
let zappers = [];
let lastGapCenter = null;   // opening van de vorige laser (voor haalbare spawns)
function spawnZapper() {
  // Alle laser-maten schalen met SIZE (= schermhoogte), zodat de moeilijkheid
  // op telefoon hetzelfde is als op iPad/pc en gaten niet groter zijn dan het veld.
  const Z = SIZE;
  const floorY = FLOOR_Y();

  // ── Slimmere spawning 1: genoeg horizontale ruimte tussen lasers ──
  const lastX = zappers.length ? Math.max(...zappers.map(z => z.x + (z.length ? z.length/2 : z.len ? z.len/2 : 30))) : -9999;
  const minSpace = (280 + gameSpeed*40) * Z;
  if (canvas.width + 50 - lastX < minSpace) return;   // te dichtbij — volgende tick opnieuw

  // ── Type-keuze: nieuwe types pas verderop, zodat het begin rustig blijft ──
  const pool = ['vertical','vertical','horizontal','horizontal'];
  if (distance > 120) pool.push('diagonal','diagonal');
  if (distance > 250) pool.push('moving','moving','moving');
  if (distance > 400) pool.push('blink','blink','blink');
  const type = pool[Math.floor(Math.random()*pool.length)];

  // ── Slimmere spawning 2: nieuwe opening haalbaar vanaf de vorige ──
  const reach = lastGapCenter == null ? 99999 : Math.max(140*Z, (minSpace / Math.max(1,gameSpeed)) * 1.7);
  const clampGap = (c) => lastGapCenter == null ? c : Math.max(lastGapCenter - reach, Math.min(lastGapCenter + reach, c));

  if (type === 'vertical') {
    const gs = (280+Math.random()*80)*Z;
    let gy = CEIL_Y+40*Z+Math.random()*Math.max(20,(floorY-CEIL_Y-80*Z-gs));
    gy = Math.max(CEIL_Y+30*Z, Math.min(floorY-30*Z-gs, clampGap(gy+gs/2)-gs/2));
    zappers.push({ type:'vertical', x:canvas.width+50, gapY:gy, gapSize:gs, width:20*Z, glowPhase:Math.random()*Math.PI*2 });
    lastGapCenter = gy + gs/2;
  } else if (type === 'horizontal') {
    const gs  = (270 + Math.random() * 80) * Z;
    const len = (220 + Math.random() * 120) * Z;
    let y = CEIL_Y + 100*Z + Math.random() * Math.max(20,(floorY - CEIL_Y - 200*Z));
    y = Math.max(CEIL_Y+60*Z, Math.min(floorY-60*Z, clampGap(y)));
    zappers.push({ type:'horizontal', x:canvas.width + len/2 + 50, y, gapSize:gs, height:20*Z, length:len, glowPhase:Math.random()*Math.PI*2 });
    lastGapCenter = y;
  } else if (type === 'diagonal') {
    const angle=(Math.random()>0.5?1:-1)*(25+Math.random()*25)*Math.PI/180;
    let cy=CEIL_Y+80*Z+Math.random()*Math.max(20,(floorY-CEIL_Y-200*Z));
    cy = Math.max(CEIL_Y+70*Z, Math.min(floorY-70*Z, clampGap(cy)));
    zappers.push({ type:'diagonal', x:canvas.width+60, y:cy, angle, len:(200+Math.random()*100)*Z, gap:(160+Math.random()*60)*Z, width:18*Z, glowPhase:Math.random()*Math.PI*2 });
    lastGapCenter = cy;
  } else if (type === 'moving') {
    // Verticale laser waarvan de opening langzaam op en neer beweegt
    const gs = (300+Math.random()*70)*Z;
    const amp = (55+Math.random()*55)*Z;
    const lo = CEIL_Y + amp + gs/2 + 30*Z, hi = floorY - amp - gs/2 - 30*Z;
    const mid = hi > lo ? lo + Math.random()*(hi-lo) : (CEIL_Y+floorY)/2;   // mid = centrum van de opening
    zappers.push({ type:'moving', x:canvas.width+50, baseGapY:mid, gapY:mid-gs/2, gapSize:gs, amp, phase:Math.random()*Math.PI*2, spd:0.018+Math.random()*0.014, width:20*Z, glowPhase:Math.random()*Math.PI*2 });
    lastGapCenter = mid;
  } else {
    // Knipper-laser: balk die aan/uit gaat, met een vaste opening om doorheen te vliegen
    const gs = (280+Math.random()*80)*Z;
    let gy = CEIL_Y+40*Z+Math.random()*Math.max(20,(floorY-CEIL_Y-80*Z-gs));
    gy = Math.max(CEIL_Y+30*Z, Math.min(floorY-30*Z-gs, clampGap(gy+gs/2)-gs/2));
    zappers.push({ type:'blink', x:canvas.width+50, gapY:gy, gapSize:gs, width:22*Z, cycle:Math.random()*240, glowPhase:Math.random()*Math.PI*2 });
    lastGapCenter = gy + gs/2;
  }
}

// Knipper-laser cyclus: 110 frames aan → 40 waarschuwen → 90 uit
function blinkState(z) {
  const c = z.cycle % 240;
  return c < 110 ? 'on' : c < 150 ? 'warn' : 'off';
}

// ===== LASER HELPER FUNCTIES =====
function drawLaserBeam(x1, y1, x2, y2, glow, color) {
  const len = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
  if (len < 1) return;

  ctx.save();

  // === Laag 1: Brede buitenste glow ===
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color.outer;
  ctx.lineWidth   = 14 + glow * 6;
  ctx.globalAlpha = 0.12 + glow * 0.08;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // === Laag 2: Middelste glow ===
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color.mid;
  ctx.lineWidth   = 6 + glow * 3;
  ctx.globalAlpha = 0.35 + glow * 0.2;
  ctx.stroke();

  // === Laag 3: Harde kern ===
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color.core;
  ctx.lineWidth   = 2.5;
  ctx.globalAlpha = 0.9 + glow * 0.1;
  ctx.stroke();

  // === Laag 4: Witte flikkerende middellijn ===
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth   = 1;
  ctx.globalAlpha = 0.5 + glow * 0.5;
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawLaserNode(x, y, glow, color) {
  ctx.save();

  // Buitenste ring
  ctx.beginPath();
  ctx.arc(x, y, 14 + glow * 4, 0, Math.PI * 2);
  ctx.fillStyle   = color.outer;
  ctx.globalAlpha = 0.2 + glow * 0.15;
  ctx.fill();

  // Binnenste cirkel
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle   = color.mid;
  ctx.globalAlpha = 0.7 + glow * 0.3;
  ctx.fill();

  // Witte kern
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle   = '#ffffff';
  ctx.globalAlpha = 0.9 + glow * 0.1;
  ctx.fill();

  // Energie kruisje
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth   = 1.5;
  ctx.globalAlpha = 0.4 + glow * 0.4;
  const r = 12 + glow * 3;
  ctx.beginPath(); ctx.moveTo(x-r, y); ctx.lineTo(x+r, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y-r); ctx.lineTo(x, y+r); ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawLaserEmitter(x, y, w, h, glow, color) {
  ctx.save();

  // Emitter box
  const grad = ctx.createLinearGradient(x, y, x+w, y+h);
  grad.addColorStop(0,   '#2a2a3a');
  grad.addColorStop(0.5, '#3a3a5a');
  grad.addColorStop(1,   '#1a1a2a');
  ctx.fillStyle   = grad;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, 4) : ctx.rect(x, y, w, h);
  ctx.fill();

  // Rand
  ctx.strokeStyle = color.mid;
  ctx.lineWidth   = 1.5;
  ctx.globalAlpha = 0.6 + glow * 0.3;
  ctx.stroke();

  // Glowing opening
  ctx.beginPath();
  ctx.arc(x + w/2, y + h/2, Math.min(w,h)*0.3, 0, Math.PI*2);
  ctx.fillStyle   = color.core;
  ctx.globalAlpha = 0.5 + glow * 0.4;
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawZappers() {
  zappers.forEach(z => {
    z.glowPhase += 0.1 * slowMoFactor;
    const glow = Math.sin(z.glowPhase) * 0.5 + 0.5;

    // Kleur per type
    const colors = {
      vertical:   { outer:'rgba(255,50,50,1)',   mid:'rgba(255,120,50,1)',  core:'rgba(255,200,100,1)' },
      horizontal: { outer:'rgba(180,0,255,1)',   mid:'rgba(220,80,255,1)',  core:'rgba(240,180,255,1)' },
      diagonal:   { outer:'rgba(0,220,255,1)',   mid:'rgba(50,255,200,1)',  core:'rgba(200,255,255,1)' },
      moving:     { outer:'rgba(255,160,0,1)',   mid:'rgba(255,210,60,1)',  core:'rgba(255,245,180,1)' },
      blink:      { outer:'rgba(0,255,120,1)',   mid:'rgba(120,255,170,1)', core:'rgba(220,255,235,1)' },
    };
    const color = colors[z.type];

    if (z.type === 'blink') {
      // Volledige balk die aan/uit knippert — waarschuwt voor hij aan gaat
      const eW = 28, eH = 16, floorY = FLOOR_Y();
      const st = blinkState(z);
      drawLaserEmitter(z.x - eW/2, CEIL_Y, eW, eH, glow, color);
      drawLaserEmitter(z.x - eW/2, floorY - eH, eW, eH, glow, color);
      if (st === 'on') {
        drawLaserBeam(z.x, CEIL_Y + eH, z.x, z.gapY, glow, color);
        drawLaserNode(z.x, z.gapY, glow, color);
        drawLaserBeam(z.x, z.gapY + z.gapSize, z.x, floorY - eH, glow, color);
        drawLaserNode(z.x, z.gapY + z.gapSize, glow, color);
      } else if (st === 'warn') {
        // Flikkerende waarschuwing: laser laadt op
        if (Math.floor(z.cycle / 6) % 2 === 0) {
          ctx.save(); ctx.globalAlpha = 0.3;
          ctx.setLineDash([8, 12]);
          ctx.strokeStyle = color.mid; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(z.x, CEIL_Y+eH); ctx.lineTo(z.x, floorY-eH); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      } else {
        // Uit: vage stippellijn zodat je weet waar hij zit
        ctx.save(); ctx.globalAlpha = 0.12;
        ctx.setLineDash([4, 16]);
        ctx.strokeStyle = color.mid; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(z.x, CEIL_Y+eH); ctx.lineTo(z.x, floorY-eH); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      return;
    }

    if (z.type === 'vertical' || z.type === 'moving') {
      const eW = 28, eH = 16;
      const floorY = FLOOR_Y();

      // Bovenste emitter + laser naar beneden
      drawLaserEmitter(z.x - eW/2, CEIL_Y, eW, eH, glow, color);
      drawLaserBeam(z.x, CEIL_Y + eH, z.x, z.gapY, glow, color);
      drawLaserNode(z.x, z.gapY, glow, color);

      // Onderste emitter + laser naar boven
      drawLaserEmitter(z.x - eW/2, floorY - eH, eW, eH, glow, color);
      drawLaserBeam(z.x, floorY - eH, z.x, z.gapY + z.gapSize, glow, color);
      drawLaserNode(z.x, z.gapY + z.gapSize, glow, color);

    } else if (z.type === 'horizontal') {
      const eW = 16, eH = 28;
      const leftEnd  = z.x - z.length/2;
      const rightEnd = z.x + z.length/2;
      const gapL = z.x - z.gapSize/2;
      const gapR = z.x + z.gapSize/2;

      // Linker emitter
      drawLaserEmitter(leftEnd, z.y - eH/2, eW, eH, glow, color);
      // Laser van linker emitter tot linker rand van gat
      drawLaserBeam(leftEnd + eW, z.y, gapL, z.y, glow, color);
      // Node op gat rand
      drawLaserNode(gapL, z.y, glow, color);

      // Rechter emitter
      drawLaserEmitter(rightEnd - eW, z.y - eH/2, eW, eH, glow, color);
      // Laser van rechter emitter tot rechter rand van gat
      drawLaserBeam(rightEnd - eW, z.y, gapR, z.y, glow, color);
      // Node op gat rand
      drawLaserNode(gapR, z.y, glow, color);

    } else if (z.type === 'diagonal') {
      const cos = Math.cos(z.angle), sin = Math.sin(z.angle);
      const hg  = z.gap / 2;

      // Balk 1
      const b1x1 = z.x - sin*hg - cos*z.len/2, b1y1 = z.y + cos*hg - sin*z.len/2;
      const b1x2 = z.x - sin*hg + cos*z.len/2, b1y2 = z.y + cos*hg + sin*z.len/2;
      drawLaserBeam(b1x1, b1y1, b1x2, b1y2, glow, color);
      drawLaserNode(b1x1, b1y1, glow, color);
      drawLaserNode(b1x2, b1y2, glow, color);

      // Balk 2
      const b2x1 = z.x + sin*hg - cos*z.len/2, b2y1 = z.y - cos*hg - sin*z.len/2;
      const b2x2 = z.x + sin*hg + cos*z.len/2, b2y2 = z.y - cos*hg + sin*z.len/2;
      drawLaserBeam(b2x1, b2y1, b2x2, b2y2, glow, color);
      drawLaserNode(b2x1, b2y1, glow, color);
      drawLaserNode(b2x2, b2y2, glow, color);
    }
  });
}

function updateZappers() {
  zapperTimer += S;
  // Spawn rate scales up with rocket speed so obstacles still feel challenging
  const speedMult = rocketActive ? gameSpeed / baseSpeed : 1;
  const zInterval = Math.max(60, Math.floor((480 - frameCount / 80) / speedMult));
  if (zapperTimer >= zInterval) { spawnZapper(); zapperTimer = 0; }
  zappers = zappers.filter(z => {
    const prevZx = z.x; // positie voor beweging (sweep test)
    z.x -= gameSpeed*slowMoFactor*S;
    // Bewegende opening / knipper-cyclus bijwerken
    if (z.type === 'moving') { z.phase += z.spd*slowMoFactor*S; z.gapY = z.baseGapY + Math.sin(z.phase)*z.amp - z.gapSize/2; }
    if (z.type === 'blink')  { z.cycle += slowMoFactor*S; }
    // Kogel raakt laser → laser kapot (sweep-gebaseerde detectie)
    if (bullet.active) {
      const prevBx = bullet.x - bullet.vx * slowMoFactor * S; // vorige kogelpositie
      let hit = false;
      if (z.type === 'vertical' || z.type === 'moving' || z.type === 'blink') {
        // Sweep: heeft kogel de laser-x overgestoken deze frame?
        const crossed = (prevBx <= prevZx && bullet.x >= z.x) ||
                        (prevBx >= prevZx && bullet.x <= z.x) ||
                        Math.abs(bullet.x - z.x) < 28;
        // Y-bereik check: kogel moet binnen de laser-opening vallen
        const inBeam = bullet.y < z.gapY || bullet.y > z.gapY + z.gapSize;
        hit = crossed && inBeam;
      } else if (z.type === 'horizontal') {
        hit = Math.abs(bullet.y - z.y) < 22 &&
              bullet.x >= z.x - z.length/2 && bullet.x <= z.x + z.length/2;
      } else if (z.type === 'diagonal') {
        hit = Math.hypot(bullet.x - z.x, bullet.y - z.y) < 90;
      }
      if (hit) {
        bullet.active = false;
        // Beloning + effect voor het kapotschieten
        coins += 3;
        spawnFloatText(bullet.x, bullet.y - 20, '+3 🪙', '#7ef0a0', 20);
        spawnRing(bullet.x, bullet.y, 'rgba(150,255,180,', 80);
        spawnSparks(bullet.x, bullet.y, '#88ffbb', 10);
        missionEvent('lasers', 1);
        return false;
      }
    }
    return true;
  });
  zappers.forEach(z => {
    if (!player.alive || player.invincible || rocketActive) return;
    const px=player.x+28, py=player.y+15, pw=player.width-56, ph=player.height-FOOT_OFF()-20;
    if (z.type==='vertical' || z.type==='moving') {
      if (px+pw>z.x-z.width/2 && px<z.x+z.width/2)
        if (py<z.gapY || py+ph>z.gapY+z.gapSize) endGame();
    } else if (z.type==='blink') {
      if (blinkState(z) === 'on' && px+pw>z.x-z.width/2 && px<z.x+z.width/2)
        if (py<z.gapY || py+ph>z.gapY+z.gapSize) endGame();
    } else if (z.type==='horizontal') {
      const inGap = px+pw/2>z.x-z.gapSize/2 && px+pw/2<z.x+z.gapSize/2;
      if (!inGap && px+pw>z.x-z.length/2 && px<z.x+z.length/2 && py+ph>z.y-z.height/2 && py<z.y+z.height/2) endGame();
    } else {
      const cos=Math.cos(z.angle), sin=Math.sin(z.angle), hg=z.gap/2;
      const cx=player.x+player.width/2, cy2=player.y+player.height/2;
      [1,-1].forEach(side => {
        const ox=-sin*hg*side, oy=cos*hg*side;
        const dx=cx-(z.x+ox), dy=cy2-(z.y+oy);
        if (Math.abs(dx*cos+dy*sin)<z.len/2 && Math.abs(-dx*sin+dy*cos)<z.width/2+12) endGame();
      });
    }
  });
  zappers = zappers.filter(z=>z.x>-300);
}

// ===== VIJANDELIJKE RAKETTEN =====
// Waarschuwing (⚠ knippert op jouw hoogte) → raket vliegt snel binnen.
let missiles = [];
let missileTimer = 0;

function updateMissiles() {
  if (distance > 250 && player.alive) {
    missileTimer += S;
    const interval = Math.max(280, 620 - distance/3);
    if (missileTimer >= interval) {
      missileTimer = 0;
      missiles.push({ y: player.y + player.height/2, warn: 150, x: canvas.width + 40, active: false });
    }
  }
  missiles.forEach(m => {
    if (m.warn > 0) { m.warn -= slowMoFactor*S; if (m.warn <= 0) m.active = true; return; }
    m.x -= (gameSpeed*2.2 + 7) * slowMoFactor * S;
    // Rook-spoor
    if (Math.random() < 0.5) fxSparks.push({ x:m.x+30, y:m.y+(Math.random()-0.5)*6, vx:1+Math.random(), vy:(Math.random()-0.5)*0.6, life:0.7, color:'rgba(200,200,200,0.7)', size:2.5+Math.random()*2 });
    // Kogel kan de raket neerschieten
    if (bullet.active && Math.hypot(bullet.x-m.x, bullet.y-m.y) < 30) {
      bullet.active = false; m.dead = true;
      coins += 5;
      spawnFloatText(m.x, m.y-24, 'RAKET NEER! +5 🪙', '#ffcc44', 22);
      spawnRing(m.x, m.y, 'rgba(255,180,80,', 100);
      spawnSparks(m.x, m.y, '#ffaa33', 14);
      screenFlash = Math.max(screenFlash, 0.15);
      missionEvent('rockets', 1);
      return;
    }
    // Botsing met speler
    if (player.alive && !player.invincible && !rocketActive) {
      const px = player.x+28, py = player.y+15, pw = player.width-56, ph = player.height-FOOT_OFF()-20;
      if (m.x > px && m.x < px+pw+20 && m.y > py-8 && m.y < py+ph+8) { m.dead = true; endGame(); }
    }
  });
  missiles = missiles.filter(m => !m.dead && m.x > -80);
}

function drawMissiles() {
  missiles.forEach(m => {
    if (m.warn > 0) {
      // Knipperend waarschuwingsbord aan de rechterrand
      if (Math.floor(m.warn / 9) % 2 === 0) {
        const wx = canvas.width - 34, wy = m.y;
        ctx.save();
        ctx.fillStyle = 'rgba(255,40,40,0.92)';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(wx-22, wy-22, 44, 44, 9) : ctx.rect(wx-22, wy-22, 44, 44); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '900 27px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', wx, wy+1);
        ctx.restore();
      }
      return;
    }
    // Raket zelf: romp + neus + vinnen + felle vlam
    ctx.save();
    ctx.translate(m.x, m.y);
    const g = ctx.createLinearGradient(0, -9, 0, 9);
    g.addColorStop(0, '#e8e8f0'); g.addColorStop(0.5, '#b8b8c8'); g.addColorStop(1, '#787888');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-18, -8, 40, 16, 8) : ctx.rect(-18, -8, 40, 16); ctx.fill();
    // Neuskegel
    ctx.fillStyle = '#ff4433';
    ctx.beginPath(); ctx.moveTo(-18, -8); ctx.quadraticCurveTo(-32, 0, -18, 8); ctx.closePath(); ctx.fill();
    // Vinnen
    ctx.fillStyle = '#ff4433';
    ctx.beginPath(); ctx.moveTo(14, -8); ctx.lineTo(26, -16); ctx.lineTo(22, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, 8); ctx.lineTo(26, 16); ctx.lineTo(22, 2); ctx.closePath(); ctx.fill();
    // Venster
    ctx.fillStyle = '#66ccff'; ctx.beginPath(); ctx.arc(-6, 0, 4, 0, Math.PI*2); ctx.fill();
    // Vlam (flikkert)
    const fl = 14 + Math.random()*12;
    const fg = ctx.createLinearGradient(22, 0, 22+fl, 0);
    fg.addColorStop(0, 'rgba(255,240,150,0.95)'); fg.addColorStop(0.5, 'rgba(255,140,30,0.8)'); fg.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(22, -6); ctx.lineTo(22+fl, 0); ctx.lineTo(22, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  });
}

// ===== MUNTEN =====
let coinObjects = [];
// ===== LASER COLLISION CHECK VOOR COINS =====
function isCoinInLaser(cx, cy) {
  for (const z of zappers) {
    if (z.type === 'vertical') {
      if (Math.abs(cx - z.x) < 30) {
        if (cy < z.gapY || cy > z.gapY + z.gapSize) return true;
      }
    } else if (z.type === 'moving') {
      if (Math.abs(cx - z.x) < 30) {
        // Alleen veilig waar de opening ALTIJD is (opening beweegt met amp op/neer)
        const safeTop = z.baseGapY - z.gapSize/2 + z.amp;
        const safeBot = z.baseGapY + z.gapSize/2 - z.amp;
        if (cy < safeTop || cy > safeBot) return true;
      }
    } else if (z.type === 'blink') {
      if (Math.abs(cx - z.x) < 30) return true;   // hele balk vermijden
    } else if (z.type === 'horizontal') {
      if (Math.abs(cy - z.y) < 30) {
        const inGap = cx > z.x - z.gapSize/2 && cx < z.x + z.gapSize/2;
        if (!inGap && cx > z.x - z.length/2 && cx < z.x + z.length/2) return true;
      }
    } else if (z.type === 'diagonal') {
      const cos = Math.cos(z.angle), sin = Math.sin(z.angle), hg = z.gap/2;
      for (const side of [1, -1]) {
        const ox = -sin*hg*side, oy = cos*hg*side;
        const dx = cx-(z.x+ox), dy = cy-(z.y+oy);
        if (Math.abs(dx*cos+dy*sin) < z.len/2 && Math.abs(-dx*sin+dy*cos) < 20) return true;
      }
    }
  }
  return false;
}

function spawnCoinRow() {
  // Probeer positie te vinden die niet in een laser zit
  let attempts = 0;
  let y;
  do {
    y = CEIL_Y + 80 + Math.random() * (FLOOR_Y() - CEIL_Y - 200);
    attempts++;
  } while (attempts < 10 && zappers.some(z =>
    z.type === 'horizontal' && Math.abs(y - z.y) < 40
  ));

  for (let i = 0; i < 4; i++) {   // 4 munten per rij
    const cx = canvas.width + 200 + i * 52; // ver genoeg vooruit spawnen
    coinObjects.push({ x:cx, y, r:16, collected:false, phase:i*0.3 });
  }
}

function drawCoins() {
  const skin = shopEquipped['coin_skin'] || 'default';
  coinObjects.forEach(c => {
    if (c.collected) return;
    c.phase += 0.05 * slowMoFactor * S;
    const by = c.y + Math.sin(c.phase) * 5;
    ctx.save();

    if (skin === 'diamond') {
      // Diamant vorm
      ctx.beginPath();
      ctx.moveTo(c.x, by - c.r);
      ctx.lineTo(c.x + c.r * 0.7, by);
      ctx.lineTo(c.x, by + c.r);
      ctx.lineTo(c.x - c.r * 0.7, by);
      ctx.closePath();
      const dg = ctx.createLinearGradient(c.x-c.r, by-c.r, c.x+c.r, by+c.r);
      dg.addColorStop(0, '#aaeeff'); dg.addColorStop(0.5, '#ffffff'); dg.addColorStop(1, '#44aaff');
      ctx.fillStyle = dg; ctx.fill();
      ctx.strokeStyle = '#88ddff'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='#44aaff'; ctx.font=`bold ${c.r*0.8}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💎', c.x, by);
    } else if (skin === 'star') {
      ctx.font = `${c.r*2}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⭐', c.x, by);
    } else if (skin === 'heart') {
      ctx.font = `${c.r*2}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('❤️', c.x, by);
    } else if (skin === 'rainbow') {
      const rh = (frameCount * 3 + c.phase * 50) % 360;
      const rg = ctx.createRadialGradient(c.x-3,by-3,1,c.x,by,c.r);
      rg.addColorStop(0,'#ffffff'); rg.addColorStop(0.4,`hsl(${rh},100%,65%)`); rg.addColorStop(1,`hsl(${(rh+80)%360},100%,45%)`);
      ctx.beginPath(); ctx.arc(c.x,by,c.r+4,0,Math.PI*2);
      ctx.fillStyle=`hsla(${rh},100%,60%,0.15)`; ctx.fill();
      ctx.beginPath(); ctx.arc(c.x,by,c.r,0,Math.PI*2);
      ctx.fillStyle=rg; ctx.fill();
      ctx.strokeStyle=`hsl(${(rh+40)%360},100%,60%)`; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font=`bold ${c.r*1.0}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('✦',c.x,by+1);
    } else if (skin === 'lava') {
      const lg = ctx.createRadialGradient(c.x-3,by-3,1,c.x,by,c.r);
      lg.addColorStop(0,'#ffffa0'); lg.addColorStop(0.4,'#ff5500'); lg.addColorStop(1,'#880000');
      ctx.beginPath(); ctx.arc(c.x,by,c.r+4,0,Math.PI*2);
      ctx.fillStyle='rgba(255,80,0,0.15)'; ctx.fill();
      ctx.beginPath(); ctx.arc(c.x,by,c.r,0,Math.PI*2);
      ctx.fillStyle=lg; ctx.fill();
      ctx.strokeStyle='#ff3300'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font=`bold ${c.r*1.1}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🔥',c.x,by);
    } else {
      // Standaard gouden munt
      ctx.beginPath(); ctx.arc(c.x, by, c.r+4, 0, Math.PI*2);
      ctx.fillStyle='rgba(255,215,0,0.15)'; ctx.fill();
      const g=ctx.createRadialGradient(c.x-3,by-3,1,c.x,by,c.r);
      g.addColorStop(0,'#fff7a0'); g.addColorStop(0.4,'#ffd700'); g.addColorStop(1,'#cc8800');
      ctx.beginPath(); ctx.arc(c.x,by,c.r,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle='#ffaa00'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#7a5000'; ctx.font=`bold ${c.r*1.1}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('$',c.x,by+1);
      ctx.beginPath(); ctx.ellipse(c.x-c.r*0.25,by-c.r*0.3,c.r*0.2,c.r*0.4,-0.5,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fill();
    }
    ctx.restore();
  });
}

function updateCoins() {
  coinTimer += S;
  const cInterval = Math.max(52, Math.floor(155 - frameCount / 150));
  if (coinTimer >= cInterval) { spawnCoinRow(); coinTimer = 0; }
  coinObjects.forEach(c => {
    c.x -= gameSpeed * slowMoFactor * S;
    // Verwijder munt als hij in een laser zit
    if (isCoinInLaser(c.x, c.y)) { c.collected = true; return; }
    if (!c.collected && player.alive) {
      const dx = c.x-(player.x+player.width/2), dy = c.y-(player.y+player.height/2);
      if (Math.sqrt(dx*dx+dy*dy) < c.r+30) { c.collected=true; coins++; showCoinPopup(c.x,c.y); onCoinCollected(c.x,c.y); }
    }
  });
  coinObjects = coinObjects.filter(c => c.x > -30 && !c.collected);
}

function showCoinPopup(x,y) {
  const el = document.createElement('div');
  el.className = 'coin-popup'; el.textContent = '+1 🪙';
  el.style.left = x+'px'; el.style.top = y+'px';
  document.body.appendChild(el); setTimeout(()=>el.remove(), 800);
}

// ===== FX SYSTEEM (popups / schokgolven / vonken / flits) =====
let floatTexts = [];   // zwevende teksten op het canvas
let fxRings    = [];   // schokgolf-ringen
let fxSparks   = [];   // vonk-deeltjes
let screenFlash = 0;   // korte witte flits (0..1)

function spawnFloatText(x, y, txt, color, size) {
  floatTexts.push({ x, y, txt, color: color||'#ffe08a', size: size||20, life: 1, vy: -1.2 });
}
function spawnRing(x, y, color, maxR) {
  fxRings.push({ x, y, r: 6, maxR: maxR||90, life: 1, color: color||'rgba(255,220,120,' });
}
function spawnSparks(x, y, color, n) {
  for (let i = 0; i < (n||6); i++) {
    const a = Math.random()*Math.PI*2, sp = 1.5+Math.random()*3.5;
    fxSparks.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp-1, life: 1, color: color||'#ffd700', size: 1.5+Math.random()*2 });
  }
}
function updateFX() {
  floatTexts.forEach(t => { t.y += t.vy*slowMoFactor*S; t.life -= 0.022*S; });
  floatTexts = floatTexts.filter(t => t.life > 0);
  fxRings.forEach(r => { r.r += (r.maxR-r.r)*0.12*S; r.life -= 0.035*S; });
  fxRings = fxRings.filter(r => r.life > 0);
  fxSparks.forEach(p => { p.x += p.vx*slowMoFactor*S; p.y += p.vy*slowMoFactor*S; p.vy += 0.12*S; p.life -= 0.03*S; });
  fxSparks = fxSparks.filter(p => p.life > 0);
  if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - 0.05*S);
}
function drawFX() {
  fxRings.forEach(r => {
    ctx.save(); ctx.globalAlpha = r.life*0.8;
    ctx.strokeStyle = r.color + (r.life*0.9) + ')';
    ctx.lineWidth = 3 + r.life*3;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  });
  fxSparks.forEach(p => {
    ctx.save(); ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
  floatTexts.forEach(t => {
    ctx.save(); ctx.globalAlpha = Math.min(1, t.life*1.4);
    ctx.font = `900 ${t.size}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4;
    ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
    ctx.restore();
  });
  if (screenFlash > 0) {
    ctx.save(); ctx.globalAlpha = screenFlash*0.55;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-30, -30, canvas.width+60, canvas.height+60);
    ctx.restore();
  }
}

// ===== COMBO SYSTEEM =====
let comboStreak = 0;
let comboTimer  = 0;   // frames resterend om de combo vast te houden
function onCoinCollected(x, y) {
  comboStreak++; comboTimer = 110;
  spawnSparks(x, y, '#ffd700', 5);
  // Bonus-drempels: hoe langer de reeks, hoe groter de beloning
  if (comboStreak === 8)       { coins += 3;  spawnFloatText(x, y-24, 'COMBO! +3 🪙', '#7ef0a0', 22); spawnRing(x, y, 'rgba(126,240,160,', 60); }
  else if (comboStreak === 16) { coins += 6;  spawnFloatText(x, y-24, 'SUPER COMBO! +6 🪙', '#66ccff', 24); spawnRing(x, y, 'rgba(102,204,255,', 80); }
  else if (comboStreak === 24) { coins += 12; spawnFloatText(x, y-24, 'MEGA COMBO! +12 🪙', '#ff8af0', 28); spawnRing(x, y, 'rgba(255,138,240,', 110); screenFlash = Math.max(screenFlash, 0.25); }
  else if (comboStreak > 24 && comboStreak % 12 === 0) { coins += 12; spawnFloatText(x, y-24, 'MEGA COMBO! +12 🪙', '#ff8af0', 28); }
}
function updateCombo() {
  if (comboTimer > 0) { comboTimer -= slowMoFactor*S; if (comboTimer <= 0) comboStreak = 0; }
}

// ===== TRAIL SYSTEEM =====
// Trail types: stars, smoke, fire, rainbow, energy, bubbles, lightning, ice
// Geselecteerd via shopEquipped['trail']
let trailParticles = [];

// ===== THEMA PARTICLES =====
let themeParticles = [];

// Statische sterren voor space-thema (eenmalig gegenereerd)
const SPACE_STARS = Array.from({length: 220}, () => ({
  x: Math.random() * 3000, y: Math.random() * 580,
  size: 0.5 + Math.random() * 1.8,
  brightness: 0.3 + Math.random() * 0.7,
  twinkle: Math.random() * Math.PI * 2
}));

function spawnTrail() {
  const trailType = shopEquipped['trail'];
  if (!trailType) return;

  const tx = player.x + player.width  * 0.12;  // meer naar achteren
  const ty = player.y + player.height * 0.5;

  if (trailType === 'stars') {
    for (let i = 0; i < 2; i++) {
      trailParticles.push({
        type:'stars',
        x: tx + Math.random()*8, y: ty + (Math.random()-0.5)*22,
        vx: -2.5 - Math.random()*2.5, vy: (Math.random()-0.5)*1.5,
        life: 1, size: 4 + Math.random()*6,
        hue: Math.random()*360,
        rot: Math.random()*Math.PI*2,
        rotSpeed: (Math.random()-0.5)*0.15
      });
    }
    if (Math.random() > 0.5) {
      trailParticles.push({
        type:'glitter',
        x: tx + Math.random()*14, y: ty + (Math.random()-0.5)*28,
        vx: -1.5 - Math.random()*2.5, vy: (Math.random()-0.5)*2,
        life: 1, size: 1.5 + Math.random()*2.5, hue: Math.random()*360
      });
    }

  } else if (trailType === 'smoke') {
    for (let i = 0; i < 2; i++) {
      trailParticles.push({
        type:'smoke',
        x: tx + Math.random()*10, y: ty + (Math.random()-0.5)*18,
        vx: -1.2 - Math.random()*2, vy: -0.2 - Math.random()*0.4,
        life: 1, size: 9 + Math.random()*11
      });
    }

  } else if (trailType === 'fire') {
    for (let i = 0; i < 3; i++) {
      trailParticles.push({
        type:'fire',
        x: tx + Math.random()*8, y: ty + (Math.random()-0.5)*20,
        vx: -2.5 - Math.random()*4, vy: (Math.random()-0.5)*1.2,
        life: 1, size: 5 + Math.random()*8,
        hue: Math.random() > 0.5 ? 30 : 15
      });
    }
    if (Math.random() > 0.4) {
      trailParticles.push({
        type:'spark',
        x: tx + Math.random()*14, y: ty + (Math.random()-0.5)*26,
        vx: -1.5 - Math.random()*5, vy: (Math.random()-0.5)*3,
        life: 1, size: 1.5 + Math.random()*3, hue: 50 + Math.random()*20
      });
    }

  } else if (trailType === 'rainbow') {
    for (let i = 0; i < 3; i++) {
      trailParticles.push({
        type:'rainbow',
        x: tx + i*3, y: ty + (Math.random()-0.5)*22,
        vx: -2 - Math.random()*2.5, vy: (Math.random()-0.5)*0.8,
        life: 1, size: 5 + Math.random()*7,
        hue: ((frameCount * 6) + i * 30) % 360
      });
    }

  } else if (trailType === 'energy') {
    for (let i = 0; i < 2; i++) {
      trailParticles.push({
        type:'energy',
        x: tx + Math.random()*10, y: ty + (Math.random()-0.5)*22,
        vx: -2 - Math.random()*3, vy: (Math.random()-0.5)*1.8,
        life: 1, size: 4 + Math.random()*7,
        hue: 180 + Math.random()*60
      });
    }
    if (Math.random() > 0.5) {
      trailParticles.push({
        type:'electric',
        x: tx + Math.random()*20, y: ty + (Math.random()-0.5)*28,
        vx: -3 - Math.random()*4, vy: (Math.random()-0.5)*2.5,
        life: 1, size: 1.5 + Math.random()*2.5, hue: 200
      });
    }

  } else if (trailType === 'bubbles') {
    if (Math.random() > 0.45) {
      trailParticles.push({
        type:'bubble',
        x: tx + Math.random()*14, y: ty + (Math.random()-0.5)*22,
        vx: -0.8 - Math.random()*1.5, vy: -0.6 - Math.random()*1.2,
        life: 1, size: 5 + Math.random()*10,
        hue: 175 + Math.random()*50
      });
    }

  } else if (trailType === 'lightning') {
    for (let i = 0; i < 2; i++) {
      trailParticles.push({
        type:'lightning_bolt',
        x: tx + Math.random()*12, y: ty + (Math.random()-0.5)*24,
        vx: -3 - Math.random()*4, vy: (Math.random()-0.5)*2,
        life: 1, size: 3 + Math.random()*5,
        hue: 215 + Math.random()*45,
        segs: 3 + Math.floor(Math.random()*3)
      });
    }

  } else if (trailType === 'ice') {
    for (let i = 0; i < 2; i++) {
      trailParticles.push({
        type:'ice_crystal',
        x: tx + Math.random()*10, y: ty + (Math.random()-0.5)*20,
        vx: -1.8 - Math.random()*2.5, vy: (Math.random()-0.5)*1,
        life: 1, size: 5 + Math.random()*8,
        hue: 188 + Math.random()*22,
        rot: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*0.08
      });
    }
    if (Math.random() > 0.5) {
      trailParticles.push({
        type:'ice_spark',
        x: tx + Math.random()*16, y: ty + (Math.random()-0.5)*26,
        vx: -2 - Math.random()*3, vy: (Math.random()-0.5)*2,
        life: 1, size: 1.5 + Math.random()*2.5, hue: 200
      });
    }
  }
}

function drawTrail() {
  trailParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life * 0.85;

    if (p.type === 'stars') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      // Glow
      ctx.globalAlpha = p.life * 0.3;
      ctx.fillStyle = `hsl(${p.hue},100%,70%)`;
      drawStar(ctx, 0, 0, 5, p.size*p.life*1.6, p.size*p.life*0.6);
      // Ster
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = `hsl(${p.hue},100%,75%)`;
      drawStar(ctx, 0, 0, 5, p.size*p.life, p.size*p.life*0.4);
      // Witte kern
      ctx.globalAlpha = p.life * 0.7;
      ctx.fillStyle = '#ffffff';
      drawStar(ctx, 0, 0, 5, p.size*p.life*0.4, p.size*p.life*0.15);

    } else if (p.type === 'glitter') {
      ctx.fillStyle = `hsl(${p.hue},100%,90%)`;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
      ctx.fill();

    } else if (p.type === 'smoke') {
      ctx.globalAlpha = p.life * 0.3;
      ctx.fillStyle = `rgba(180,180,190,1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*(1.8-p.life*0.6), 0, Math.PI*2);
      ctx.fill();

    } else if (p.type === 'fire') {
      // Glow
      ctx.globalAlpha = p.life * 0.25;
      ctx.fillStyle = `hsl(${p.hue},100%,55%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life*2, 0, Math.PI*2);
      ctx.fill();
      // Vlam
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = `hsl(${p.hue},100%,${40+p.life*25}%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
      ctx.fill();
      // Kern
      ctx.globalAlpha = p.life * 0.5;
      ctx.fillStyle = '#ffffa0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life*0.4, 0, Math.PI*2);
      ctx.fill();

    } else if (p.type === 'spark') {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = `hsl(${p.hue},100%,80%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
      ctx.fill();

    } else if (p.type === 'rainbow') {
      // Grote glow
      ctx.globalAlpha = p.life * 0.2;
      const rg2 = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*p.life*2);
      rg2.addColorStop(0, `hsla(${p.hue},100%,70%,1)`);
      rg2.addColorStop(1, `hsla(${(p.hue+60)%360},100%,50%,0)`);
      ctx.fillStyle = rg2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life*2, 0, Math.PI*2);
      ctx.fill();
      // Bol
      ctx.globalAlpha = p.life * 0.9;
      const rg = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*p.life);
      rg.addColorStop(0, `hsla(${p.hue},100%,90%,1)`);
      rg.addColorStop(0.5, `hsla(${(p.hue+40)%360},100%,65%,0.8)`);
      rg.addColorStop(1, `hsla(${(p.hue+80)%360},100%,50%,0)`);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
      ctx.fill();

    } else if (p.type === 'energy') {
      // Grote glow
      ctx.globalAlpha = p.life * 0.2;
      ctx.fillStyle = `hsl(${p.hue},100%,60%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life*2.2, 0, Math.PI*2);
      ctx.fill();
      // Bol
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = `hsl(${p.hue},100%,65%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
      ctx.fill();
      // Kern
      ctx.globalAlpha = p.life * 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life*0.35, 0, Math.PI*2);
      ctx.fill();

    } else if (p.type === 'electric') {
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = `hsl(${p.hue},100%,85%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
      ctx.fill();

    } else if (p.type === 'bubble') {
      const r = p.size * p.life;
      ctx.globalAlpha = p.life * 0.25;
      ctx.fillStyle = `hsl(${p.hue},75%,80%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = p.life * 0.7;
      ctx.strokeStyle = `hsl(${p.hue},90%,78%)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = p.life * 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x - r*0.28, p.y - r*0.28, r*0.22, 0, Math.PI*2); ctx.fill();

    } else if (p.type === 'lightning_bolt') {
      ctx.globalAlpha = p.life * 0.9;
      ctx.strokeStyle = `hsl(${p.hue},100%,82%)`;
      ctx.lineWidth = 1.8 * p.life;
      ctx.shadowColor = `hsl(${p.hue},100%,70%)`; ctx.shadowBlur = 10 * p.life;
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      let lx = p.x, ly = p.y;
      for (let s = 0; s < (p.segs||3); s++) {
        lx -= 6 + Math.random()*6; ly += (Math.random()-0.5)*10;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke(); ctx.shadowBlur = 0;

    } else if (p.type === 'ice_crystal') {
      const r = p.size * p.life;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = p.life * 0.85;
      ctx.strokeStyle = `hsl(${p.hue},80%,82%)`;
      ctx.lineWidth = 1.3 * p.life;
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI / 3) * i;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
        ctx.lineTo(Math.cos(a+Math.PI)*r, Math.sin(a+Math.PI)*r);
        ctx.stroke();
        // kleine tak op elk been
        const mx = Math.cos(a)*r*0.55, my = Math.sin(a)*r*0.55;
        const pa = a + Math.PI/2;
        ctx.beginPath();
        ctx.moveTo(mx - Math.cos(pa)*r*0.25, my - Math.sin(pa)*r*0.25);
        ctx.lineTo(mx + Math.cos(pa)*r*0.25, my + Math.sin(pa)*r*0.25);
        ctx.stroke();
      }
      ctx.globalAlpha = p.life * 0.5;
      ctx.fillStyle = `rgba(180,235,255,${p.life*0.45})`;
      ctx.beginPath(); ctx.arc(0, 0, r*0.28, 0, Math.PI*2); ctx.fill();

    } else if (p.type === 'ice_spark') {
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = `hsl(${p.hue},90%,88%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
  });
}

// Hulpfunctie: teken een ster
function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = (Math.PI/2)*3, step = Math.PI/spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy-outerR);
  for (let i=0; i<spikes; i++) {
    ctx.lineTo(cx+Math.cos(rot)*outerR, cy+Math.sin(rot)*outerR);
    rot += step;
    ctx.lineTo(cx+Math.cos(rot)*innerR, cy+Math.sin(rot)*innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy-outerR);
  ctx.closePath();
  ctx.fill();
}

function updateTrail() {
  if (player.alive) spawnTrail();
  trailParticles.forEach(p => {
    p.x    += p.vx * slowMoFactor * S;
    p.y    += p.vy * slowMoFactor * S;
    p.life -= 0.017 * slowMoFactor * S;  // ~0.41s @ 144fps
    if (p.rot !== undefined) p.rot += (p.rotSpeed||0) * slowMoFactor * S;
  });
  trailParticles = trailParticles.filter(p => p.life > 0);
}

// ===== VUUR PARTICLES =====
let fireParticles = [];
function spawnFireParticles() {
  if (!player.isThrusting) return;
  const jx = player.x + player.width  * JETPACK_X;
  const jy = player.y + player.height * JETPACK_Y;
  const fireColor = shopEquipped['fire_color'] || 'default';

  for (let i = 0; i < 4; i++) {
    let hue;
    if      (fireColor === 'blue')    hue = 200 + Math.random()*20;
    else if (fireColor === 'green')   hue = 110 + Math.random()*20;
    else if (fireColor === 'rainbow') hue = Math.random()*360;
    else if (fireColor === 'purple')  hue = 270 + Math.random()*25;
    else if (fireColor === 'gold')    hue = 45 + Math.random()*10;
    else if (fireColor === 'ice')     hue = 188 + Math.random()*20;
    else                              hue = Math.random() > 0.4 ? 35 : 15;

    fireParticles.push({
      x: jx + (Math.random()-0.5)*6,
      y: jy,
      vx: (Math.random()-0.5)*0.4,
      vy: 2.5 + Math.random()*3.5,    // omlaag, iets sneller voor langere streep
      life: 1,
      size: 5 + Math.random()*6,       // kleiner dan voorheen
      hue
    });
  }
}

function drawFireParticles() {
  fireParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life * 0.75;
    ctx.fillStyle = `hsl(${p.hue},100%,${45+p.life*20}%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = p.life * 0.5;
    ctx.fillStyle = '#ffffa0';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life * 0.35, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });
}

function updateFireParticles() {
  fireParticles.forEach(p => {
    p.x    += p.vx * slowMoFactor * S;
    p.y    += p.vy * slowMoFactor * S;
    p.life -= 0.035 * slowMoFactor * S;
    p.size *= Math.pow(0.97, S);
  });
  fireParticles = fireParticles.filter(p => p.life > 0);
}

// ===== POWERUP CAPSULES =====
function drawPowerupCapsules() {
  powerupObjects.forEach(p => {
    p.phase += 0.04 * slowMoFactor * S;
    const by   = p.y + Math.sin(p.phase) * 7;
    const info = POWERUP_TYPES[p.type];
    const col  = info.color;
    const r    = 36; // Groter dan voorheen (was 22)

    ctx.save();

    // Buitenste pulse ring
    ctx.beginPath();
    ctx.arc(p.x, by, r + 8 + Math.sin(p.phase*2)*4, 0, Math.PI*2);
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.2 + Math.sin(p.phase*2)*0.1;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Capsule achtergrond gradient
    const bg = ctx.createRadialGradient(p.x-5, by-5, 2, p.x, by, r);
    bg.addColorStop(0,   'rgba(255,255,255,0.25)');
    bg.addColorStop(0.5, col + 'cc');
    bg.addColorStop(1,   col + '55');
    ctx.beginPath();
    ctx.arc(p.x, by, r, 0, Math.PI*2);
    ctx.fillStyle = bg;
    ctx.fill();

    // Rand
    ctx.strokeStyle = col;
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.85 + Math.sin(p.phase)*0.15;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Glans
    ctx.beginPath();
    ctx.ellipse(p.x - r*0.2, by - r*0.35, r*0.35, r*0.2, -0.3, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();

    // Emoji — groot en duidelijk
    ctx.font = `${r * 1.1}px Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.emoji, p.x, by - 4);

    // Label onder emoji
    ctx.font      = `bold 11px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.fillText(info.label.toUpperCase(), p.x, by + r * 0.55);
    ctx.globalAlpha = 1;

    ctx.restore();
  });
}
function updatePowerupObjects() {
  powerupTimer -= S;
  if (powerupTimer <= 0) { spawnPowerupCapsule(); powerupTimer = window._powerupRate || 900; }
  powerupObjects.forEach(p => {
    p.x -= gameSpeed*slowMoFactor*S;
    if (!player.alive||player.invincible) return;
    const dx=p.x-(player.x+player.width/2), dy=p.y-(player.y+player.height/2);
    if (Math.sqrt(dx*dx+dy*dy)<p.r+30) { activatePowerup(p.type); p.collected=true; missionEvent('powerups', 1); spawnSparks(p.x, p.y, '#aaddff', 8); }
  });
  powerupObjects = powerupObjects.filter(p=>p.x>-50&&!p.collected);
}

// ===== RAKET =====
// ===== RAKET PARTICLES =====
let rocketParticles = [];
function spawnRocketParticles() {
  const cx = player.x + player.width  * 0.5;
  const cy = player.y + player.height * 0.5;
  const backX = cx - ROCKET_W * 0.5; // achterkant raket
  for (let i = 0; i < 3; i++) {
    rocketParticles.push({
      x: backX - Math.random() * 8,
      y: cy + (Math.random() - 0.5) * ROCKET_H * 0.7,
      vx: -3 - Math.random() * 4,
      vy: (Math.random() - 0.5) * 1.5,
      life: 1, size: 10 + Math.random() * 12,
      type: 'flame', hue: Math.random() > 0.4 ? 35 : 15
    });
  }
  if (Math.random() > 0.4) {
    rocketParticles.push({
      x: backX - Math.random() * 25,
      y: cy + (Math.random() - 0.5) * ROCKET_H * 0.4,
      vx: -1.5 - Math.random() * 2, vy: (Math.random() - 0.5) * 0.8,
      life: 1, size: 8 + Math.random() * 10, type: 'smoke'
    });
  }
}
function updateRocketParticles() {
  rocketParticles.forEach(p => {
    p.x += p.vx * slowMoFactor * S; p.y += p.vy * slowMoFactor * S;
    p.life -= (p.type==='flame' ? 0.08 : 0.04) * slowMoFactor * S;
    p.size *= Math.pow(0.97, S);
  });
  rocketParticles = rocketParticles.filter(p => p.life > 0);
}
function drawRocketParticles() {
  rocketParticles.forEach(p => {
    ctx.save();
    if (p.type === 'flame') {
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = `hsl(${p.hue},100%,${45+p.life*20}%)`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = p.life * 0.5;
      ctx.fillStyle = '#ffffa0';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*p.life*0.35,0,Math.PI*2); ctx.fill();
    } else {
      ctx.globalAlpha = p.life * 0.22;
      ctx.fillStyle = 'rgb(180,180,180)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(2-p.life),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  });
}

// ===== TEKEN RAKET =====
function drawRocket() {
  if (!rocketActive) return;
  const cx = player.x + player.width  * 0.5;
  const cy = player.y + player.height * 0.5;

  // Rook & vlammen achter de raket
  drawRocketParticles();

  ctx.save();
  ctx.translate(cx, cy);
  // Origineel wijst omhoog → 90° draaien zodat neus naar rechts wijst
  ctx.rotate(Math.PI / 2);

  if (rocketImg.complete && rocketImg.naturalWidth > 0) {
    // Na rotatie: originele breedte (122) wordt hoogte, originele hoogte (374) wordt breedte
    ctx.drawImage(rocketImg,
      -ROCKET_H / 2, -ROCKET_W / 2,  // gecentreerd
      ROCKET_H, ROCKET_W
    );
  }
  ctx.restore();
}

// ===== SCHILD =====
function drawShield() {
  if (!activePowerups.shield && !shieldHit) return;
  const cx=player.x+player.width/2, cy=player.y+player.height/2;
  const r=Math.max(player.width,player.height)*0.65;
  ctx.save();
  ctx.shadowColor=shieldHit?'#fff':'#44aaff'; ctx.shadowBlur=shieldHit?40:20;
  ctx.strokeStyle=shieldHit?'#fff':'rgba(68,170,255,0.7)'; ctx.lineWidth=shieldHit?5:2.5;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=0.15; ctx.fillStyle=shieldHit?'#fff':'#44aaff';
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.restore();
}

// ===== POWERUP HUD =====
function drawPowerupHUD() {
  let idx=0;
  Object.entries(activePowerups).forEach(([type,timer]) => {
    const info=POWERUP_TYPES[type], maxT=info.duration||1;
    const frac=type==='shield'?1:timer/maxT;
    const bw=120, x=canvas.width-bw-20, y=100+idx*38;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.5)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x-8,y-14,bw+16,30,8); ctx.fill(); }
    ctx.fillStyle=info.color+'44'; ctx.fillRect(x,y,bw,10);
    ctx.fillStyle=info.color; ctx.shadowColor=info.color; ctx.shadowBlur=8;
    ctx.fillRect(x,y,bw*frac,10); ctx.shadowBlur=0;
    ctx.font='13px Arial'; ctx.textAlign='left'; ctx.fillStyle='#fff';
    ctx.fillText(`${info.emoji} ${info.label}`,x,y-2);
    ctx.restore(); idx++;
  });
}

// ===== SLOMO OVERLAY =====
function drawSlowMoOverlay() {
  if (!slowMo && !activePowerups.slowmo) return;
  const a=(1-slowMoFactor)*0.12;
  ctx.fillStyle=`rgba(150,200,255,${a})`; ctx.fillRect(0,0,canvas.width,canvas.height);
  const vg=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*0.3,canvas.width/2,canvas.height/2,canvas.height*0.8);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,`rgba(0,0,50,${(1-slowMoFactor)*0.4})`);
  ctx.fillStyle=vg; ctx.fillRect(0,0,canvas.width,canvas.height);
}

// ===== SPELER TEKENEN =====
// Vlam positie gemeten via pixel analyse (vlieg.png & vliegdood.png):
// X: 33.7%-75.6% van frame, Y: 41.3%-73.1% van frame
const FLAME_COVER = { x1:0.337, x2:0.756, y1:0.413, y2:0.731 };

function drawSprite(anim, frame, x, y) {
  const s = SPRITES[anim];
  if (!s.img.complete || s.img.naturalWidth === 0) {
    ctx.fillStyle = '#00bfff';
    ctx.fillRect(x, y, player.width, player.height);
    return;
  }
  const col = frame % s.cols;
  const row = Math.floor(frame / s.cols);
  ctx.drawImage(s.img,
    col*FRAME_W, row*FRAME_H, FRAME_W, FRAME_H,
    x, y, player.width, player.height
  );
}

function drawPlayer() {
  if (rocketActive) return;
  drawSprite(player.currentAnim, player.currentFrame, player.x, player.y);
}

// ===== SHOP SYSTEEM =====
const SHOP_ITEMS = {
  fire: [
    { id:'fire_blue',    name:'Blauw Vuur',     icon:'🔵', desc:'Verander de jetpack vlam naar ijskoud blauw.',  price:80,  type:'fire_color', value:'blue' },
    { id:'fire_green',   name:'Groen Vuur',     icon:'💚', desc:'Neon groene vlammen uit je jetpack!',           price:100, type:'fire_color', value:'green' },
    { id:'fire_rainbow', name:'Regenboog Vuur', icon:'🌈', desc:'Alle kleuren tegelijk — maximale stijl.',       price:250, type:'fire_color', value:'rainbow' },
    { id:'fire_purple',  name:'Paars Vuur',     icon:'💜', desc:'Mystieke paarse vlammen — magisch!',            price:140, type:'fire_color', value:'purple' },
    { id:'fire_gold',    name:'Goud Vuur',      icon:'✨', desc:'Koninklijk gouden vlammen uit je jetpack.',     price:180, type:'fire_color', value:'gold' },
    { id:'fire_ice',     name:'Ijs Vuur',       icon:'🧊', desc:'Ijskoude cyaan vlammen — vriest alles om je.', price:220, type:'fire_color', value:'ice' },
  ],
  trail: [
    { id:'trail_stars',     name:'Sterren Trail',   icon:'✨', desc:'Glinsterende sterretjes achter je aan.',    price:120, type:'trail', value:'stars' },
    { id:'trail_smoke',     name:'Rook Trail',      icon:'💨', desc:'Mysterieuze rookwolken achter je.',         price:80,  type:'trail', value:'smoke' },
    { id:'trail_fire',      name:'Vuur Trail',      icon:'🔥', desc:'Komeet-effect — jij bent het vuur!',       price:150, type:'trail', value:'fire'  },
    { id:'trail_rainbow',   name:'Regenboog Trail', icon:'🌈', desc:'Kleurexplosie achter elke beweging.',      price:200, type:'trail', value:'rainbow' },
    { id:'trail_energy',    name:'Energie Trail',   icon:'⚡', desc:'Elektrische energie bollen achter je.',    price:180, type:'trail', value:'energy' },
    { id:'trail_bubbles',   name:'Bubbels Trail',   icon:'🫧', desc:'Vrolijke zeepbellen — zacht en kleurrijk.', price:130, type:'trail', value:'bubbles' },
    { id:'trail_lightning', name:'Bliksem Trail',   icon:'⚡', desc:'Elektrische bliksemschichten achter je.',  price:190, type:'trail', value:'lightning' },
    { id:'trail_ice',       name:'IJs Trail',       icon:'❄️', desc:'Ijskristallen — laat een ijsspoor achter.', price:160, type:'trail', value:'ice' },
  ],
  coins: [
    { id:'coin_diamond', name:'Diamant Munten',   icon:'💎', desc:'Verander gewone munten in glinsterende diamanten.', price:150, type:'coin_skin', value:'diamond' },
    { id:'coin_star',    name:'Ster Munten',      icon:'⭐', desc:'Gouden sterren in plaats van munten.',               price:120, type:'coin_skin', value:'star' },
    { id:'coin_heart',   name:'Hart Munten',      icon:'❤️', desc:'Schattige harten — voor de romanticus.',             price:100, type:'coin_skin', value:'heart' },
    { id:'coin_rainbow', name:'Regenboog Munten', icon:'🌈', desc:'Munten die van kleur wisselen — psychedelisch!',     price:175, type:'coin_skin', value:'rainbow' },
    { id:'coin_lava',    name:'Lava Munten',      icon:'🔥', desc:'Gloeiend hete lava munten — gevaarlijk mooi.',      price:160, type:'coin_skin', value:'lava' },
  ],
  themes: [
    { id:'theme_space',   name:'Ruimte',   icon:'🌌', desc:'Vlieg door de sterrennacht — planeten, maan en meteoren.', price:2500, type:'theme', value:'space' },
    { id:'theme_ocean',   name:'Oceaan',   icon:'🌊', desc:'Onderwater avontuur met bellen en zeeblauw licht.',        price:2000, type:'theme', value:'ocean' },
    { id:'theme_winter',  name:'Winter',   icon:'❄️', desc:'IJzige sneeuwwereld met vallende vlokken.',                price:1800, type:'theme', value:'winter' },
    { id:'theme_volcano', name:'Vulkaan',  icon:'🌋', desc:'Vlieg langs een actieve vulkaan — lava en vuur overal.',   price:2200, type:'theme', value:'volcano' },
  ],
  colors: [
    { id:'color_blue',    name:'Blauw Pak',     icon:'🔵', desc:'Verf je pak en helm koel blauw.',           price:500,    type:'suit_color', value:'blue'    },
    { id:'color_red',     name:'Rood Pak',      icon:'🔴', desc:'Fel rood pak — niet te missen.',            price:600,    type:'suit_color', value:'red'     },
    { id:'color_green',   name:'Groen Pak',     icon:'🟢', desc:'Fris groen pak voor de natuurliefhebber.',  price:600,    type:'suit_color', value:'green'   },
    { id:'color_orange',  name:'Oranje Pak',    icon:'🟠', desc:'Knal-oranje pak — Hollands trots.',         price:700,    type:'suit_color', value:'orange'  },
    { id:'color_pink',    name:'Roze Pak',      icon:'🩷', desc:'Vrolijk roze pak dat opvalt.',              price:700,    type:'suit_color', value:'pink'    },
    { id:'color_purple',  name:'Paars Pak',     icon:'🟣', desc:'Mysterieus paars pak — stijlvol.',          price:800,    type:'suit_color', value:'purple'  },
    { id:'color_rainbow', name:'Regenboog Pak', icon:'🌈', desc:'Alle kleuren over je hele pak — zeldzaam!',  price:100000, type:'suit_color', value:'rainbow' },
    { id:'color_gold',    name:'Gouden Pak',    icon:'✨', desc:'Puur goud pak — het allermooiste dat er is.', price:10000,  type:'suit_color', value:'gold'    },
  ],
  upgrades: [
    {
      id: 'magnet',
      name: 'Magneet Bereik',
      icon: '🧲',
      levels: [
        { level:1, desc:'Munten aantrekken binnen 280px.',  price:150,  effect:{ magnetRange:280  } },
        { level:2, desc:'Bereik vergroot naar 360px.',      price:280,  effect:{ magnetRange:360  } },
        { level:3, desc:'Bereik vergroot naar 460px.',      price:450,  effect:{ magnetRange:460  } },
        { level:4, desc:'Mega bereik: 600px — alles!',      price:700,  effect:{ magnetRange:600  } },
      ]
    },
    {
      id: 'shield',
      name: 'Schild',
      icon: '🛡️',
      levels: [
        { level:1, desc:'Overleef één laser per potje.',          price:200,  effect:{ shieldHits:1    } },
        { level:2, desc:'Overleef twee lasers per potje.',        price:380,  effect:{ shieldHits:2    } },
        { level:3, desc:'Schild herlaadt na 25 seconden.',        price:600,  effect:{ shieldHits:2, shieldRegen:25 } },
        { level:4, desc:'Herlaadt na 12 seconden — onkwetsbaar.', price:900,  effect:{ shieldHits:3, shieldRegen:12 } },
      ]
    },
    {
      id: 'coins',
      name: 'Munt Bonus',
      icon: '🪙',
      levels: [
        { level:1, desc:'Verdien 1.5x zoveel munten.',            price:200,  effect:{ coinMulti:1.5 } },
        { level:2, desc:'Verdien 2x zoveel munten.',              price:380,  effect:{ coinMulti:2   } },
        { level:3, desc:'Verdien 2.5x zoveel munten.',            price:600,  effect:{ coinMulti:2.5 } },
        { level:4, desc:'Verdien 3x zoveel munten — max bonus!',  price:850,  effect:{ coinMulti:3   } },
      ]
    },
    {
      id: 'extrabullets',
      name: 'Extra Kogels',
      icon: '🔫',
      levels: [
        { level:1, desc:'Begin elk potje met 2 kogels.',          price:150,  effect:{ startBullets:2 } },
        { level:2, desc:'Begin elk potje met 3 kogels.',          price:300,  effect:{ startBullets:3 } },
        { level:3, desc:'Begin elk potje met 4 kogels.',          price:500,  effect:{ startBullets:4 } },
        { level:4, desc:'Begin elk potje met 5 kogels.',          price:800,  effect:{ startBullets:5 } },
      ]
    },
    {
      id: 'rocket_dur',
      name: 'Raket Duur',
      icon: '🚀',
      levels: [
        { level:1, desc:'Raket duurt 12 seconden (was 10).',      price:180,  effect:{ rocketDuration:720 } },
        { level:2, desc:'Raket duurt 14 seconden.',               price:360,  effect:{ rocketDuration:840 } },
        { level:3, desc:'Raket duurt 16 seconden.',               price:580,  effect:{ rocketDuration:960 } },
        { level:4, desc:'Raket duurt 18 seconden — mega boost!',  price:900,  effect:{ rocketDuration:1080 } },
      ]
    },
    {
      id: 'powerup_rate',
      name: 'Meer Powerups',
      icon: '💊',
      levels: [
        { level:1, desc:'Powerups spawnen 20% vaker.',            price:140,  effect:{ powerupRate:720 } },
        { level:2, desc:'Powerups spawnen 40% vaker.',            price:280,  effect:{ powerupRate:540 } },
        { level:3, desc:'Powerups spawnen 60% vaker.',            price:460,  effect:{ powerupRate:360 } },
        { level:4, desc:'Powerups spawnen 75% vaker — onstopbaar!', price:750, effect:{ powerupRate:225 } },
      ]
    },
  ],
  starters: [
    { id:'start_200',    name:'Head Start 200m', icon:'💨', desc:'Begin elk potje al 200m verder.',             price:200, type:'starter', value:'headstart_200', repeatable:true },
    { id:'start_magnet', name:'Gratis Magneet',  icon:'🧲', desc:'Begin met de magneet al actief.',             price:150, type:'starter', value:'free_magnet',   repeatable:true },
    { id:'start_shield', name:'Gratis Schild',   icon:'🛡️', desc:'Begin elk potje met een schild.',             price:180, type:'starter', value:'free_shield',   repeatable:true },
    { id:'start_slow',   name:'Gratis Slow-mo',  icon:'🐢', desc:'Begin met slow-mo actief.',                   price:130, type:'starter', value:'free_slowmo',   repeatable:true },
  ]
};

// Geladen uit localStorage
let shopOwned      = JSON.parse(localStorage.getItem('jj_owned')    || '[]');
let shopEquipped   = JSON.parse(localStorage.getItem('jj_equipped') || '{}');
let activeStarters = JSON.parse(localStorage.getItem('jj_starters') || '[]');
let upgradeLevels  = JSON.parse(localStorage.getItem('jj_upgradelevels') || '{}');
let disabledUpgrades = JSON.parse(localStorage.getItem('jj_disabled') || '[]'); // upgrades tijdelijk uit

// Eenmalige reset: thema's zijn vernieuwd (achtergrond verandert nu mee) en
// duurder geworden — eerder gekochte thema's vervallen, iedereen koopt opnieuw.
if (!localStorage.getItem('jj_theme_reset1')) {
  shopOwned = shopOwned.filter(id => !id.startsWith('theme_'));
  delete shopEquipped['theme'];
  localStorage.setItem('jj_owned', JSON.stringify(shopOwned));
  localStorage.setItem('jj_equipped', JSON.stringify(shopEquipped));
  localStorage.setItem('jj_theme_reset1', '1');
}

function saveShop() {
  localStorage.setItem('jj_owned',         JSON.stringify(shopOwned));
  localStorage.setItem('jj_equipped',      JSON.stringify(shopEquipped));
  localStorage.setItem('jj_starters',      JSON.stringify(activeStarters));
  localStorage.setItem('jj_upgradelevels', JSON.stringify(upgradeLevels));
  localStorage.setItem('jj_disabled',      JSON.stringify(disabledUpgrades));
  localStorage.setItem('kk_curuntie',    totalCoins);
}

function openShop(fromScreen) {
  document.getElementById('shopCoins').textContent = totalCoins;
  renderShopTab('fire');
  document.getElementById('shopScreen').classList.add('active');
  document.getElementById('shopScreen').dataset.from = fromScreen || 'menu';

  // Tab knoppen
  document.querySelectorAll('.shop-tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      renderShopTab(btn.dataset.tab);
    };
  });

  document.getElementById('shopClose').onclick = closeShop;
}

function closeShop() {
  document.getElementById('shopScreen').classList.remove('active');
}

function renderShopTab(tab) {
  const container = document.getElementById('shopItems');
  container.innerHTML = '';
  document.getElementById('shopFeedback').textContent = '';

  if (tab === 'upgrades') {
    renderUpgradeTab(container);
    return;
  }

  SHOP_ITEMS[tab].forEach(item => {
    // Starters: "owned" = ooit gekocht (eenmalig)
    const isStarter = !!item.repeatable;
    const owned     = shopOwned.includes(item.id);
    const equipped  = shopEquipped[item.type] === item.value;
    const canAfford = totalCoins >= item.price;

    const card = document.createElement('div');
    if (isStarter) {
      const isActive = activeStarters.includes(item.id);
      card.className = 'shop-item' +
        (owned ? (isActive ? ' equipped' : ' owned') : (!canAfford ? ' cant-afford' : ''));
    } else {
      card.className = 'shop-item' +
        (owned ? ' owned' : '') +
        (equipped ? ' equipped' : '') +
        (!canAfford && !owned ? ' cant-afford' : '');
    }

    let badge = equipped && !isStarter ? `<div class="item-badge badge-on">AAN</div>`
              : (isStarter && activeStarters.includes(item.id)) ? `<div class="item-badge badge-on">ACTIEF</div>`
              : owned ? `<div class="item-badge badge-owned">✓ GEKOCHT</div>` : '';

    let priceHtml = '', btnHtml = '';
    if (isStarter) {
      // Eenmalig kopen, dan gratis toggling
      const isActive = activeStarters.includes(item.id);
      if (owned) {
        priceHtml = isActive
          ? `<span class="item-price free">ACTIEF</span>`
          : `<span class="item-price owned-txt">AL GEKOCHT</span>`;
        btnHtml = isActive
          ? `<button class="item-btn btn-unequip" onclick="toggleStarter('${item.id}','${tab}')">✕ Uitzetten</button>`
          : `<button class="item-btn btn-equip"   onclick="toggleStarter('${item.id}','${tab}')">▶ Aanzetten</button>`;
      } else {
        priceHtml = `<span class="item-price">🪙 ${item.price}</span>`;
        btnHtml   = `<button class="item-btn" onclick="buyStarter('${item.id}','${tab}')" ${!canAfford?'disabled':''}>Koop</button>`;
      }
    } else if (owned) {
      priceHtml = `<span class="item-price owned-txt">AL GEKOCHT</span>`;
      if (item.type !== 'upgrade') {
        btnHtml = equipped
          ? `<button class="item-btn btn-unequip" onclick="unequipItem('${item.type}','${tab}')">✕ Uitzetten</button>`
          : `<button class="item-btn btn-equip"   onclick="equipItem('${item.id}','${item.type}','${item.value}','${tab}')">▶ Aanzetten</button>`;
      }
    } else {
      priceHtml = `<span class="item-price">🪙 ${item.price}</span>`;
      btnHtml   = `<button class="item-btn" onclick="buyItem('${item.id}','${item.type}','${item.value}','${tab}')" ${!canAfford?'disabled':''}>Koop</button>`;
    }

    card.innerHTML = `${badge}
      <div class="item-icon">${item.icon}</div>
      <div class="item-name">${item.name}</div>
      <div class="item-desc">${item.desc}</div>
      <div class="item-footer">${priceHtml}${btnHtml}</div>`;
    container.appendChild(card);
  });
}

function renderUpgradeTab(container) {
  SHOP_ITEMS.upgrades.forEach(upg => {
    const currentLevel = upgradeLevels[upg.id] || 0;
    const maxLevel     = upg.levels.length;
    const isMax        = currentLevel >= maxLevel;
    const isDisabled   = disabledUpgrades.includes(upg.id);
    const hasLevel     = currentLevel > 0;
    const nextLevel    = isMax ? null : upg.levels[currentLevel];
    const canAfford    = nextLevel && totalCoins >= nextLevel.price;

    const card = document.createElement('div');
    card.className = 'shop-item upgrade-card' +
      (isMax ? ' owned' : '') +
      (isDisabled ? ' upgrade-disabled' : '') +
      (!canAfford && !hasLevel ? ' cant-afford' : '');

    // Niveau sterren
    let stars = '';
    for (let i = 0; i < maxLevel; i++) {
      stars += `<span class="lvl-star ${i < currentLevel ? 'filled' : ''}">${i < currentLevel ? '★' : '☆'}</span>`;
    }

    // Effect beschrijvingen
    const curDesc  = hasLevel
      ? `<div class="upgrade-current ${isDisabled ? 'upgrade-cur-off' : ''}">
           ${isDisabled ? '⏸️' : '✅'} Nu: ${upg.levels[currentLevel-1].desc}
         </div>` : '';
    const nextDesc = nextLevel
      ? `<div class="upgrade-next">⬆️ Volgende (Lvl ${currentLevel+1}): ${nextLevel.desc}</div>` : '';

    // Toggle knop (alleen als je al een level hebt)
    const toggleBtn = hasLevel
      ? `<button class="item-btn toggle-btn ${isDisabled ? 'btn-off' : 'btn-on'}"
           onclick="toggleUpgrade('${upg.id}')">
           ${isDisabled ? '▶ Aanzetten' : '⏸ Uitzetten'}
         </button>`
      : '';

    // Upgrade knop
    let upgradeBtn = '';
    if (!isMax) {
      upgradeBtn = `<button class="item-btn upgrade-btn"
        onclick="buyUpgradeLevel('${upg.id}')"
        ${!canAfford ? 'disabled' : ''}>
        ⬆️ Lvl ${currentLevel+1} — 🪙${nextLevel.price}
      </button>`;
    } else {
      upgradeBtn = `<button class="item-btn btn-equipped" disabled>✨ MAX</button>`;
    }

    card.innerHTML = `
      ${isMax ? '<div class="item-badge badge-on">MAX</div>' : ''}
      ${isDisabled && hasLevel ? '<div class="item-badge badge-disabled">UIT</div>' : ''}
      <div class="upgrade-header">
        <span class="item-icon" style="opacity:${isDisabled?0.4:1}">${upg.icon}</span>
        <div>
          <div class="item-name">${upg.name}</div>
          <div class="upgrade-stars">${stars}</div>
          <div class="upgrade-level-txt">Level ${currentLevel} / ${maxLevel}</div>
        </div>
      </div>
      <div class="item-desc">${curDesc}${nextDesc}</div>
      <div class="upgrade-buttons">
        ${toggleBtn}
        ${upgradeBtn}
      </div>`;

    container.appendChild(card);
  });
}

function toggleUpgrade(upgId) {
  if (disabledUpgrades.includes(upgId)) {
    // Aanzetten
    disabledUpgrades = disabledUpgrades.filter(id => id !== upgId);
    applyUpgradeLevel(upgId, upgradeLevels[upgId]);
    showShopFeedback(`▶️ ${SHOP_ITEMS.upgrades.find(u=>u.id===upgId).name} aangezet!`);
  } else {
    // Uitzetten — reset effect
    disabledUpgrades.push(upgId);
    resetUpgradeEffect(upgId);
    showShopFeedback(`⏸️ ${SHOP_ITEMS.upgrades.find(u=>u.id===upgId).name} uitgezet!`);
  }
  saveShop();
  renderShopTab('upgrades');
}

function resetUpgradeEffect(upgId) {
  if (upgId === 'magnet')      window._magnetRange    = 220;
  if (upgId === 'shield')      { window._shieldHits = 0; window._shieldRegen = null; }
  if (upgId === 'slowmo')      POWERUP_TYPES.slowmo.duration = 360;
  if (upgId === 'coins')       window._coinMulti      = 1;
  if (upgId === 'speed')       { POWERUP_TYPES.speed.duration = 300; window._speedMult = 1.8; }
  if (upgId === 'rocket_dur')  POWERUP_TYPES.rocket.duration  = 600;
  if (upgId === 'powerup_rate') window._powerupRate   = 900;
  if (upgId === 'speed_ramp')  window._speedIncrement = 0.15;
}

function buyItem(id, type, value, tab) {
  const item = Object.values(SHOP_ITEMS).flat().find(i => i.id === id);
  if (!item || totalCoins < item.price) return;
  totalCoins -= item.price;
  shopOwned.push(id);
  if (type !== 'upgrade') shopEquipped[type] = value;
  if (type === 'suit_color') applySuitColor(value);
  saveShop();
  document.getElementById('shopCoins').textContent = totalCoins;
  showShopFeedback(`✅ ${item.name} gekocht!`);
  renderShopTab(tab);
}

function buyUpgradeLevel(upgId) {
  const upg = SHOP_ITEMS.upgrades.find(u => u.id === upgId);
  if (!upg) return;
  const currentLevel = upgradeLevels[upgId] || 0;
  if (currentLevel >= upg.levels.length) return;
  const nextLevel = upg.levels[currentLevel];
  if (totalCoins < nextLevel.price) return;

  totalCoins -= nextLevel.price;
  upgradeLevels[upgId] = currentLevel + 1;
  applyUpgradeLevel(upgId, currentLevel + 1);
  saveShop();
  document.getElementById('shopCoins').textContent = totalCoins;
  showShopFeedback(`⬆️ ${upg.name} geüpgraded naar level ${currentLevel+1}!`);
  renderShopTab('upgrades');
}

function applyUpgradeLevel(upgId, level) {
  const upg = SHOP_ITEMS.upgrades.find(u => u.id === upgId);
  if (!upg || level < 1) return;
  const effect = upg.levels[level-1].effect;

  if (effect.magnetRange)    window._magnetRange    = effect.magnetRange;
  if (effect.shieldHits)     window._shieldHits     = effect.shieldHits;
  if (effect.shieldRegen)    window._shieldRegen    = effect.shieldRegen;
  if (effect.slowmoDuration) POWERUP_TYPES.slowmo.duration = effect.slowmoDuration;
  if (effect.coinMulti)      window._coinMulti      = effect.coinMulti;
  if (effect.startBullets)   window._startBullets   = effect.startBullets;
  if (effect.rocketDuration) POWERUP_TYPES.rocket.duration = effect.rocketDuration;
  if (effect.powerupRate)    window._powerupRate    = effect.powerupRate;
  if (effect.speedIncrement) window._speedIncrement = effect.speedIncrement;
}

function equipItem(id, type, value, tab) {
  shopEquipped[type] = value;
  if (type === 'suit_color') applySuitColor(value);
  saveShop();
  showShopFeedback(`✨ ${id} aangezet!`);
  renderShopTab(tab);
}

function buyStarter(id, tab) {
  const item = Object.values(SHOP_ITEMS).flat().find(i => i.id === id);
  if (!item || totalCoins < item.price) return;
  totalCoins -= item.price;
  if (!shopOwned.includes(id))    shopOwned.push(id);        // eenmalig kopen
  if (!activeStarters.includes(id)) activeStarters.push(id); // direct actief
  saveShop();
  document.getElementById('shopCoins').textContent = totalCoins;
  showShopFeedback(`🚀 ${item.name} gekocht en actief!`);
  renderShopTab(tab);
}

function toggleStarter(id, tab) {
  if (activeStarters.includes(id)) {
    activeStarters = activeStarters.filter(s => s !== id);
    const item = Object.values(SHOP_ITEMS).flat().find(i => i.id === id);
    showShopFeedback(`⏸️ ${item ? item.name : id} uitgezet`);
  } else {
    activeStarters.push(id);
    const item = Object.values(SHOP_ITEMS).flat().find(i => i.id === id);
    showShopFeedback(`▶️ ${item ? item.name : id} aangezet!`);
  }
  saveShop();
  renderShopTab(tab);
}

function unequipItem(type, tab) {
  delete shopEquipped[type];
  if (type === 'suit_color') applySuitColor(null);
  saveShop();
  showShopFeedback(`⏸️ Uitgezet`);
  renderShopTab(tab);
}

function showShopFeedback(msg) {
  const el = document.getElementById('shopFeedback');
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

function applyUpgrade(value) {
  if (value === 'magnet_range')    window._magnetRange    = 440;
  if (value === 'shield_regen')    window._shieldRegen    = true;
  if (value === 'slowmo_duration') POWERUP_TYPES.slowmo.duration = 540;
  if (value === 'extra_life')      window._extraLife      = true;
  if (value === 'coin_double')     window._coinDouble     = true;
}

// Laad upgrades bij start
function loadUpgrades() {
  Object.entries(upgradeLevels).forEach(([upgId, level]) => {
    if (level > 0 && !disabledUpgrades.includes(upgId)) {
      applyUpgradeLevel(upgId, level);
    }
  });
}
loadUpgrades();
if (shopEquipped.suit_color) applySuitColor(shopEquipped.suit_color);

// Expose shop-functies als globals (nodig voor inline onclick handlers in dynamische HTML)
window.buyItem         = buyItem;
window.equipItem       = equipItem;
window.unequipItem     = unequipItem;
window.buyStarter      = buyStarter;
window.toggleStarter   = toggleStarter;
window.buyUpgradeLevel = buyUpgradeLevel;
window.toggleUpgrade   = toggleUpgrade;
window.openShop        = openShop;
window.closeShop       = closeShop;

// ===== INPUT =====
document.addEventListener('keydown',e=>{ if(e.code==='Space'){e.preventDefault();handlePress();} });
document.addEventListener('keyup',  e=>{ if(e.code==='Space') handleRelease(); });
function isShootBtnArea(cx, cy) {
  const rect = canvas.getBoundingClientRect();
  const x = (cx - rect.left) * (canvas.width  / rect.width);
  const y = (cy - rect.top)  * (canvas.height / rect.height);
  return x < 115 && y > canvas.height - 95;
}
canvas.addEventListener('mousedown', e=>{ if(isShootBtnArea(e.clientX,e.clientY)) handleShoot(); else handlePress(); });
canvas.addEventListener('mouseup',   handleRelease);
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  const t=e.touches[0];
  if(isShootBtnArea(t.clientX,t.clientY)) handleShoot(); else handlePress();
},{passive:false});
canvas.addEventListener('touchend',  handleRelease);
document.addEventListener('keydown',e=>{ if(e.code==='KeyF'||e.code==='KeyX'||e.code==='KeyE') handleShoot(); });
function handlePress()   { if(gameState==='playing'&&player.alive) player.isThrusting=true; }
function handleRelease() { player.isThrusting=false; }

// ===== MISSIES =====
// 3 actieve missies, persistent. Voltooid ⇒ munten + nieuwe (zwaardere) missie.
const MISSION_TEMPLATES = [
  { type:'run_dist',   icon:'📏', desc:g=>`Vlieg ${g}m in één potje`,      goals:[300,500,800,1200,2000], reward:g=>Math.round(g/8) },
  { type:'run_coins',  icon:'🪙', desc:g=>`Pak ${g} munten in één potje`,  goals:[25,50,80,120,180],      reward:g=>g*2 },
  { type:'total_dist', icon:'🌍', desc:g=>`Vlieg in totaal ${g}m`,          goals:[1500,4000,8000,15000],  reward:g=>Math.round(g/12), cum:true },
  { type:'lasers',     icon:'⚡', desc:g=>`Schiet ${g} lasers kapot`,       goals:[2,5,12,25],             reward:g=>g*20, cum:true },
  { type:'rockets',    icon:'🚀', desc:g=>`Schiet ${g} raketten neer`,      goals:[1,3,8],                 reward:g=>g*35, cum:true },
  { type:'powerups',   icon:'💊', desc:g=>`Pak ${g} powerups`,              goals:[3,8,20],                reward:g=>g*15, cum:true },
  { type:'job',        icon:'🔤', desc:g=>`Maak ${g}x J-O-B compleet`,      goals:[1,3,6],                 reward:g=>g*120, cum:true },
];
let missions   = JSON.parse(localStorage.getItem('jj_missions')   || 'null') || [];
let missionLvl = JSON.parse(localStorage.getItem('jj_missionlvl') || '{}');
function saveMissions() {
  localStorage.setItem('jj_missions', JSON.stringify(missions));
  localStorage.setItem('jj_missionlvl', JSON.stringify(missionLvl));
}
function makeMission(excludeTypes) {
  const opts = MISSION_TEMPLATES.filter(t => !excludeTypes.includes(t.type));
  const t = opts[Math.floor(Math.random()*opts.length)];
  const lvl = Math.min(missionLvl[t.type] || 0, t.goals.length - 1);
  const goal = t.goals[lvl];
  return { type:t.type, goal, prog:0, reward:t.reward(goal), done:false };
}
function ensureMissions() {
  while (missions.length < 3) missions.push(makeMission(missions.map(m => m.type)));
  saveMissions();
}
ensureMissions();
function missionTemplate(type) { return MISSION_TEMPLATES.find(t => t.type === type); }

// Cumulatieve gebeurtenissen (lasers/raketten/powerups/job) tellen direct mee
function missionEvent(type, amt) {
  let changed = false;
  missions.forEach(m => {
    if (m.type === type && !m.done) {
      m.prog += amt; changed = true;
      if (m.prog >= m.goal) {
        m.done = true;
        spawnFloatText(canvas.width/2, CEIL_Y + 90, '🎯 Missie voltooid!', '#ffe08a', 28);
        spawnRing(canvas.width/2, CEIL_Y + 90, 'rgba(255,224,138,', 120);
      }
    }
  });
  if (changed) saveMissions();
}

// Run-gebaseerde missies bijwerken + voltooide uitbetalen (op game over)
function settleMissions() {
  missions.forEach(m => {
    if (m.done) return;
    if (m.type === 'run_dist')   { m.prog = Math.max(m.prog, distance); if (distance >= m.goal) m.done = true; }
    if (m.type === 'run_coins')  { m.prog = Math.max(m.prog, coins);    if (coins    >= m.goal) m.done = true; }
    if (m.type === 'total_dist') { m.prog += distance;                  if (m.prog   >= m.goal) m.done = true; }
  });
  const completed = missions.filter(m => m.done);
  completed.forEach(m => {
    totalCoins += m.reward;
    missionLvl[m.type] = (missionLvl[m.type] || 0) + 1;
  });
  missions = missions.filter(m => !m.done);
  ensureMissions();
  return completed;
}

function missionHTML(m) {
  const t = missionTemplate(m.type);
  const pct = Math.min(100, Math.round(m.prog / m.goal * 100));
  return `<div class="mission-row">
    <span class="mission-icon">${t.icon}</span>
    <div class="mission-mid">
      <div class="mission-desc">${t.desc(m.goal)}</div>
      <div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>
    </div>
    <span class="mission-reward">🪙${m.reward}</span>
  </div>`;
}
function renderMissions() {
  const box = document.getElementById('missionsBox');
  if (box) box.innerHTML = `<div class="mission-title">🎯 MISSIES</div>` + missions.map(missionHTML).join('');
}
renderMissions();

// ===== UI =====
document.getElementById('startBtn').addEventListener('click',   startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('shopBtnMenu').addEventListener('click', () => openShop('menu'));
document.getElementById('shopBtnGO').addEventListener('click',   () => openShop('gameover'));

function startGame() {
  SIZE = sizeFor(); recomputeBounds(); applyScale();   // klopt met huidige schermstand
  window._gameGen = (window._gameGen || 0) + 1;   // ongeldig maken van oude schild-regen timers
  gameState='playing'; coins=0; distance=0; frameCount=0;
  gameSpeed=2.0; baseSpeed=2.0;
  lastTime=0; S=1;
  bulletsLeft = window._startBullets || 1; bullet.active=false; shootTimer=0;
  zapperTimer=0; coinTimer=0; speedUpTimer=700; letterTimer=360; powerupTimer=450;
  zappers=[]; coinObjects=[]; fireParticles=[]; powerupObjects=[];
  trailParticles=[]; themeParticles=[];
  missiles=[]; missileTimer=0; lastGapCenter=null;
  floatTexts=[]; fxRings=[]; fxSparks=[]; screenFlash=0;
  comboStreak=0; comboTimer=0;
  activePowerups={}; rocketActive=false; rocketY=0; rocketVy=0;
  rocketParticles=[]; collectedLetters=[]; letterObjects=[];
  slowMo=false; slowMoFactor=1.0; slowMoTimer=0; shakeTimer=0; shakeX=0; shakeY=0;
  bgOffsets={mount:0,far:0,mid:0,near:0};

  player.y=canvas.height/2; player.vy=0; player.alive=true;
  player.isThrusting=false; player.invincible=false;
  player.currentFrame=0; player.currentAnim='run';
  player.onGround=false; player.dieFrameDone=false;

  // Pas starters toe
  if (activeStarters.includes('start_200'))    { frameCount = Math.floor(200 * 60 / 4); distance = 200; }
  if (activeStarters.includes('start_magnet')) activatePowerup('magnet');
  if (activeStarters.includes('start_shield')) activatePowerup('shield');
  if (activeStarters.includes('start_slow'))   activatePowerup('slowmo');
  // Schild-upgrade: begin elk potje met een schild (en regen brengt 'm terug)
  if (window._shieldHits > 0) activePowerups.shield = 1;
  // Reset starters na gebruik (eenmalig per run)
  activeStarters = [];
  saveShop();

  document.getElementById('startMenu').classList.remove('active');
  document.getElementById('gameOverScreen').classList.remove('active');
  document.getElementById('shopScreen').classList.remove('active');
  document.getElementById('hud').classList.remove('hidden');
  requestAnimationFrame(gameLoop);
}

function endGame() {
  if (!player.alive) return;
  if (activePowerups.shield) {
    delete activePowerups.shield; shieldHit=true;
    setTimeout(()=>{shieldHit=false;},600);
    player.invincible=true; setTimeout(()=>{player.invincible=false;},800);
    // Schild-upgrade: herlaad het schild na X seconden (lvl 3 = 25s, lvl 4 = 12s)
    if (window._shieldRegen) {
      const regenSec = typeof window._shieldRegen === 'number' ? window._shieldRegen : 15;
      const gen = window._gameGen;
      setTimeout(() => {
        if (player.alive && gameState === 'playing' && window._gameGen === gen) activePowerups.shield = 1;
      }, regenSec * 1000);
    }
    return;
  }
  if (rocketActive) deactivatePowerup('rocket');
  player.alive=false; player.currentAnim='die'; player.currentFrame=0; player.frameTimer=0;
  triggerDeathEffects();
  if (distance>highScore) { highScore=distance; localStorage.setItem('jj_highscore',highScore); }
}

function showGameOver() {
  gameState = 'gameover';
  try { window.parent.postMessage({ type: 'jetpack-gameover', distance: distance }, '*'); } catch(e) {}

  // Sla munten op met multiplier
  const multi  = window._coinMulti || (window._coinDouble ? 2 : 1);
  const earned = Math.floor(coins * multi);
  totalCoins  += earned;
  // Missies uitbetalen + tonen
  const completedMissions = settleMissions();
  localStorage.setItem('kk_curuntie', totalCoins);
  const goM = document.getElementById('goMissions');
  if (goM) {
    goM.innerHTML = completedMissions.length
      ? completedMissions.map(m => `<div class="go-mission-done">🎯 ${missionTemplate(m.type).desc(m.goal)} — <b>+${m.reward} 🪙</b></div>`).join('')
      : '';
  }
  renderMissions();

  document.getElementById('hud').classList.add('hidden');
  document.getElementById('finalDistance').textContent = distance + 'm';
  document.getElementById('finalCoins').textContent = earned + (multi > 1 ? ` (x${multi}!)` : '');
  document.getElementById('highScore').textContent     = highScore + 'm';

  const isNewRecord = distance >= highScore && distance > 0;
  const rec = document.getElementById('newRecord');
  if (isNewRecord) rec.classList.add('visible');
  else             rec.classList.remove('visible');

  const stars = distance > 800 ? '⭐⭐⭐' : distance > 400 ? '⭐⭐' : distance > 100 ? '⭐' : '';
  document.getElementById('ratingStars').textContent = stars;

  const tips = window._tips || [];
  if (tips.length) document.getElementById('goTip').textContent = tips[Math.floor(Math.random()*tips.length)];

  document.getElementById('menuHighScore').textContent = highScore + 'm';
  document.getElementById('gameOverScreen').classList.add('active');
}

// ===== PLAYER UPDATE =====
function updatePlayer() {
  const prevOnGround = player.onGround;

  // Schietanimatie-timer
  if (shootTimer > 0) {
    shootTimer -= S;
    if (shootTimer <= 0) {
      // Terug naar normale animatie
      player.currentFrame = 0;
      player.currentAnim  = player.onGround ? 'run' : 'fly';
    }
  }

  // Frame-animatie
  const rate = player.currentAnim==='die' ? player.frameRate : Math.max(2,Math.floor(player.frameRate/slowMoFactor));
  player.frameTimer += S;
  if (player.frameTimer >= rate) {
    player.frameTimer = 0;
    const anim = SPRITES[player.currentAnim];
    if (player.currentAnim === 'die') {
      if (player.currentFrame < anim.total-1) player.currentFrame++;
      else if (!player.dieFrameDone) { player.dieFrameDone=true; setTimeout(showGameOver,600); }
    } else if (player.currentAnim === 'takeoff') {
      // Eenmalig afspelen, daarna naar 'fly'
      if (player.currentFrame < anim.total-1) player.currentFrame++;
      else { player.currentAnim='fly'; player.currentFrame=0; }
    } else {
      player.currentFrame = (player.currentFrame+1) % anim.total;
    }
  }

  if (!player.alive) {
    player.vy = Math.min(player.vy + player.gravity*slowMoFactor*S, 12);
    player.y  = Math.min(player.y  + player.vy*slowMoFactor*S, FLOOR_Y()-player.height+FOOT_OFF());
    return;
  }
  if (rocketActive) return;

  if (player.isThrusting) {
    player.vy = Math.max(player.vy - player.thrustPower*S, player.maxUp);
    spawnFireParticles();
    // Opstijgen-animatie alleen als we net van de grond komen
    if (prevOnGround && shootTimer <= 0) {
      player.currentAnim = 'takeoff'; player.currentFrame = 0;
    } else if (!prevOnGround && shootTimer <= 0 && player.currentAnim !== 'takeoff') {
      player.currentAnim = 'fly';
    }
  } else {
    player.vy = Math.min(player.vy + player.gravity*S, player.maxDown);
  }

  player.y += player.vy * slowMoFactor * S;
  if (player.y+player.height-FOOT_OFF() >= FLOOR_Y()) {
    player.y=FLOOR_Y()-player.height+FOOT_OFF(); player.vy=0; player.onGround=true;
    if (!player.isThrusting && shootTimer<=0) player.currentAnim='run';
  } else { player.onGround=false; }
  if (player.y <= CEIL_Y) { player.y=CEIL_Y; player.vy=3; }
  if (!player.isThrusting && !player.onGround && shootTimer<=0) player.currentAnim='run';
}

// ===== RAKET TRANSFORM EFFECT =====
let rocketFX = { active:false, timer:0, cx:0, cy:0, particles:[], textScale:0 };

function triggerRocketTransform(cx, cy) {
  rocketFX.active = true;
  rocketFX.timer  = 55;
  rocketFX.cx     = cx;
  rocketFX.cy     = cy;
  rocketFX.textScale = 0;
  rocketFX.particles = [];
  // Grote burst van vuurdeeltjes
  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 / 60) * i + Math.random() * 0.3;
    const spd   = 4 + Math.random() * 14;
    rocketFX.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1, size: 6 + Math.random() * 14,
      hue: Math.random() > 0.5 ? 30 + Math.random()*20 : 50 + Math.random()*20,
      type: Math.random() > 0.35 ? 'fire' : 'spark',
    });
  }
  // Extra ring shockwave
  rocketFX.shockR  = 10;
  rocketFX.shockMax = canvas.width * 0.65;
  shakeTimer = 25; shakeIntensity = 18;
}

function updateRocketFX() {
  if (!rocketFX.active) return;
  rocketFX.timer -= S;
  if (rocketFX.timer <= 0) { rocketFX.active = false; return; }
  rocketFX.shockR    = Math.min(rocketFX.shockR + 28*S, rocketFX.shockMax);
  rocketFX.textScale = Math.min(rocketFX.textScale + 0.18*S, 1.4);
  rocketFX.particles.forEach(p => {
    p.x += p.vx * slowMoFactor * S; p.y += p.vy * slowMoFactor * S;
    p.vx *= Math.pow(0.92, S); p.vy *= Math.pow(0.92, S);
    p.life -= 0.025 * slowMoFactor * S;
    p.size *= Math.pow(0.97, S);
  });
  rocketFX.particles = rocketFX.particles.filter(p => p.life > 0);
}

function drawRocketFX() {
  if (!rocketFX.active) return;
  const t = rocketFX.timer / 55;  // 1→0

  // Shockwave ring
  if (rocketFX.shockR < rocketFX.shockMax) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t * 0.7);
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth   = 5 * t;
    ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(rocketFX.cx, rocketFX.cy, rocketFX.shockR, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Burst particles
  rocketFX.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life * 0.9;
    if (p.type === 'fire') {
      ctx.fillStyle = `hsl(${p.hue},100%,${50 + p.life*20}%)`;
      ctx.shadowColor = `hsl(${p.hue},100%,60%)`; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 8;
      ctx.fillRect(p.x - 1.5, p.y - p.size*p.life, 3, p.size*p.life*2);
    }
    ctx.restore();
  });

  // Schermflash bij begin
  if (t > 0.75) {
    ctx.save();
    ctx.globalAlpha = (t - 0.75) / 0.25 * 0.55;
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // 🚀 RAKET! tekst
  if (rocketFX.textScale > 0.1) {
    const scale = Math.min(rocketFX.textScale, 1.2);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2 - 40);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.min(1, rocketFX.textScale * 0.85);
    ctx.font        = 'bold 54px Arial';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 30;
    ctx.fillStyle   = '#ffe066';
    ctx.fillText('🚀 RAKET MODUS!', 0, 0);
    ctx.shadowBlur  = 0;
    ctx.restore();
  }
}

// ===== SCHIETEN =====
function handleShoot() {
  if (gameState !== 'playing' || !player.alive || bulletsLeft <= 0 || rocketActive) return;
  bulletsLeft--;
  // Kogel positie: pistoolloop rechtsboven op het karakter
  bullet.x = player.x + player.width  * 0.82;
  bullet.y = player.y + player.height * 0.40;
  bullet.active = true;
  // Schietanimatie
  shootTimer = SHOOT_ANIM_FRAMES;
  player.currentAnim  = player.onGround ? 'shootstand' : 'shootfly';
  player.currentFrame = 0;
}

function updateBullet() {
  if (!bullet.active) return;
  bullet.x += bullet.vx * slowMoFactor * S;
  if (bullet.x > canvas.width + 40) bullet.active = false;
}

function drawBullet() {
  if (!bullet.active) return;
  ctx.save();
  // Gloed
  ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 14;
  ctx.fillStyle   = '#fff8aa';
  ctx.beginPath(); ctx.ellipse(bullet.x, bullet.y, bullet.r*2, bullet.r*0.8, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.r*0.55, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawShootButton() {
  if (gameState !== 'playing' || !player.alive) return;
  const empty = bulletsLeft <= 0;
  const bx=18, by=canvas.height-90, bw=96, bh=68;
  ctx.save();
  ctx.globalAlpha = empty ? 0.35 : 0.90;
  ctx.fillStyle   = empty ? '#333' : '#c0392b';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,14); ctx.fill(); }
  else ctx.fillRect(bx,by,bw,bh);
  if (!empty) {
    ctx.shadowColor='#e74c3c'; ctx.shadowBlur=12;
    ctx.strokeStyle='#ff6b6b'; ctx.lineWidth=2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,14); ctx.stroke(); }
  }
  ctx.globalAlpha = empty ? 0.4 : 1;
  ctx.shadowBlur = 0;
  // Kogels als bolletjes tonen
  ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.fillText('🔫', bx+bw/2, by+26);
  // Aantal kogels
  ctx.font = 'bold 13px Arial';
  ctx.fillStyle = empty ? '#aaa' : '#ffe066';
  const bullets = '●'.repeat(Math.min(bulletsLeft, 5)) + (bulletsLeft > 5 ? `+${bulletsLeft-5}` : '');
  ctx.fillText(empty ? 'LEEG' : bullets, bx+bw/2, by+44);
  ctx.font = '10px Arial'; ctx.fillStyle = '#fff';
  ctx.fillText('SCHIETEN', bx+bw/2, by+59);
  ctx.restore();
}

// ===== GAME LOOP =====
function gameLoop(now) {
  if (gameState!=='playing') return;
  // ── Delta-time: normalise to 144 fps so speed is identical on all screens ──
  if (!lastTime) lastTime = now;
  const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms to avoid spiral of death
  lastTime = now;
  S = dt * 144;

  frameCount += S;
  if (player.alive) {
    distance = Math.floor(frameCount * gameSpeed / 60);
    speedUpTimer -= S;
    if (speedUpTimer <= 0) { baseSpeed=Math.min(baseSpeed+(window._speedIncrement||0.15),5); if (!rocketActive) gameSpeed=baseSpeed; speedUpTimer=700; }
  }
  updateSlowMoShake();
  updatePowerupTick();

  ctx.save(); ctx.translate(shakeX,shakeY);
  ctx.clearRect(-20,-20,canvas.width+40,canvas.height+40);

  drawBackground();
  drawThemeParticles();  // 🌌 Thema ambient particles (sterren/sneeuw/etc)
  drawFloorCeil();
  drawForegroundTrees();
  drawTrail();           // ✨ Trail achter speler
  drawPowerupCapsules();
  drawLetters();
  drawZappers();
  drawMissiles();        // 🚀 Vijandelijke raketten + waarschuwing
  drawCoins();
  drawRocket();
  drawPlayer();          // Speler
  drawFireParticles();   // 🔥 Vlam op de PNG-vlam positie
  drawBullet();          // 💥 Kogel
  drawShield();
  drawShootButton();     // 🔫 Schietknop linksonder
  drawRocketFX();        // 🚀 Raket transformatie effect
  drawSlowMoOverlay();
  drawFX();              // ✨ Popups / schokgolven / vonken / flits
  drawPowerupHUD();
  drawJobHUD();

  ctx.restore();

  // Vignette (buiten de shake, gecachet) — subtiele donkere randen
  if (vignetteGrad) { ctx.fillStyle = vignetteGrad; ctx.fillRect(0, 0, canvas.width, canvas.height); }

  document.getElementById('distanceDisplay').textContent=distance+'m';
  document.getElementById('coinDisplay').textContent=coins;

  // Spawn raket particles als raket actief is
  if (rocketActive) spawnRocketParticles();

  updatePlayer();
  updateZappers();
  updateMissiles();
  updateCoins();
  updateCombo();
  updateFX();
  updateFireParticles();
  updateTrail();
  updateThemeParticles();
  updateBullet();
  updateRocketFX();      // 🚀 Raket transformatie effect
  updateRocketParticles();
  updatePowerupObjects();
  updateLetters();

  requestAnimationFrame(gameLoop);
}

// ===== INIT =====
function drawMenuBg() {
  if (gameState!=='menu') return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBackground(); drawFloorCeil();
  requestAnimationFrame(drawMenuBg);
}
drawMenuBg();
