/**
 * Turki's Battle Game - Souls-like Edition (3D)
 * Entry module. Same external contract as the previous 2D game:
 * binds #playGameBtn / #gameClose / #gameOverlay / ESC on import,
 * opens inside #gameModal, reuses the existing sound bank and the
 * existing lazy-load flow in script.js.
 *
 * All heavy dependencies (Three.js + game modules) live under ./game/
 * and are only fetched when the user opens the game.
 */
import { en as gameEn, ar as gameAr } from './translations/game.js?v=2';
import { createEngine } from './game/engine.js?v=1';
import { createKnight } from './game/knight.js?v=1';
import { ParticlePool, ScreenShake, HitStop, HUD, worldToScreen } from './game/effects.js?v=1';
import { Player, Boss } from './game/combat.js?v=1';

// ---------- Localization ----------
function getGameText(enText) {
    const lang = localStorage.getItem('lang') || 'en';
    if (lang === 'ar') return gameAr[enText] || enText;
    return gameEn[enText] || enText;
}

// ---------- Sound bank (reuses existing files) ----------
const sounds = {
    dodge: new Audio('Sounds/Game/jump.wav'),
    hit: new Audio('Sounds/Game/hitHurt.wav'),
    block: new Audio('Sounds/Game/block.wav'),
    gameOver: new Audio('Sounds/Game/gameoversound.wav'),
    windowOpen: new Audio('Sounds/Game/windowopen.wav'),
    countdown: new Audio('Sounds/Game/countdown.wav'),
};
let soundEnabled = localStorage.getItem('sound') !== 'false';

function applySoundVolumes() {
    const v = soundEnabled ? 1 : 0;
    sounds.dodge.volume = 0.3 * v;
    sounds.hit.volume = 0.4 * v;
    sounds.block.volume = 0.35 * v;
    sounds.gameOver.volume = 0.5 * v;
    sounds.windowOpen.volume = 0.4 * v;
    sounds.countdown.volume = 0.5 * v;
}
applySoundVolumes();
window.addEventListener('soundToggle', (e) => {
    soundEnabled = e.detail.enabled;
    applySoundVolumes();
});

function playSound(name, rate = 1) {
    if (!soundEnabled) return;
    const s = sounds[name];
    if (!s) return;
    s.pause();
    s.currentTime = 0;
    s.playbackRate = rate;
    s.play().catch(() => {});
}

// ---------- Game state ----------
const canvas = document.getElementById('gameCanvas');
let engine = null;
let player = null;
let boss = null;
let particles = null;
let shake = null;
let hitStop = null;
let hud = null;
let initialized = false;

let gameRunning = false;
let gameState = 'idle'; // idle|countdown|playing|over|win
let countdownValue = 3;
let countdownTimer = 0;
let lastFrameTime = 0;
let accumulator = 0;
const TIME_STEP = 1000 / 60;
const MAX_ACCUMULATOR = TIME_STEP * 5;

// ---------- Input ----------
const input = {
    keys: {},
    moveVec: { x: 0, z: 0, length() { return Math.hypot(this.x, this.z); } },
    joyX: 0, joyY: 0,
    sprint: false,
    locked: true,
    blockHeld: false,
};
const _camFwd = { x: 0, z: -1 };
const _camRight = { x: 1, z: 0 };
// Reusable roll-direction arg (must look like a Vector3 for combat.js)
const _rollDir = {
    x: 0, y: 0, z: 0,
    lengthSq() { return this.x * this.x + this.z * this.z; },
};

function currentRollDir() {
    _rollDir.x = input.moveVec.x;
    _rollDir.z = input.moveVec.z;
    return _rollDir;
}

function updateMoveVec() {
    let ix = 0, iy = 0;
    if (input.keys['w'] || input.keys['arrowup']) iy += 1;
    if (input.keys['s'] || input.keys['arrowdown']) iy -= 1;
    if (input.keys['a'] || input.keys['arrowleft']) ix -= 1;
    if (input.keys['d'] || input.keys['arrowright']) ix += 1;
    ix += input.joyX;
    iy -= input.joyY; // joystick up = forward

    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }

    // Camera-relative
    input.moveVec.x = _camRight.x * ix + _camFwd.x * iy;
    input.moveVec.z = _camRight.z * ix + _camFwd.z * iy;
}

// ---------- Initialization (deferred until first open) ----------
function ensureInit() {
    if (initialized) return;
    const isMobile = isMobileDevice();
    engine = createEngine(canvas, isMobile);

    const playerRig = createKnight({ color: 0x4ade80, darkColor: 0x14201a, scale: 1 });
    const bossRig = createKnight({ color: 0xef4444, darkColor: 0x241416, scale: 1.28 });
    engine.scene.add(playerRig.root, bossRig.root);

    player = new Player(playerRig);
    boss = new Boss(bossRig);

    particles = new ParticlePool(engine.scene, isMobile ? 90 : 140);
    shake = new ScreenShake();
    hitStop = new HitStop();
    hud = new HUD(document.querySelector('.game-container'), getGameText);
    hud.setBossName(getGameText('DARK KNIGHT'));

    window.addEventListener('resize', positionHudOverlay);
    initialized = true;
}

/** Pin the HUD overlay to the canvas area (below the modal header). */
function positionHudOverlay() {
    if (!hud || !canvas) return;
    hud.root.style.top = canvas.offsetTop + 'px';
    hud.root.style.height = canvas.offsetHeight + 'px';
}

// ---------- Combat context (effects + hud + sound wiring) ----------
const ctx = {
    onPlayerHit(res, atk, pl, bs) {
        const hitY = pl.pos.y + 1.2;
        if (res === 'dodged') {
            // Stylish: faint afterimage dust, no damage
            particles.spawn(pl.pos.x, hitY - 0.5, pl.pos.z, 4, { color: 0x9fdfb8, speed: 1, life: 0.3, gravity: 2 });
            return;
        }
        if (res === 'parried') {
            playSound('block', 1.5);
            hitStop.freeze(140);
            shake.add(0.35);
            hud.flash('rgba(74, 222, 128, 0.28)', 220);
            hud.showCenter(getGameText('PARRY!'), { cls: 'good', duration: 700 });
            particles.spawn(pl.pos.x, hitY, pl.pos.z, 18, { color: 0x4ade80, speed: 4, life: 0.5 });
            return;
        }
        if (res === 'blocked') {
            playSound('block', 1);
            shake.add(0.12);
            particles.spawn(pl.pos.x, hitY, pl.pos.z, 8, { color: 0xfbbf24, speed: 2.5, life: 0.35 });
            return;
        }
        if (res === 'guardbroken') {
            playSound('block', 0.7);
            hitStop.freeze(160);
            shake.add(0.45);
            hud.flash('rgba(251, 191, 36, 0.3)', 260);
            hud.showCenter(getGameText('GUARD BREAK!'), { cls: 'bad', duration: 900 });
            return;
        }
        // Clean hit on player
        playSound('hit', 1);
        hitStop.freeze(atk.damage >= 24 ? 110 : 70);
        shake.add(Math.min(0.6, 0.2 + atk.damage * 0.012));
        hud.flash('rgba(239, 68, 68, 0.3)', 240);
        particles.spawn(pl.pos.x, hitY, pl.pos.z, 12, { color: 0xef4444, speed: 3, life: 0.5 });
        const s = worldToScreen({ x: pl.pos.x, y: hitY + 0.4, z: pl.pos.z }, engine.camera, canvas);
        if (!s.behind) hud.damageNumber('-' + atk.damage, s.x, s.y, 'bad');
    },

    onBossHit(res, atk, bs, pl) {
        const hitY = bs.pos.y + 1.5;
        if (res === 'blocked') {
            playSound('block', 1.1);
            shake.add(0.08);
            particles.spawn(bs.pos.x, hitY, bs.pos.z, 6, { color: 0xfbbf24, speed: 2, life: 0.3 });
            return;
        }
        const rip = !!atk.riposte;
        playSound('hit', rip ? 0.6 : 0.85);
        hitStop.freeze(rip ? 200 : 60);
        shake.add(rip ? 0.55 : 0.15);
        particles.spawn(bs.pos.x, hitY, bs.pos.z, rip ? 26 : 10, {
            color: rip ? 0xfde047 : 0xffd0a0, speed: rip ? 5 : 3, life: 0.5,
        });
        if (rip) {
            hud.flash('rgba(253, 224, 71, 0.25)', 260);
            hud.showCenter(getGameText('RIPOSTE!'), { cls: 'good', duration: 800 });
        }
        const s = worldToScreen({ x: bs.pos.x, y: hitY + 0.4, z: bs.pos.z }, engine.camera, canvas);
        if (!s.behind) hud.damageNumber(String(atk.damage), s.x, s.y, rip ? 'crit' : '');
        if (bs.dead) onBossDefeated();
    },

    onPlayerHealed(pl) {
        particles.spawn(pl.pos.x, pl.pos.y + 1, pl.pos.z, 14, { color: 0x4ade80, speed: 1.5, up: 2.5, life: 0.7, gravity: 1.5 });
        playSound('countdown', 0.9);
    },

    onBossRage(bs) {
        hud.showCenter(getGameText('ENRAGED!'), { cls: 'bad', duration: 1200 });
        hud.flash('rgba(239, 68, 68, 0.3)', 350);
        shake.add(0.5);
        playSound('hit', 0.5);
        particles.spawn(bs.pos.x, bs.pos.y + 1.5, bs.pos.z, 30, { color: 0xef4444, speed: 4.5, life: 0.8 });
    },
};

function onBossDefeated() {
    gameState = 'win';
    input.locked = false;
    player.state = 'victory';
    player.stateTime = 0;
    hitStop.freeze(300);
    shake.add(0.6);
    playSound('windowOpen', 0.9);
    hud.showCenter(getGameText('VICTORY!') + `<div class="hud-sub">${getGameText('Press R to Play Again')}</div>`, { cls: 'good' });
}

function onPlayerDefeated() {
    gameState = 'over';
    playSound('gameOver', 1);
    hud.flash('rgba(0, 0, 0, 0.55)', 900);
    hud.showCenter(getGameText('YOU DIED') + `<div class="hud-sub">${getGameText('Press R to Restart')}</div>`, { cls: 'bad' });
}

// ---------- Game flow ----------
function resetGame(skipCountdown = false) {
    player.reset();
    boss.reset();
    input.locked = true;
    hud.setBossName(getGameText('DARK KNIGHT'));
    hud.showBossBar(true);
    hud.setBars(1, 1, player.estus, player.estusMax, 1);
    hud.showCenter('');
    if (skipCountdown) {
        gameState = 'playing';
        hud.showCenter(getGameText('GO!'), { cls: 'good', duration: 600 });
        playSound('countdown', 1.3);
    } else {
        gameState = 'countdown';
        countdownValue = 3;
        countdownTimer = 0;
    }
}

function openGame() {
    ensureInit();
    document.getElementById('gameModal').classList.add('active');
    playSound('windowOpen', 1);
    engine.resize();
    positionHudOverlay();
    resetGame();
    gameRunning = true;
    lastFrameTime = 0;
    accumulator = 0;
    requestAnimationFrame(gameLoop);
}

function closeGame() {
    gameRunning = false;
    gameState = 'idle';
    document.getElementById('gameModal').classList.remove('active');
}

// ---------- Main loop (fixed timestep logic, per-frame render) ----------
function gameLoop(timestamp) {
    if (!gameRunning) return;
    requestAnimationFrame(gameLoop);

    if (!lastFrameTime) lastFrameTime = timestamp;
    let frameTime = Math.min(timestamp - lastFrameTime, MAX_ACCUMULATOR);
    lastFrameTime = timestamp;
    accumulator += frameTime;

    const dtReal = frameTime / 1000;
    const frozen = hitStop.tick(dtReal);

    while (accumulator >= TIME_STEP) {
        accumulator -= TIME_STEP;
        if (!frozen) tick(TIME_STEP / 1000);
    }

    // Render-side updates (always, even during hit-stop)
    shake.apply(dtReal, engine.camRig);
    particles.update(dtReal);
    engine.updateEnvironment(dtReal);
    updateCameraBasis();
    engine.updateCamera(dtReal, player.pos, player.heading, boss.pos, input.locked && !boss.dead);
    engine.render();
}

function tick(dt) {
    if (gameState === 'countdown') {
        countdownTimer += dt;
        if (countdownTimer >= 1) {
            countdownTimer = 0;
            if (countdownValue > 1) {
                countdownValue--;
                hud.showCenter(String(countdownValue), { cls: 'count' });
                playSound('countdown', 1);
            } else {
                gameState = 'playing';
                hud.showCenter(getGameText('GO!'), { cls: 'good', duration: 600 });
                playSound('countdown', 1.4);
            }
        }
        return;
    }
    if (gameState !== 'playing' && gameState !== 'over' && gameState !== 'win') return;

    updateMoveVec();
    player.update(dt, input, boss, ctx);
    boss.update(dt, player, ctx);

    hud.setBars(player.hp / player.maxHp, player.stamina / player.maxStamina, player.estus, player.estusMax, boss.hp / boss.maxHp);

    if (player.dead && gameState === 'playing') onPlayerDefeated();
}

/** Derive camera basis vectors for camera-relative movement. */
function updateCameraBasis() {
    const e = engine.camera.matrixWorld.elements;
    // Camera forward = -Z column, projected to XZ
    _camFwd.x = -e[8]; _camFwd.z = -e[10];
    const l = Math.hypot(_camFwd.x, _camFwd.z) || 1;
    _camFwd.x /= l; _camFwd.z /= l;
    _camRight.x = -_camFwd.z;
    _camRight.z = _camFwd.x;
}

// ---------- Keyboard input ----------
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;
    const k = e.key.toLowerCase();
    input.keys[k] = true;
    if (k === 'shift') input.sprint = true;

    if (gameState === 'playing' && !e.repeat) {
        if (k === 'j') player.tryAttack();
        if (k === ' ') { e.preventDefault(); player.tryRoll(currentRollDir(), input.locked); playSound('dodge', 1); }
        if (k === 'e') player.tryHeal(ctx);
        if (k === 'q') input.locked = !input.locked;
        if (k === 'k') player.setBlock(true);
    }
    if (k === 'k' && !e.repeat) input.blockHeld = true;
    if ((k === 'escape') && gameRunning) closeGame();
    if (k === 'r' && (gameState === 'over' || gameState === 'win')) { hud.showCenter(''); resetGame(true); }
});

document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    input.keys[k] = false;
    if (k === 'shift') input.sprint = false;
    if (k === 'k') {
        input.blockHeld = false;
        if (player) player.setBlock(false);
    }
});

// Mouse: LMB attack, RMB block (PC only, when modal open)
canvas.addEventListener('mousedown', (e) => {
    if (!gameRunning || gameState !== 'playing') return;
    if (e.button === 0) player.tryAttack();
    if (e.button === 2) { input.blockHeld = true; player.setBlock(true); }
});
document.addEventListener('mouseup', (e) => {
    if (e.button === 2 && player) { input.blockHeld = false; player.setBlock(false); }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- Mobile controls ----------
const mobileControls = document.getElementById('mobileControls');
let forceMobileControls = false;

function isMobileDevice() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    return (isTouch && isSmallScreen) || isMobileUA;
}

function updateMobileControlsVisibility() {
    if (!mobileControls) return;
    const shouldShow = isMobileDevice() || forceMobileControls;
    mobileControls.classList.toggle('active', shouldShow);
    const toggleBtn = document.getElementById('controlToggle');
    if (toggleBtn) {
        toggleBtn.classList.toggle('active', forceMobileControls || isMobileDevice());
        const txt = toggleBtn.querySelector('.toggle-text');
        if (txt) txt.textContent = (forceMobileControls || isMobileDevice()) ? getGameText('Mobile') : getGameText('Desktop');
    }
}

const controlToggle = document.getElementById('controlToggle');
if (controlToggle) {
    controlToggle.addEventListener('click', () => {
        forceMobileControls = !forceMobileControls;
        updateMobileControlsVisibility();
    });
}
updateMobileControlsVisibility();
window.addEventListener('resize', updateMobileControlsVisibility);

// --- Virtual joystick ---
const joyZone = document.getElementById('mobileJoystick');
const joyKnob = document.getElementById('joystickKnob');
let joyPointer = null;

function setKnob(dx, dy) {
    if (joyKnob) joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

if (joyZone) {
    const JOY_R = 42;
    const onMove = (e) => {
        if (joyPointer !== e.pointerId) return;
        const rect = joyZone.getBoundingClientRect();
        let dx = e.clientX - (rect.left + rect.width / 2);
        let dy = e.clientY - (rect.top + rect.height / 2);
        const d = Math.hypot(dx, dy);
        if (d > JOY_R) { dx = dx / d * JOY_R; dy = dy / d * JOY_R; }
        setKnob(dx, dy);
        input.joyX = dx / JOY_R;
        input.joyY = dy / JOY_R;
    };
    const onEnd = (e) => {
        if (joyPointer !== e.pointerId) return;
        joyPointer = null;
        input.joyX = 0; input.joyY = 0;
        setKnob(0, 0);
    };
    joyZone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        joyPointer = e.pointerId;
        joyZone.setPointerCapture(e.pointerId);
        onMove(e);
    });
    joyZone.addEventListener('pointermove', onMove);
    joyZone.addEventListener('pointerup', onEnd);
    joyZone.addEventListener('pointercancel', onEnd);
}

// --- Mobile action buttons ---
function bindHoldButton(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.classList.add('active'); onDown(); });
    const release = (e) => { el.classList.remove('active'); if (onUp) onUp(); };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
}

bindHoldButton('btnAttack', () => { if (gameState === 'playing') player.tryAttack(); });
bindHoldButton('btnRoll', () => {
    if (gameState !== 'playing') return;
    player.tryRoll(currentRollDir(), input.locked);
    playSound('dodge', 1);
});
bindHoldButton('btnBlock', () => {
    if (gameState !== 'playing') return;
    input.blockHeld = true;
    player.setBlock(true);
}, () => {
    input.blockHeld = false;
    if (player) player.setBlock(false);
});
bindHoldButton('btnHeal', () => { if (gameState === 'playing') player.tryHeal(ctx); });
bindHoldButton('btnLock', () => { input.locked = !input.locked; });

const mobileExit = document.getElementById('mobileExit');
const mobileRestart = document.getElementById('mobileRestart');
if (mobileExit) mobileExit.addEventListener('click', () => closeGame());
if (mobileRestart) mobileRestart.addEventListener('click', () => {
    if (gameState === 'over' || gameState === 'win' || gameState === 'playing') { hud.showCenter(''); resetGame(true); }
});

// Pause when the tab loses focus
document.addEventListener('visibilitychange', () => {
    if (document.hidden) lastFrameTime = 0;
});

// ---------- External contract (unchanged from the 2D game) ----------
document.getElementById('playGameBtn').addEventListener('click', openGame);
document.getElementById('gameClose').addEventListener('click', closeGame);
document.getElementById('gameOverlay').addEventListener('click', closeGame);
