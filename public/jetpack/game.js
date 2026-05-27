// ===== CANVAS =====
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

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
const FLOOR_Y  = () => canvas.height - 80;
const CEIL_Y   = 60;
const FOOT_OFF = () => player.height * 0.18;

// ===== GAME STATE =====
let gameState    = 'menu';
let coins        = 0;
let highScore    = parseInt(localStorage.getItem('jj_highscore') || '0');
let totalCoins   = parseInt(localStorage.getItem('jj_totalcoins') || '0'); // gespaarde munten voor shop
let frameCount   = 0;
let gameSpeed    = 2.0;
let baseSpeed    = 2.0;

// ===== SPAWN TIMERS =====
let zapperTimer = 0;
let coinTimer   = 0;

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
}
function updateSlowMoShake() {
  if (slowMoTimer > 0) {
    slowMoTimer--;
    if (slowMoTimer < 40) slowMoFactor = 0.25 + 0.75 * (1 - slowMoTimer / 40);
    if (slowMoTimer <= 0) { slowMo = false; slowMoFactor = 1.0; }
  }
  if (shakeTimer > 0) {
    shakeTimer--;
    const i = shakeIntensity * (shakeTimer / 80);
    shakeX = (Math.random()-0.5)*i*2; shakeY = (Math.random()-0.5)*i*2;
  } else { shakeX = 0; shakeY = 0; }
}

// ===== PLAYER =====
const player = {
  x:150, y:300, vy:0,
  gravity:0.08, thrustPower:0.11, maxUp:-2, maxDown:2.5,
  isThrusting:false, invincible:false,
  width: FRAME_W*SCALE, height: FRAME_H*SCALE,
  currentAnim:'run', currentFrame:0, frameTimer:0, frameRate:3,
  alive:true, onGround:false, dieFrameDone:false
};

// ===== POWERUPS =====
const POWERUP_TYPES = {
  magnet: { emoji:'🧲', color:'#ff4488', label:'Magneet',  duration:480 },
  shield: { emoji:'🛡️', color:'#44aaff', label:'Schild',   duration:0   },
  slowmo: { emoji:'🐢', color:'#aaffaa', label:'Slow-mo',  duration:360 },
  extrabullet: { emoji:'🔫', color:'#e74c3c', label:'+1 Kogel', duration:0 },
  rocket: { emoji:'🚀', color:'#ff6600', label:'Raket',    duration:900 }, // langer: 900 frames (~15 sec)
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
    l.phase += 0.05 * slowMoFactor;
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
  // Spawn letter elke ~12 seconden
  if (frameCount % 720 === 360) spawnLetter();

  letterObjects.forEach(l => {
    l.x -= gameSpeed * slowMoFactor;
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
    gameSpeed = baseSpeed * 2.8;  // raket gaat veel sneller vooruit
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
    activePowerups[type]--;
    if (activePowerups[type] <= 0) deactivatePowerup(type);
  });

  // Slowmo factor
  if (activePowerups.slowmo) slowMoFactor = 0.45;
  else if (!slowMo)          slowMoFactor = 1.0;

  // Raket physics
  if (rocketActive) {
    if (player.isThrusting) rocketVy = Math.max(rocketVy - 0.25, -3.5);
    else                     rocketVy = Math.min(rocketVy + 0.20,  3.5);
    rocketY  = Math.max(CEIL_Y+20, Math.min(rocketY + rocketVy, FLOOR_Y()-40));
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
      if (Math.sqrt(dx*dx+dy*dy) < magnetRange) { c.x += dx*0.08; c.y += dy*0.08; }
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

function initBackground() {
  const w = canvas.width;
  // Bergen — minder dan voorheen
  for (let i=0; i<12; i++) {
    bgMountains.push({ x: w/6*i+Math.random()*80, w:150+Math.random()*200, h:80+Math.random()*120,
      color:`hsl(${130+Math.random()*30},${30+Math.random()*15}%,${18+Math.random()*12}%)` });
  }
  // Bomen — minder voor betere performance
  for (let i=0; i<16; i++) {
    bgTreesFar.push({ x:w/8*i+Math.random()*60, th:30+Math.random()*25, tw:7,
      cr:18+Math.random()*14, color:`hsl(${120+Math.random()*35},38%,${22+Math.random()*10}%)` });
  }
  for (let i=0; i<12; i++) {
    bgTreesMid.push({ x:w/6*i+Math.random()*80, th:50+Math.random()*35, tw:11,
      cr:28+Math.random()*18, color:`hsl(${115+Math.random()*35},48%,${28+Math.random()*12}%)` });
  }
  for (let i=0; i<10; i++) {
    bgTreesNear.push({ x:w/5*i+Math.random()*100, th:70+Math.random()*50, tw:16,
      cr:42+Math.random()*24, color:`hsl(${110+Math.random()*30},20%,12%)` });
  }
}
initBackground();

// Vogels — minder voor performance
const birds = Array.from({length:3}, () => ({
  x: Math.random()*canvas.width, y:80+Math.random()*100,
  spd:1.5+Math.random()*2, phase:Math.random()*Math.PI*2, sz:3+Math.random()*4
}));

function drawBackground() {
  const w = canvas.width, h = canvas.height;
  const floorY = FLOOR_Y();

  // Diepere mooiere lucht
  const sky = ctx.createLinearGradient(0,0,0,floorY);
  sky.addColorStop(0,   '#020802');
  sky.addColorStop(0.25,'#051205');
  sky.addColorStop(0.6, '#0d2a0d');
  sky.addColorStop(1,   '#1a4a15');
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,floorY);

  // Atmosferische mist onderaan
  const mist = ctx.createLinearGradient(0, floorY-150, 0, floorY);
  mist.addColorStop(0, 'rgba(20,60,15,0)');
  mist.addColorStop(1, 'rgba(20,60,15,0.4)');
  ctx.fillStyle = mist; ctx.fillRect(0, floorY-150, w, 150);

  // Zon grote glow
  const sx=w*0.78, sy=CEIL_Y+55;
  const sg = ctx.createRadialGradient(sx,sy,0,sx,sy,180);
  sg.addColorStop(0,'rgba(255,230,100,0.22)');
  sg.addColorStop(0.5,'rgba(255,180,30,0.06)');
  sg.addColorStop(1,'rgba(255,140,0,0)');
  ctx.fillStyle=sg; ctx.fillRect(0,0,w,floorY);

  // Zon kern gradient
  ctx.save();
  const sunG = ctx.createRadialGradient(sx-4,sy-4,0,sx,sy,26);
  sunG.addColorStop(0,'#ffffff');
  sunG.addColorStop(0.3,'#ffe566');
  sunG.addColorStop(1,'#ffbb00');
  ctx.fillStyle=sunG;
  ctx.beginPath(); ctx.arc(sx,sy,26,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Vogels
  birds.forEach(b => {
    b.x -= b.spd*slowMoFactor; b.phase += 0.12*slowMoFactor;
    if (b.x < -20) b.x = w+20;
    ctx.save(); ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(b.x-b.sz*2,b.y); ctx.quadraticCurveTo(b.x-b.sz,b.y-Math.sin(b.phase)*b.sz*1.2,b.x,b.y);
    ctx.moveTo(b.x+b.sz*2,b.y); ctx.quadraticCurveTo(b.x+b.sz,b.y-Math.sin(b.phase)*b.sz*1.2,b.x,b.y);
    ctx.stroke(); ctx.restore();
  });

  // Bergen
  bgOffsets.mount += gameSpeed*0.08*slowMoFactor;
  bgMountains.forEach(m => {
    const dx = ((m.x - bgOffsets.mount) % (w+400) + w+400) % (w+400) - 200;
    ctx.fillStyle=m.color; ctx.beginPath();
    ctx.moveTo(dx-m.w/2,floorY); ctx.lineTo(dx,floorY-m.h); ctx.lineTo(dx+m.w/2,floorY); ctx.closePath(); ctx.fill();
  });

  // Bomen ver
  bgOffsets.far += gameSpeed*0.2*slowMoFactor;
  drawTreeSet(bgTreesFar, bgOffsets.far, 0.55, w);

  // Bomen midden
  bgOffsets.mid += gameSpeed*0.35*slowMoFactor;
  drawTreeSet(bgTreesMid, bgOffsets.mid, 0.78, w);
}

function drawTreeSet(trees, offset, alpha, w) {
  const floorY = FLOOR_Y();
  trees.forEach(t => {
    const dx = ((t.x - offset) % (w+600) + w+600) % (w+600) - 300;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(dx-t.tw/2, floorY-t.th, t.tw, t.th);
    ctx.fillStyle = t.color;
    ctx.beginPath(); ctx.arc(dx, floorY-t.th-t.cr*0.6, t.cr, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(dx-t.cr*0.5, floorY-t.th-t.cr*0.25, t.cr*0.72, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(dx+t.cr*0.5, floorY-t.th-t.cr*0.25, t.cr*0.72, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

function drawForegroundTrees() {
  bgOffsets.near += gameSpeed*0.6*slowMoFactor;
  const w = canvas.width, floorY = FLOOR_Y();
  bgTreesNear.forEach(t => {
    const dx = ((t.x - bgOffsets.near) % (w+800) + w+800) % (w+800) - 400;
    ctx.save(); ctx.globalAlpha=0.95;
    ctx.fillStyle='#150800'; ctx.fillRect(dx-t.tw/2, floorY-t.th, t.tw, t.th);
    ctx.fillStyle=t.color;
    ctx.beginPath(); ctx.arc(dx, floorY-t.th-t.cr*0.6, t.cr, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(dx-t.cr*0.5, floorY-t.th-t.cr*0.25, t.cr*0.72, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(dx+t.cr*0.5, floorY-t.th-t.cr*0.25, t.cr*0.72, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

function drawFloorCeil() {
  const w=canvas.width, h=canvas.height, floorY=FLOOR_Y();
  // Vloer
  const fg=ctx.createLinearGradient(0,floorY,0,h);
  fg.addColorStop(0,'#2d5a1b'); fg.addColorStop(0.2,'#1e3d12'); fg.addColorStop(1,'#0a1a06');
  ctx.fillStyle=fg; ctx.fillRect(0,floorY,w,h-floorY);
  // Simpele groene rand ipv losse gras puntjes (sneller)
  ctx.fillStyle='#4aaa20';
  ctx.fillRect(0,floorY,w,3);
  // Plafond
  ctx.fillStyle='#0a1a06'; ctx.fillRect(0,0,w,CEIL_Y);
  // Lianen
  ctx.strokeStyle='#2a5018'; ctx.lineWidth=3;
  for (let lx=(bgOffsets.far*0.5)%80; lx<w; lx+=80) {
    ctx.beginPath(); ctx.moveTo(lx,0);
    ctx.quadraticCurveTo(lx+15,CEIL_Y*0.6,lx+5,CEIL_Y); ctx.stroke();
  }
  ctx.fillStyle='#4aaa20';
  ctx.fillRect(0,CEIL_Y-2,w,3);
}

// ===== ZAPPERS =====
let zappers = [];
function spawnZapper() {
  const floorY=FLOOR_Y(), roll=Math.random();
  if (roll < 0.4) {
    const gs=280+Math.random()*80, gy=CEIL_Y+40+Math.random()*(floorY-CEIL_Y-80-gs);
    zappers.push({ type:'vertical', x:canvas.width+50, gapY:gy, gapSize:gs, width:20, glowPhase:Math.random()*Math.PI*2 });
  } else if (roll < 0.7) {
    const gs  = 270 + Math.random() * 80;
    const len = 220 + Math.random() * 120;
    // y is het midden van de laser, gewoon een vaste hoogte in het speelveld
    const y = CEIL_Y + 100 + Math.random() * (floorY - CEIL_Y - 200);
    zappers.push({ type:'horizontal', x:canvas.width + len/2 + 50, y, gapSize:gs, height:20, length:len, glowPhase:Math.random()*Math.PI*2 });
  } else {
    const angle=(Math.random()>0.5?1:-1)*(25+Math.random()*25)*Math.PI/180;
    const cy=CEIL_Y+80+Math.random()*(floorY-CEIL_Y-200);
    zappers.push({ type:'diagonal', x:canvas.width+60, y:cy, angle, len:200+Math.random()*100, gap:160+Math.random()*60, width:18, glowPhase:Math.random()*Math.PI*2 });
  }
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
    };
    const color = colors[z.type];

    if (z.type === 'vertical') {
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
  zapperTimer++;
  const zInterval = Math.max(200, Math.floor(480 - frameCount / 80));
  if (zapperTimer >= zInterval) { spawnZapper(); zapperTimer = 0; }
  zappers = zappers.filter(z => {
    z.x -= gameSpeed*slowMoFactor;
    // Kogel raakt laser → laser kapot
    if (bullet.active) {
      const hit = (z.type==='vertical'   && Math.abs(bullet.x - z.x) < 28) ||
                  (z.type==='horizontal' && Math.abs(bullet.y - z.y) < 22 && bullet.x >= z.x-z.length/2 && bullet.x <= z.x+z.length/2) ||
                  (z.type==='diagonal'   && Math.hypot(bullet.x - z.x, bullet.y - z.y) < 80);
      if (hit) { bullet.active = false; return false; } // verwijder zapper
    }
    return true;
  });
  zappers.forEach(z => {
    if (!player.alive || player.invincible || rocketActive) return;
    const px=player.x+28, py=player.y+15, pw=player.width-56, ph=player.height-FOOT_OFF()-20;
    if (z.type==='vertical') {
      if (px+pw>z.x-z.width/2 && px<z.x+z.width/2)
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

// ===== MUNTEN =====
let coinObjects = [];
// ===== LASER COLLISION CHECK VOOR COINS =====
function isCoinInLaser(cx, cy) {
  for (const z of zappers) {
    if (z.type === 'vertical') {
      if (Math.abs(cx - z.x) < 30) {
        if (cy < z.gapY || cy > z.gapY + z.gapSize) return true;
      }
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

  for (let i = 0; i < 6; i++) {
    const cx = canvas.width + 200 + i * 52; // ver genoeg vooruit spawnen
    coinObjects.push({ x:cx, y, r:16, collected:false, phase:i*0.3 });
  }
}

function drawCoins() {
  const skin = shopEquipped['coin_skin'] || 'default';
  coinObjects.forEach(c => {
    if (c.collected) return;
    c.phase += 0.05 * slowMoFactor;
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
  coinTimer++;
  const cInterval = Math.max(60, Math.floor(180 - frameCount / 150));
  if (coinTimer >= cInterval) { spawnCoinRow(); coinTimer = 0; }
  coinObjects.forEach(c => {
    c.x -= gameSpeed * slowMoFactor;
    // Verwijder munt als hij in een laser zit
    if (isCoinInLaser(c.x, c.y)) { c.collected = true; return; }
    if (!c.collected && player.alive) {
      const dx = c.x-(player.x+player.width/2), dy = c.y-(player.y+player.height/2);
      if (Math.sqrt(dx*dx+dy*dy) < c.r+30) { c.collected=true; coins++; showCoinPopup(c.x,c.y); }
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

// ===== TRAIL SYSTEEM =====
// Trail types: stars, smoke, fire, rainbow, energy
// Geselecteerd via shopEquipped['trail']
let trailParticles = [];

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
    p.x    += p.vx * slowMoFactor;
    p.y    += p.vy * slowMoFactor;
    p.life -= 0.017 * slowMoFactor;  // ~1 sec bij 60fps
    if (p.rot !== undefined) p.rot += (p.rotSpeed||0) * slowMoFactor;
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
    p.x    += p.vx * slowMoFactor;
    p.y    += p.vy * slowMoFactor;
    p.life -= 0.035 * slowMoFactor;  // langzamer uitdoven = langere streep omlaag
    p.size *= 0.97;
  });
  fireParticles = fireParticles.filter(p => p.life > 0);
}

// ===== POWERUP CAPSULES =====
function drawPowerupCapsules() {
  powerupObjects.forEach(p => {
    p.phase += 0.04 * slowMoFactor;
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
  if (frameCount%900===450) spawnPowerupCapsule();
  powerupObjects.forEach(p => {
    p.x -= gameSpeed*slowMoFactor;
    if (!player.alive||player.invincible) return;
    const dx=p.x-(player.x+player.width/2), dy=p.y-(player.y+player.height/2);
    if (Math.sqrt(dx*dx+dy*dy)<p.r+30) { activatePowerup(p.type); p.collected=true; }
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
    p.x += p.vx * slowMoFactor; p.y += p.vy * slowMoFactor;
    p.life -= (p.type==='flame' ? 0.08 : 0.04) * slowMoFactor;
    p.size *= 0.97;
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
    { id:'fire_blue',    name:'Blauw Vuur',     icon:'🔵', desc:'Verander de jetpack vlam naar ijskoud blauw.', price:80,  type:'fire_color', value:'blue' },
    { id:'fire_green',   name:'Groen Vuur',     icon:'💚', desc:'Neon groene vlammen uit je jetpack!',          price:100, type:'fire_color', value:'green' },
    { id:'fire_rainbow', name:'Regenboog Vuur', icon:'🌈', desc:'Alle kleuren tegelijk — maximale stijl.',      price:250, type:'fire_color', value:'rainbow' },
  ],
  trail: [
    { id:'trail_stars',   name:'Sterren Trail',   icon:'✨', desc:'Glinsterende sterretjes achter je aan.',   price:120, type:'trail', value:'stars' },
    { id:'trail_smoke',   name:'Rook Trail',      icon:'💨', desc:'Mysterieuze rookwolken achter je.',        price:80,  type:'trail', value:'smoke' },
    { id:'trail_fire',    name:'Vuur Trail',      icon:'🔥', desc:'Komeet-effect — jij bent het vuur!',      price:150, type:'trail', value:'fire'  },
    { id:'trail_rainbow', name:'Regenboog Trail', icon:'🌈', desc:'Kleurexplosie achter elke beweging.',     price:200, type:'trail', value:'rainbow' },
    { id:'trail_energy',  name:'Energie Trail',   icon:'⚡', desc:'Elektrische energie bollen achter je.',   price:180, type:'trail', value:'energy' },
  ],
  coins: [
    { id:'coin_diamond', name:'Diamant Munten', icon:'💎', desc:'Verander gewone munten in glinsterende diamanten.', price:150, type:'coin_skin', value:'diamond' },
    { id:'coin_star',    name:'Ster Munten',    icon:'⭐', desc:'Gouden sterren in plaats van munten.',              price:120, type:'coin_skin', value:'star' },
    { id:'coin_heart',   name:'Hart Munten',    icon:'❤️', desc:'Schattige harten — voor de romanticus.',            price:100, type:'coin_skin', value:'heart' },
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
      id: 'slowmo',
      name: 'Slow-mo Duur',
      icon: '🐢',
      levels: [
        { level:1, desc:'Slow-mo duurt 3 seconden langer.',       price:120,  effect:{ slowmoDuration:540  } },
        { level:2, desc:'Slow-mo duurt 6 seconden langer.',       price:240,  effect:{ slowmoDuration:720  } },
        { level:3, desc:'Slow-mo duurt 10 seconden langer.',      price:400,  effect:{ slowmoDuration:960  } },
        { level:4, desc:'Slow-mo duurt onbeperkt lang!',          price:700,  effect:{ slowmoDuration:9999 } },
      ]
    },
    {
      id: 'coins',
      name: 'Munt Bonus',
      icon: '🪙',
      levels: [
        { level:1, desc:'Verdien 1.5x zoveel munten.',            price:200,  effect:{ coinMulti:1.5 } },
        { level:2, desc:'Verdien 2x zoveel munten.',              price:380,  effect:{ coinMulti:2   } },
        { level:3, desc:'Verdien 3x zoveel munten.',              price:600,  effect:{ coinMulti:3   } },
        { level:4, desc:'Verdien 5x zoveel munten — jackpot!',    price:1000, effect:{ coinMulti:5   } },
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

function saveShop() {
  localStorage.setItem('jj_owned',         JSON.stringify(shopOwned));
  localStorage.setItem('jj_equipped',      JSON.stringify(shopEquipped));
  localStorage.setItem('jj_starters',      JSON.stringify(activeStarters));
  localStorage.setItem('jj_upgradelevels', JSON.stringify(upgradeLevels));
  localStorage.setItem('jj_disabled',      JSON.stringify(disabledUpgrades));
  localStorage.setItem('jj_totalcoins',    totalCoins);
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
    const owned     = shopOwned.includes(item.id) && !item.repeatable;
    const equipped  = shopEquipped[item.type] === item.value;
    const canAfford = totalCoins >= item.price;

    const card = document.createElement('div');
    card.className = 'shop-item' +
      (owned ? ' owned' : '') +
      (equipped ? ' equipped' : '') +
      (!canAfford && !owned ? ' cant-afford' : '');

    let badge = equipped ? `<div class="item-badge badge-on">AAN</div>`
              : owned    ? `<div class="item-badge badge-owned">✓ GEKOCHT</div>` : '';

    let priceHtml = '', btnHtml = '';
    if (item.repeatable) {
      const isActive = activeStarters.includes(item.id);
      priceHtml = isActive ? `<span class="item-price free">ACTIEF</span>` : `<span class="item-price">🪙 ${item.price}</span>`;
      btnHtml   = isActive ? `<button class="item-btn btn-equipped" disabled>✓ Actief</button>`
                           : `<button class="item-btn" onclick="buyStarter('${item.id}','${tab}')" ${!canAfford?'disabled':''}>Koop</button>`;
    } else if (owned) {
      priceHtml = `<span class="item-price owned-txt">AL GEKOCHT</span>`;
      if (item.type !== 'upgrade') {
        btnHtml = equipped
          ? `<button class="item-btn btn-equipped" disabled>✓ Aan</button>`
          : `<button class="item-btn btn-equip" onclick="equipItem('${item.id}','${item.type}','${item.value}','${tab}')">Aandoen</button>`;
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
  if (upgId === 'magnet')  window._magnetRange    = 220;
  if (upgId === 'shield')  { window._shieldHits = 1; window._shieldRegen = null; }
  if (upgId === 'slowmo')  POWERUP_TYPES.slowmo.duration = 360;
  if (upgId === 'coins')   window._coinMulti      = 1;
  if (upgId === 'speed')   { POWERUP_TYPES.speed.duration = 300; window._speedMult = 1.8; }
}

function buyItem(id, type, value, tab) {
  const item = Object.values(SHOP_ITEMS).flat().find(i => i.id === id);
  if (!item || totalCoins < item.price) return;
  totalCoins -= item.price;
  shopOwned.push(id);
  if (type !== 'upgrade') shopEquipped[type] = value;
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

  if (effect.magnetRange)   window._magnetRange    = effect.magnetRange;
  if (effect.shieldHits)    window._shieldHits     = effect.shieldHits;
  if (effect.shieldRegen)   window._shieldRegen    = effect.shieldRegen;
  if (effect.slowmoDuration) POWERUP_TYPES.slowmo.duration = effect.slowmoDuration;
  if (effect.coinMulti)     window._coinMulti      = effect.coinMulti;
  if (effect.startBullets)  window._startBullets   = effect.startBullets;
}

function applyUpgrade(value) {} // legacy stub

function equipItem(id, type, value, tab) {
  shopEquipped[type] = value;
  saveShop();
  showShopFeedback(`✨ ${id} aangezet!`);
  renderShopTab(tab);
}

function buyStarter(id, tab) {
  const item = Object.values(SHOP_ITEMS).flat().find(i => i.id === id);
  if (!item || totalCoins < item.price) return;
  totalCoins -= item.price;
  if (!activeStarters.includes(id)) activeStarters.push(id);
  saveShop();
  document.getElementById('shopCoins').textContent = totalCoins;
  showShopFeedback(`🚀 ${item.name} actief voor de volgende run!`);
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
document.addEventListener('keydown',e=>{ if(e.code==='KeyF'||e.code==='KeyX') handleShoot(); });
function handlePress()   { if(gameState==='playing'&&player.alive) player.isThrusting=true; }
function handleRelease() { player.isThrusting=false; }

// ===== UI =====
document.getElementById('startBtn').addEventListener('click',   startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('shopBtnMenu').addEventListener('click', () => openShop('menu'));
document.getElementById('shopBtnGO').addEventListener('click',   () => openShop('gameover'));

function startGame() {
  gameState='playing'; coins=0; distance=0; frameCount=0;
  gameSpeed=2.0; baseSpeed=2.0;
  bulletsLeft = window._startBullets || 1; bullet.active=false; shootTimer=0;
  zapperTimer=0; coinTimer=0;
  zappers=[]; coinObjects=[]; fireParticles=[]; powerupObjects=[];
  trailParticles=[];
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
    return;
  }
  if (rocketActive) deactivatePowerup('rocket');
  player.alive=false; player.currentAnim='die'; player.currentFrame=0; player.frameTimer=0;
  triggerDeathEffects();
  if (distance>highScore) { highScore=distance; localStorage.setItem('jj_highscore',highScore); }
}

function showGameOver() {
  gameState = 'gameover';

  // Sla munten op met multiplier
  const multi  = window._coinMulti || (window._coinDouble ? 2 : 1);
  const earned = Math.floor(coins * multi);
  totalCoins  += earned;
  localStorage.setItem('jj_totalcoins', totalCoins);

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
    shootTimer--;
    if (shootTimer === 0) {
      // Terug naar normale animatie
      player.currentFrame = 0;
      player.currentAnim  = player.onGround ? 'run' : 'fly';
    }
  }

  // Frame-animatie
  const rate = player.currentAnim==='die' ? player.frameRate : Math.max(2,Math.floor(player.frameRate/slowMoFactor));
  player.frameTimer++;
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
    player.vy = Math.min(player.vy+player.gravity*slowMoFactor, 12);
    player.y  = Math.min(player.y+player.vy*slowMoFactor, FLOOR_Y()-player.height+FOOT_OFF());
    return;
  }
  if (rocketActive) return;

  if (player.isThrusting) {
    player.vy = Math.max(player.vy-player.thrustPower, player.maxUp);
    spawnFireParticles();
    // Opstijgen-animatie alleen als we net van de grond komen
    if (prevOnGround && shootTimer === 0) {
      player.currentAnim = 'takeoff'; player.currentFrame = 0;
    } else if (!prevOnGround && shootTimer === 0 && player.currentAnim !== 'takeoff') {
      player.currentAnim = 'fly';
    }
  } else {
    player.vy = Math.min(player.vy+player.gravity, player.maxDown);
  }

  player.y += player.vy * slowMoFactor;
  if (player.y+player.height-FOOT_OFF() >= FLOOR_Y()) {
    player.y=FLOOR_Y()-player.height+FOOT_OFF(); player.vy=0; player.onGround=true;
    if (!player.isThrusting && shootTimer===0) player.currentAnim='run';
  } else { player.onGround=false; }
  if (player.y <= CEIL_Y) { player.y=CEIL_Y; player.vy=3; }
  if (!player.isThrusting && !player.onGround && shootTimer===0) player.currentAnim='run';
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
  bullet.x += bullet.vx * slowMoFactor;
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
function gameLoop() {
  if (gameState!=='playing') return;
  frameCount++;
  if (player.alive) {
    distance=Math.floor(frameCount*gameSpeed/60);
    if (frameCount%700===0) { baseSpeed=Math.min(baseSpeed+0.15,5); if (!activePowerups.speed) gameSpeed=baseSpeed; }
  }
  updateSlowMoShake();
  updatePowerupTick();

  ctx.save(); ctx.translate(shakeX,shakeY);
  ctx.clearRect(-20,-20,canvas.width+40,canvas.height+40);

  drawBackground();
  drawFloorCeil();
  drawForegroundTrees();
  drawTrail();           // ✨ Trail achter speler
  drawPowerupCapsules();
  drawLetters();
  drawZappers();
  drawCoins();
  drawRocket();
  drawPlayer();          // Speler
  drawFireParticles();   // 🔥 Vlam op de PNG-vlam positie
  drawBullet();          // 💥 Kogel
  drawShield();
  drawShootButton();     // 🔫 Schietknop linksonder
  drawSlowMoOverlay();
  drawPowerupHUD();
  drawJobHUD();

  ctx.restore();

  document.getElementById('distanceDisplay').textContent=distance+'m';
  document.getElementById('coinDisplay').textContent=coins;

  // Spawn raket particles als raket actief is
  if (rocketActive) spawnRocketParticles();

  updatePlayer();
  updateZappers();
  updateCoins();
  updateFireParticles();
  updateTrail();
  updateBullet();
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
