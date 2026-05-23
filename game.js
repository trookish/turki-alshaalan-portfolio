// ========================================
// Browser-Based Minigame: Turki's Battle
// Game Juice / Game Feel Edition
// ========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Sound Effects
const sounds = {
    jump: new Audio('Sounds/Game/jump.wav'),
    hit: new Audio('Sounds/Game/hitHurt.wav'),
    block: new Audio('Sounds/Game/block.wav'),
    gameOver: new Audio('Sounds/Game/gameoversound.wav'),
    windowOpen: new Audio('Sounds/Game/windowopen.wav'),
    countdown: new Audio('Sounds/Game/countdown.wav')
};

sounds.jump.volume = 0.3;
sounds.hit.volume = 0.4;
sounds.block.volume = 0.3;
sounds.gameOver.volume = 0.5;
sounds.windowOpen.volume = 0.4;
sounds.countdown.volume = 0.5;

function playSound(soundName) {
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(() => { });
    }
}

// Game Constants
const GRAVITY = 0.5;
const FRICTION = 0.9;
const GROUND_Y = 420;

const SHIELD_MAX = 100;
const SHIELD_BLOCK_COST = 12;
const SHIELD_REGEN_RATE = 0.25;
const SHIELD_REGEN_DELAY = 120;
const SHIELD_BREAK_RECOVERY = 180;

const TARGET_FPS = 60;
const TIME_STEP = 1000 / TARGET_FPS;
const MAX_ACCUMULATOR = TIME_STEP * 5;

// Game State
let gameRunning = false;
let gameState = 'playing';
let countdownValue = 3;
let countdownTimer = 0;
let keys = {};

let lastFrameTime = 0;
let accumulator = 0;

// Base Visual Effects
let screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };
let floatingTexts = [];
let backgroundStars = [];
let bgOffset = 0;

// ========================================
// GAME JUICE STATE
// ========================================
let hitStop = 0;                        // Freeze-frame on impact
let screenFlash = { alpha: 0, color: '#ffffff', decay: 0.87 };
let chromaticAb = { intensity: 0, decay: 0.84 };
let healthBarFlash = { player: 0, boss: 0 };
let swordTrails = [];                   // Sword swing trail points
let wasPlayerOnGround = true;
let wasBossOnGround = true;
let victoryParticlesSpawned = false;

// Initialize background stars
function initStars() {
    backgroundStars = [];
    for (let i = 0; i < 60; i++) {
        backgroundStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.3 + 0.1,
            brightness: Math.random(),
            twinkleSpeed: Math.random() * 0.05 + 0.01
        });
    }
}
initStars();

// Entities
let player = {
    x: 100, y: GROUND_Y - 80, width: 40, height: 60,
    vx: 0, vy: 0, speed: 4, jumpForce: -12, onGround: false,
    health: 120, maxHealth: 120, facing: 1,
    attacking: false, attackTimer: 0, attackCooldown: 0,
    blocking: false, blockTimer: 0, hit: false, hitTimer: 0,
    color: '#4ade80', shield: SHIELD_MAX, maxShield: SHIELD_MAX,
    shieldBroken: false, shieldBreakTimer: 0, shieldRegenDelay: 0,
    scaleX: 1, scaleY: 1, targetScaleX: 1, targetScaleY: 1
};

let boss = {
    x: 600, y: GROUND_Y - 80, width: 50, height: 70,
    vx: 0, vy: 0, speed: 2.5,
    health: 150, maxHealth: 150, facing: -1,
    attacking: false, attackTimer: 0, attackCooldown: 0,
    blockTimer: 0, hit: false, hitTimer: 0,
    state: 'idle', stateTimer: 0, color: '#ef4444', pattern: 'normal',
    shield: SHIELD_MAX, maxShield: SHIELD_MAX,
    shieldBroken: false, shieldBreakTimer: 0, shieldRegenDelay: 0,
    scaleX: 1, scaleY: 1, targetScaleX: 1, targetScaleY: 1
};

// Platforms
const platforms = [
    { x: 150, y: 320, width: 120, height: 20 },
    { x: 400, y: 280, width: 120, height: 20 },
    { x: 600, y: 340, width: 100, height: 20 },
    { x: 300, y: 200, width: 100, height: 20 },
    { x: 550, y: 180, width: 100, height: 20 }
];

let particles = [];

// Input Handling
document.addEventListener('keydown', (e) => {
    if (gameRunning) {
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
        }
    }
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape') closeGame();
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mobile Touch Controls
const mobileControls = document.getElementById('mobileControls');
const mobileLeft = document.getElementById('mobileLeft');
const mobileRight = document.getElementById('mobileRight');
const mobileJump = document.getElementById('mobileJump');
const mobileAttack = document.getElementById('mobileAttack');
const mobileShield = document.getElementById('mobileShield');

function isMobileDevice() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    return (isTouch && isSmallScreen) || isMobileUA;
}

let soundEnabled = localStorage.getItem('sound') !== 'false';

window.addEventListener('soundToggle', (e) => {
    soundEnabled = e.detail.enabled;
    updateSoundState();
});

updateSoundState();

function updateSoundState() {
    if (!soundEnabled) {
        Object.values(sounds).forEach(sound => { sound.volume = 0; });
    } else {
        sounds.jump.volume = 0.3;
        sounds.hit.volume = 0.4;
        sounds.block.volume = 0.3;
        sounds.gameOver.volume = 0.5;
        sounds.windowOpen.volume = 0.4;
        sounds.countdown.volume = 0.5;
    }
}

let forceMobileControls = false;

function updateMobileControlsVisibility() {
    if (mobileControls) {
        const shouldShow = isMobileDevice() || forceMobileControls;
        if (shouldShow) {
            mobileControls.classList.add('active');
        } else {
            mobileControls.classList.remove('active');
        }
        const toggleBtn = document.getElementById('controlToggle');
        if (toggleBtn) {
            if (forceMobileControls) {
                toggleBtn.classList.add('active');
                toggleBtn.querySelector('.toggle-text').textContent = 'Mobile';
            } else if (isMobileDevice()) {
                toggleBtn.classList.add('active');
                toggleBtn.querySelector('.toggle-text').textContent = 'Mobile';
            } else {
                toggleBtn.classList.remove('active');
                toggleBtn.querySelector('.toggle-text').textContent = 'Desktop';
            }
        }
    }
}

const controlToggle = document.getElementById('controlToggle');
if (controlToggle) {
    controlToggle.addEventListener('click', () => {
        forceMobileControls = !forceMobileControls;
        updateMobileControlsVisibility();
    });
    controlToggle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        forceMobileControls = !forceMobileControls;
        updateMobileControlsVisibility();
    });
}

updateMobileControlsVisibility();
window.addEventListener('resize', updateMobileControlsVisibility);

function addTouchHandler(element, keyName, keyValue = true) {
    if (!element) return;
    const activateKey = () => { keys[keyName] = keyValue; element.classList.add('active'); };
    const deactivateKey = () => { keys[keyName] = false; element.classList.remove('active'); };
    element.addEventListener('touchstart', (e) => { e.preventDefault(); activateKey(); });
    element.addEventListener('touchend', (e) => { e.preventDefault(); deactivateKey(); });
    element.addEventListener('touchcancel', (e) => { e.preventDefault(); deactivateKey(); });
    element.addEventListener('mousedown', () => { activateKey(); });
    element.addEventListener('mouseup', () => { deactivateKey(); });
    element.addEventListener('mouseleave', () => { deactivateKey(); });
}

addTouchHandler(mobileLeft, 'a', true);
addTouchHandler(mobileRight, 'd', true);
addTouchHandler(mobileJump, 'w', true);
addTouchHandler(mobileJump, ' ', true);
addTouchHandler(mobileAttack, 'j', true);
addTouchHandler(mobileShield, 'k', true);

const mobileExit = document.getElementById('mobileExit');
const mobileRestart = document.getElementById('mobileRestart');

if (mobileExit) {
    mobileExit.addEventListener('click', () => { closeGame(); });
    mobileExit.addEventListener('touchstart', (e) => { e.preventDefault(); closeGame(); });
}
if (mobileRestart) {
    mobileRestart.addEventListener('click', () => { resetGame(); });
    mobileRestart.addEventListener('touchstart', (e) => { e.preventDefault(); resetGame(); });
}

// Game Functions
function openGame() {
    document.getElementById('gameModal').classList.add('active');
    playSound('windowOpen');
    resetGame();
    gameRunning = true;
    lastFrameTime = 0;
    accumulator = 0;
    requestAnimationFrame(gameLoop);
}

function closeGame() {
    gameRunning = false;
    document.getElementById('gameModal').classList.remove('active');
}

function resetGame() {
    player = {
        x: 100, y: GROUND_Y - 60, width: 40, height: 60,
        vx: 0, vy: 0, speed: 5, jumpForce: -14, onGround: false,
        health: 120, maxHealth: 120, facing: 1,
        attacking: false, attackTimer: 0, attackCooldown: 0,
        blocking: false, blockTimer: 0, hit: false, hitTimer: 0,
        color: '#4ade80', shield: SHIELD_MAX, maxShield: SHIELD_MAX,
        shieldBroken: false, shieldBreakTimer: 0, shieldRegenDelay: 0,
        scaleX: 1, scaleY: 1, targetScaleX: 1, targetScaleY: 1
    };

    boss = {
        x: 600, y: GROUND_Y - 70, width: 50, height: 70,
        vx: 0, vy: 0, speed: 3,
        health: 150, maxHealth: 150, facing: -1,
        attacking: false, attackTimer: 0, attackCooldown: 0,
        blockTimer: 0, hit: false, hitTimer: 0,
        state: 'idle', stateTimer: 0, color: '#ef4444', pattern: 'normal',
        shield: SHIELD_MAX, maxShield: SHIELD_MAX,
        shieldBroken: false, shieldBreakTimer: 0, shieldRegenDelay: 0,
        scaleX: 1, scaleY: 1, targetScaleX: 1, targetScaleY: 1,
        ai: {
            reactionTimer: 0, reactionDelay: 10, comboCount: 0, maxCombo: 2,
            phase: 1, lastPlayerX: 100, lastPlayerY: GROUND_Y - 60,
            playerVelocityX: 0, playerVelocityY: 0,
            attackPattern: 'normal', patternTimer: 0, feintReady: false,
            zonePreference: 'mid', consecutiveBlocks: 0,
            lastAction: 'none', actionCooldown: 0,
            targetPlatform: null, jumpCommitTimer: 0,
            antiAirWindow: 0, baitTimer: 0, rageMode: false
        }
    };

    particles = [];
    floatingTexts = [];
    screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };

    // Reset juice state
    hitStop = 0;
    screenFlash = { alpha: 0, color: '#ffffff', decay: 0.87 };
    chromaticAb = { intensity: 0, decay: 0.84 };
    healthBarFlash = { player: 0, boss: 0 };
    swordTrails = [];
    wasPlayerOnGround = true;
    wasBossOnGround = true;
    victoryParticlesSpawned = false;

    gameState = 'countdown';
    countdownValue = 3;
    countdownTimer = 0;
    lastFrameTime = 0;
    accumulator = 0;
    playSound('countdown');
}

// Collision between player and boss
function handleEntityCollision() {
    if (player.x < boss.x + boss.width &&
        player.x + player.width > boss.x &&
        player.y < boss.y + boss.height &&
        player.y + player.height > boss.y) {
        const overlapX = Math.min(player.x + player.width - boss.x, boss.x + boss.width - player.x);
        const overlapY = Math.min(player.y + player.height - boss.y, boss.y + boss.height - player.y);
        if (overlapX < overlapY) {
            const pushDir = (player.x + player.width / 2) < (boss.x + boss.width / 2) ? -1 : 1;
            player.x += pushDir * overlapX * 0.5;
            boss.x -= pushDir * overlapX * 0.5;
        } else {
            const pushDir = (player.y + player.height / 2) < (boss.y + boss.height / 2) ? -1 : 1;
            if (pushDir < 0) {
                player.y = boss.y - player.height - 1;
                player.vy = 0;
                player.onGround = true;
            } else {
                boss.y = player.y - boss.height - 1;
                boss.vy = 0;
                boss.onGround = true;
            }
        }
    }
}

// Physics
function applyPhysics(entity) {
    entity.vy += GRAVITY;
    entity.x += entity.vx;
    entity.y += entity.vy;
    entity.vx *= FRICTION;
    if (entity.y + entity.height > GROUND_Y) {
        entity.y = GROUND_Y - entity.height;
        entity.vy = 0;
        entity.onGround = true;
    } else {
        entity.onGround = false;
    }
    platforms.forEach(plat => {
        if (entity.vy > 0 &&
            entity.x + entity.width > plat.x &&
            entity.x < plat.x + plat.width &&
            entity.y + entity.height > plat.y &&
            entity.y + entity.height < plat.y + plat.height + entity.vy) {
            entity.y = plat.y - entity.height;
            entity.vy = 0;
            entity.onGround = true;
        }
    });
    if (entity.x < 0) entity.x = 0;
    if (entity.x + entity.width > canvas.width) entity.x = canvas.width - entity.width;
}

function checkAttackHit(attacker, target, range) {
    const attackX = attacker.facing === 1 ? attacker.x + attacker.width : attacker.x - range;
    return attackX < target.x + target.width &&
        attackX + range > target.x &&
        Math.abs(attacker.y - target.y) < 50;
}

// ========================================
// PARTICLE SYSTEM – Enhanced
// ========================================
function createParticle(x, y, color, count = 5, type = 'spark') {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.8;
        const speed = type === 'dust' ? Math.random() * 2.5 + 0.5 : Math.random() * 7 + 2;
        particles.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            vx: Math.cos(angle) * speed,
            vy: type === 'dust' ? -Math.random() * 1.5 : Math.sin(angle) * speed,
            life: type === 'dust' ? 18 + Math.random() * 12 : 22 + Math.random() * 20,
            maxLife: type === 'dust' ? 30 : 42,
            color: color,
            size: type === 'dust' ? Math.random() * 7 + 3 : Math.random() * 4 + 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * (type === 'dust' ? 0.06 : 0.28),
            gravity: type === 'dust' ? 0.04 : 0.16,
            type: type
        });
    }
}

function createDust(x, y, dirBias, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 24,
            y: y - Math.random() * 4,
            vx: (Math.random() - 0.5) * 3.5 + dirBias,
            vy: -Math.random() * 1.8 - 0.2,
            life: 16 + Math.random() * 14,
            maxLife: 30,
            color: `rgba(${155 + (Math.random() * 50 | 0)},${135 + (Math.random() * 30 | 0)},${90 + (Math.random() * 30 | 0)},0.75)`,
            size: Math.random() * 9 + 4,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.07,
            gravity: 0.035,
            type: 'dust'
        });
    }
}

function createSlashEffect(x, y, facing, color) {
    for (let i = 0; i < 8; i++) {
        const baseAngle = facing === 1 ? -0.6 : Math.PI + 0.6;
        const angle = baseAngle + (Math.random() - 0.5) * 1.4;
        const speed = Math.random() * 5 + 3;
        particles.push({
            x: x + facing * 20 + (Math.random() - 0.5) * 14,
            y: y + (Math.random() - 0.5) * 14,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,
            life: 10 + Math.random() * 8,
            maxLife: 18,
            color: color,
            size: Math.random() * 3 + 1.5,
            rotation: angle,
            rotationSpeed: 0,
            gravity: 0.08,
            type: 'slash'
        });
    }
}

// ========================================
// GAME JUICE HELPERS
// ========================================
function triggerHitStop(frames) {
    hitStop = Math.max(hitStop, frames);
}

function triggerScreenFlash(color, alpha) {
    screenFlash.color = color || '#ffffff';
    screenFlash.alpha = Math.max(screenFlash.alpha, alpha || 0.55);
}

function triggerChromatic(intensity) {
    chromaticAb.intensity = Math.max(chromaticAb.intensity, intensity);
}

function triggerScreenShake(intensity) {
    screenShake.intensity = Math.max(screenShake.intensity, intensity);
}

function lerpSquash(entity) {
    const lerp = 0.16;
    entity.scaleX += (entity.targetScaleX - entity.scaleX) * lerp;
    entity.scaleY += (entity.targetScaleY - entity.scaleY) * lerp;
    // Spring back toward 1,1
    entity.targetScaleX += (1 - entity.targetScaleX) * 0.12;
    entity.targetScaleY += (1 - entity.targetScaleY) * 0.12;
}

function createFloatingText(x, y, text, color, big) {
    floatingTexts.push({
        x: x, y: y, text: text, color: color,
        life: 55, maxLife: 55,
        vy: -2.2,
        scale: 0.25,
        targetScale: big ? 2.0 : 1.3,
        big: !!big
    });
}

// ========================================
// UPDATE FUNCTIONS
// ========================================
function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.95;
        p.rotation += p.rotationSpeed;
        p.life--;
        return p.life > 0;
    });
}

function updateFloatingTexts() {
    floatingTexts = floatingTexts.filter(t => {
        t.y += t.vy;
        t.vy *= 0.91;  // decelerate drift
        t.life--;
        // Scale pop animation
        t.scale += (t.targetScale - t.scale) * 0.22;
        return t.life > 0;
    });
}

function updateSwordTrails() {
    swordTrails = swordTrails.filter(t => {
        t.life--;
        return t.life > 0;
    });
}

function updateScreenShake() {
    if (screenShake.intensity > 0.5) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.intensity *= screenShake.decay;
    } else {
        screenShake.x = 0;
        screenShake.y = 0;
        screenShake.intensity = 0;
    }
}

function updateJuiceState() {
    // Decay screen flash
    screenFlash.alpha *= screenFlash.decay;
    if (screenFlash.alpha < 0.01) screenFlash.alpha = 0;

    // Decay chromatic aberration
    chromaticAb.intensity *= chromaticAb.decay;
    if (chromaticAb.intensity < 0.02) chromaticAb.intensity = 0;

    // Decay health bar flashes
    if (healthBarFlash.player > 0) healthBarFlash.player--;
    if (healthBarFlash.boss > 0) healthBarFlash.boss--;

    // Sword trail decay
    updateSwordTrails();

    // Squash & stretch lerp
    lerpSquash(player);
    lerpSquash(boss);
}

function updateBackground() {
    bgOffset += 0.2;
    backgroundStars.forEach(star => {
        star.brightness += star.twinkleSpeed;
        if (star.brightness > 1 || star.brightness < 0.2) star.twinkleSpeed *= -1;
    });
}

// ========================================
// PLAYER UPDATE
// ========================================
function updatePlayer() {
    const wasOnGround = player.onGround;

    if (keys['a'] || keys['arrowleft']) { player.vx = -player.speed; player.facing = -1; }
    if (keys['d'] || keys['arrowright']) { player.vx = player.speed; player.facing = 1; }

    // Jump
    if ((keys['w'] || keys[' '] || keys['arrowup']) && player.onGround) {
        player.vy = player.jumpForce;
        player.onGround = false;
        playSound('jump');
        // JUICE: Jump squash/stretch
        player.targetScaleX = 0.70;
        player.targetScaleY = 1.38;
        createDust(player.x + player.width / 2, player.y + player.height, -player.vx * 0.12, 8);
    }

    // Attack
    if (keys['j'] && !player.attacking && !player.blocking && player.attackCooldown <= 0) {
        player.attacking = true;
        player.attackTimer = 20;
        player.attackCooldown = 25;
        // JUICE: Attack lunge stretch
        player.targetScaleX = 1.28;
        player.targetScaleY = 0.86;

        if (checkAttackHit(player, boss, 50)) {
            if (boss.blocking && boss.shield > 0) {
                boss.shield -= SHIELD_BLOCK_COST;
                createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#fbbf24', 14);
                createSlashEffect(boss.x, boss.y + boss.height / 2, player.facing, '#fbbf24');
                boss.vx = player.facing * 8;
                playSound('block');
                if (boss.shield <= 0) {
                    boss.shield = 0;
                    boss.shieldBroken = true;
                    boss.shieldBreakTimer = SHIELD_BREAK_RECOVERY;
                    boss.shieldRegenDelay = SHIELD_REGEN_DELAY;
                    boss.blocking = false;
                    createFloatingText(boss.x + boss.width / 2, boss.y - 22, 'SHIELD BREAK!', '#3b82f6', true);
                    triggerScreenShake(8);
                    triggerHitStop(7);
                    triggerScreenFlash('#3b82f6', 0.38);
                    triggerChromatic(0.85);
                } else {
                    createFloatingText(boss.x + boss.width / 2, boss.y - 10, 'BLOCKED', '#fbbf24', false);
                    triggerHitStop(3);
                    triggerScreenShake(3);
                }
            } else {
                // Direct hit!
                boss.health -= 6;
                playSound('hit');
                boss.hit = true;
                boss.hitTimer = 15;
                healthBarFlash.boss = 22;
                // JUICE: Boss squash on hit
                boss.targetScaleX = 1.32;
                boss.targetScaleY = 0.72;
                createParticle(boss.x + boss.width / 2, boss.y + boss.height / 3, '#ef4444', 18);
                createSlashEffect(boss.x, boss.y + boss.height / 2, player.facing, '#fca5a5');
                createFloatingText(boss.x + boss.width / 2, boss.y - 12, '-6', '#ef4444', false);
                triggerScreenShake(5);
                triggerHitStop(5);
                triggerScreenFlash('#ff3333', 0.18);
                triggerChromatic(0.65);

                if (boss.health <= 0) {
                    gameState = 'victory';
                    // JUICE: Death particle explosion
                    for (let i = 0; i < 6; i++) {
                        createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ef4444', 20);
                        createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#fbbf24', 16);
                        createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ff8800', 12);
                    }
                    triggerScreenShake(20);
                    triggerHitStop(18);
                    triggerScreenFlash('#ffaa00', 0.75);
                    triggerChromatic(1.0);
                }
            }
        }
    }

    // Block
    if (keys['k'] && !player.shieldBroken && player.shield > 0) {
        player.blocking = true;
        player.blockTimer = 10;
    } else if (player.shieldBroken || player.shield <= 0) {
        player.blocking = false;
    }

    // Shield regen
    if (player.shieldRegenDelay > 0) {
        player.shieldRegenDelay--;
    } else if (player.shield < player.maxShield && !player.blocking) {
        player.shield = Math.min(player.maxShield, player.shield + SHIELD_REGEN_RATE);
    }

    // Shield break recovery
    if (player.shieldBroken) {
        player.shieldBreakTimer--;
        if (player.shieldBreakTimer <= 0) { player.shieldBroken = false; player.shield = player.maxShield * 0.3; }
    }

    // Timers
    if (player.attackTimer > 0) { player.attackTimer--; if (player.attackTimer === 0) player.attacking = false; }
    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.blockTimer > 0) { player.blockTimer--; if (player.blockTimer === 0) player.blocking = false; }
    if (player.hitTimer > 0) { player.hitTimer--; if (player.hitTimer === 0) player.hit = false; }

    applyPhysics(player);

    // JUICE: Landing squash + dust
    if (!wasOnGround && player.onGround) {
        const impact = Math.abs(player.vy) + Math.abs(player.vx) * 0.25;
        if (impact > 2) {
            player.targetScaleX = 1.42;
            player.targetScaleY = 0.63;
            const dustCount = Math.min(12, Math.floor(4 + impact));
            createDust(player.x + player.width / 2, player.y + player.height, player.vx * 0.15, dustCount);
        }
    }

    // JUICE: Subtle run lean
    if (player.onGround && Math.abs(player.vx) > 1.5 && !player.attacking) {
        player.targetScaleX = 1 + Math.abs(player.vx) * 0.014;
        player.targetScaleY = 1 - Math.abs(player.vx) * 0.009;
    }

    wasPlayerOnGround = player.onGround;
}

// ========================================
// ADVANCED BOSS AI – Precision Edition
// ========================================
function predictPlayerPosition(frames) {
    const ai = boss.ai;
    let predX = player.x + ai.playerVelocityX * frames;
    let predY = player.y + ai.playerVelocityY * frames + 0.5 * GRAVITY * frames * frames;
    predX = Math.max(0, Math.min(canvas.width - player.width, predX));
    predY = Math.min(predY, GROUND_Y - player.height);
    return { x: predX, y: predY };
}

function findOptimalPlatform() {
    let best = null;
    let bestScore = -Infinity;
    const pred = predictPlayerPosition(20);
    platforms.forEach(plat => {
        const platCenterX = plat.x + plat.width / 2;
        const distToPlayer = Math.abs(platCenterX - pred.x);
        const heightDiff = plat.y - boss.y;
        const playerHeightDiff = Math.abs(plat.y - pred.y);
        let score = 0;
        score -= distToPlayer * 0.5;
        score -= playerHeightDiff * 0.3;
        if (heightDiff < -20) score += 40;
        else if (heightDiff < 0) score += 20;
        if (Math.abs(heightDiff) > 180) score -= 100;
        const distFromCenter = Math.abs(platCenterX - canvas.width / 2);
        score -= distFromCenter * 0.1;
        if (score > bestScore) { bestScore = score; best = plat; }
    });
    return best;
}

function calculateJumpVelocity(targetX, targetY) {
    const bossCenterX = boss.x + boss.width / 2;
    const distX = targetX - bossCenterX;
    const jumpVy = -13;
    const timeToPeak = -jumpVy / GRAVITY;
    const peakY = boss.y + jumpVy * timeToPeak + 0.5 * GRAVITY * timeToPeak * timeToPeak;
    if (peakY <= targetY + 10) {
        const totalTime = timeToPeak * 2;
        const neededVx = distX / totalTime;
        return { vx: neededVx, vy: jumpVy };
    }
    return { vx: distX * 0.08, vy: jumpVy };
}

function isPlayerAttackIncoming() {
    if (!player.attacking) return false;
    const playerFacesBoss = (player.facing === 1 && player.x < boss.x) || (player.facing === -1 && player.x > boss.x);
    const distX = Math.abs(player.x - boss.x);
    const onSameLevel = Math.abs(player.y - boss.y) < 80;
    return playerFacesBoss && distX < 90 && onSameLevel;
}

function timeToPlayerImpact() {
    if (!player.attacking) return Infinity;
    const distX = Math.abs(player.x - boss.x);
    return distX / Math.max(Math.abs(player.vx), 1);
}

function updateBoss() {
    const ai = boss.ai;
    const wasOnGround = boss.onGround;

    boss.stateTimer++;
    ai.patternTimer++;
    if (ai.actionCooldown > 0) ai.actionCooldown--;
    if (ai.reactionTimer > 0) ai.reactionTimer--;
    if (ai.antiAirWindow > 0) ai.antiAirWindow--;
    if (ai.baitTimer > 0) ai.baitTimer--;
    if (ai.jumpCommitTimer > 0) ai.jumpCommitTimer--;

    ai.playerVelocityX = player.x - ai.lastPlayerX;
    ai.playerVelocityY = player.y - ai.lastPlayerY;
    ai.lastPlayerX = player.x;
    ai.lastPlayerY = player.y;

    const healthPercent = boss.health / boss.maxHealth;
    if (healthPercent <= 0.4 && ai.phase === 1) {
        ai.phase = 2;
        ai.rageMode = true;
        boss.speed = 3.8;
        createFloatingText(boss.x + boss.width / 2, boss.y - 30, 'ENRAGED!', '#ef4444', true);
        triggerScreenShake(10);
        triggerScreenFlash('#ff0000', 0.5);
        triggerChromatic(1.0);
        for (let i = 0; i < 3; i++) {
            createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ef4444', 20);
            createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ff8800', 15);
        }
    } else if (healthPercent <= 0.75 && ai.phase === 0) {
        ai.phase = 1;
        ai.maxCombo = 3;
    }

    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const distX = Math.abs(dx);
    const distY = Math.abs(dy);
    const onSameLevel = distY < 80;
    const predictedPlayer = predictPlayerPosition(15);
    const predDx = predictedPlayer.x - boss.x;
    const predDistX = Math.abs(predDx);

    // --- Defensive AI ---
    const attackIncoming = isPlayerAttackIncoming();
    const timeToImpact = timeToPlayerImpact();

    if (!boss.attacking && boss.attackCooldown <= 25) {
        if (attackIncoming && timeToImpact < 25 && timeToImpact > 3) {
            if (ai.reactionTimer === 0 && ai.actionCooldown === 0) {
                ai.reactionTimer = ai.reactionDelay + Math.floor(Math.random() * 5);
            }
        }
        if (ai.reactionTimer === 1 && attackIncoming && !boss.blocking && !boss.shieldBroken && boss.shield > 0) {
            if (boss.shield < SHIELD_BLOCK_COST * 2) {
                if (boss.onGround) { boss.vy = -11; boss.vx = -boss.facing * 6; ai.lastAction = 'dodge'; }
            } else if (Math.random() < 0.85) {
                boss.blockTimer = 12 + Math.floor(Math.random() * 8);
                ai.consecutiveBlocks++;
                ai.lastAction = 'block';
            } else {
                if (boss.onGround) { boss.vy = -11; boss.vx = -boss.facing * 6; ai.lastAction = 'dodge'; }
            }
            ai.actionCooldown = 8;
        }
        if (ai.consecutiveBlocks >= 2 && attackIncoming) {
            if (Math.random() < 0.6) { boss.blockTimer = 0; ai.consecutiveBlocks = 0; }
        }
    }

    if (boss.blockTimer > 0 && !boss.attacking && !boss.shieldBroken && boss.shield > 0) {
        boss.blockTimer--;
        boss.blocking = true;
        if (boss.blockTimer === 0) { boss.blocking = false; ai.actionCooldown = 5; }
    } else {
        boss.blocking = false;
    }

    if (boss.shieldRegenDelay > 0) {
        boss.shieldRegenDelay--;
    } else if (boss.shield < boss.maxShield && !boss.blocking) {
        boss.shield = Math.min(boss.maxShield, boss.shield + SHIELD_REGEN_RATE);
    }

    if (boss.shieldBroken) {
        boss.shieldBreakTimer--;
        if (boss.shieldBreakTimer <= 0) { boss.shieldBroken = false; boss.shield = boss.maxShield * 0.3; }
    }

    if (!player.attacking) ai.consecutiveBlocks = 0;

    // --- State Decisions ---
    const idealRangeMin = ai.phase === 2 ? 45 : 55;
    const idealRangeMax = ai.phase === 2 ? 90 : 110;
    const inAttackRange = predDistX < idealRangeMax && onSameLevel;
    const tooClose = distX < idealRangeMin;
    const playerAbove = player.y < boss.y - 60;
    const playerOnPlatform = !player.onGround && player.y < GROUND_Y - 70;
    const bossOnPlatform = !boss.onGround && boss.y < GROUND_Y - 70;

    let thinkInterval = 40;
    if (boss.health < 40) thinkInterval = 30;
    if (player.attacking && distX < 100) thinkInterval = 15;
    if (ai.rageMode) thinkInterval = 25;

    if (boss.stateTimer > thinkInterval) {
        boss.stateTimer = 0;
        if (boss.health < 30 && player.attacking && distX < 120) { boss.state = 'retreat'; ai.lastAction = 'retreat'; }
        else if (playerAbove && distX < 130 && player.vy < 0 && boss.onGround) { boss.state = 'antiAir'; ai.lastAction = 'antiAir'; }
        else if (playerOnPlatform && !bossOnPlatform && boss.onGround && distX > 100) { boss.state = 'jumpPlatform'; ai.targetPlatform = findOptimalPlatform(); ai.lastAction = 'jumpPlatform'; }
        else if (tooClose && !player.attacking && ai.lastAction !== 'retreat') { boss.state = 'retreat'; ai.lastAction = 'retreat'; }
        else if (inAttackRange && onSameLevel && !boss.blocking && ai.actionCooldown === 0) {
            if (ai.baitTimer === 0 && Math.random() < 0.25 && ai.phase >= 1) { boss.state = 'feint'; ai.baitTimer = 90; ai.lastAction = 'feint'; }
            else { boss.state = 'attack'; ai.lastAction = 'attack'; }
        }
        else if (distX > idealRangeMax || !onSameLevel) { boss.state = 'approach'; ai.lastAction = 'approach'; }
        else { boss.state = 'idle'; ai.lastAction = 'idle'; }
    }

    // --- State Behaviors ---
    switch (boss.state) {
        case 'approach': {
            const targetX = predictedPlayer.x;
            const moveDir = targetX > boss.x ? 1 : -1;
            let moveSpeed = boss.speed;
            if (ai.rageMode) moveSpeed *= 1.3;
            if (distX > 200) moveSpeed *= 1.1;
            boss.vx = moveDir * moveSpeed;
            boss.facing = moveDir;
            if (playerAbove && boss.onGround && distX < 150) {
                if (ai.jumpCommitTimer === 0) ai.jumpCommitTimer = 20;
                if (ai.jumpCommitTimer === 1) {
                    if (playerOnPlatform) {
                        ai.targetPlatform = findOptimalPlatform();
                        if (ai.targetPlatform) {
                            const platCX = ai.targetPlatform.x + ai.targetPlatform.width / 2;
                            const jumpCalc = calculateJumpVelocity(platCX, ai.targetPlatform.y);
                            boss.vy = jumpCalc.vy; boss.vx = jumpCalc.vx;
                        } else { boss.vy = -12; }
                    } else { boss.vy = -12; }
                }
            }
            break;
        }
        case 'attack': {
            if (!boss.attacking && boss.attackCooldown <= 0 && ai.actionCooldown === 0) {
                boss.attacking = true;
                if (ai.comboCount < ai.maxCombo) { boss.attackTimer = 20; ai.comboCount++; }
                else { boss.attackTimer = 25; ai.comboCount = 0; }
                boss.attackCooldown = ai.phase === 2 ? 35 : 45;
                const lungeDir = predictedPlayer.x > boss.x ? 1 : -1;
                boss.vx = lungeDir * (ai.phase === 2 ? 12 : 10);
                boss.facing = lungeDir;
                ai.actionCooldown = 10;
                // JUICE: Boss attack stretch
                boss.targetScaleX = boss.facing === 1 ? 1.22 : 0.82;
                boss.targetScaleY = 0.88;
            }
            if (boss.attackTimer > 0) {
                boss.attackTimer--;
                const hitWindowStart = ai.comboCount > 1 ? 16 : 18;
                const hitWindowEnd = ai.comboCount > 1 ? 8 : 10;
                if (boss.attackTimer < hitWindowStart && boss.attackTimer > hitWindowEnd) {
                    const hitRange = ai.comboCount > 1 ? 70 : 65;
                    if (checkAttackHit(boss, player, hitRange)) {
                        if (player.blocking && player.shield > 0) {
                            player.shield -= SHIELD_BLOCK_COST;
                            createParticle(player.x + player.width / 2, player.y + player.height / 2, '#fbbf24', 16);
                            createSlashEffect(player.x, player.y + player.height / 2, boss.facing, '#fbbf24');
                            player.vx = boss.facing * 14;
                            playSound('block');
                            if (player.shield <= 0) {
                                player.shield = 0;
                                player.shieldBroken = true;
                                player.shieldBreakTimer = SHIELD_BREAK_RECOVERY;
                                player.shieldRegenDelay = SHIELD_REGEN_DELAY;
                                player.blocking = false;
                                createFloatingText(player.x + player.width / 2, player.y - 22, 'SHIELD BREAK!', '#3b82f6', true);
                                triggerScreenShake(7);
                                triggerHitStop(6);
                                triggerScreenFlash('#3b82f6', 0.35);
                            } else {
                                createFloatingText(player.x + player.width / 2, player.y - 10, 'BLOCK', '#fbbf24', false);
                                triggerHitStop(3);
                            }
                            triggerScreenShake(4);
                            ai.comboCount = 0;
                        } else {
                            const damage = ai.comboCount > 1 ? 6 : 5;
                            player.health -= damage;
                            player.hit = true;
                            player.hitTimer = 15;
                            healthBarFlash.player = 28;
                            // JUICE: Player squash on hit
                            player.targetScaleX = 1.38;
                            player.targetScaleY = 0.68;
                            createParticle(player.x + player.width / 2, player.y + player.height / 2, '#ef4444', 22);
                            createSlashEffect(player.x, player.y + player.height / 2, boss.facing, '#fca5a5');
                            playSound('hit');
                            createFloatingText(player.x + player.width / 2, player.y - 12, `-${damage}`, '#ef4444', false);
                            triggerScreenShake(6 + ai.comboCount);
                            triggerHitStop(5 + ai.comboCount);
                            triggerScreenFlash('#ff2222', 0.25);
                            triggerChromatic(0.72);
                            player.vx = boss.facing * 5;
                            if (player.health <= 0) {
                                gameState = 'gameover';
                                playSound('gameOver');
                                // JUICE: Death burst
                                for (let i = 0; i < 5; i++) {
                                    createParticle(player.x + player.width / 2, player.y + player.height / 2, '#4ade80', 20);
                                    createParticle(player.x + player.width / 2, player.y + player.height / 2, '#fbbf24', 14);
                                }
                                triggerScreenShake(22);
                                triggerHitStop(20);
                                triggerScreenFlash('#ff0000', 0.82);
                                triggerChromatic(1.0);
                            }
                        }
                    }
                }
                if (boss.attackTimer === 0) { boss.attacking = false; ai.actionCooldown = ai.phase === 2 ? 4 : 6; }
            } else { boss.attacking = false; }
            break;
        }
        case 'feint': {
            if (!boss.attacking && boss.attackCooldown <= 0) {
                boss.attacking = true;
                boss.attackTimer = 12;
                boss.attackCooldown = 30;
                boss.vx = boss.facing * 5;
            }
            if (boss.attackTimer > 0) {
                boss.attackTimer--;
                if (boss.attackTimer < 8) {
                    boss.attacking = false;
                    boss.attackTimer = 0;
                    if (player.blocking) {
                        boss.state = 'idle';
                        ai.baitTimer = 40;
                        setTimeout(() => { if (gameState === 'playing') { boss.state = 'attack'; boss.stateTimer = 100; } }, 300);
                    } else { boss.state = 'retreat'; }
                }
            }
            break;
        }
        case 'retreat': {
            const idealDist = ai.phase === 2 ? 80 : 100;
            const currentDist = Math.abs(player.x - boss.x);
            if (currentDist < idealDist) {
                boss.vx = -boss.facing * (boss.speed * (ai.rageMode ? 1.4 : 1.2));
            } else {
                boss.vx = boss.facing * boss.speed * 0.5;
            }
            if (boss.onGround && player.attacking && distX < 120 && Math.random() < 0.15) boss.vy = -10;
            if (boss.onGround && !playerOnPlatform && Math.random() < 0.05) {
                const nearbyPlat = platforms.find(p => Math.abs(p.x + p.width / 2 - boss.x) < 100 && p.y < boss.y - 40);
                if (nearbyPlat) { boss.vy = -12; boss.vx = (nearbyPlat.x + nearbyPlat.width / 2 > boss.x) ? 4 : -4; }
            }
            break;
        }
        case 'antiAir': {
            boss.facing = dx > 0 ? 1 : -1;
            if (boss.onGround && ai.antiAirWindow === 0) ai.antiAirWindow = 30;
            if (ai.antiAirWindow > 0) {
                if (boss.onGround && player.vy < -2) {
                    const timeToPeak = -player.vy / GRAVITY;
                    const playerPeakX = player.x + player.vx * timeToPeak;
                    boss.vx = (playerPeakX > boss.x) ? 5 : -5;
                    boss.vy = -13;
                }
                if (!boss.onGround && distX < 70 && !boss.attacking && boss.attackCooldown <= 0) {
                    boss.attacking = true; boss.attackTimer = 20; boss.attackCooldown = 40;
                }
            }
            break;
        }
        case 'jumpPlatform': {
            if (!ai.targetPlatform) ai.targetPlatform = findOptimalPlatform();
            if (ai.targetPlatform && boss.onGround) {
                const platCX = ai.targetPlatform.x + ai.targetPlatform.width / 2;
                const jumpCalc = calculateJumpVelocity(platCX, ai.targetPlatform.y);
                const distToJumpPoint = Math.abs(platCX - (boss.x + boss.width / 2));
                if (distToJumpPoint > 80) {
                    boss.vx = platCX > boss.x ? boss.speed : -boss.speed;
                    boss.facing = platCX > boss.x ? 1 : -1;
                } else {
                    boss.vy = jumpCalc.vy; boss.vx = jumpCalc.vx; boss.state = 'approach';
                }
            } else if (!boss.onGround) {
                if (ai.targetPlatform) {
                    const platCX = ai.targetPlatform.x + ai.targetPlatform.width / 2;
                    const bossCX = boss.x + boss.width / 2;
                    const correction = (platCX - bossCX) * 0.08;
                    boss.vx += correction;
                    boss.vx = Math.max(-6, Math.min(6, boss.vx));
                }
                if (boss.onGround) boss.state = 'approach';
            } else { boss.state = 'approach'; }
            break;
        }
        default: {
            boss.facing = dx > 0 ? 1 : -1;
            if (Math.abs(boss.vx) < 0.5) boss.vx = Math.sin(Date.now() / 400) * 0.8;
            if (boss.onGround && Math.random() < 0.015) boss.vy = -5;
            if (distX < 70 && onSameLevel && !player.attacking && boss.attackCooldown <= 0 && Math.random() < 0.08) {
                boss.state = 'attack'; boss.stateTimer = 100;
            }
        }
    }

    // Global AI behaviors
    if (ai.rageMode) {
        if (boss.state === 'idle' && distX > 50) boss.state = 'approach';
        ai.reactionDelay = 6;
    }

    if (boss.x < 30) { boss.vx = Math.max(boss.vx, 2); boss.facing = 1; }
    else if (boss.x > canvas.width - boss.width - 30) { boss.vx = Math.min(boss.vx, -2); boss.facing = -1; }

    if (bossOnPlatform) {
        const currentPlat = platforms.find(p =>
            boss.x + boss.width / 2 > p.x &&
            boss.x + boss.width / 2 < p.x + p.width &&
            Math.abs(boss.y + boss.height - p.y) < 5
        );
        if (currentPlat) {
            const leftEdge = currentPlat.x + 5;
            const rightEdge = currentPlat.x + currentPlat.width - boss.width - 5;
            if (boss.x < leftEdge && boss.vx < 0) boss.vx = 0;
            if (boss.x > rightEdge && boss.vx > 0) boss.vx = 0;
        }
    }

    if (boss.hitTimer > 0) { boss.hitTimer--; if (boss.hitTimer === 0) boss.hit = false; }
    if (boss.attackCooldown > 0) boss.attackCooldown--;

    applyPhysics(boss);

    // JUICE: Boss landing dust + squash
    if (!wasOnGround && boss.onGround) {
        const impact = Math.abs(boss.vy) + Math.abs(boss.vx) * 0.25;
        if (impact > 2) {
            boss.targetScaleX = 1.38;
            boss.targetScaleY = 0.65;
            createDust(boss.x + boss.width / 2, boss.y + boss.height, boss.vx * 0.15, Math.min(10, Math.floor(3 + impact)));
        }
    }

    // JUICE: Boss jump stretch
    if (wasOnGround && !boss.onGround && boss.vy < -3) {
        boss.targetScaleX = 0.76;
        boss.targetScaleY = 1.30;
        createDust(boss.x + boss.width / 2, boss.y + boss.height, -boss.vx * 0.12, 7);
    }
}

// ========================================
// VISUAL RENDERING – Enhanced
// ========================================
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a12');
    gradient.addColorStop(0.5, '#0f0f1a');
    gradient.addColorStop(1, '#151525');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.lineWidth = 1;
    const gridSize = 40;
    const perspectiveOffset = bgOffset % gridSize;
    for (let y = GROUND_Y + 10; y < canvas.height; y += gridSize) {
        const perspective = (y - GROUND_Y) / (canvas.height - GROUND_Y);
        ctx.strokeStyle = `rgba(74, 222, 128, ${0.08 * (1 - perspective)})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    for (let x = -perspectiveOffset; x < canvas.width; x += gridSize) {
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.05)';
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x + (x - canvas.width / 2) * 0.3, canvas.height); ctx.stroke();
    }
    ctx.restore();

    backgroundStars.forEach(star => {
        const alpha = 0.3 + star.brightness * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    ctx.fillStyle = '#0d0d15';
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= canvas.width; x += 20) {
        ctx.lineTo(x, GROUND_Y - (Math.sin(x * 0.01) * 30 + Math.sin(x * 0.03) * 15 + 20));
    }
    ctx.lineTo(canvas.width, GROUND_Y); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#12121c';
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= canvas.width; x += 15) {
        ctx.lineTo(x, GROUND_Y - (Math.sin(x * 0.015 + 2) * 20 + Math.sin(x * 0.04) * 10 + 10));
    }
    ctx.lineTo(canvas.width, GROUND_Y); ctx.closePath(); ctx.fill();
}

function drawGround() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(canvas.width, GROUND_Y); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.15)';
    ctx.lineWidth = 1;
    for (let y = GROUND_Y + 10; y < canvas.height; y += 12) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(74, 222, 128, 0.1)';
    ctx.fillRect(0, GROUND_Y, canvas.width, 4);
}

function drawPlatforms() {
    platforms.forEach(plat => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(plat.x + 4, plat.y + 4, plat.width, plat.height);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = '#334155';
        ctx.fillRect(plat.x, plat.y, plat.width, 6);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(plat.x, plat.y, plat.width, 2);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
        for (let i = 0; i < plat.width; i += 15) ctx.fillRect(plat.x + i + 4, plat.y + 10, 4, 4);
        ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.fillRect(plat.x + plat.width / 2 - 4, plat.y + plat.height, 8, GROUND_Y - plat.y - plat.height);
    });
}

// ========================================
// JUICE DRAW: Boss Rage Aura
// ========================================
function drawBossRageAura() {
    if (!boss.ai || !boss.ai.rageMode) return;
    const t = Date.now() / 1000;
    const cx = boss.x + boss.width / 2;
    const cy = boss.y + boss.height / 2;
    ctx.save();
    for (let ring = 0; ring < 3; ring++) {
        const phase = ((t * 1.8 + ring * 0.65) % 1);
        const radius = 28 + ring * 14 + phase * 28;
        const alpha = (1 - phase) * 0.28;
        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    const innerAlpha = 0.08 + Math.sin(t * 5) * 0.05;
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 48);
    radGrad.addColorStop(0, `rgba(239, 68, 68, ${innerAlpha * 2.5})`);
    radGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawPlayer() {
    const p = player;
    const facing = p.facing;

    // Ground shadow (stretched with scaleX)
    if (p.onGround) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(p.x + p.width / 2, GROUND_Y - 2, (p.width / 2) * Math.abs(p.scaleX), 4, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(p.x + p.width / 2, GROUND_Y - 2, p.width / 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Hit flash overlay
    if (p.hit && p.hitTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.hitTimer / 15 * 0.6})`;
        ctx.fillRect(p.x - 5, p.y - 5, p.width + 10, p.height + 10);
    }

    const bobOffset = p.onGround ? Math.sin(Date.now() / 300) * 1.5 : 0;

    ctx.save();
    // Anchor squash/stretch at bottom (feet stay grounded)
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + bobOffset);
    // Offset so scaling anchors at feet
    ctx.translate(0, (1 - p.scaleY) * p.height / 2);
    ctx.scale(p.scaleX * (facing === -1 ? -1 : 1), p.scaleY);

    const bodyColor = p.hit ? '#ffffff' : p.color;
    const darkBodyColor = p.hit ? '#cccccc' : '#22c55e';

    // Legs
    const legOffset = Math.abs(p.vx) > 0.5 && p.onGround ? Math.sin(Date.now() / 80) * 4 : 0;
    ctx.fillStyle = darkBodyColor;
    ctx.fillRect(-12, 15, 8, 18 + legOffset);
    ctx.fillRect(4, 15, 8, 18 - legOffset);
    // Boots
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-13, 28 + legOffset, 10, 6);
    ctx.fillRect(3, 28 - legOffset, 10, 6);
    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-14, -5, 28, 22);
    ctx.fillStyle = darkBodyColor;
    ctx.fillRect(-10, -2, 20, 3); ctx.fillRect(-10, 5, 20, 3); ctx.fillRect(-10, 12, 20, 3);
    // Belt
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-14, 15, 28, 4);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(-2, 15, 4, 4);
    // Head
    ctx.fillStyle = bodyColor; ctx.fillRect(-10, -22, 20, 18);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-8, -18, 16, 8);
    ctx.fillStyle = '#4ade80'; ctx.fillRect(-4, -16, 4, 3);
    ctx.fillStyle = darkBodyColor; ctx.fillRect(-2, -26, 4, 6); ctx.fillRect(-4, -24, 8, 3);
    // Arms
    const armSwing = p.attacking ? -20 : (Math.abs(p.vx) > 0.5 && p.onGround ? Math.sin(Date.now() / 80 + Math.PI) * 6 : 0);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-18, -5, 6, 14 + armSwing * 0.3);
    ctx.fillRect(12, -5, 6, 14 + armSwing);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-19, 6 + armSwing * 0.3, 8, 5);
    ctx.fillRect(11, 6 + armSwing, 8, 5);

    // Sword
    if (p.attacking) {
        const swingProgress = 1 - (p.attackTimer / 20);
        const swingAngle = swingProgress * Math.PI * 0.8 - Math.PI * 0.4;
        ctx.save();
        ctx.translate(16, 5);
        ctx.rotate(swingAngle);
        // Blade
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, -28, 5, 32);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -28, 2, 32);
        ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1;
        ctx.strokeRect(-1, -29, 7, 34);
        ctx.shadowBlur = 0;
        // Hilt
        ctx.fillStyle = '#92400e'; ctx.fillRect(-3, 2, 11, 4); ctx.fillRect(-1, 6, 7, 3);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(-6, -1, 17, 3);
        // JUICE: Enhanced multi-arc sword trail
        for (let tr = 0; tr < 4; tr++) {
            const trailProgress = swingProgress - tr * 0.10;
            if (trailProgress > 0.05) {
                const trailAngle = trailProgress * Math.PI * 0.8 - Math.PI * 0.4;
                const alpha = (1 - tr * 0.24) * swingProgress * 0.55;
                ctx.strokeStyle = `rgba(251, 191, 36, ${alpha.toFixed(2)})`;
                ctx.lineWidth = 3.5 - tr * 0.7;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(0, 0, 28 - tr * 2, trailAngle - 0.22, trailAngle);
                ctx.stroke();
            }
        }
        ctx.restore();
    } else {
        ctx.save();
        ctx.translate(16, 5); ctx.rotate(0.1);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, -20, 4, 24);
        ctx.fillStyle = '#92400e'; ctx.fillRect(-2, 2, 8, 3);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(-4, -1, 12, 2);
        ctx.restore();
    }

    // Shield
    if (p.blocking) {
        ctx.save();
        ctx.translate(-18, 5);
        ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.moveTo(0, -15); ctx.lineTo(10, -10); ctx.lineTo(10, 15);
        ctx.lineTo(0, 20); ctx.lineTo(-10, 15); ctx.lineTo(-10, -10);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(0, 2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 12); ctx.moveTo(-6, 2); ctx.lineTo(6, 2); ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

function drawBoss() {
    const b = boss;
    const facing = b.facing;

    // JUICE: Rage aura behind character
    drawBossRageAura();

    // Shadow
    if (b.onGround) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(b.x + b.width / 2, GROUND_Y - 2, (b.width / 2) * Math.abs(b.scaleX), 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Hit flash
    if (b.hit && b.hitTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${b.hitTimer / 15 * 0.6})`;
        ctx.fillRect(b.x - 5, b.y - 5, b.width + 10, b.height + 10);
    }

    const breatheScale = 1 + Math.sin(Date.now() / 400) * 0.02;

    ctx.save();
    ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
    // JUICE: Squash/stretch anchored at feet + breathe
    ctx.translate(0, (1 - b.scaleY) * b.height / 2);
    ctx.scale(b.scaleX * breatheScale * (facing === -1 ? -1 : 1), b.scaleY * breatheScale);

    const bodyColor = b.hit ? '#ffffff' : b.color;
    const darkBodyColor = b.hit ? '#cccccc' : '#b91c1c';
    // JUICE: Eyes glow brighter + orange when enraged
    const eyeColor = (b.ai && b.ai.rageMode) ? '#ff6600' : '#ef4444';
    const eyeGlowColor = (b.ai && b.ai.rageMode) ? '#ffaa00' : '#fca5a5';

    // Legs
    const legOffset = Math.abs(b.vx) > 0.5 && b.onGround ? Math.sin(Date.now() / 100) * 5 : 0;
    ctx.fillStyle = darkBodyColor;
    ctx.fillRect(-15, 20, 10, 18 + legOffset); ctx.fillRect(5, 20, 10, 18 - legOffset);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-17, 32 + legOffset, 14, 6); ctx.fillRect(3, 32 - legOffset, 14, 6);
    ctx.fillStyle = '#525252';
    ctx.fillRect(-16, 33 + legOffset, 4, 4); ctx.fillRect(12, 33 - legOffset, 4, 4);
    // Body
    ctx.fillStyle = bodyColor; ctx.fillRect(-18, -10, 36, 32);
    ctx.fillStyle = darkBodyColor;
    ctx.fillRect(-14, -6, 28, 6); ctx.fillRect(-14, 4, 28, 6); ctx.fillRect(-14, 14, 28, 6);
    // Spikes
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath(); ctx.moveTo(-18, -5); ctx.lineTo(-26, 0); ctx.lineTo(-18, 5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-24, 13); ctx.lineTo(-18, 18); ctx.fill();
    // Head
    ctx.fillStyle = bodyColor; ctx.fillRect(-14, -28, 28, 20);
    ctx.fillStyle = '#525252';
    ctx.beginPath(); ctx.moveTo(-12, -26); ctx.lineTo(-20, -38); ctx.lineTo(-8, -28); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, -26); ctx.lineTo(20, -38); ctx.lineTo(8, -28); ctx.fill();
    // Eyes
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-10, -22, 20, 10);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(-6, -20, 5, 4); ctx.fillRect(2, -20, 5, 4);
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = (b.ai && b.ai.rageMode) ? 16 : 8;
    ctx.fillStyle = eyeGlowColor;
    ctx.fillRect(-5, -19, 2, 2); ctx.fillRect(3, -19, 2, 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-6, -10, 12, 4);
    ctx.fillStyle = eyeColor; ctx.fillRect(-4, -9, 8, 2);
    // Arms
    const armSwing = b.attacking ? -25 : (Math.abs(b.vx) > 0.5 && b.onGround ? Math.sin(Date.now() / 100 + Math.PI) * 7 : 0);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-24, -5, 8, 16 + armSwing * 0.3); ctx.fillRect(16, -5, 8, 16 + armSwing);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-26, 8 + armSwing * 0.3, 12, 6); ctx.fillRect(14, 8 + armSwing, 12, 6);

    // Boss Sword
    if (b.attacking) {
        const swingProgress = 1 - (b.attackTimer / 25);
        const swingAngle = swingProgress * Math.PI * 0.9 - Math.PI * 0.45;
        ctx.save();
        ctx.translate(20, 5); ctx.rotate(swingAngle);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, -35, 7, 40);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -35, 3, 40);
        ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 12;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5;
        ctx.strokeRect(-1, -36, 9, 42);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-3, 3, 13, 5); ctx.fillRect(-1, 8, 9, 4);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(-8, 0, 23, 4);
        // JUICE: Boss sword multi-arc trail (red)
        for (let tr = 0; tr < 4; tr++) {
            const trailProgress = swingProgress - tr * 0.10;
            if (trailProgress > 0.05) {
                const trailAngle = trailProgress * Math.PI * 0.9 - Math.PI * 0.45;
                const alpha = (1 - tr * 0.24) * swingProgress * 0.5;
                ctx.strokeStyle = `rgba(239, 68, 68, ${alpha.toFixed(2)})`;
                ctx.lineWidth = 4.5 - tr * 0.8;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(0, 0, 34 - tr * 2.5, trailAngle - 0.28, trailAngle);
                ctx.stroke();
            }
        }
        ctx.restore();
    } else {
        ctx.save();
        ctx.translate(20, 5); ctx.rotate(0.15);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, -24, 5, 28);
        ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-2, 2, 9, 4);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(-5, -1, 15, 3);
        ctx.restore();
    }

    // Boss Shield
    if (b.blocking) {
        ctx.save();
        ctx.translate(-22, 5);
        ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.moveTo(0, -18); ctx.lineTo(12, -12); ctx.lineTo(12, 18);
        ctx.lineTo(0, 24); ctx.lineTo(-12, 18); ctx.lineTo(-12, -12);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(0, 3, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

// ========================================
// JUICE DRAW: Particles (with types)
// ========================================
function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const lifeRatio = p.life / p.maxLife;
        ctx.globalAlpha = lifeRatio;

        if (p.type === 'dust') {
            // Soft circular puffs
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * (0.5 + lifeRatio * 0.5), 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'slash') {
            // Short elongated lines
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size * 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-p.size * 2.5, 0);
            ctx.lineTo(p.size * 2.5, 0);
            ctx.stroke();
        } else {
            // Default: rotating squares (sparks)
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

// JUICE DRAW: Floating damage numbers with scale pop
function drawFloatingTexts() {
    floatingTexts.forEach(t => {
        const lifeRatio = t.life / t.maxLife;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(t.scale, t.scale);
        // Fade out in last 30% of life
        ctx.globalAlpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1;
        const fontSize = t.big ? 18 : 14;
        ctx.font = `bold ${fontSize}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(t.text, 0, 0);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

// JUICE DRAW: Health bars with flash effect
function drawHealthBars() {
    // === Player Health ===
    ctx.fillStyle = '#0a0a0a'; ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
    ctx.fillRect(20, 20, 200, 24); ctx.strokeRect(20, 20, 200, 24);
    const playerHPPct = Math.max(0, player.health / player.maxHealth);
    ctx.fillStyle = player.health > 30 ? '#4ade80' : '#ef4444';
    ctx.fillRect(22, 22, playerHPPct * 196, 20);
    // Flash overlay
    if (healthBarFlash.player > 0) {
        const fa = (healthBarFlash.player / 28) * 0.55;
        ctx.fillStyle = `rgba(255, 255, 255, ${fa})`;
        ctx.fillRect(22, 22, playerHPPct * 196, 20);
        ctx.fillStyle = `rgba(255, 30, 30, ${fa * 0.9})`;
        ctx.fillRect(22 + playerHPPct * 196, 22, 7, 20);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 1; i < 10; i++) ctx.fillRect(22 + (196 / 10) * i, 22, 2, 20);
    ctx.fillStyle = '#ffffff'; ctx.font = '10px "Press Start 2P"'; ctx.textAlign = 'left';
    ctx.fillText('PLAYER', 25, 36);

    // === Player Shield ===
    const shieldBarY = 46;
    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = player.shieldBroken ? '#525252' : '#3b82f6';
    ctx.lineWidth = 1;
    ctx.fillRect(20, shieldBarY, 200, 10); ctx.strokeRect(20, shieldBarY, 200, 10);
    if (!player.shieldBroken) {
        const psp = Math.max(0, player.shield / player.maxShield);
        ctx.fillStyle = player.shield > 30 ? '#3b82f6' : '#60a5fa';
        ctx.fillRect(21, shieldBarY + 1, psp * 198, 8);
    }
    ctx.fillStyle = player.shieldBroken ? '#525252' : '#93c5fd';
    ctx.font = '7px "Press Start 2P"'; ctx.textAlign = 'left';
    ctx.fillText(player.shieldBroken ? 'BROKEN' : 'SHIELD', 23, shieldBarY + 8);

    // === Boss Health ===
    ctx.fillStyle = '#0a0a0a'; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.fillRect(canvas.width - 220, 20, 200, 24); ctx.strokeRect(canvas.width - 220, 20, 200, 24);
    const bossHPPct = Math.max(0, boss.health / boss.maxHealth);
    ctx.fillStyle = boss.health > 50 ? '#ef4444' : '#f97316';
    ctx.fillRect(canvas.width - 218, 22, bossHPPct * 196, 20);
    // Flash overlay
    if (healthBarFlash.boss > 0) {
        const fa = (healthBarFlash.boss / 22) * 0.55;
        ctx.fillStyle = `rgba(255, 255, 255, ${fa})`;
        ctx.fillRect(canvas.width - 218, 22, bossHPPct * 196, 20);
        ctx.fillStyle = `rgba(255, 100, 0, ${fa * 0.9})`;
        ctx.fillRect(canvas.width - 218 + bossHPPct * 196 - 7, 22, 7, 20);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 1; i < 10; i++) ctx.fillRect(canvas.width - 218 + (196 / 10) * i, 22, 2, 20);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'right';
    ctx.fillText('BOSS', canvas.width - 25, 36);

    // === Boss Shield ===
    const bossShieldBarY = 46;
    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = boss.shieldBroken ? '#525252' : '#3b82f6';
    ctx.lineWidth = 1;
    ctx.fillRect(canvas.width - 220, bossShieldBarY, 200, 10);
    ctx.strokeRect(canvas.width - 220, bossShieldBarY, 200, 10);
    if (!boss.shieldBroken) {
        const bsp = Math.max(0, boss.shield / boss.maxShield);
        ctx.fillStyle = boss.shield > 30 ? '#3b82f6' : '#60a5fa';
        ctx.fillRect(canvas.width - 219, bossShieldBarY + 1, bsp * 198, 8);
    }
    ctx.fillStyle = boss.shieldBroken ? '#525252' : '#93c5fd';
    ctx.font = '7px "Press Start 2P"'; ctx.textAlign = 'right';
    ctx.fillText(boss.shieldBroken ? 'BROKEN' : 'SHIELD', canvas.width - 23, bossShieldBarY + 8);
    ctx.textAlign = 'left';
}

function drawCountdown() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const displayText = countdownValue > 0 ? countdownValue.toString() : 'GO!';
    const pulseScale = countdownValue > 0 ? 1 + Math.sin(Date.now() / 100) * 0.1 : 1.2;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(pulseScale, pulseScale);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '72px "Press Start 2P"';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(displayText, 4, 4);
    ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 20;
    ctx.fillText(displayText, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 15;
    ctx.font = '40px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', 0, -20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.font = '14px "Press Start 2P"';
    ctx.fillText('Press R to Restart', 0, 20);
    ctx.restore();
    if (keys['r']) resetGame();
}

function drawVictory() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // JUICE: Confetti burst on first draw
    if (!victoryParticlesSpawned) {
        victoryParticlesSpawned = true;
        const colors = ['#4ade80', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa', '#fb923c'];
        for (let i = 0; i < 80; i++) {
            const col = colors[Math.floor(Math.random() * colors.length)];
            particles.push({
                x: Math.random() * canvas.width,
                y: canvas.height / 2 + (Math.random() - 0.5) * 80,
                vx: (Math.random() - 0.5) * 12,
                vy: -Math.random() * 10 - 3,
                life: 60 + Math.random() * 60,
                maxLife: 120,
                color: col,
                size: Math.random() * 6 + 3,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.25,
                gravity: 0.18,
                type: 'spark'
            });
        }
    }

    const t = Date.now() / 1000;
    const hue = (t * 55) % 360;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
    ctx.shadowColor = `hsl(${hue}, 90%, 65%)`;
    ctx.shadowBlur = 18 + Math.sin(t * 4) * 7;
    ctx.font = '40px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('VICTORY!', 0, -20);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.font = '14px "Press Start 2P"';
    ctx.fillText('Press R to Play Again', 0, 20);
    ctx.restore();
    if (keys['r']) resetGame();
}

function drawVignette() {
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.4, canvas.width / 2, canvas.height / 2, canvas.height * 0.8);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// JUICE DRAW: Low health red vignette pulse
function drawLowHealthVignette() {
    const ratio = player.health / player.maxHealth;
    if (ratio > 0.35) return;
    const intensity = (0.35 - ratio) / 0.35;
    const pulse = 0.48 + Math.sin(Date.now() / 180) * 0.52;
    const alpha = intensity * pulse * 0.48;
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.22, canvas.width / 2, canvas.height / 2, canvas.height * 0.78);
    gradient.addColorStop(0, 'rgba(180,0,0,0)');
    gradient.addColorStop(1, `rgba(210,0,0,${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// JUICE DRAW: Screen flash (drawn OUTSIDE shake transform)
function drawScreenFlash() {
    if (screenFlash.alpha <= 0.01) return;
    ctx.fillStyle = screenFlash.color;
    ctx.globalAlpha = screenFlash.alpha;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
}

// JUICE DRAW: Chromatic aberration edge fringing
function drawChromaticAberration() {
    if (chromaticAb.intensity <= 0.04) return;
    const shift = chromaticAb.intensity * 7;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Left edge: cyan fringe
    const lgL = ctx.createLinearGradient(0, 0, shift * 3.5, 0);
    lgL.addColorStop(0, `rgba(0, 200, 255, ${(chromaticAb.intensity * 0.38).toFixed(2)})`);
    lgL.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lgL;
    ctx.fillRect(0, 0, shift * 3.5, canvas.height);

    // Right edge: red fringe
    const lgR = ctx.createLinearGradient(canvas.width - shift * 3.5, 0, canvas.width, 0);
    lgR.addColorStop(0, 'rgba(0,0,0,0)');
    lgR.addColorStop(1, `rgba(255, 50, 50, ${(chromaticAb.intensity * 0.38).toFixed(2)})`);
    ctx.fillStyle = lgR;
    ctx.fillRect(canvas.width - shift * 3.5, 0, shift * 3.5, canvas.height);

    ctx.restore();
}

// Main Rendering
function draw() {
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);

    drawBackground();
    drawGround();
    drawPlatforms();

    // Characters (back-to-front by Y)
    if (player.y + player.height < boss.y + boss.height) {
        drawPlayer();
        drawBoss();
    } else {
        drawBoss();
        drawPlayer();
    }

    drawParticles();
    drawFloatingTexts();

    if (gameState === 'countdown') {
        drawCountdown();
        ctx.restore();
        return;
    }

    drawHealthBars();

    if (gameState === 'gameover') drawGameOver();
    if (gameState === 'victory') drawVictory();

    drawVignette();
    drawLowHealthVignette();

    ctx.restore();

    // Post-process effects drawn OUTSIDE the shake transform
    drawChromaticAberration();
    drawScreenFlash();
}

// Fixed Timestep Game Loop
function gameLoop(currentTime) {
    if (!gameRunning) return;

    if (!lastFrameTime) lastFrameTime = currentTime;
    let deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    if (deltaTime > MAX_ACCUMULATOR) deltaTime = MAX_ACCUMULATOR;

    accumulator += deltaTime;

    while (accumulator >= TIME_STEP) {
        if (gameState === 'countdown') {
            countdownTimer++;
            if (countdownTimer >= 60) {
                countdownTimer = 0;
                countdownValue--;
                playSound('countdown');
                if (countdownValue <= 0) gameState = 'playing';
            }
        }

        if (gameState === 'playing') {
            if (hitStop > 0) {
                // JUICE: Freeze logic, still animate particles/texts/shake
                hitStop--;
                updateParticles();
                updateFloatingTexts();
                updateScreenShake();
            } else {
                updatePlayer();
                updateBoss();
                updateParticles();
                updateFloatingTexts();
                updateScreenShake();
                handleEntityCollision();
            }
            updateJuiceState();
        }

        if (gameState === 'victory' || gameState === 'gameover') {
            // Keep particles alive for death/win effects
            updateParticles();
            updateFloatingTexts();
            updateJuiceState();
        }

        updateBackground();
        accumulator -= TIME_STEP;
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// Event Listeners
document.getElementById('playGameBtn').addEventListener('click', openGame);
document.getElementById('gameClose').addEventListener('click', closeGame);
document.getElementById('gameOverlay').addEventListener('click', closeGame);
