// ============================================================
//  MOTEUR ARCADE COMMUN
//  Police pixel, sons 8-bit, effet CRT, commandes (clavier,
//  souris, manette), écran titre, high scores, 1 ou 2 joueurs.
//
//  Commandes (calquées sur les touches par défaut de MAME,
//  pour faciliter l'adaptation à la borne / l'émulateur) :
//    J1 : flèches + Espace/Ctrl (bouton 1) + Alt/Shift (bouton 2)
//    J2 : R F D G + A (bouton 1) + S (bouton 2)   [Q/S en AZERTY]
//    1 = partie 1 joueur, 2 = partie 2 joueurs, P = pause,
//    Echap = pause puis quitter, F = plein écran, M = son,
//    V = mode d'affichage (adapté / plein écran / pixels nets),
//    O = rotation 90° (écran de borne vertical)
//  Manettes USB (Gamepad API) : manette 1 = J1, manette 2 = J2.
//    Start = jouer / pause, Select (en pause) = quitter, Select + Start = quitter.
//  Réglages matériels : voir le bloc CONFIG plus bas (ou définir
//  window.ARCADE_CONFIG avant de charger ce fichier).
// ============================================================
(function () {
'use strict';
const A = window.Arcade = {};
let cfg, W = 224, H = 288, SC = 1, cv, ctx, world = null;
const RED = '#ff2a2a', YEL = '#ffe030', CYAN = '#30e0ff';
A.col = { RED, YEL, CYAN };

// ---------- Sauvegarde ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const opts = Object.assign({ crt: true, sound: true, view: 'ratio', rot: false }, store.get('arc_opts', {}));
A.opts = opts;

// ---------- Outils ----------
A.rand = (a, b) => a + Math.random() * (b - a);
A.irand = (a, b) => Math.floor(A.rand(a, b + 1));
A.pick = arr => arr[Math.floor(Math.random() * arr.length)];
A.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
A.overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

// ---------- Police bitmap 5x7 ----------
const FONT = {
  A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],
  E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],
  I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],
  M:[17,27,21,21,17,17,17],N:[17,17,25,21,19,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],
  Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],
  U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],
  Y:[17,17,17,10,4,4,4],Z:[31,1,2,4,8,16,31],
  0:[14,17,19,21,25,17,14],1:[4,12,4,4,4,4,14],2:[14,17,1,2,4,8,31],3:[31,2,4,2,1,17,14],
  4:[2,6,10,18,31,2,2],5:[31,16,30,1,1,17,14],6:[6,8,16,30,17,17,14],7:[31,1,2,4,8,8,8],
  8:[14,17,17,14,17,17,14],9:[14,17,17,15,1,2,12],
  ' ':[0,0,0,0,0,0,0],'.':[0,0,0,0,0,12,12],',':[0,0,0,0,12,4,8],':':[0,12,12,0,12,12,0],
  '!':[4,4,4,4,4,0,4],'?':[14,17,1,2,4,0,4],'-':[0,0,0,31,0,0,0],'/':[1,1,2,4,8,16,16],
  '>':[8,4,2,1,2,4,8],'<':[2,4,8,16,8,4,2],"'":[4,4,8,0,0,0,0],'(':[2,4,8,8,8,4,2],
  ')':[8,4,2,2,2,4,8],'+':[0,4,4,31,4,4,0],'=':[0,0,31,0,31,0,0],'_':[0,0,0,0,0,0,31],
  '*':[0,21,14,31,14,21,0],'"':[10,10,0,0,0,0,0],'#':[10,10,31,10,31,10,10],'%':[24,25,2,4,8,19,3]
};
const glyphCache = new Map();
function glyph(ch, col) {
  const k = ch + col; let g = glyphCache.get(k); if (g) return g;
  const rows = FONT[ch] || FONT['?'];
  g = document.createElement('canvas'); g.width = 5; g.height = 7;
  const c = g.getContext('2d'); c.fillStyle = col;
  rows.forEach((r, y) => { for (let x = 0; x < 5; x++) if (r & (16 >> x)) c.fillRect(x, y, 1, 1); });
  glyphCache.set(k, g); return g;
}
const norm = A.norm = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
A.textWidth = (s, sc = 1) => norm(s).length * 6 * sc - sc;
A.text = function (s, x, y, col = '#fff', sc = 1, al = 'left', sh = false) {
  s = norm(s); const w = s.length * 6 * sc - sc;
  if (al === 'center') x -= Math.floor(w / 2); else if (al === 'right') x -= w;
  x = Math.round(x); y = Math.round(y);
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ') continue; const gx = x + i * 6 * sc;
    if (sh) ctx.drawImage(glyph(s[i], '#000'), gx + sc, y + sc, 5 * sc, 7 * sc);
    ctx.drawImage(glyph(s[i], col), gx, y, 5 * sc, 7 * sc);
  }
};
function makeLogo(lines, cols) {
  lines = lines.map(norm);
  const longest = Math.max(...lines.map(l => l.length));
  const sc = Math.max(2, Math.min(5, Math.floor((W - 12) / (longest * 6))));
  const c = document.createElement('canvas'); c.width = W; c.height = lines.length * (7 * sc + 6) + 6;
  const g = c.getContext('2d'), px = [];
  lines.forEach((s, li) => {
    const x0 = Math.floor((W - (s.length * 6 * sc - sc)) / 2), y0 = 3 + li * (7 * sc + 6);
    for (let i = 0; i < s.length; i++) (FONT[s[i]] || []).forEach((r, y) => {
      for (let x = 0; x < 5; x++) if (r & (16 >> x)) px.push([x0 + i * 6 * sc + x * sc, y0 + y * sc, y]);
    });
  });
  g.fillStyle = '#000'; px.forEach(([x, y]) => g.fillRect(x - 2, y - 2, sc + 5, sc + 5));
  g.fillStyle = cols[7] || '#400'; px.forEach(([x, y]) => g.fillRect(x + 1, y + 1, sc, sc));
  px.forEach(([x, y, r]) => { g.fillStyle = cols[r]; g.fillRect(x, y, sc, sc); });
  return c;
}

// ---------- Sprites "pixel art" à partir de chaînes ----------
//   A.sprite(['..RR..','.RRRR.'], {R:'#f00'})  -> canvas
A.sprite = function (rows, pal, sc = 1) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w * sc; c.height = h * sc;
  const g = c.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = pal[r[x]]; if (col) { g.fillStyle = col; g.fillRect(x * sc, y * sc, sc, sc); } } });
  return c;
};
A.flipX = function (s) {
  const c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
  const g = c.getContext('2d'); g.translate(s.width, 0); g.scale(-1, 1); g.drawImage(s, 0, 0); return c;
};
A.flipY = function (s) {
  const c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
  const g = c.getContext('2d'); g.translate(0, s.height); g.scale(1, -1); g.drawImage(s, 0, 0); return c;
};
A.rot90 = function (s, q = 1) {   // q quarts de tour dans le sens horaire
  let out = s;
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) {
    const c = document.createElement('canvas'); c.width = out.height; c.height = out.width;
    const g = c.getContext('2d'); g.translate(c.width, 0); g.rotate(Math.PI / 2); g.drawImage(out, 0, 0); out = c;
  }
  return out;
};
A.recolor = function (s, col) {   // silhouette d'une seule couleur (flash, ombre...)
  const c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
  const g = c.getContext('2d'); g.drawImage(s, 0, 0); g.globalCompositeOperation = 'source-in';
  g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c;
};
A.draw = (s, x, y) => ctx.drawImage(s, Math.round(x), Math.round(y));
A.drawC = (s, x, y) => ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2));

// ---------- Particules / étoiles ----------
A.burst = function (arr, x, y, cols, n = 12, spd = 60, life = .6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = spd * (.3 + Math.random() * .7);
    arr.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: life * (.5 + Math.random() * .5), c: A.pick(cols) });
  }
};
A.updParts = function (arr, dt, grav = 0) {
  for (const p of arr) { p.x += p.vx * dt; p.vy += grav * dt; p.y += p.vy * dt; p.l -= dt; }
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i].l <= 0) arr.splice(i, 1);
};
A.drawParts = function (arr, size = 1) {
  for (const p of arr) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size); }
};
A.starfield = function (n = 70, speed = 30, y0 = 0) {
  const cols = ['#fff', '#ff5050', '#50ff50', '#5080ff', '#ffff50', '#ff50ff', '#50ffff'];
  const s = Array.from({ length: n }, () => ({ x: Math.random() * W, y: y0 + Math.random() * (H - y0), c: A.pick(cols), ph: Math.random() * 4, sp: .6 + Math.random() * .8 }));
  return {
    update(dt, sp = speed) { for (const st of s) { st.y += sp * st.sp * dt; if (st.y > H) st.y = y0 + (st.y - H); if (st.y < y0) st.y = H - (y0 - st.y); } },
    draw(t) { for (const st of s) { if (Math.floor(t * 2 + st.ph) % 4 === 0) continue; ctx.fillStyle = st.c; ctx.fillRect(Math.round(st.x), Math.round(st.y), 1, 1); } }
  };
};

// ---------- Sons 8-bit ----------
let AC = null, NB = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
A.tone = function (f, d, type = 'square', vol = .08, slide = 0, delay = 0) {
  if (!opts.sound) return; const a = audio(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
};
A.noise = function (d, vol = .15, freq = 1200, slide = 0, delay = 0) {
  if (!opts.sound) return; const a = audio(); if (!a) return;
  if (!NB) { NB = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const ch = NB.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const t = a.currentTime + delay, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = NB; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t);
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  s.connect(f).connect(g).connect(a.destination); s.start(t, Math.random()); s.stop(t + d + .02);
};
A.melody = function (notes, step = .1, type = 'square', vol = .07) {
  let t = 0; for (const [f, n] of notes) { if (f) A.tone(f, n * step * .92, type, vol, 0, t); t += n * step; }
};
// Son continu : à rappeler à chaque image tant qu'il doit jouer (coupé automatiquement sinon)
const hums = {};
A.hum = function (id, f, type = 'square', vol = .04) {
  if (!opts.sound) return; const a = audio(); if (!a) return;
  let h = hums[id];
  if (!h) { const o = a.createOscillator(), g = a.createGain(); o.type = type; g.gain.value = 0; o.connect(g).connect(a.destination); o.start(); h = hums[id] = { o, g }; }
  h.o.frequency.setTargetAtTime(f, a.currentTime, .01); h.g.gain.setTargetAtTime(vol, a.currentTime, .02); h.used = true;
};
function endHums() { for (const k in hums) { const h = hums[k]; if (!h.used) h.g.gain.setTargetAtTime(0, AC.currentTime, .02); h.used = false; } }
const JINGLE = {
  start: () => A.melody([[523,1],[659,1],[784,1],[1047,2],[784,1],[1047,3]], .09),
  over:  () => A.melody([[392,2],[370,2],[349,2],[330,6]], .14, 'triangle', .13),
  bonus: () => A.melody([[784,1],[988,1],[1175,1],[1568,3]], .07),
  entry: () => A.melody([[659,1],[784,1],[1047,1],[1319,3]], .08)
};
A.jingle = name => JINGLE[name] && JINGLE[name]();

// ---------- CONFIGURATION DES COMMANDES ----------
// Tout ce qui dépend du matériel (borne, encodeur, manettes, Recalbox...) est
// regroupé ici : pour adapter les jeux, il suffit de modifier ce bloc.
//  - keys : codes clavier (KeyboardEvent.code, position physique) par joueur
//  - pad  : numéros de boutons de manette (standard "Gamepad API" ; même
//           disposition que Recalbox : 0=A/bas, 1=B/droite, 8=Select, 9=Start)
const CONFIG = A.CONFIG = Object.assign({
  keys: [
    { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], a: ['Space', 'ControlLeft', 'ControlRight'], b: ['AltLeft', 'ShiftLeft', 'AltRight'] },
    { left: ['KeyD'], right: ['KeyG'], up: ['KeyR'], down: ['KeyF'], a: ['KeyA'], b: ['KeyS'] }
  ],
  start: [['Digit1', 'Numpad1', 'Enter'], ['Digit2', 'Numpad2']],
  pad: { a: [0, 2], b: [1, 3], c: [], d: [], select: 8, start: 9, up: 12, down: 13, left: 14, right: 15, deadzone: .5 },
  pauseKeys: ['KeyP', 'Escape'],   // touches qui mettent en pause pendant la partie
  padStartPauses: true             // Start de la manette met en pause (false pour les jeux où Start sert à autre chose)
}, window.ARCADE_CONFIG || {});

// ---------- Entrées ----------
const keys = new Set(), pressed = new Set(), typed = [];
const MAP = CONFIG.keys;
// 4 boutons d'action maximum (a, b, c, d) : les jeux à 1 ou 2 boutons ignorent c et d
const BTN = ['left', 'right', 'up', 'down', 'a', 'b', 'c', 'd'];
const mouse = A.mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, clicked: false, rclicked: false, rdown: false, moved: false, wheel: 0, locked: false };
let inp = [blank(), blank(), blank()], padPrev = [{}, {}], padStart = [false, false], padSelect = [false, false], padHeld = [{}, {}];
// Taille / orientation de l'écran (voir resize)
const view = { kx: 1, ky: 1, rot: false, el: null };
function blank() { const o = {}; for (const b of BTN) { o[b] = false; o[b + 'P'] = false; } return o; }
// Libellés réels des touches (AZERTY par défaut)
const LAB = { KeyA: 'Q', KeyQ: 'A', KeyW: 'Z', KeyZ: 'W', Semicolon: 'M', KeyM: ',' };
let layout = null;
try { navigator.keyboard && navigator.keyboard.getLayoutMap().then(m => { layout = m; }).catch(() => {}); } catch (e) {}
A.lab = code => {
  const k = layout && layout.get(code);
  if (k) return k.toUpperCase();
  return LAB[code] || code.replace(/^(Key|Digit)/, '').replace('Numpad', 'PAV.').replace('Arrow', '');
};

addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab','AltLeft','AltRight','Backspace'].includes(e.code)) e.preventDefault();
  if (!e.repeat) { pressed.add(e.code); if (/^[a-z0-9.]$/i.test(e.key)) typed.push(e.key); }
  keys.add(e.code); audio();
});
addEventListener('keyup', e => { keys.delete(e.code); if (e.code.startsWith('Alt')) e.preventDefault(); });
addEventListener('blur', () => { keys.clear(); mouse.down = false; });
// Convertit un déplacement écran en déplacement dans le jeu (tient compte de la rotation)
const toGame = (dx, dy) => view.rot ? [dy / view.kx, -dx / view.ky] : [dx / view.kx, dy / view.ky];
addEventListener('mousemove', e => {
  if (!cv) return;
  const [mx, my] = toGame(e.movementX || 0, e.movementY || 0);
  if (mouse.locked) { mouse.x = A.clamp(mouse.x + mx, 0, W - 1); mouse.y = A.clamp(mouse.y + my, 0, H - 1); }
  else {
    const r = view.el.getBoundingClientRect(), [gx, gy] = toGame(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    mouse.x = gx + W / 2; mouse.y = gy + H / 2;
  }
  mouse.dx += mx; mouse.dy += my; mouse.moved = true;
});
addEventListener('mousedown', e => { audio(); if (e.button === 0) { mouse.down = true; mouse.clicked = true; } if (e.button === 2) { mouse.rdown = true; mouse.rclicked = true; } });
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; if (e.button === 2) mouse.rdown = false; });
addEventListener('wheel', e => mouse.wheel += Math.sign(e.deltaY), { passive: true });
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  mouse.locked = !!cv && document.pointerLockElement === cv;
  if (!mouse.locked && S.state === 'play' && cfg.mouse === 'rel') pause();
});
function lockMouse() { if (cfg.mouse !== 'rel') return; try { const r = cv.requestPointerLock && cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
function unlockMouse() { if (document.pointerLockElement) document.exitPointerLock(); }

function pollPads() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const out = [blank(), blank()];
  for (let i = 0; i < 2; i++) {
    const g = pads[i], o = out[i], prev = padPrev[i], cur = {}, P = CONFIG.pad;
    if (g) {
      const b = n => [].concat(n).some(k => g.buttons[k] && g.buttons[k].pressed), ax = g.axes[0] || 0, ay = g.axes[1] || 0, dz = P.deadzone;
      cur.left = ax < -dz || b(P.left); cur.right = ax > dz || b(P.right); cur.up = ay < -dz || b(P.up); cur.down = ay > dz || b(P.down);
      cur.a = b(P.a); cur.b = b(P.b); cur.c = b(P.c || []); cur.d = b(P.d || []); cur.start = b(P.start); cur.select = b(P.select);
    }
    for (const k of BTN) { o[k] = !!cur[k]; o[k + 'P'] = !!cur[k] && !prev[k]; }
    padStart[i] = !!cur.start && !prev.start;
    padSelect[i] = !!cur.select && !prev.select;
    padPrev[i] = cur; padHeld[i] = cur;
  }
  return out;
}
function buildInputs() {
  const pads = pollPads();
  for (let i = 0; i < 2; i++) {
    const o = blank(), m = MAP[i];
    for (const k of BTN) { const c = m[k] || []; o[k] = c.some(x => keys.has(x)) || pads[i][k]; o[k + 'P'] = c.some(x => pressed.has(x)) || pads[i][k + 'P']; }
    inp[i] = o;
  }
  const mg = blank(); for (const k in mg) mg[k] = inp[0][k] || inp[1][k];
  inp[2] = mg;
}
// Entrées d'un joueur. En partie solo, les deux jeux de commandes pilotent le joueur 1.
A.input = i => A.n === 1 ? inp[2] : inp[i];
// Touche / bouton Start du joueur i appuyé à cette image (ex. "un nouveau challenger")
A.startP = i => CONFIG.start[i].some(c => pressed.has(c)) || padStart[i];
A.key = code => keys.has(code);
A.keyP = code => pressed.has(code);

// ---------- Joueurs / déroulement ----------
const S = { state: 'title', t: 0, timer: 0, hl: -1, entry: null, queue: [], msgs: [] };
A.players = []; A.n = 1;
let scores = [];
const qualifies = s => s > 0 && (scores.length < 10 || s > scores[scores.length - 1].s);
A.hi = () => Math.max(scores[0] ? scores[0].s : 0, ...A.players.map(p => p.score));
A.addScore = function (i, n) {
  const p = A.players[i]; if (!p || !n) return; p.score += n;
  if (cfg.bonus && p.score >= p.nextBonus) {
    p.nextBonus = cfg.bonusEvery ? p.nextBonus + cfg.bonusEvery : Infinity;
    p.lives++; A.jingle('bonus'); if (cfg.onBonus) cfg.onBonus(world, i);
  }
};
// À appeler par le jeu quand l'animation de mort d'un joueur est terminée.
// Renvoie true s'il lui reste des vies (le jeu le fait réapparaître), false sinon.
A.die = function (i) {
  const p = A.players[i]; if (!p || !p.alive) return false;
  p.lives--;
  if (p.lives > 0) return true;
  p.alive = false;
  if (A.players.every(q => !q.alive)) { S.state = 'over'; S.timer = 3.5; A.jingle('over'); unlockMouse(); }
  else A.msg('JOUEUR ' + (i + 1) + ' : GAME OVER', 2.5);
  return false;
};
A.gameOver = function (label) { S.overText = label || 'GAME OVER'; for (const p of A.players) { p.lives = Math.min(p.lives, 1); A.die(p.id); } };
A.msg = (s, d = 2) => S.msgs.push({ s, d });
A.alive = i => !!(A.players[i] && A.players[i].alive);

function begin(n) {
  audio(); A.n = n;
  A.players = Array.from({ length: n }, (_, id) => ({ id, score: 0, lives: cfg.lives || 3, alive: true, nextBonus: cfg.bonus || Infinity }));
  S.msgs = []; S.hl = -1; S.overText = 'GAME OVER';
  world = cfg.init(n);
  S.state = 'play'; lockMouse(); A.jingle('start');
}
function pause() { if (S.state !== 'play') return; S.state = 'pause'; unlockMouse(); }
function nextEntry() {
  while (S.queue.length) {
    const p = S.queue.shift();
    if (qualifies(p.score)) { S.entry = { p, l: [0, 0, 0], pos: 0, acc: 0 }; S.state = 'entry'; A.jingle('entry'); return; }
  }
  S.state = 'table'; S.timer = 0;
}
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-! ';
function updEntry() {
  const e = S.entry, i = inp[2], N = CHARS.length; let step = 0;
  if (typed.length) {   // lettres tapées au clavier : prioritaires sur les commandes (évite les conflits Q/S/R/F...)
    for (const ch of typed) { if (e.pos >= 3) break; e.l[e.pos++] = CHARS.indexOf(ch.toUpperCase()); A.tone(880, .04); }
  } else {
    if (i.upP || i.rightP) step++; if (i.downP || i.leftP) step--;
    e.acc += mouse.dy; step -= mouse.wheel;
    while (e.acc > 12) { step--; e.acc -= 12; } while (e.acc < -12) { step++; e.acc += 12; }
    if (step) { e.l[e.pos] = ((e.l[e.pos] + step) % N + N) % N; A.tone(880, .04); }
    if (e.pos < 3 && (i.aP || pressed.has('Enter') || mouse.clicked)) { e.pos++; A.tone(990, .06); }
    if ((pressed.has('Backspace') || i.bP) && e.pos > 0) e.pos--;
  }
  if (e.pos >= 3) {
    const en = { n: e.l.map(k => CHARS[k]).join(''), s: e.p.score };
    scores.push(en); scores.sort((a, b) => b.s - a.s); scores = scores.slice(0, 10);
    S.hl = scores.indexOf(en); store.set('arc_' + cfg.id + '_scores', scores); nextEntry();
  }
}

function update(dt) {
  S.t += dt; A.t = S.t;
  if (pressed.has('KeyF') && S.state !== 'entry') toggleFS();
  if (pressed.has('KeyM') && S.state !== 'entry') { opts.sound = !opts.sound; store.set('arc_opts', opts); }
  if (pressed.has('KeyC') && S.state !== 'entry' && S.state !== 'play') { opts.crt = !opts.crt; applyOpts(); }
  if (S.state !== 'entry' && S.state !== 'play') {
    if (pressed.has('KeyV')) { opts.view = VIEWS[(VIEWS.indexOf(opts.view) + 1) % VIEWS.length]; applyOpts(); toast('ECRAN : ' + VIEW_NAMES[opts.view]); }
    if (pressed.has('KeyO')) { opts.rot = !opts.rot; applyOpts(); toast(opts.rot ? 'ECRAN TOURNE (BORNE VERTICALE)' : 'ECRAN NORMAL'); }
  }
  if (S.toast) S.toast.t -= dt;
  // Select + Start sur une manette = quitter la partie (comme le "Hotkey + Start" de Recalbox)
  const quitCombo = [0, 1].some(i => (padHeld[i].select && padStart[i]) || (padHeld[i].start && padSelect[i]));
  if (quitCombo && S.state !== 'title' && S.state !== 'table') { unlockMouse(); S.state = 'title'; S.timer = 0; world = null; return; }
  const startKeys = k => CONFIG.start[k].some(c => pressed.has(c));
  const st1 = startKeys(0) || padStart[0] || (cfg.mouse && mouse.clicked);
  const st2 = startKeys(1) || padStart[1];
  switch (S.state) {
    case 'title': case 'table':
      S.timer += dt; if (cfg.attractUpdate) cfg.attractUpdate(dt);
      if (st2) begin(2); else if (st1) begin(1);
      else if (S.state === 'title' && S.timer > 12) { S.state = 'table'; S.timer = 0; }
      else if (S.state === 'table' && S.timer > (S.hl >= 0 ? 12 : 7)) { S.state = 'title'; S.timer = 0; S.hl = -1; }
      break;
    case 'play':
      if (CONFIG.pauseKeys.some(c => pressed.has(c)) || padSelect[0] || padSelect[1] || (CONFIG.padStartPauses && (padStart[0] || padStart[1]))) { pause(); break; }
      cfg.update(world, dt);
      for (const m of S.msgs) m.d -= dt; S.msgs = S.msgs.filter(m => m.d > 0);
      break;
    case 'pause':
      if (CONFIG.pauseKeys.some(c => c !== 'Escape' && pressed.has(c)) || inp[2].aP || mouse.clicked || padStart[0] || padStart[1]) { S.state = 'play'; lockMouse(); }
      else if (pressed.has('Escape') || padSelect[0] || padSelect[1]) { S.state = 'title'; S.timer = 0; world = null; }
      break;
    case 'over':
      if ((S.timer -= dt) <= 0) { S.queue = A.players.slice(); S.hl = -1; nextEntry(); }
      break;
    case 'entry': updEntry(); break;
  }
}

// ---------- Rendu ----------
let LOGO = null;
function hud() {
  const p = A.players;
  const lab = (s, x, on) => A.text(s, x, 1, on ? RED : '#777', 1, 'center');
  lab('1UP', W * .16, !p[0] || p[0].alive); A.text(p[0] ? p[0].score : 0, W * .16 + 22, 9, '#fff', 1, 'right');
  A.text('HIGH SCORE', W / 2, 1, RED, 1, 'center'); A.text(A.hi(), W / 2 + 14, 9, '#fff', 1, 'right');
  if (A.n === 2) { lab('2UP', W * .84, p[1].alive); A.text(p[1].score, W * .84 + 22, 9, '#fff', 1, 'right'); }
}
function band(y, h) { ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(0, y, W, h); }
function drawTitle() {
  if (!LOGO) LOGO = makeLogo(cfg.title.split('\n'), cfg.logoColors || ['#fff4b0','#ffd850','#ffb030','#ff8420','#ff5a14','#e02c10','#a81808','#4a0804']);
  ctx.drawImage(LOGO, 0, 22);
  let y = 22 + LOGO.height + 2;
  if (cfg.sub) { A.text(cfg.sub, W / 2, y, CYAN, 1, 'center'); y += 12; }
  if (cfg.attract) cfg.attract(ctx, S.t, y);
  const help = cfg.help ? cfg.help() : [];
  let by = H - 42 - help.length * 9;
  A.text('HIGH SCORE ' + A.hi(), W / 2, by - 34, RED, 1, 'center');
  if (Math.floor(S.t * 2) % 2) A.text('APPUIE SUR 1 OU 2', W / 2, by - 20, YEL, 1, 'center');
  A.text('1 = 1 JOUEUR   2 = 2 JOUEURS', W / 2, by - 8, '#fff', 1, 'center');
  help.forEach((l, i) => A.text(l, W / 2, by + 4 + i * 9, '#9a9a9a', 1, 'center'));
  A.text('ARCADE SERGE - FREE PLAY', W / 2, H - 10, '#666', 1, 'center');
}
function drawTable() {
  A.text('MEILLEURS SCORES', W / 2, 30, RED, 1, 'center');
  A.text(cfg.title.replace('\n', ' '), W / 2, 44, CYAN, 1, 'center');
  const cols = ['#ffe030','#ffa040','#ff5050','#ff60ff','#6080ff','#40e0ff','#60ff60','#ffffff','#c0c0c0','#e0b030'];
  scores.forEach((s, i) => {
    if (i === S.hl && Math.floor(S.t * 4) % 2) return;
    const y = 70 + i * 16, x = W / 2 - 60;
    A.text((i + 1) + (i ? 'E' : 'ER'), x, y, cols[i]); A.text(s.n, x + 40, y, cols[i]); A.text(s.s, x + 120, y, cols[i], 1, 'right');
  });
  if (Math.floor(S.t * 2) % 2) A.text('APPUIE SUR 1 OU 2', W / 2, H - 30, YEL, 1, 'center');
}
function drawEntry() {
  const e = S.entry;
  A.text('BRAVO JOUEUR ' + (e.p.id + 1) + ' !', W / 2, 50, YEL, 2, 'center');
  A.text('SCORE ' + e.p.score, W / 2, 80, '#fff', 1, 'center');
  A.text('ENTRE TES INITIALES', W / 2, 104, RED, 1, 'center');
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - 42 + i * 30, on = i === e.pos;
    if (!on || Math.floor(S.t * 4) % 2) A.text(CHARS[e.l[i]] === ' ' ? '_' : CHARS[e.l[i]], x, 126, on ? YEL : '#fff', 4);
    if (on) { ctx.fillStyle = YEL; ctx.fillRect(x, 158, 20, 2); }
  }
  A.text('HAUT/BAS: CHANGER', W / 2, 186, '#aaa', 1, 'center');
  A.text('BOUTON 1 / ENTREE: VALIDER', W / 2, 198, '#aaa', 1, 'center');
  A.text('BOUTON 2: RETOUR', W / 2, 210, '#aaa', 1, 'center');
  A.text('(OU TAPE LES LETTRES)', W / 2, 222, '#aaa', 1, 'center');
}
function draw() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  switch (S.state) {
    case 'title': drawTitle(); break;
    case 'table': drawTable(); break;
    case 'entry': drawEntry(); break;
    default:
      cfg.draw(world, ctx); if (!cfg.noHud) hud();
      S.msgs.forEach((m, i) => { band(H * .42 + i * 14 - 3, 13); A.text(m.s, W / 2, H * .42 + i * 14, YEL, 1, 'center'); });
      if (S.state === 'pause') {
        band(H / 2 - 30, 60); A.text('PAUSE', W / 2, H / 2 - 22, YEL, 2, 'center');
        A.text('P / START: REPRENDRE', W / 2, H / 2 + 2, '#fff', 1, 'center');
        A.text('ECHAP / SELECT: QUITTER', W / 2, H / 2 + 14, '#fff', 1, 'center');
      } else if (S.state === 'over') { band(H / 2 - 16, 32); A.text(S.overText || 'GAME OVER', W / 2, H / 2 - 10, S.overText && S.overText !== 'GAME OVER' ? YEL : RED, 3, 'center'); }
  }
  if (S.toast && S.toast.t > 0) { band(H - 22, 13); A.text(S.toast.s, W / 2, H - 19, CYAN, 1, 'center'); }
}
function toast(s) { S.toast = { s, t: 2 }; }

// ---------- Écran / CRT ----------
function applyOpts() {
  if (!VIEWS.includes(opts.view)) opts.view = 'ratio';
  document.body.classList.toggle('crt', !!opts.crt); store.set('arc_opts', opts);
  if (view.el) resize();
}
function toggleFS() {
  if (!document.fullscreenElement) { const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (r && r.catch) r.catch(() => {}); }
  else if (document.exitFullscreen) document.exitFullscreen();
}
// Modes d'affichage (touche V) :
//   ratio : le plus grand possible sans déformer (bandes noires si besoin)
//   plein : remplit tout l'écran (image étirée)
//   pixel : agrandissement entier (x2, x3...) pour des pixels parfaitement nets
// Touche O : rotation 90° pour un écran de borne monté à la verticale.
const VIEWS = ['ratio', 'plein', 'pixel'];
const VIEW_NAMES = { ratio: 'ADAPTE', plein: 'PLEIN ECRAN', pixel: 'PIXELS NETS' };
function resize() {
  const el = view.el = document.getElementById('arc-screen');
  const vw = document.documentElement.clientWidth || innerWidth, vh = document.documentElement.clientHeight || innerHeight;
  const rot = view.rot = !!opts.rot;
  // en rotation, la largeur du jeu s'étale sur la hauteur de l'écran
  let kx = (rot ? vh : vw) / W, ky = (rot ? vw : vh) / H;
  if (opts.view === 'pixel') { const k = Math.max(1, Math.floor(Math.min(kx, ky))); kx = ky = Math.min(kx, ky) < 1 ? Math.min(kx, ky) : k; }
  else if (opts.view !== 'plein') kx = ky = Math.min(kx, ky);
  view.kx = kx; view.ky = ky;
  el.style.width = W * kx + 'px'; el.style.height = H * ky + 'px';
  el.style.transform = 'translate(-50%,-50%)' + (rot ? ' rotate(90deg)' : '');
  el.style.setProperty('--l1', ky * .55 + 'px'); el.style.setProperty('--l2', ky + 'px');
}
const CSS = `html,body{margin:0;height:100%;background:#000;overflow:hidden}
#arc-wrap{position:fixed;inset:0;overflow:hidden}
#arc-screen{position:absolute;left:50%;top:50%;transform-origin:center}
#arc-screen canvas{display:block;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
body.vector #arc-screen canvas{image-rendering:auto}
#arc-crt{position:absolute;inset:0;pointer-events:none;display:none}
body.crt #arc-screen{border-radius:3%/2.5%;overflow:hidden;box-shadow:0 0 50px rgba(70,110,255,.22)}
body.crt #arc-screen canvas{filter:saturate(1.25) contrast(1.08) brightness(1.12)}
body.crt #arc-crt{display:block;animation:arcflick .1s infinite;background:
radial-gradient(ellipse at center,rgba(0,0,0,0) 58%,rgba(0,0,0,.6) 100%),
repeating-linear-gradient(to bottom,rgba(0,0,0,0) 0,rgba(0,0,0,0) var(--l1),rgba(0,0,0,.3) var(--l1),rgba(0,0,0,.3) var(--l2)),
repeating-linear-gradient(to right,rgba(255,0,0,.04) 0 1px,rgba(0,255,0,.04) 1px 2px,rgba(0,0,255,.04) 2px 3px)}
@keyframes arcflick{0%{opacity:.93}50%{opacity:1}100%{opacity:.96}}
body.playing{cursor:none}`;

A.run = function (c) {
  cfg = c; W = A.W = c.W || 224; H = A.H = c.H || 288; SC = c.vector ? 3 : 1;
  scores = store.get('arc_' + c.id + '_scores', null) ||
    [[10000,'ARK'],[8000,'VAU'],[6000,'DOH'],[5000,'TAI'],[4000,'PIX'],[3000,'CRT'],[2500,'ROM'],[2000,'CPU'],[1500,'BIT'],[1000,'RAM']]
      .map(([s, n]) => ({ n, s: Math.round(s * (c.scoreScale || 1)) }));
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  if (!document.querySelector('meta[name=viewport]')) document.head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=device-width,initial-scale=1">');
  document.body.insertAdjacentHTML('beforeend', '<div id="arc-wrap"><div id="arc-screen"><canvas></canvas><div id="arc-crt"></div></div></div>');
  if (c.vector) document.body.classList.add('vector');
  cv = document.querySelector('#arc-screen canvas'); cv.width = W * SC; cv.height = H * SC;
  ctx = A.ctx = cv.getContext('2d');
  mouse.x = W / 2; mouse.y = H / 2;
  addEventListener('resize', resize); document.addEventListener('fullscreenchange', resize); resize(); applyOpts();
  if (c.setup) c.setup();
  let last = performance.now();
  function frame(now) {
    const dt = A.clamp((now - last) / 1000, 0, 1 / 30); last = now;
    try { buildInputs(); update(dt); draw(); if (AC) endHums(); }
    catch (e) { console.error(e); }
    document.body.classList.toggle('playing', S.state === 'play' && !!cfg.mouse);
    pressed.clear(); typed.length = 0;
    mouse.clicked = mouse.rclicked = mouse.moved = false; mouse.dx = mouse.dy = mouse.wheel = 0;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};
// Pour les tests automatiques
A._debug = { S, begin, get world() { return world; }, step(dt = 1 / 60) { buildInputs(); update(dt); draw(); pressed.clear(); } };
})();
