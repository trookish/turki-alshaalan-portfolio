// ========================================
// Browser-Based Minigame: Turki's Battle
// Visually Enhanced Edition
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

// Set volumes
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

// Game State
let gameRunning = false;
let gameState = 'playing'; // playing, gameover, victory, countdown
let countdownValue = 3;
let countdownTimer = 0;
let keys = {};

// Visual Effects State
let screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };
let floatingTexts = [];
let backgroundStars = [];
let bgOffset = 0;

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
    x: 100,
    y: GROUND_Y - 80,
    width: 40,
    height: 60,
    vx: 0,
    vy: 0,
    speed: 4,
    jumpForce: -12,
    onGround: false,
    health: 120,
    maxHealth: 120,
    facing: 1, // 1 = right, -1 = left
    attacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    blocking: false,
    blockTimer: 0,
    hit: false,
    hitTimer: 0,
    color: '#4ade80'
};

let boss = {
    x: 600,
    y: GROUND_Y - 80,
    width: 50,
    height: 70,
    vx: 0,
    vy: 0,
    speed: 2.5,
    health: 150,
    maxHealth: 150,
    facing: -1,
    attacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    blockTimer: 0,
    hit: false,
    hitTimer: 0,
    state: 'idle',
    stateTimer: 0,
    color: '#ef4444',
    pattern: 'normal'
};

// Platforms
const platforms = [
    { x: 150, y: 320, width: 120, height: 20 },
    { x: 400, y: 280, width: 120, height: 20 },
    { x: 600, y: 340, width: 100, height: 20 },
    { x: 300, y: 200, width: 100, height: 20 },
    { x: 550, y: 180, width: 100, height: 20 }
];

// Particles
let particles = [];

// Input Handling
document.addEventListener('keydown', (e) => {
    if (gameRunning) {
        // Prevent space bar from scrolling the page during gameplay
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

// Mobile detection - actual mobile/touch devices only
function isMobileDevice() {
    const isTouch = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0);

    // Also check for mobile user agent
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Check viewport size (common mobile breakpoint)
    const isSmallScreen = window.innerWidth <= 768;

    return (isTouch && isSmallScreen) || isMobileUA;
}

// Sound mute handling
let soundEnabled = localStorage.getItem('sound') !== 'false';

// Listen for sound toggle events
window.addEventListener('soundToggle', (e) => {
    soundEnabled = e.detail.enabled;
    updateSoundState();
});

// Check initial sound state
updateSoundState();

function updateSoundState() {
    if (!soundEnabled) {
        // Mute all sounds
        Object.values(sounds).forEach(sound => {
            sound.volume = 0;
        });
    } else {
        // Restore volumes
        sounds.jump.volume = 0.3;
        sounds.hit.volume = 0.4;
        sounds.block.volume = 0.3;
        sounds.gameOver.volume = 0.5;
        sounds.windowOpen.volume = 0.4;
        sounds.countdown.volume = 0.5;
    }
}

// Manual control toggle state
let forceMobileControls = false;

// Show/hide mobile controls based on device or manual toggle
function updateMobileControlsVisibility() {
    if (mobileControls) {
        const shouldShow = isMobileDevice() || forceMobileControls;
        if (shouldShow) {
            mobileControls.classList.add('active');
        } else {
            mobileControls.classList.remove('active');
        }

        // Update toggle button state
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

// Control toggle button handler
const controlToggle = document.getElementById('controlToggle');
if (controlToggle) {
    controlToggle.addEventListener('click', () => {
        forceMobileControls = !forceMobileControls;
        updateMobileControlsVisibility();
    });

    // Also support touch for mobile
    controlToggle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        forceMobileControls = !forceMobileControls;
        updateMobileControlsVisibility();
    });
}

// Initialize mobile controls visibility
updateMobileControlsVisibility();
window.addEventListener('resize', updateMobileControlsVisibility);

// Touch event handlers with visual feedback
function addTouchHandler(element, keyName, keyValue = true) {
    if (!element) return;

    const activateKey = () => {
        keys[keyName] = keyValue;
        element.classList.add('active');
    };

    const deactivateKey = () => {
        keys[keyName] = false;
        element.classList.remove('active');
    };

    // Touch events
    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        activateKey();
    });

    element.addEventListener('touchend', (e) => {
        e.preventDefault();
        deactivateKey();
    });

    element.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        deactivateKey();
    });

    // Also support click for testing
    element.addEventListener('mousedown', (e) => {
        activateKey();
    });

    element.addEventListener('mouseup', (e) => {
        deactivateKey();
    });

    element.addEventListener('mouseleave', (e) => {
        deactivateKey();
    });
}

// Add touch handlers for all mobile controls
addTouchHandler(mobileLeft, 'a', true);
addTouchHandler(mobileRight, 'd', true);
addTouchHandler(mobileJump, 'w', true);
addTouchHandler(mobileJump, ' ', true); // Also trigger space for jump
addTouchHandler(mobileAttack, 'j', true);
addTouchHandler(mobileShield, 'k', true);

// Exit and Restart button handlers
const mobileExit = document.getElementById('mobileExit');
const mobileRestart = document.getElementById('mobileRestart');

if (mobileExit) {
    mobileExit.addEventListener('click', () => {
        closeGame();
    });
    mobileExit.addEventListener('touchstart', (e) => {
        e.preventDefault();
        closeGame();
    });
}

if (mobileRestart) {
    mobileRestart.addEventListener('click', () => {
        resetGame();
    });
    mobileRestart.addEventListener('touchstart', (e) => {
        e.preventDefault();
        resetGame();
    });
}

// Game Functions
function openGame() {
    document.getElementById('gameModal').classList.add('active');
    playSound('windowOpen');
    resetGame();
    gameRunning = true;
    gameLoop();
}

function closeGame() {
    gameRunning = false;
    document.getElementById('gameModal').classList.remove('active');
}

function resetGame() {
    player = {
        x: 100,
        y: GROUND_Y - 60,
        width: 40,
        height: 60,
        vx: 0,
        vy: 0,
        speed: 5,
        jumpForce: -14,
        onGround: false,
        health: 120,
        maxHealth: 120,
        facing: 1,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        blocking: false,
        blockTimer: 0,
        hit: false,
        hitTimer: 0,
        color: '#4ade80'
    };

    boss = {
        x: 600,
        y: GROUND_Y - 70,
        width: 50,
        height: 70,
        vx: 0,
        vy: 0,
        speed: 3,
        health: 150,
        maxHealth: 150,
        facing: -1,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        blockTimer: 0,
        hit: false,
        hitTimer: 0,
        state: 'idle',
        stateTimer: 0,
        color: '#ef4444',
        pattern: 'normal'
    };

    particles = [];
    floatingTexts = [];
    screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };
    gameState = 'countdown';
    countdownValue = 3;
    countdownTimer = 0;
    playSound('countdown');
}

// Collision between player and boss
function handleEntityCollision() {
    // Check if player and boss overlap
    if (player.x < boss.x + boss.width &&
        player.x + player.width > boss.x &&
        player.y < boss.y + boss.height &&
        player.y + player.height > boss.y) {

        // Calculate overlap
        const overlapX = Math.min(player.x + player.width - boss.x, boss.x + boss.width - player.x);
        const overlapY = Math.min(player.y + player.height - boss.y, boss.y + boss.height - player.y);

        // Push them apart based on who's more to the right/below
        if (overlapX < overlapY) {
            // Horizontal collision - push apart
            const pushDir = (player.x + player.width / 2) < (boss.x + boss.width / 2) ? -1 : 1;
            player.x += pushDir * overlapX * 0.5;
            boss.x -= pushDir * overlapX * 0.5;
        } else {
            // Vertical collision - push apart
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

// Physics Functions
function applyPhysics(entity) {
    entity.vy += GRAVITY;
    entity.x += entity.vx;
    entity.y += entity.vy;
    entity.vx *= FRICTION;

    // Ground collision
    if (entity.y + entity.height > GROUND_Y) {
        entity.y = GROUND_Y - entity.height;
        entity.vy = 0;
        entity.onGround = true;
    } else {
        entity.onGround = false;
    }

    // Platform collision
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

    // Screen bounds
    if (entity.x < 0) entity.x = 0;
    if (entity.x + entity.width > canvas.width) entity.x = canvas.width - entity.width;
}

function checkAttackHit(attacker, target, range) {
    const attackX = attacker.facing === 1 ? attacker.x + attacker.width : attacker.x - range;
    return attackX < target.x + target.width &&
        attackX + range > target.x &&
        Math.abs(attacker.y - target.y) < 50;
}

function createParticle(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            color: color,
            size: Math.random() * 4 + 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            gravity: 0.15
        });
    }
}

function createFloatingText(x, y, text, color) {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        life: 40,
        vy: -1.5
    });
}

function triggerScreenShake(intensity) {
    screenShake.intensity = intensity;
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.life--;
        return p.life > 0;
    });
}

function updateFloatingTexts() {
    floatingTexts = floatingTexts.filter(t => {
        t.y += t.vy;
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

function updateBackground() {
    bgOffset += 0.2;
    backgroundStars.forEach(star => {
        star.brightness += star.twinkleSpeed;
        if (star.brightness > 1 || star.brightness < 0.2) {
            star.twinkleSpeed *= -1;
        }
    });
}

// Player Update
function updatePlayer() {
    // Movement
    if (keys['a'] || keys['arrowleft']) {
        player.vx = -player.speed;
        player.facing = -1;
    }
    if (keys['d'] || keys['arrowright']) {
        player.vx = player.speed;
        player.facing = 1;
    }

    // Jump
    if ((keys['w'] || keys[' '] || keys['arrowup']) && player.onGround) {
        player.vy = player.jumpForce;
        player.onGround = false;
        playSound('jump');
    }

    // Attack with cooldown
    if (keys['j'] && !player.attacking && !player.blocking && player.attackCooldown <= 0) {
        player.attacking = true;
        player.attackTimer = 20;
        player.attackCooldown = 25; // 25 frames cooldown after attack

        // Check hit
        if (checkAttackHit(player, boss, 50)) {
            if (boss.blocking) {
                // Blocked
                createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#fbbf24', 12);
                boss.vx = player.facing * 8;
                createFloatingText(boss.x + boss.width / 2, boss.y - 10, 'BLOCKED', '#fbbf24');
                triggerScreenShake(3);
            } else {
                // Hit
                boss.health -= 6;
                playSound('hit');
                boss.hit = true;
                boss.hitTimer = 15;
                createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ef4444', 15);
                createFloatingText(boss.x + boss.width / 2, boss.y - 10, '-6', '#ef4444');
                triggerScreenShake(5);

                if (boss.health <= 0) {
                    gameState = 'victory';
                }
            }
        }
    }

    // Block
    if (keys['k']) {
        player.blocking = true;
        player.blockTimer = 10;
    }

    // Timers
    if (player.attackTimer > 0) {
        player.attackTimer--;
        if (player.attackTimer === 0) player.attacking = false;
    }
    if (player.attackCooldown > 0) {
        player.attackCooldown--;
    }
    if (player.blockTimer > 0) {
        player.blockTimer--;
        if (player.blockTimer === 0) player.blocking = false;
    }
    if (player.hitTimer > 0) {
        player.hitTimer--;
        if (player.hitTimer === 0) player.hit = false;
    }

    applyPhysics(player);
}

// Boss AI - Smart Version
function updateBoss() {
    boss.stateTimer++;

    // Calculate distance to player
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const distX = Math.abs(dx);
    const distY = Math.abs(dy);
    const onSameLevel = distY < 80;

    // Boss can only block OR attack, not both at the same time
    // If already attacking, don't block
    if (!boss.attacking && boss.attackCooldown <= 30) {
        // Only set block if not currently in attack animation
        if (player.attacking && distX < 80 && onSameLevel) {
            boss.blockTimer = 15;
        }
    }

    // Update block state
    if (boss.blockTimer > 0 && !boss.attacking) {
        boss.blockTimer--;
        boss.blocking = true;
    } else {
        boss.blocking = false;
    }

    // Smart platform jumping
    const needsPlatform = player.y < boss.y - 50; // Player is above
    const shouldRetreat = player.attacking && distX < 100;

    // State machine with smart decisions
    if (boss.stateTimer > 45) {
        boss.stateTimer = 0;

        // Decide state based on situation - can't attack while blocking
        if (boss.blocking) {
            // If blocking, stay in retreat/approach mode
            boss.state = 'retreat';
        } else if (shouldRetreat && !boss.blocking) {
            boss.state = 'retreat';
        } else if (distX > 300) {
            // Far away - approach
            boss.state = 'approach';
        } else if (distX < 60 && onSameLevel && !boss.blocking) {
            // Close range - attack
            boss.state = 'attack';
        } else if (needsPlatform && boss.onGround) {
            // Player above - jump to platform
            boss.state = 'jumpPlatform';
        } else if (Math.random() < 0.3) {
            boss.state = 'idle';
        } else {
            boss.state = 'approach';
        }
    }

    // State behavior
    switch (boss.state) {
        case 'approach':
            boss.vx = dx > 0 ? boss.speed : -boss.speed;
            boss.facing = dx > 0 ? 1 : -1;

            // If player jumps, boss should try to jump too
            if (player.y < boss.y - 100 && boss.onGround && Math.random() < 0.05) {
                boss.vy = -12;
            }
            break;

        case 'attack':
            if (!boss.attacking && boss.attackCooldown <= 0) {
                boss.attacking = true;
                boss.attackTimer = 25;
                boss.attackCooldown = 50; // Boss attack cooldown
                // Charge attack
                boss.vx = boss.facing * 10;
            }

            if (boss.attackTimer > 0) {
                boss.attackTimer--;

                // Check player hit (only once per attack)
                if (boss.attackTimer < 18 && boss.attackTimer > 10 && checkAttackHit(boss, player, 65)) {
                    if (player.blocking) {
                        createParticle(player.x + player.width / 2, player.y + player.height / 2, '#fbbf24', 14);
                        player.vx = boss.facing * 12;
                        playSound('block');
                        createFloatingText(player.x + player.width / 2, player.y - 10, 'BLOCK', '#fbbf24');
                        triggerScreenShake(4);
                    } else {
                        player.health -= 5;
                        player.hit = true;
                        player.hitTimer = 15;
                        createParticle(player.x + player.width / 2, player.y + player.height / 2, '#ef4444', 16);
                        playSound('hit');
                        createFloatingText(player.x + player.width / 2, player.y - 10, '-5', '#ef4444');
                        triggerScreenShake(6);

                        if (player.health <= 0) {
                            gameState = 'gameover';
                            playSound('gameOver');
                        }
                    }
                }
            } else {
                boss.attacking = false;
            }
            break;

        case 'retreat':
            boss.vx = -boss.facing * (boss.speed * 1.2);
            // Jump while retreating
            if (boss.onGround && Math.random() < 0.1) {
                boss.vy = -10;
            }
            break;

        case 'jumpPlatform':
            // Find best platform to jump to
            let bestPlatform = null;
            let bestScore = -Infinity;

            platforms.forEach(plat => {
                // Score based on: being above boss, closer to player's x, and not too high
                const aboveBoss = plat.y < boss.y;
                const nearPlayerX = Math.abs(plat.x + plat.width / 2 - (player.x + player.width / 2)) < 150;
                const reachable = boss.y - plat.y < 200;

                let score = 0;
                if (aboveBoss) score += 3;
                if (nearPlayerX) score += 2;
                if (reachable) score += 1;

                if (score > bestScore) {
                    bestScore = score;
                    bestPlatform = plat;
                }
            });

            if (bestPlatform && boss.onGround) {
                // Jump toward platform
                const platCenterX = bestPlatform.x + bestPlatform.width / 2;
                const bossCenterX = boss.x + boss.width / 2;

                if (platCenterX > bossCenterX) {
                    boss.vx = boss.speed;
                    boss.facing = 1;
                } else {
                    boss.vx = -boss.speed;
                    boss.facing = -1;
                }

                // Jump
                boss.vy = -13;
                boss.state = 'approach'; // After jumping, continue approaching
            } else if (!boss.onGround) {
                // Mid-air: adjust position toward platform
                if (bestPlatform) {
                    const platCenterX = bestPlatform.x + bestPlatform.width / 2;
                    const bossCenterX = boss.x + boss.width / 2;
                    boss.vx = (platCenterX > bossCenterX) ? 3 : -3;
                }
            }
            break;

        default:
            // Idle - face player, slight movement
            boss.facing = dx > 0 ? 1 : -1;
            // Small hop to look alive
            if (boss.onGround && Math.random() < 0.02) {
                boss.vy = -6;
            }
    }

    // Additional smart behaviors
    // Anti-air: jump if player is above
    if (player.y < boss.y - 80 && boss.onGround && distX < 100) {
        if (Math.random() < 0.08) {
            boss.vy = -12;
        }
    }

    // Pursue vertically if player on platform
    if (!boss.onGround && player.onGround && Math.random() < 0.05) {
        boss.vx = dx > 0 ? boss.speed * 0.5 : -boss.speed * 0.5;
    }

    // Timers
    if (boss.hitTimer > 0) {
        boss.hitTimer--;
        if (boss.hitTimer === 0) boss.hit = false;
    }
    if (boss.attackCooldown > 0) {
        boss.attackCooldown--;
    }

    applyPhysics(boss);
}

// ========================================
// VISUAL RENDERING - ENHANCED
// ========================================

function drawBackground() {
    // Deep space gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a12');
    gradient.addColorStop(0.5, '#0f0f1a');
    gradient.addColorStop(1, '#151525');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Retro grid floor effect (below ground)
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const perspectiveOffset = (bgOffset % gridSize);

    // Horizontal grid lines with perspective
    for (let y = GROUND_Y + 10; y < canvas.height; y += gridSize) {
        const perspective = (y - GROUND_Y) / (canvas.height - GROUND_Y);
        const alpha = 0.08 * (1 - perspective);
        ctx.strokeStyle = `rgba(74, 222, 128, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Vertical grid lines
    for (let x = -perspectiveOffset; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x + (x - canvas.width / 2) * 0.3, canvas.height);
        ctx.stroke();
    }
    ctx.restore();

    // Stars
    backgroundStars.forEach(star => {
        const alpha = 0.3 + star.brightness * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Distant mountains / silhouettes
    ctx.fillStyle = '#0d0d15';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= canvas.width; x += 20) {
        const height = Math.sin(x * 0.01) * 30 + Math.sin(x * 0.03) * 15 + 20;
        ctx.lineTo(x, GROUND_Y - height);
    }
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Second layer of silhouettes
    ctx.fillStyle = '#12121c';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= canvas.width; x += 15) {
        const height = Math.sin(x * 0.015 + 2) * 20 + Math.sin(x * 0.04) * 10 + 10;
        ctx.lineTo(x, GROUND_Y - height);
    }
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.closePath();
    ctx.fill();
}

function drawGround() {
    // Ground base
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    // Ground top edge - glowing line
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ground texture - horizontal lines
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.15)';
    ctx.lineWidth = 1;
    for (let y = GROUND_Y + 10; y < canvas.height; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Ground edge highlight
    ctx.fillStyle = 'rgba(74, 222, 128, 0.1)';
    ctx.fillRect(0, GROUND_Y, canvas.width, 4);
}

function drawPlatforms() {
    platforms.forEach(plat => {
        // Platform shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(plat.x + 4, plat.y + 4, plat.width, plat.height);

        // Platform base
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        // Platform top surface
        ctx.fillStyle = '#334155';
        ctx.fillRect(plat.x, plat.y, plat.width, 6);

        // Platform highlight edge
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(plat.x, plat.y, plat.width, 2);

        // Platform border
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

        // Platform surface detail - small dots
        ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
        for (let i = 0; i < plat.width; i += 15) {
            ctx.fillRect(plat.x + i + 4, plat.y + 10, 4, 4);
        }

        // Platform support pillar (visual only)
        ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.fillRect(plat.x + plat.width / 2 - 4, plat.y + plat.height, 8, GROUND_Y - plat.y - plat.height);
    });
}

function drawShadow(x, y, width) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + width / 2, GROUND_Y - 2, width / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlayer() {
    const p = player;
    const facing = p.facing;

    // Shadow
    if (p.onGround) {
        drawShadow(p.x, p.y, p.width);
    } else {
        // Smaller shadow when in air
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(p.x + p.width / 2, GROUND_Y - 2, p.width / 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Hit flash
    if (p.hit && p.hitTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.hitTimer / 15 * 0.6})`;
        ctx.fillRect(p.x - 5, p.y - 5, p.width + 10, p.height + 10);
    }

    // Idle bobbing animation
    const bobOffset = p.onGround ? Math.sin(Date.now() / 300) * 1.5 : 0;

    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + bobOffset);
    if (facing === -1) ctx.scale(-1, 1);

    // Body color
    const bodyColor = p.hit ? '#ffffff' : p.color;
    const darkBodyColor = p.hit ? '#cccccc' : '#22c55e';

    // Legs
    const legOffset = Math.abs(p.vx) > 0.5 && p.onGround ? Math.sin(Date.now() / 80) * 4 : 0;
    ctx.fillStyle = darkBodyColor;
    // Left leg
    ctx.fillRect(-12, 15, 8, 18 + legOffset);
    // Right leg
    ctx.fillRect(4, 15, 8, 18 - legOffset);

    // Boots
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-13, 28 + legOffset, 10, 6);
    ctx.fillRect(3, 28 - legOffset, 10, 6);

    // Body / Torso
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-14, -5, 28, 22);

    // Armor details
    ctx.fillStyle = darkBodyColor;
    ctx.fillRect(-10, -2, 20, 3);
    ctx.fillRect(-10, 5, 20, 3);
    ctx.fillRect(-10, 12, 20, 3);

    // Belt
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-14, 15, 28, 4);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-2, 15, 4, 4);

    // Head
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-10, -22, 20, 18);

    // Helmet visor
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-8, -18, 16, 8);

    // Eye glow
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(-4, -16, 4, 3);

    // Helmet crest
    ctx.fillStyle = darkBodyColor;
    ctx.fillRect(-2, -26, 4, 6);
    ctx.fillRect(-4, -24, 8, 3);

    // Arms
    const armSwing = p.attacking ? -20 : (Math.abs(p.vx) > 0.5 && p.onGround ? Math.sin(Date.now() / 80 + Math.PI) * 6 : 0);
    ctx.fillStyle = bodyColor;
    // Left arm (back)
    ctx.fillRect(-18, -5, 6, 14 + armSwing * 0.3);
    // Right arm (front)
    ctx.fillRect(12, -5, 6, 14 + armSwing);

    // Hands
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

        // Sword blade
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, -28, 5, 32);

        // Sword edge highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -28, 2, 32);

        // Sword glow
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.strokeRect(-1, -29, 7, 34);
        ctx.shadowBlur = 0;

        // Hilt
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-3, 2, 11, 4);
        ctx.fillRect(-1, 6, 7, 3);

        // Crossguard
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-6, -1, 17, 3);

        ctx.restore();

        // Sword trail
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(16, 5, 20, swingAngle - 0.3, swingAngle);
        ctx.stroke();
    } else {
        // Sword sheathed / idle
        ctx.save();
        ctx.translate(16, 5);
        ctx.rotate(0.1);

        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, -20, 4, 24);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-2, 2, 8, 3);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-4, -1, 12, 2);

        ctx.restore();
    }

    // Shield
    if (p.blocking) {
        ctx.save();
        ctx.translate(-18, 5);

        // Shield glow
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 12;

        // Shield body
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(10, -10);
        ctx.lineTo(10, 15);
        ctx.lineTo(0, 20);
        ctx.lineTo(-10, 15);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Shield border
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Shield center
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(0, 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Shield cross
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 12);
        ctx.moveTo(-6, 2);
        ctx.lineTo(6, 2);
        ctx.stroke();

        ctx.restore();
    }

    ctx.restore();
}

function drawBoss() {
    const b = boss;
    const facing = b.facing;

    // Shadow
    if (b.onGround) {
        drawShadow(b.x, b.y, b.width);
    }

    // Hit flash
    if (b.hit && b.hitTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${b.hitTimer / 15 * 0.6})`;
        ctx.fillRect(b.x - 5, b.y - 5, b.width + 10, b.height + 10);
    }

    // Idle breathing animation
    const breatheScale = 1 + Math.sin(Date.now() / 400) * 0.02;

    ctx.save();
    ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
    ctx.scale(breatheScale, breatheScale);
    if (facing === -1) ctx.scale(-1, 1);

    // Body color
    const bodyColor = b.hit ? '#ffffff' : b.color;
    const darkBodyColor = b.hit ? '#cccccc' : '#b91c1c';

    // Legs
    const legOffset = Math.abs(b.vx) > 0.5 && b.onGround ? Math.sin(Date.now() / 100) * 5 : 0;
    ctx.fillStyle = darkBodyColor;
    ctx.fillRect(-15, 20, 10, 18 + legOffset);
    ctx.fillRect(5, 20, 10, 18 - legOffset);

    // Claws / feet
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-17, 32 + legOffset, 14, 6);
    ctx.fillRect(3, 32 - legOffset, 14, 6);
    ctx.fillStyle = '#525252';
    ctx.fillRect(-16, 33 + legOffset, 4, 4);
    ctx.fillRect(12, 33 - legOffset, 4, 4);

    // Body / Torso - larger and more menacing
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-18, -10, 36, 32);

    // Armor plates
    ctx.fillStyle = darkBodyColor;
    ctx.fillRect(-14, -6, 28, 6);
    ctx.fillRect(-14, 4, 28, 6);
    ctx.fillRect(-14, 14, 28, 6);

    // Spikes on back
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(-18, -5);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-18, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-18, 8);
    ctx.lineTo(-24, 13);
    ctx.lineTo(-18, 18);
    ctx.fill();

    // Head
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-14, -28, 28, 20);

    // Horns
    ctx.fillStyle = '#525252';
    ctx.beginPath();
    ctx.moveTo(-12, -26);
    ctx.lineTo(-20, -38);
    ctx.lineTo(-8, -28);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, -26);
    ctx.lineTo(20, -38);
    ctx.lineTo(8, -28);
    ctx.fill();

    // Eyes - glowing red
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-10, -22, 20, 10);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-6, -20, 5, 4);
    ctx.fillRect(2, -20, 5, 4);

    // Eye glow effect
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(-5, -19, 2, 2);
    ctx.fillRect(3, -19, 2, 2);
    ctx.shadowBlur = 0;

    // Mouth
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-6, -10, 12, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -9, 8, 2);

    // Arms
    const armSwing = b.attacking ? -25 : (Math.abs(b.vx) > 0.5 && b.onGround ? Math.sin(Date.now() / 100 + Math.PI) * 7 : 0);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-24, -5, 8, 16 + armSwing * 0.3);
    ctx.fillRect(16, -5, 8, 16 + armSwing);

    // Hands / claws
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-26, 8 + armSwing * 0.3, 12, 6);
    ctx.fillRect(14, 8 + armSwing, 12, 6);

    // Sword (boss uses a larger sword)
    if (b.attacking) {
        const swingProgress = 1 - (b.attackTimer / 25);
        const swingAngle = swingProgress * Math.PI * 0.9 - Math.PI * 0.45;

        ctx.save();
        ctx.translate(20, 5);
        ctx.rotate(swingAngle);

        // Sword blade - larger
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, -35, 7, 40);

        // Sword edge
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -35, 3, 40);

        // Sword glow
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-1, -36, 9, 42);
        ctx.shadowBlur = 0;

        // Hilt
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(-3, 3, 13, 5);
        ctx.fillRect(-1, 8, 9, 4);

        // Crossguard
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-8, 0, 23, 4);

        ctx.restore();

        // Sword trail
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(20, 5, 25, swingAngle - 0.4, swingAngle);
        ctx.stroke();
    } else {
        // Idle sword
        ctx.save();
        ctx.translate(20, 5);
        ctx.rotate(0.15);

        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, -24, 5, 28);
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(-2, 2, 9, 4);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-5, -1, 15, 3);

        ctx.restore();
    }

    // Shield
    if (b.blocking) {
        ctx.save();
        ctx.translate(-22, 5);

        // Shield glow
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 14;

        // Shield body - larger
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(12, -12);
        ctx.lineTo(12, 18);
        ctx.lineTo(0, 24);
        ctx.lineTo(-12, 18);
        ctx.lineTo(-12, -12);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Shield border
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Shield center
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(0, 3, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    ctx.restore();
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
    floatingTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.life / 40;
        ctx.fillStyle = t.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}

function drawHealthBars() {
    // Player health bar background
    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.fillRect(20, 20, 200, 24);
    ctx.strokeRect(20, 20, 200, 24);

    // Player health fill
    const playerHealthPercent = Math.max(0, player.health / player.maxHealth);
    const playerHealthColor = player.health > 30 ? '#4ade80' : '#ef4444';
    ctx.fillStyle = playerHealthColor;
    ctx.fillRect(22, 22, playerHealthPercent * 196, 20);

    // Player health segments
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let i = 1; i < 10; i++) {
        ctx.fillRect(22 + (196 / 10) * i, 22, 2, 20);
    }

    // Player name
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText('PLAYER', 25, 36);

    // Boss health bar background
    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.fillRect(canvas.width - 220, 20, 200, 24);
    ctx.strokeRect(canvas.width - 220, 20, 200, 24);

    // Boss health fill
    const bossHealthPercent = Math.max(0, boss.health / boss.maxHealth);
    const bossHealthColor = boss.health > 50 ? '#ef4444' : '#f97316';
    ctx.fillStyle = bossHealthColor;
    ctx.fillRect(canvas.width - 218, 22, bossHealthPercent * 196, 20);

    // Boss health segments
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let i = 1; i < 10; i++) {
        ctx.fillRect(canvas.width - 218 + (196 / 10) * i, 22, 2, 20);
    }

    // Boss name
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText('BOSS', canvas.width - 25, 36);
    ctx.textAlign = 'left';
}

function drawCountdown() {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Countdown number or GO
    const displayText = countdownValue > 0 ? countdownValue.toString() : 'GO!';
    const pulseScale = countdownValue > 0 ? 1 + Math.sin(Date.now() / 100) * 0.1 : 1.2;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(pulseScale, pulseScale);

    // Text shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = '72px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, 4, 4);

    // Main text
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 20;
    ctx.fillText(displayText, 0, 0);
    ctx.shadowBlur = 0;

    ctx.restore();
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Game Over text
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 15;
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', 0, -20);

    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText('Press R to Restart', 0, 20);

    ctx.restore();

    if (keys['r']) {
        resetGame();
    }
}

function drawVictory() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Victory text
    ctx.fillStyle = '#4ade80';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 15;
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VICTORY!', 0, -20);

    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText('Press R to Play Again', 0, 20);

    ctx.restore();

    if (keys['r']) {
        resetGame();
    }
}

function drawVignette() {
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.4,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.8
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Main Rendering
function draw() {
    ctx.save();

    // Apply screen shake
    ctx.translate(screenShake.x, screenShake.y);

    // Background
    drawBackground();

    // Ground
    drawGround();

    // Platforms
    drawPlatforms();

    // Characters (drawn back-to-front based on Y position for pseudo-depth)
    if (player.y + player.height < boss.y + boss.height) {
        drawPlayer();
        drawBoss();
    } else {
        drawBoss();
        drawPlayer();
    }

    // Particles
    drawParticles();

    // Floating damage numbers
    drawFloatingTexts();

    // Skip UI if in countdown (but still draw background elements)
    if (gameState === 'countdown') {
        drawCountdown();
        ctx.restore();
        return;
    }

    // Health bars
    drawHealthBars();

    // Game state overlays
    if (gameState === 'gameover') {
        drawGameOver();
    }

    if (gameState === 'victory') {
        drawVictory();
    }

    // Vignette effect
    drawVignette();

    ctx.restore();
}

// Game Loop
function gameLoop() {
    if (!gameRunning) return;

    // Countdown state
    if (gameState === 'countdown') {
        countdownTimer++;
        if (countdownTimer >= 60) { // 1 second per countdown
            countdownTimer = 0;
            countdownValue--;
            playSound('countdown');
            if (countdownValue <= 0) {
                gameState = 'playing';
            }
        }
    }

    if (gameState === 'playing') {
        updatePlayer();
        updateBoss();
        updateParticles();
        updateFloatingTexts();
        updateScreenShake();
        handleEntityCollision(); // Prevent overlapping
    }

    updateBackground();
    draw();
    requestAnimationFrame(gameLoop);
}

// Event Listeners
document.getElementById('playGameBtn').addEventListener('click', openGame);
document.getElementById('gameClose').addEventListener('click', closeGame);
document.getElementById('gameOverlay').addEventListener('click', closeGame);
