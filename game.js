// ========================================
// Browser-Based Minigame: Turki's Battle
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
            life: 30,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
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
                createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#fbbf24', 8);
                boss.vx = player.facing * 8;
            } else {
                // Hit
                boss.health -= 6;
                playSound('hit');
                boss.hit = true;
                boss.hitTimer = 15;
                createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ef4444', 10);

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
                        createParticle(player.x + player.width / 2, player.y + player.height / 2, '#fbbf24', 10);
                        player.vx = boss.facing * 12;
                        playSound('block');
                    } else {
                        player.health -= 5;
                        player.hit = true;
                        player.hitTimer = 15;
                        createParticle(player.x + player.width / 2, player.y + player.height / 2, '#ef4444', 12);
                        playSound('hit');

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

// Rendering
function draw() {
    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    ctx.fillStyle = '#1f1f1f';
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    platforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
    });

    // Draw ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.strokeStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // Draw player
    ctx.fillStyle = player.hit ? '#ffffff' : player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Player eyes
    ctx.fillStyle = '#0a0a0a';
    const eyeX = player.facing === 1 ? player.x + 25 : player.x + 8;
    ctx.fillRect(eyeX, player.y + 15, 6, 6);

    // Player sword
    if (player.attacking) {
        ctx.fillStyle = '#fbbf24';
        const swordX = player.facing === 1 ? player.x + player.width : player.x - 30;
        ctx.fillRect(swordX, player.y + 25, 30, 8);
    }

    // Player shield
    if (player.blocking) {
        ctx.fillStyle = '#3b82f6';
        const shieldX = player.facing === 1 ? player.x + player.width - 5 : player.x - 5;
        ctx.fillRect(shieldX, player.y + 20, 10, 30);
    }

    // Draw boss
    ctx.fillStyle = boss.hit ? '#ffffff' : boss.color;
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

    // Boss eyes
    ctx.fillStyle = '#0a0a0a';
    const bossEyeX = boss.facing === 1 ? boss.x + 35 : boss.x + 8;
    ctx.fillRect(bossEyeX, boss.y + 15, 8, 8);

    // Boss sword
    if (boss.attacking) {
        ctx.fillStyle = '#fbbf24';
        const bossSwordX = boss.facing === 1 ? boss.x + boss.width : boss.x - 35;
        ctx.fillRect(bossSwordX, boss.y + 25, 35, 10);
    }

    // Boss shield - only show when blocking
    if (boss.blocking) {
        ctx.fillStyle = '#3b82f6';
        const bossShieldX = boss.facing === 1 ? boss.x + boss.width - 8 : boss.x - 8;
        ctx.fillRect(bossShieldX, boss.y + 20, 12, 35);
    }

    // Draw particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    // Skip drawing health bars and game elements if in countdown
    if (gameState === 'countdown') {
        // Still draw background and countdown
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw platforms (minimal)
        ctx.fillStyle = '#374151';
        ctx.fillRect(0, GROUND_Y, canvas.width, 60);

        // Draw countdown
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '72px "Press Start 2P"';
        ctx.textAlign = 'center';

        let displayText = countdownValue > 0 ? countdownValue.toString() : 'GO!';
        ctx.fillText(displayText, canvas.width / 2, canvas.height / 2 + 20);
        ctx.textAlign = 'left';
        return;
    }

    // Draw health bars
    // Player health
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(20, 20, 200, 20);
    ctx.fillStyle = player.health > 30 ? '#4ade80' : '#ef4444';
    ctx.fillRect(22, 22, (player.health / player.maxHealth) * 196, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('PLAYER', 25, 34);

    // Boss health
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(canvas.width - 220, 20, 200, 20);
    ctx.fillStyle = boss.health > 50 ? '#ef4444' : '#f97316';
    ctx.fillRect(canvas.width - 218, 22, (boss.health / boss.maxHealth) * 196, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BOSS', canvas.width - 212, 34);

    // Game state overlays
    if (gameState === 'gameover') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444';
        ctx.font = '40px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = 'left';

        if (keys['r']) {
            resetGame();
        }
    }

    if (gameState === 'victory') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#4ade80';
        ctx.font = '40px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('Press R to Play Again', canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = 'left';

        if (keys['r']) {
            resetGame();
        }
    }
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
        handleEntityCollision(); // Prevent overlapping
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// Event Listeners
document.getElementById('playGameBtn').addEventListener('click', openGame);
document.getElementById('gameClose').addEventListener('click', closeGame);
document.getElementById('gameOverlay').addEventListener('click', closeGame);
