/**
 * Souls-like Battle Game - Combat Module (Ashen Oath overhaul)
 *
 * Player — Elden Ring moveset: light 3-hit combo, sprint lunge and roll thrust,
 * charged heavy (tap heavy / full charge guard-crush), guard counter after a
 * successful block, dodge roll or backstep, walking estus heals, knockdowns with
 * wake-up i-frames, parry -> riposte criticals.
 *
 * Boss — reactive Elden Ring encounter: per-frame perception of the player's
 * inputs behind a difficulty-scaled human reaction delay, delayed (held) attacks,
 * data-driven combo strings with branches, roll catching that times a swing to
 * land just after the roll's i-frames, tracking that freezes at 75 % of the
 * windup, turn punishes, spacing stalking, a leaping slam with a radial AoE, and
 * three phases (roar transition, flaming blade, unblockable ashen nova).
 *
 * Difficulties: easy | medium | hard (see DIFFICULTIES).
 */
import * as THREE from 'three';
import { clampToArena } from './engine.js';

const _v = new THREE.Vector3();
const _tv = new THREE.Vector3();
const _t2 = new THREE.Vector3();

function angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
}
function forward(heading, out) {
    return out.set(Math.sin(heading), 0, Math.cos(heading));
}
function easeOut(x) { return 1 - (1 - x) * (1 - x); }
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

/** Weighted pick from [[value, weight], ...]; deterministic under a stubbed random. */
function pickWeighted(list) {
    let total = 0;
    for (let i = 0; i < list.length; i++) total += list[i][1];
    let roll = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
        roll -= list[i][1];
        if (roll <= 0) return list[i][0];
    }
    return list[list.length - 1][0];
}

/**
 * LOCAL move direction of a velocity relative to a heading (a fighter's +Z is
 * forward, +X is right). Returns a shared scratch record — read it immediately.
 */
const _local = { x: 0, z: 0, speed: 0 };
function localMove(vel, heading) {
    const speed = Math.hypot(vel.x, vel.z);
    if (speed < 0.001) {
        _local.x = 0; _local.z = 0; _local.speed = 0;
        return _local;
    }
    const sin = Math.sin(heading);
    const cos = Math.cos(heading);
    _local.x = (vel.x * cos - vel.z * sin) / speed;
    _local.z = (vel.x * sin + vel.z * cos) / speed;
    _local.speed = speed;
    return _local;
}

export const COMBAT_TUNING = Object.freeze({
    // Player movement / defense
    ROLL_COST: 26,
    ROLL_DURATION: 0.56,
    BACKSTEP_COST: 16,
    BACKSTEP_DURATION: 0.4,
    BACKSTEP_DIST: 1.8,
    BACKSTEP_IFRAME_START: 0.04,
    BACKSTEP_IFRAME_END: 0.2,
    INPUT_BUFFER: 0.2,
    PARRY_COOLDOWN: 0.65,
    // Offense
    GUARD_COUNTER_WINDOW: 0.6,
    HEAVY_CHAMBER: 0.32,
    HEAVY_CHARGE_MAX: 0.9,
    // Estus
    HEAL_DURATION: 1.4,
    HEAL_LAND: 0.75,
    HEAL_SPEED: 1.4,
    // Knockdown
    KNOCKDOWN_DURATION: 1.4,
    KNOCKDOWN_IFRAME_AT: 0.25,
    KNOCKDOWN_ROLL_AT: 0.9,
    KNOCKDOWN_PUSH: 1.5,
    // Boss phases and pacing
    PHASE2_AT: 0.65,
    PHASE3_AT: 0.3,
    TRANSITION_DURATION: 1.4,
    WINDUP_FLOOR: 0.26,
    POISE_REGEN_DELAY: 3,
    POISE_REGEN_RATE: 0.25,
    STRING_BREATHER: 0.62,
    SINGLE_BREATHER: 0.3,
    STANCE_BREAK_POISE: 1.6,
    STANCE_BREAK_PARRY: 2.5,
    CHAIN_RECOVER: 0.35,
    LEAP_HEIGHT: 1.7,
});

/**
 * Difficulty tables. Multipliers unless noted: `bossDamage`/`playerDamage` scale
 * damage, `windupMult` >= 1 slows boss windups, `thinkMult` stretches boss
 * decision intervals, `comboExtend` is the chance to lengthen a finished string,
 * `breather` scales the post-string punish window, `delayChance`/`maxDelay` drive
 * the held delayed attacks, `reactChance`/`reactionDelay` gate the boss reading
 * player inputs, and `rollCatch` is the chance it times a swing past roll
 * i-frames. Frozen — constructors read these live.
 */
export const DIFFICULTIES = Object.freeze({
    easy: Object.freeze({
        name: 'easy',
        bossHp: 700,
        bossDamage: 0.55,
        windupMult: 1.25,
        delayChance: 0.08,
        maxDelay: 0.25,
        reactChance: 0.35,
        reactionDelay: 0.35,
        rollCatch: 0.0,
        thinkMult: 1.45,
        comboExtend: 0.12,
        breather: 1.5,
        aggression: 0.75,
        playerHp: 130,
        flasks: 4,
        healAmount: 60,
        parryWindow: 0.2,
        iframeStart: 0.06,
        iframeEnd: 0.36,
        poiseMax: 75,
        playerDamage: 1.15,
    }),
    medium: Object.freeze({
        name: 'medium',
        bossHp: 850,
        bossDamage: 0.8,
        windupMult: 1.08,
        delayChance: 0.2,
        maxDelay: 0.45,
        reactChance: 0.6,
        reactionDelay: 0.18,
        rollCatch: 0.35,
        thinkMult: 1.1,
        comboExtend: 0.3,
        breather: 1.0,
        aggression: 1.0,
        playerHp: 100,
        flasks: 3,
        healAmount: 45,
        parryWindow: 0.15,
        iframeStart: 0.08,
        iframeEnd: 0.3,
        poiseMax: 100,
        playerDamage: 1.0,
    }),
    hard: Object.freeze({
        name: 'hard',
        bossHp: 1000,
        bossDamage: 1.05,
        windupMult: 1.0,
        delayChance: 0.38,
        maxDelay: 0.7,
        reactChance: 0.9,
        reactionDelay: 0.08,
        rollCatch: 0.65,
        thinkMult: 0.85,
        comboExtend: 0.55,
        breather: 0.65,
        aggression: 1.3,
        playerHp: 90,
        flasks: 2,
        healAmount: 35,
        parryWindow: 0.12,
        iframeStart: 0.08,
        iframeEnd: 0.3,
        poiseMax: 115,
        playerDamage: 0.92,
    }),
});

export const DIFFICULTY_ORDER = Object.freeze(['easy', 'medium', 'hard']);

function difficultyOf(name) {
    return DIFFICULTIES[name] || DIFFICULTIES.medium;
}

// ======================================================================
// PLAYER — Elden Ring moveset
// ======================================================================

/** Light 3-hit combo (as before) with its own poise damage per swing. */
export const PLAYER_ATTACKS = Object.freeze([
    Object.freeze({ type: 0, windup: 0.22, active: 0.12, recover: 0.28, range: 2.1, arc: 1.9, damage: 22, poiseDamage: 18, stamina: 18 }),
    Object.freeze({ type: 1, windup: 0.16, active: 0.12, recover: 0.28, range: 2.1, arc: 1.9, damage: 24, poiseDamage: 18, stamina: 18 }),
    Object.freeze({ type: 2, windup: 0.3, active: 0.14, recover: 0.42, range: 2.3, arc: 1.4, damage: 34, poiseDamage: 30, stamina: 24 }),
]);

const RUNNING_ATTACK = Object.freeze({ type: 3, windup: 0.2, active: 0.16, recover: 0.34, range: 2.5, arc: 1.5, damage: 28, poiseDamage: 20, stamina: 20, running: true });
const ROLL_ATTACK = Object.freeze({ type: 3, windup: 0.12, active: 0.12, recover: 0.3, range: 2.3, arc: 1.6, damage: 26, poiseDamage: 20, stamina: 16, rollAttack: true });
const RIPOSTE = Object.freeze({ type: 9, windup: 0.24, active: 0.14, recover: 0.5, range: 2.4, arc: 1.6, damage: 95, poiseDamage: 60, stamina: 0, riposte: true, critical: true });
const HEAVY_BASE = Object.freeze({ type: 2, windup: COMBAT_TUNING.HEAVY_CHAMBER, active: 0.16, recover: 0.5, range: 2.4, arc: 1.5, damage: 32, poiseDamage: 36, stamina: 26, heavy: true });
const GUARD_COUNTER = Object.freeze({ type: 8, windup: 0.16, active: 0.14, recover: 0.4, range: 2.3, arc: 2.0, damage: 26, poiseDamage: 46, stamina: 18, guardCounter: true });

const PLAYER_STATE_DURATION = Object.freeze({
    roll: COMBAT_TUNING.ROLL_DURATION,
    backstep: COMBAT_TUNING.BACKSTEP_DURATION,
    stagger: 0.45,
    guardbroken: 2.0,
    parry: 0.4,
    heal: COMBAT_TUNING.HEAL_DURATION,
    knockdown: COMBAT_TUNING.KNOCKDOWN_DURATION,
    dead: 1.2,
    victory: 99,
});

export class Player {
    constructor(rig, { difficulty = 'medium' } = {}) {
        this.rig = rig;
        this.pos = rig.root.position;
        this.difficulty = difficulty in DIFFICULTIES ? difficulty : 'medium';
        this.reset();
    }

    setDifficulty(name) {
        if (name in DIFFICULTIES) this.difficulty = name;
    }

    get diff() { return difficultyOf(this.difficulty); }

    reset() {
        const d = this.diff;
        this.pos.set(0, 0, 5.5);
        this.heading = Math.PI;           // face -z (toward boss spawn)
        this.vel = new THREE.Vector3();
        this.hp = this.maxHp = d.playerHp;
        this.stamina = this.maxStamina = 100;
        this.estus = this.estusMax = d.flasks;
        this.state = 'idle';
        this.stateTime = 0;
        this.comboIndex = 0;
        this.comboQueued = false;
        this.iframes = 0;
        this.parryWindow = 0;
        this.parryCooldown = 0;
        this.riposteWindow = 0;
        this.guardCounterWindow = 0;
        this.rollAttackWindow = 0;
        this.staminaDelay = 0;
        this.blockHeld = false;
        this.sprinting = false;
        this.rollDir = new THREE.Vector3(0, 0, -1);
        this.knockDir = new THREE.Vector3(0, 0, 1);
        this.currentAttack = null;
        this.attackHitDone = false;
        this.healed = false;
        this.moveSpeed = 0;
        this.heavyHeld = false;
        this.chargeTime = 0;
        this.chargeReadyFired = false;
        this.attackBuffer = false;
        this.rollBuffer = false;
        this.healBuffer = false;
        this.bufferedRollDir = null;
        this.bufferTimers = { attack: 0, roll: 0, heal: 0 };
        this.boss = null;
        this.ctx = null;
        this.rig.root.visible = true;
    }

    get dead() { return this.state === 'dead'; }
    get busy() {
        return ['attack', 'roll', 'backstep', 'stagger', 'guardbroken', 'heal', 'dead', 'victory', 'parry', 'knockdown'].includes(this.state);
    }
    /** True while the swing should leave a weapon trail. */
    get trailActive() {
        const atk = this.currentAttack;
        if (!atk || this.state !== 'attack') return false;
        return this.stateTime >= atk.windup - 0.05 && this.stateTime <= atk.windup + atk.active + atk.recover * 0.12;
    }

    spendStamina(n) {
        this.stamina = Math.max(0, this.stamina - n);
        this.staminaDelay = 0.8;
    }

    // ------------------------------------------------------------------
    // Edge-triggered actions (input layer)
    // ------------------------------------------------------------------

    /** Light attack (R1). Context-sensitive: riposte > roll attack > sprint lunge > combo. */
    tryAttack() {
        if (this.dead || this.state === 'victory') return false;
        if (this.rollBuffer) return false;
        if (this.canRiposte()) return this.startRiposte();
        if (this.state === 'attack') {
            const atk = this.currentAttack;
            if (atk && !atk.heavy && !atk.guardCounter && this.stateTime > atk.windup * 0.6 &&
                this.comboIndex < PLAYER_ATTACKS.length - 1) {
                this.comboQueued = true;
            }
            return false;
        }
        if (this.state === 'roll') {
            // Press during the tail of the roll -> the press buffers into a roll attack
            if (this.stateTime > COMBAT_TUNING.ROLL_DURATION * 0.6) this.queueInput('attack');
            return false;
        }
        if (this.state === 'stagger' || this.state === 'guardbroken' || this.state === 'parry' || this.state === 'knockdown') {
            this.queueInput('attack');
            return false;
        }
        if (this.busy) return false;
        if (this.rollAttackWindow > 0) return this.startRollAttack();
        if (this.state === 'run' && this.sprinting) return this.startRunAttack();
        if (this.stamina < PLAYER_ATTACKS[0].stamina) return false;
        this.startSwing(0);
        return true;
    }

    /**
     * Heavy attack (R2). setHeavy(true) starts a heavy; holding keeps the chamber
     * and builds charge up to ~0.9 s (full charge = type 7 with more damage and
     * poise damage, and a one-shot 'chargeReady' event); setHeavy(false) releases.
     * Within ~0.6 s of a successfully blocked hit it becomes a rising-slash guard
     * counter (type 8) instead.
     */
    setHeavy(held) {
        if (!held) {
            if (this.heavyHeld) this.releaseHeavy();
            return;
        }
        if (this.heavyHeld || this.dead || this.busy) return;
        if (this.guardCounterWindow > 0) {
            this.guardCounterWindow = 0;
            this.comboIndex = 0;
            this.beginAttack(GUARD_COUNTER);
            this.ctx?.onPlayerEvent?.('guardCounter', {});
            return;
        }
        this.heavyHeld = true;
        this.chargeTime = 0;
        this.chargeReadyFired = false;
        this.comboIndex = 0;
        this.beginAttack(HEAVY_BASE, {
            heavy: true,
            baseDamage: Math.round(HEAVY_BASE.damage * this.diff.playerDamage),
            basePoise: HEAVY_BASE.poiseDamage,
            charge: 0,
        });
    }

    /** Release the chambered heavy (early release or full charge). */
    releaseHeavy() {
        this.heavyHeld = false;
        const atk = this.currentAttack;
        if (!atk || !atk.heavy || this.state !== 'attack') return;
        const charge = Math.min(1, this.chargeTime / COMBAT_TUNING.HEAVY_CHARGE_MAX);
        atk.charge = charge;
        atk.windup = this.stateTime + 0.06;   // short release beat, then the smash
        if (charge >= 0.995) {
            atk.type = 7;
            atk.charged = true;
            atk.damage = Math.round(atk.baseDamage * 1.6);
            atk.poiseDamage = Math.round(atk.basePoise * 1.8);
        } else {
            atk.damage = Math.round(atk.baseDamage * (1 + 0.45 * charge));
            atk.poiseDamage = Math.round(atk.basePoise * (1 + 0.5 * charge));
        }
    }

    /**
     * Dodge. A real direction rolls; a zero direction backsteps (cheaper, short
     * i-frames, ~1.8 units backward, guard up). Returns whether input was accepted.
     */
    tryRoll(moveDir, locked) {
        if (this.dead) return false;
        const dir = moveDir && typeof moveDir.x === 'number' ? moveDir : { x: 0, z: 0 };
        if (this.state === 'knockdown') {
            // Roll out of the knockdown once the wake-up window opens
            if (this.stateTime >= COMBAT_TUNING.KNOCKDOWN_ROLL_AT) return this.startRoll(dir, locked);
            this.queueInput('roll');
            this.bufferedRollDir = { direction: new THREE.Vector3(dir.x || 0, 0, dir.z || 0), locked };
            return false;
        }
        // Buffer roll out of attack recovery (last 0.12 s) so cancels feel responsive
        if (this.state === 'attack' && this.currentAttack) {
            const a = this.currentAttack;
            if (this.stateTime > a.windup + a.active + a.recover - 0.12) {
                this.queueInput('roll');
                this.bufferedRollDir = { direction: new THREE.Vector3(dir.x || 0, 0, dir.z || 0), locked };
                return true;
            }
            return false;
        }
        if (this.state === 'stagger' || this.state === 'guardbroken' || this.state === 'heal') {
            this.queueInput('roll');
            this.bufferedRollDir = { direction: new THREE.Vector3(dir.x || 0, 0, dir.z || 0), locked };
            return true;
        }
        const isBackstep = !dir.x && !dir.z;
        if (this.busy || this.stamina < (isBackstep ? COMBAT_TUNING.BACKSTEP_COST : COMBAT_TUNING.ROLL_COST)) return false;
        return this.startRoll(dir, locked);
    }

    startRoll(moveDir, locked) {
        this.clearBuffers();
        this.parryWindow = 0;
        this.stateTime = 0;
        this.iframes = 0;
        const x = moveDir.x || 0;
        const z = moveDir.z || 0;
        if (Math.abs(x) < 0.01 && Math.abs(z) < 0.01) {
            // Backstep: hop backward on the spot, keep facing
            this.spendStamina(COMBAT_TUNING.BACKSTEP_COST);
            this.state = 'backstep';
            forward(this.heading, this.rollDir).negate();
            this.ctx?.onPlayerEvent?.('backstep', {});
            return true;
        }
        this.spendStamina(COMBAT_TUNING.ROLL_COST);
        this.state = 'roll';
        this.rollDir.set(x, 0, z).normalize();
        this.heading = Math.atan2(this.rollDir.x, this.rollDir.z);
        return true;
    }

    startRollAttack() {
        this.rollAttackWindow = 0;
        this.comboIndex = 0;
        this.beginAttack(ROLL_ATTACK);
        this.ctx?.onPlayerEvent?.('rollAttack', {});
        return true;
    }

    startRunAttack() {
        this.comboIndex = 0;
        this.beginAttack(RUNNING_ATTACK);
        this.ctx?.onPlayerEvent?.('runAttack', {});
        return true;
    }

    /** A riposte needs an open boss (vulnerable) in front and in reach. */
    canRiposte() {
        if (this.state !== 'idle' && this.state !== 'run' && this.state !== 'block') return false;
        const boss = this.boss;
        const bossOpen = boss && !boss.dead && boss.vulnerable;
        if (!bossOpen && this.riposteWindow <= 0) return false;
        if (boss && !boss.dead) {
            _tv.subVectors(boss.pos, this.pos);
            _tv.y = 0;
            if (_tv.length() > RIPOSTE.range + 0.6) return false;
            if (Math.abs(angleDiff(Math.atan2(_tv.x, _tv.z), this.heading)) > RIPOSTE.arc / 2 + 0.35) return false;
        }
        return true;
    }

    startRiposte() {
        this.riposteWindow = 0;
        this.comboIndex = 0;
        this.beginAttack(RIPOSTE, { riposte: true });
        return true;
    }

    startSwing(index) {
        const atk = PLAYER_ATTACKS[index] || PLAYER_ATTACKS[0];
        this.comboIndex = index;
        this.comboQueued = false;
        this.beginAttack(atk);
    }

    beginAttack(base, extra = null) {
        this.parryWindow = 0;
        this.heavyHeld = base.heavy ? this.heavyHeld : false;
        this.state = 'attack';
        this.stateTime = 0;
        this.currentAttack = {
            ...base,
            damage: Math.round(base.damage * this.diff.playerDamage),
            ...(extra || {}),
        };
        this.attackHitDone = false;
        if (base.stamina) this.spendStamina(base.stamina);
    }

    /** Estus: lands at ~0.75 s for the difficulty's healAmount; you may walk. */
    tryHeal(ctx) {
        if (this.dead) return false;
        if (this.state === 'roll' || this.state === 'backstep' || this.state === 'stagger' ||
            this.state === 'guardbroken' || this.state === 'knockdown') {
            this.queueInput('heal');
            return false;
        }
        if (this.busy || this.estus <= 0) return false;
        this.estus--; // consumed on commit — an interrupt never refunds it
        this.state = 'heal';
        this.parryWindow = 0;
        this.stateTime = 0;
        this.healed = false;
        return true;
    }

    setBlock(held) {
        if (held && !this.blockHeld && !this.busy) {
            this.state = 'block';
            this.stateTime = 0;
            if (this.parryCooldown <= 0) {
                this.parryWindow = this.diff.parryWindow;
                this.parryCooldown = COMBAT_TUNING.PARRY_COOLDOWN;
            }
        }
        this.blockHeld = held;
        if (!held) this.parryWindow = 0;
        if (!held && this.state === 'block') {
            this.state = 'idle';
            this.stateTime = 0;
        }
    }

    /**
     * Incoming hit resolution. Returns dodged | parried | blocked | guardbroken |
     * hit | dead. `atk` carries damage plus optional poiseDamage, knockdown,
     * unblockable, chip and guardPressure. A knockdown hit throws the player down
     * (state 'knockdown', 1.4 s, wake-up i-frames from 0.25 s).
     */
    receiveHit(atk, attacker, ctx) {
        if (this.dead) return 'dead';
        // Knockdown wake-up i-frames (invulnerable from 0.25 s until you rise)
        if (this.state === 'knockdown' && this.stateTime >= COMBAT_TUNING.KNOCKDOWN_IFRAME_AT) return 'dodged';
        // Roll / backstep i-frames from the difficulty table
        const d = this.diff;
        if (this.state === 'roll' && this.stateTime >= d.iframeStart && this.stateTime < d.iframeEnd) return 'dodged';
        if (this.state === 'backstep' && this.stateTime >= COMBAT_TUNING.BACKSTEP_IFRAME_START && this.stateTime < COMBAT_TUNING.BACKSTEP_IFRAME_END) return 'dodged';
        // Must be facing the attacker to parry/block
        const from = attacker && attacker.pos ? attacker.pos : null;
        let facing = true;
        if (from) {
            _tv.subVectors(from, this.pos);
            facing = Math.abs(angleDiff(Math.atan2(_tv.x, _tv.z), this.heading)) < 1.1;
        }
        const guarding = this.state === 'block' && this.blockHeld && facing;
        if (guarding && this.parryWindow > 0 && atk.parryable !== false) {
            this.parryWindow = 0;
            this.riposteWindow = 2.8;
            this.state = 'parry';
            this.stateTime = 0;
            attacker?.onParried?.(ctx);
            return 'parried';
        }
        if (guarding && !atk.unblockable) {
            const stamCost = atk.damage * (atk.guardPressure || 0.7);
            this.spendStamina(stamCost);
            if (atk.chip) this.hp = Math.max(1, this.hp - atk.damage * 0.15);
            if (this.stamina <= 0) {
                this.state = 'guardbroken';
                this.stateTime = 0;
                this.blockHeld = false;
                return 'guardbroken';
            }
            this.stateTime = -0.18;            // brief block stun
            this.guardCounterWindow = COMBAT_TUNING.GUARD_COUNTER_WINDOW;
            return 'blocked';
        }
        // Clean hit — hyper-armor during active swing frames (no stagger cancel)
        this.hp -= atk.damage;
        this.staminaDelay = 0.8;
        this.comboQueued = false;
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this.stateTime = 0;
            this.vel.set(0, 0, 0);
            return 'hit';
        }
        const a = this.currentAttack;
        const hyperArmor = this.state === 'attack' && a &&
            this.stateTime > a.windup && this.stateTime < a.windup + a.active;
        const wasDown = this.state === 'knockdown';
        if (atk.knockdown && !hyperArmor) {
            // Heavy slams, jump slams, charges and novas throw the player down
            this.state = 'knockdown';
            this.stateTime = 0;
            this.clearBuffers();
            if (from) {
                _tv.subVectors(this.pos, from);
                _tv.y = 0;
                if (_tv.lengthSq() > 1e-6) this.knockDir.copy(_tv).normalize();
                else forward(this.heading, this.knockDir).negate();
            } else {
                forward(this.heading, this.knockDir).negate();
            }
            ctx?.onPlayerEvent?.('knockdown', {});
        } else if (!hyperArmor && !wasDown) {
            this.state = 'stagger';
            this.stateTime = 0;
        }
        return 'hit';
    }

    onParried() { /* the player is never parried by the boss in this design */ }

    update(dt, input, boss, ctx) {
        this.ctx = ctx;
        this.boss = boss || null;
        const d = this.diff;

        for (const action of ['attack', 'roll', 'heal']) {
            this.bufferTimers[action] = Math.max(0, this.bufferTimers[action] - dt);
            if (this.bufferTimers[action] <= 0) {
                this[`${action}Buffer`] = false;
                if (action === 'roll') this.bufferedRollDir = null;
            }
        }
        this.stateTime += dt;
        this.iframes = Math.max(0, this.iframes - dt);
        this.parryWindow = Math.max(0, this.parryWindow - dt);
        this.parryCooldown = Math.max(0, this.parryCooldown - dt);
        this.riposteWindow = Math.max(0, this.riposteWindow - dt);
        this.guardCounterWindow = Math.max(0, this.guardCounterWindow - dt);
        this.rollAttackWindow = Math.max(0, this.rollAttackWindow - dt);
        this.staminaDelay = Math.max(0, this.staminaDelay - dt);
        this.sprinting = !!(input && input.sprint);

        if (this.staminaDelay <= 0 && !this.dead) {
            const rate = this.state === 'block' ? 16 : 34;
            this.stamina = Math.min(this.maxStamina, this.stamina + rate * dt);
        }

        // Face the boss when locked on (except while committed to a roll/swing)
        const locked = !!(input && input.locked) && boss && !boss.dead;
        if (locked && ['idle', 'run', 'block', 'heal'].includes(this.state)) {
            _v.subVectors(boss.pos, this.pos);
            const want = Math.atan2(_v.x, _v.z);
            this.heading += angleDiff(want, this.heading) * Math.min(1, dt * 12);
        }

        const mv = (input && input.moveVec) || null;
        switch (this.state) {
            case 'idle':
            case 'run': {
                const len = mv ? mv.length() : 0;
                const speedTarget = len > 0.1 ? (this.sprinting && this.stamina > 1 ? 6.4 : 4.2) : 0;
                if (speedTarget > 0) {
                    this.state = 'run';
                    if (this.sprinting) this.spendStamina(9 * dt);
                    if (!locked) {
                        const want = Math.atan2(mv.x, mv.z);
                        this.heading += angleDiff(want, this.heading) * Math.min(1, dt * 14);
                    }
                    this.vel.x = mv.x * speedTarget;
                    this.vel.z = mv.z * speedTarget;
                    this.moveSpeed = speedTarget;
                } else {
                    this.state = 'idle';
                    this.vel.x *= Math.pow(0.0001, dt);
                    this.vel.z *= Math.pow(0.0001, dt);
                    this.moveSpeed = 0;
                }
                break;
            }
            case 'block': {
                const len = mv ? mv.length() : 0;
                const speedTarget = len > 0.1 ? 1.8 : 0;
                this.vel.x = (mv ? mv.x : 0) * speedTarget;
                this.vel.z = (mv ? mv.z : 0) * speedTarget;
                this.moveSpeed = speedTarget;
                break;
            }
            case 'roll': {
                const p = this.stateTime / COMBAT_TUNING.ROLL_DURATION;
                const sp = 8.0 * (1 - easeOut(Math.min(1, p)) * 0.55);
                this.vel.x = this.rollDir.x * sp;
                this.vel.z = this.rollDir.z * sp;
                this.iframes = (this.stateTime >= d.iframeStart && this.stateTime < d.iframeEnd) ? 0.01 : 0;
                if (p >= 1) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.iframes = 0;
                    this.rollAttackWindow = 0.3;   // roll attack window after the roll
                    this.flushBuffer();
                }
                break;
            }
            case 'backstep': {
                const p = Math.min(1, this.stateTime / COMBAT_TUNING.BACKSTEP_DURATION);
                const sp = (2 * COMBAT_TUNING.BACKSTEP_DIST / COMBAT_TUNING.BACKSTEP_DURATION) * (1 - p);
                this.vel.x = this.rollDir.x * sp;
                this.vel.z = this.rollDir.z * sp;
                this.iframes = (this.stateTime >= COMBAT_TUNING.BACKSTEP_IFRAME_START && this.stateTime < COMBAT_TUNING.BACKSTEP_IFRAME_END) ? 0.01 : 0;
                if (this.stateTime >= COMBAT_TUNING.BACKSTEP_DURATION) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.iframes = 0;
                    this.flushBuffer();
                }
                break;
            }
            case 'attack': {
                const atk = this.currentAttack;
                const t = this.stateTime;
                if (atk.heavy && this.heavyHeld) {
                    // Keep the chamber; the windup grows with the charge
                    this.chargeTime = Math.min(COMBAT_TUNING.HEAVY_CHARGE_MAX, this.chargeTime + dt);
                    atk.windup = COMBAT_TUNING.HEAVY_CHAMBER + this.chargeTime;
                    if (!this.chargeReadyFired && this.chargeTime >= COMBAT_TUNING.HEAVY_CHARGE_MAX) {
                        this.chargeReadyFired = true;
                        ctx?.onPlayerEvent?.('chargeReady', {});
                        this.releaseHeavy();
                    }
                }
                if (t > atk.windup && t < atk.windup + atk.active) {
                    forward(this.heading, _t2);
                    this.vel.x = _t2.x * 3.0;
                    this.vel.z = _t2.z * 3.0;
                    if (!this.attackHitDone && boss && !boss.dead && this.meleeCheck(atk, boss)) {
                        this.attackHitDone = true;
                        const res = boss.receiveHit(atk, this, ctx);
                        ctx?.onBossHit?.(res, atk, boss, this);
                    }
                } else {
                    this.vel.x *= Math.pow(0.0001, dt);
                    this.vel.z *= Math.pow(0.0001, dt);
                }
                if (t > atk.windup + atk.active + atk.recover) {
                    if (this.comboQueued && this.stamina >= PLAYER_ATTACKS[Math.min(this.comboIndex + 1, PLAYER_ATTACKS.length - 1)].stamina) {
                        if (locked) {
                            _v.subVectors(boss.pos, this.pos);
                            this.heading = Math.atan2(_v.x, _v.z);
                        }
                        this.startSwing(this.comboIndex + 1);
                    } else {
                        this.state = 'idle';
                        this.stateTime = 0;
                        this.comboIndex = 0;
                        this.flushBuffer();
                    }
                }
                break;
            }
            case 'stagger':
                this.vel.x *= Math.pow(0.0001, dt);
                this.vel.z *= Math.pow(0.0001, dt);
                if (this.stateTime > 0.45) { this.state = 'idle'; this.stateTime = 0; this.flushBuffer(); }
                break;
            case 'guardbroken':
                this.vel.x *= Math.pow(0.0001, dt);
                this.vel.z *= Math.pow(0.0001, dt);
                if (this.stateTime > 2.0) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.stamina = this.maxStamina * 0.5;
                    this.flushBuffer();
                }
                break;
            case 'heal': {
                // You can walk (slowly) while drinking
                const len = mv ? mv.length() : 0;
                const speedTarget = len > 0.1 ? COMBAT_TUNING.HEAL_SPEED : 0;
                this.vel.x = (mv ? mv.x : 0) * speedTarget;
                this.vel.z = (mv ? mv.z : 0) * speedTarget;
                this.moveSpeed = speedTarget;
                if (!this.healed && this.stateTime >= COMBAT_TUNING.HEAL_LAND) {
                    this.healed = true;
                    this.hp = Math.min(this.maxHp, this.hp + d.healAmount);
                    ctx?.onPlayerHealed?.(this);
                }
                if (this.stateTime >= COMBAT_TUNING.HEAL_DURATION) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.flushBuffer();
                }
                break;
            }
            case 'parry':
                if (this.stateTime > 0.4) { this.state = 'idle'; this.stateTime = 0; }
                break;
            case 'knockdown': {
                const t = this.stateTime;
                const kb = t < 0.25 ? (2 * COMBAT_TUNING.KNOCKDOWN_PUSH / 0.25) * (1 - t / 0.25) : 0;
                this.vel.x = this.knockDir.x * kb;
                this.vel.z = this.knockDir.z * kb;
                this.iframes = t >= COMBAT_TUNING.KNOCKDOWN_IFRAME_AT ? 0.01 : 0;
                if (t >= COMBAT_TUNING.KNOCKDOWN_ROLL_AT && this.rollBuffer && this.bufferedRollDir) {
                    const buffered = this.bufferedRollDir;
                    this.clearBuffers();
                    this.startRoll(buffered.direction, buffered.locked);
                    break;
                }
                if (t >= COMBAT_TUNING.KNOCKDOWN_DURATION) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.iframes = 0;
                    ctx?.onPlayerEvent?.('wakeup', {});
                    this.flushBuffer();
                }
                break;
            }
            case 'dead':
            case 'victory':
                this.vel.set(0, 0, 0);
                break;
        }

        // A held guard survives committed actions, but recovery is not a new press.
        if (this.blockHeld && !this.busy && this.state !== 'block') {
            this.state = 'block';
            this.stateTime = 0;
            this.parryWindow = 0;
        }

        this.pos.x += this.vel.x * dt;
        this.pos.z += this.vel.z * dt;
        clampToArena(this.pos);

        this.rig.root.position.copy(this.pos);
        this.rig.root.rotation.y = this.heading;
        this.pose(dt);
    }

    pose(dt) {
        const atk = this.currentAttack;
        if (this.state === 'attack' && atk) {
            const windupP = Math.min(1, this.stateTime / Math.max(atk.windup, 0.001));
            const swingP = clamp01((this.stateTime - atk.windup) / atk.active);
            const recoverP = clamp01((this.stateTime - atk.windup - atk.active) / atk.recover);
            this.rig.pose('attack', this.stateTime, dt, {
                attackType: atk.type,
                windup: this.stateTime < atk.windup ? windupP : 0,
                progress: swingP,
                recover: recoverP,
                hold: 0,
                charge: (atk.heavy || atk.charged) ? clamp01(this.chargeTime / COMBAT_TUNING.HEAVY_CHARGE_MAX) : 0,
                air: 0,
            });
            return;
        }
        if (this.state === 'run') {
            const local = localMove(this.vel, this.heading);
            this.rig.pose('run', this.stateTime, dt, { moveSpeed: this.moveSpeed, moveX: local.x, moveZ: local.z });
            return;
        }
        if (this.state === 'heal') {
            const local = localMove(this.vel, this.heading);
            this.rig.pose('heal', this.stateTime, dt, {
                progress: clamp01(this.stateTime / COMBAT_TUNING.HEAL_DURATION),
                moveSpeed: this.moveSpeed,
                moveX: local.x,
                moveZ: local.z,
            });
            return;
        }
        if (this.state === 'idle') {
            this.rig.pose('idle', this.stateTime, dt, {});
            return;
        }
        if (this.state === 'victory') {
            this.rig.pose('victory', this.stateTime, dt, {});
            return;
        }
        const dur = PLAYER_STATE_DURATION[this.state] || 1;
        this.rig.pose(this.state, this.stateTime, dt, { progress: clamp01(this.stateTime / dur) });
    }

    /** Melee arc check vs target. Returns true if in range + arc. */
    meleeCheck(atk, target) {
        _tv.subVectors(target.pos, this.pos);
        _tv.y = 0;
        const dist = _tv.length();
        if (dist > atk.range + 0.55) return false;
        return Math.abs(angleDiff(Math.atan2(_tv.x, _tv.z), this.heading)) < atk.arc / 2;
    }

    queueInput(action) {
        if (action !== 'roll' && this.rollBuffer) return false;
        if (action === 'roll') this.clearBuffers();
        this[`${action}Buffer`] = true;
        this.bufferTimers[action] = COMBAT_TUNING.INPUT_BUFFER;
        return true;
    }

    clearBuffers() {
        this.attackBuffer = this.rollBuffer = this.healBuffer = false;
        this.comboQueued = false;
        this.bufferedRollDir = null;
        for (const action in this.bufferTimers) this.bufferTimers[action] = 0;
    }

    /** Fire off buffered inputs after recovery ends (roll/stagger/heal out). */
    flushBuffer() {
        const roll = this.rollBuffer && this.bufferedRollDir;
        const attack = this.attackBuffer;
        const heal = this.healBuffer;
        this.clearBuffers();
        if (roll) this.tryRoll(roll.direction, roll.locked);
        else if (attack) this.tryAttack();
        else if (heal) this.tryHeal();
    }
}

// ======================================================================
// BOSS — reactive Elden Ring encounter
// ======================================================================

const BOSS_ATTACKS = Object.freeze({
    // -- close range --
    jab:           Object.freeze({ type: 3, windup: 0.28, active: 0.1, recover: 0.34, range: 2.5, arc: 1.5, damage: 13, cd: 0.9 }),
    slashL:        Object.freeze({ type: 0, windup: 0.4, active: 0.14, recover: 0.5, range: 2.8, arc: 2.0, damage: 16, cd: 1.0 }),
    slashR:        Object.freeze({ type: 1, windup: 0.34, active: 0.13, recover: 0.46, range: 2.8, arc: 2.0, damage: 15, cd: 1.0 }),
    quickSlash:    Object.freeze({ type: 0, windup: 0.32, active: 0.12, recover: 0.36, range: 2.6, arc: 1.8, damage: 14, cd: 1.1 }),
    backhandSlash: Object.freeze({ type: 1, windup: 0.3, active: 0.14, recover: 0.5, range: 2.9, arc: 2.6, damage: 17, cd: 1.6, turnPunish: true }),
    shieldBash:    Object.freeze({ type: 6, windup: 0.42, active: 0.14, recover: 0.55, range: 2.5, arc: 1.7, damage: 12, cd: 2.4, guardPressure: 2.8, chip: true }),
    risingSlash:   Object.freeze({ type: 8, windup: 0.3, active: 0.14, recover: 0.5, range: 2.6, arc: 1.8, damage: 18, cd: 1.6, minPhase: 2 }),
    backstepSlash: Object.freeze({ type: 1, windup: 0.34, active: 0.16, recover: 0.48, range: 2.8, arc: 1.9, damage: 18, cd: 2.2, backstep: 2.2 }),
    lowSweep:      Object.freeze({ type: 10, windup: 0.44, active: 0.18, recover: 0.55, range: 3.0, arc: 3.0, damage: 20, cd: 2.6, minPhase: 3, knockdown: true }),
    // -- mid range --
    heavyOverhead: Object.freeze({ type: 2, windup: 0.62, active: 0.16, recover: 0.68, range: 3.0, arc: 1.6, damage: 30, cd: 2.6, guardPressure: 1.2, delayed: true, knockdown: true }),
    delayedThrust: Object.freeze({ type: 3, windup: 0.52, active: 0.16, recover: 0.6, range: 3.3, arc: 1.3, damage: 24, cd: 2.4, delayed: true }),
    lungeThrust:   Object.freeze({ type: 3, windup: 0.42, active: 0.18, recover: 0.5, range: 3.4, arc: 1.3, damage: 20, cd: 1.8 }),
    spinSlash:     Object.freeze({ type: 5, windup: 0.55, active: 0.22, recover: 0.65, range: 3.2, arc: 3.6, damage: 22, cd: 3.4 }),
    jumpSlam:      Object.freeze({ type: 4, windup: 0.5, active: 0.55, recover: 0.7, range: 3.2, arc: 6.3, damage: 30, cd: 4.5, minPhase: 2, aoe: true, radius: 3.0, parryable: false, delayed: true, knockdown: true, leap: true }),
    quakeSlam:     Object.freeze({ type: 2, windup: 0.95, active: 0.18, recover: 0.85, range: 3.2, arc: 2.8, damage: 40, cd: 7, guardPressure: 3.2, parryable: false, unblockable: true, aoe: true, radius: 3.0, minPhase: 2, minWindup: 0.85, knockdown: true, impactDelay: 0.05 }),
    ashenNova:     Object.freeze({ type: 2, windup: 1.2, active: 0.2, recover: 0.7, range: 4.2, arc: 6.3, damage: 34, cd: 9, parryable: false, unblockable: true, aoe: true, radius: 4.2, minPhase: 3, minWindup: 1.2, knockdown: true, nova: true }),
    // -- far range --
    dashThrust:    Object.freeze({ type: 3, windup: 0.5, active: 0.26, recover: 0.6, range: 2.8, arc: 1.3, damage: 22, cd: 2.8, dash: 11 }),
    runningSlash:  Object.freeze({ type: 0, windup: 0.55, active: 0.2, recover: 0.7, range: 3.0, arc: 2.0, damage: 20, cd: 3.2, dash: 13 }),
    charge:        Object.freeze({ type: 3, windup: 0.75, active: 0.35, recover: 0.85, range: 3.0, arc: 1.4, damage: 28, cd: 4.0, dash: 16, knockdown: true }),
});

const BAND_CLOSE = 2.6;
const BAND_MID = 5.5;
const BAND_FAR = 9.0;
/** Committed-attack movement bounds (units per frame at a 60Hz step). */
const MAX_ATTACK_TRAVEL_PER_STEP = 0.55;
const ATTACK_STOP_DIST = 1.2;

/** Per-phase pacing multipliers (phase 2/3 read and recover faster). */
const PHASE_MULT = Object.freeze({
    1: Object.freeze({ windup: 1, recover: 1, cd: 1 }),
    2: Object.freeze({ windup: 0.85, recover: 0.85, cd: 0.75 }),
    3: Object.freeze({ windup: 0.72, recover: 0.78, cd: 0.62 }),
});

/** True while the player is moving away from the boss (string branch input). */
function playerBackingOff(boss, player) {
    if (!player || !player.vel || !player.pos) return false;
    const speed = Math.hypot(player.vel.x, player.vel.z);
    if (speed < 0.6) return false;
    const dx = player.pos.x - boss.pos.x;
    const dz = player.pos.z - boss.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    return (player.vel.x * dx + player.vel.z * dz) / (len * speed) > 0.6;
}

/**
 * Branch for slashL -> slashR -> (?): a thrust if the player is backing off, an
 * overhead if they are still close, or the string simply ends.
 */
function branchBackoff(boss, player, dist) {
    if (playerBackingOff(boss, player)) return 'lungeThrust';
    if (dist < 3.1) return 'heavyOverhead';
    return null;
}

/**
 * Data-driven combo strings. Steps are move names (resolved through
 * BOSS_ATTACKS) or branch functions (boss, player, dist) -> move name | null.
 * Strings chain with a short link recovery and end on the full recovery of the
 * last step, which opens the difficulty-scaled breather window.
 */
const BOSS_STRINGS = Object.freeze({
    slashChain:         Object.freeze({ id: 'slashChain', band: 'close', weight: 3.0, steps: Object.freeze(['slashL', 'slashR', branchBackoff]) }),
    quickChain:         Object.freeze({ id: 'quickChain', band: 'close', weight: 2.4, steps: Object.freeze(['quickSlash', 'jab']) }),
    bashChain:          Object.freeze({ id: 'bashChain', band: 'close', weight: 1.8, steps: Object.freeze(['shieldBash', 'lungeThrust']) }),
    backstepCounter:    Object.freeze({ id: 'backstepCounter', band: 'close', weight: 1.6, steps: Object.freeze(['backstepSlash', 'jab']) }),
    risingChain:        Object.freeze({ id: 'risingChain', band: 'close', weight: 2.4, minPhase: 2, steps: Object.freeze(['jab', 'jab', 'risingSlash']) }),
    sweepSolo:          Object.freeze({ id: 'sweepSolo', band: 'close', weight: 1.6, minPhase: 3, steps: Object.freeze(['lowSweep', 'slashR']) }),
    overheadChain:      Object.freeze({ id: 'overheadChain', band: 'mid', weight: 2.4, steps: Object.freeze(['heavyOverhead', 'slashR']) }),
    delayedThrustChain: Object.freeze({ id: 'delayedThrustChain', band: 'mid', weight: 2.0, steps: Object.freeze(['delayedThrust', 'slashL']) }),
    overheadSweep:      Object.freeze({ id: 'overheadSweep', band: 'mid', weight: 2.0, minPhase: 3, steps: Object.freeze(['heavyOverhead', 'lowSweep']) }),
    spinDouble:         Object.freeze({ id: 'spinDouble', band: 'mid', weight: 2.0, minPhase: 3, steps: Object.freeze(['spinSlash', 'spinSlash']) }),
    jumpChain:          Object.freeze({ id: 'jumpChain', band: 'mid', weight: 1.8, minPhase: 2, steps: Object.freeze(['jumpSlam', 'slashR']) }),
    quakeCombo:         Object.freeze({ id: 'quakeCombo', band: 'mid', weight: 1.4, minPhase: 2, steps: Object.freeze(['quakeSlam']) }),
    novaBurst:          Object.freeze({ id: 'novaBurst', band: 'mid', weight: 1.6, minPhase: 3, steps: Object.freeze(['ashenNova', 'lowSweep']) }),
    lungeChain:         Object.freeze({ id: 'lungeChain', band: 'mid', weight: 1.8, steps: Object.freeze(['lungeThrust', 'jab']) }),
    dashChain:          Object.freeze({ id: 'dashChain', band: 'far', weight: 3.0, steps: Object.freeze(['dashThrust', 'slashL']) }),
    runningChain:       Object.freeze({ id: 'runningChain', band: 'far', weight: 2.6, steps: Object.freeze(['runningSlash', 'slashR']) }),
    spinRush:           Object.freeze({ id: 'spinRush', band: 'far', weight: 1.2, minPhase: 2, steps: Object.freeze(['spinSlash']) }),
    chargeRush:         Object.freeze({ id: 'chargeRush', band: 'vfar', weight: 3.0, steps: Object.freeze(['charge']) }),
    backhandPunish:     Object.freeze({ id: 'backhandPunish', band: 'any', weight: 2.0, steps: Object.freeze(['backhandSlash']) }),
    spinPunish:         Object.freeze({ id: 'spinPunish', band: 'any', weight: 1.6, minPhase: 2, steps: Object.freeze(['spinSlash']) }),
});

const BOSS_STRING_LIST = Object.freeze(Object.keys(BOSS_STRINGS).map((k) => BOSS_STRINGS[k]));

export class Boss {
    constructor(rig, { difficulty = 'medium' } = {}) {
        this.rig = rig;
        this.pos = rig.root.position;
        this.name = 'BOSS';
        this.difficulty = difficulty in DIFFICULTIES ? difficulty : 'medium';
        /** @type {number} Current phase (1-3); reset() re-initialises it. */
        this.phase = 1;
        this.reset();
    }

    setDifficulty(name) {
        if (name in DIFFICULTIES) this.difficulty = name;
    }

    get diff() { return difficultyOf(this.difficulty); }

    reset() {
        const d = this.diff;
        this.pos.set(0, 0, -5.5);
        this.heading = 0;
        this.vel = new THREE.Vector3();
        this.hp = this.maxHp = d.bossHp;
        this.phase = 1;
        this.poise = 0;
        this.maxPoise = d.poiseMax;
        this.poiseDelay = 0;
        this.state = 'idle';
        this.stateTime = 0;
        this.clock = 0;
        this.currentAttack = null;
        this.attackName = null;
        this.attackStart = null;
        this.pendingPhase = 0;
        this.attackHitDone = false;
        this.impactDone = false;
        this.delayAnnounced = false;
        this.leapStarted = false;
        this.leapP = 0;
        this.leapTo = null;
        this.string = null;
        this.stringId = null;
        this.stringSteps = [];
        this.stringExtended = false;
        this.chainStep = 0;
        this.comboStep = 0;
        this.thinkTimer = 0.4;
        this.strafeDir = 1;
        this.strafeTimer = 0;
        this.breatherTimer = 0;
        this.reactTimer = 0;
        this.pendingReaction = null;
        this.reactionCd = 0;
        this.guardCd = 0;
        this.rollCatch = null;
        this.rollCatchSeen = false;
        this.lastRollCatch = null;
        this.evadeDir = { x: 0, z: 0 };
        this.cooldowns = {};
        for (const k in BOSS_ATTACKS) this.cooldowns[k] = 0;
        this.rage = false;
        this.vulnerable = false;
        this.dead = false;
        this.staggerDuration = COMBAT_TUNING.STANCE_BREAK_POISE;
        this._player = null;
        this._dist = 99;
        this.rig.root.visible = true;
    }

    /** Phase + difficulty pacing. */
    get windupMult() { return (PHASE_MULT[this.phase] || PHASE_MULT[1]).windup * this.diff.windupMult; }
    get recoverMult() { return (PHASE_MULT[this.phase] || PHASE_MULT[1]).recover; }
    get cdMult() { return (PHASE_MULT[this.phase] || PHASE_MULT[1]).cd; }
    /** True while the boss holds a fully chambered delayed swing. */
    get delaying() {
        const atk = this.currentAttack;
        if (this.state !== 'attack' || !atk || !(atk.hold > 0)) return false;
        return this.stateTime >= atk.windup && this.stateTime < atk.windup + atk.hold;
    }
    /** True while the boss blade should leave a trail. */
    get trailActive() {
        const atk = this.currentAttack;
        if (!atk || this.state !== 'attack') return false;
        const swingStart = atk.windup + (atk.hold || 0);
        return this.stateTime >= swingStart && this.stateTime <= swingStart + atk.active + atk.recover * 0.12;
    }

    // ------------------------------------------------------------------
    // Damage intake
    // ------------------------------------------------------------------

    /** Parried by the player: the stance-break kneel opens the riposte window. */
    onParried(ctx) {
        this.enterStanceBreak(ctx, COMBAT_TUNING.STANCE_BREAK_PARRY);
    }

    /** Poise or parry break -> vulnerable kneel (emits 'stanceBreak'). */
    enterStanceBreak(ctx, duration) {
        this.state = 'stanceBreak';
        this.stateTime = 0;
        this.staggerDuration = duration;
        this.currentAttack = null;
        this.attackName = null;
        this.string = null;
        this.stringId = null;
        this.stringSteps = [];
        this.chainStep = 0;
        this.comboStep = 0;
        this.vel.set(0, 0, 0);
        this.vulnerable = true;
        ctx?.onBossEvent?.('stanceBreak', {});
    }

    receiveHit(atk, attacker, ctx) {
        if (this.dead) return 'dead';
        if (this.state === 'block') return 'blocked';
        // Riposte safety: only a vulnerable (stance-broken) boss takes riposte damage
        if (atk.riposte && !this.vulnerable) return 'blocked';
        this.hp -= atk.damage;
        this.poiseDelay = COMBAT_TUNING.POISE_REGEN_DELAY;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            this.state = 'dead';
            this.stateTime = 0;
            this.currentAttack = null;
            this.attackName = null;
            this.string = null;
            this.stringSteps = [];
            this.vel.set(0, 0, 0);
            return 'hit';
        }
        // Phase thresholds — never mid-swing: deferred until the swing ends
        const targetPhase = this.hp <= this.maxHp * COMBAT_TUNING.PHASE3_AT ? 3
            : this.hp <= this.maxHp * COMBAT_TUNING.PHASE2_AT ? 2 : 1;
        if (targetPhase > this.phase && targetPhase > this.pendingPhase) {
            this.pendingPhase = targetPhase;
        }
        // Poise: attacks carry their own poise damage; ripostes count double
        this.poise += (atk.poiseDamage ?? atk.damage) * (atk.riposte ? 2 : 1);
        if (this.poise >= this.maxPoise && this.state !== 'stanceBreak') {
            this.poise = 0;
            this.enterStanceBreak(ctx, COMBAT_TUNING.STANCE_BREAK_POISE);
        }
        return 'hit';
    }

    /** Phase transition: a safe 'roar' with exactly one banner per transition. */
    applyPhaseTransition(ctx) {
        this.phase = this.pendingPhase;
        this.pendingPhase = 0;
        this.rage = this.phase >= 2;
        this.state = 'roar';
        this.stateTime = 0;
        this.attackName = null;
        this.currentAttack = null;
        this.string = null;
        this.stringId = null;
        this.stringSteps = [];
        this.chainStep = 0;
        this.comboStep = 0;
        this.vel.set(0, 0, 0);
        ctx?.onBossRage?.(this);
        ctx?.onBossEvent?.('roar', { x: this.pos.x, z: this.pos.z });
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    bandOf(dist) {
        if (dist < BAND_CLOSE) return 'close';
        if (dist < BAND_MID) return 'mid';
        if (dist < BAND_FAR) return 'far';
        return 'vfar';
    }

    distTo(target) {
        return Math.hypot(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
    }

    ready(name) { return (this.cooldowns[name] || 0) <= 0; }

    /** Decision interval: difficulty thinkMult / aggression, phase-tightened. */
    scheduleThink() {
        const d = this.diff;
        const base = this.phase >= 2 ? 0.22 : 0.34;
        const span = this.phase >= 2 ? 0.18 : 0.26;
        this.thinkTimer = ((base + Math.random() * span) * d.thinkMult) / d.aggression;
    }

    // ------------------------------------------------------------------
    // Strings & attacks
    // ------------------------------------------------------------------

    resolveStep(step) {
        if (typeof step === 'function') return step(this, this._player, this._dist);
        return step;
    }

    /** Start a data-driven string by id (decide() and tests). */
    startString(id, ctx) {
        const def = BOSS_STRINGS[id];
        if (!def) return null;
        this.string = def;
        this.stringId = id;
        this.stringSteps = def.steps.slice(1);
        this.stringExtended = false;
        this.chainStep = 0;
        this.comboStep = 0;
        const first = this.resolveStep(def.steps[0]);
        if (!first) { this.endString(ctx); return null; }
        return this.startAttack(first, ctx, def.steps.length > 1);
    }

    /**
     * Start an attack. `chainLink` shortens the recovery so string follow-ups
     * flow (the last step keeps its full recovery = the breather window).
     */
    startAttack(name, ctx, chainLink = false) {
        const base = BOSS_ATTACKS[name];
        if (!base) return null;
        this.attackStart = this.clock;
        const chamber = Math.max(base.minWindup ?? COMBAT_TUNING.WINDUP_FLOOR, base.windup * this.windupMult);
        let hold = 0;
        if (base.delayed && Math.random() < Math.min(1, this.diff.delayChance * (this.phase >= 2 ? 1.25 : 1))) {
            hold = Math.random() * this.diff.maxDelay;
        }
        let windup = chamber;
        if (this.rollCatch && this.clock <= this.rollCatch.iframeEndAt + 0.45) {
            // Roll catch: re-time this follow-up to land just after the roll's i-frames
            windup = Math.max(COMBAT_TUNING.WINDUP_FLOOR, this.rollCatch.iframeEndAt + 0.06 - this.clock);
            const dx = this.rollCatch.x - this.pos.x;
            const dz = this.rollCatch.z - this.pos.z;
            if (dx * dx + dz * dz > 1e-6) this.heading = Math.atan2(dx, dz);
            this.lastRollCatch = { iframeEndAt: this.rollCatch.iframeEndAt, windup, at: this.clock, extended: false };
            this.rollCatch = null;
        }
        const phaseDamage = this.phase >= 3 ? 1.25 : this.phase >= 2 ? 1.1 : 1;
        this.currentAttack = {
            ...base,
            name,
            windup,
            hold,
            recover: base.recover * this.recoverMult * (chainLink ? COMBAT_TUNING.CHAIN_RECOVER : 1),
            damage: Math.max(1, Math.round(base.damage * this.diff.bossDamage * phaseDamage)),
        };
        this.attackName = name;
        this.state = 'attack';
        this.stateTime = 0;
        this.attackHitDone = false;
        this.impactDone = false;
        this.delayAnnounced = false;
        this.leapStarted = false;
        this.leapP = 0;
        this.leapTo = null;
        this.cooldowns[name] = base.cd * this.cdMult;
        if (base.unblockable || base.aoe) {
            ctx?.onBossEvent?.('tell', { name, unblockable: !!base.unblockable, aoe: !!base.aoe });
        }
        return name;
    }

    /** A finished string step: chain the next, extend the string, or breathe. */
    finishAttackStep(ctx) {
        const player = this._player;
        const alive = player && !player.dead && player.state !== 'victory';
        this.attackHitDone = false;
        if (this.string && this.stringSteps.length) {
            const step = this.stringSteps.shift();
            const name = this.resolveStep(step);
            const d = alive ? this.distTo(player) : 99;
            if (name && alive && d <= 5.2 && BOSS_ATTACKS[name]) {
                this.chainStep++;
                this.comboStep = this.chainStep;
                return this.startAttack(name, ctx, true);
            }
            this.stringSteps = [];
        }
        this.endString(ctx);
    }

    endString(ctx) {
        const wasString = !!this.string;
        const player = this._player;
        const alive = player && !player.dead && player.state !== 'victory';
        const dist = alive ? this.distTo(player) : 99;
        this.string = null;
        this.stringId = null;
        this.stringSteps = [];
        this.chainStep = 0;
        this.comboStep = 0;
        // Strings extend by difficulty while the player is still in the pocket
        if (wasString && alive && dist < 4.6 && !this.stringExtended &&
            Math.random() < this.diff.comboExtend * (this.phase >= 2 ? 1.15 : 1)) {
            this.stringExtended = true;
            const ext = dist < 3.2 ? 'slashR' : 'lungeThrust';
            if (this.ready(ext)) return this.startAttack(ext, ctx);
        }
        this.currentAttack = null;
        this.attackName = null;
        this.breatherTimer = (wasString ? COMBAT_TUNING.STRING_BREATHER : COMBAT_TUNING.SINGLE_BREATHER) * this.diff.breather;
        this.state = dist > 3.4 ? 'stalk' : 'idle';
        this.stateTime = 0;
        this.thinkTimer = this.breatherTimer;
    }

    // ------------------------------------------------------------------
    // Perception — every frame, behind a human-like reaction delay
    // ------------------------------------------------------------------

    /**
     * Roll read. If the boss has not swung yet it holds the current swing until
     * just after the roll's i-frames end (ER roll catch); otherwise it arms the
     * catch so the next follow-up is re-timed and re-aimed at the roll's landing.
     */
    readRoll(player, dt) {
        if (player.state !== 'roll') { this.rollCatchSeen = false; return; }
        if (this.rollCatchSeen || player.stateTime > dt * 2.5) return;
        this.rollCatchSeen = true;
        if (Math.random() >= this.diff.rollCatch) return;
        const iframeEnd = player.diff ? player.diff.iframeEnd : 0.3;
        const rollStart = this.clock - player.stateTime;
        const iframeEndAt = rollStart + iframeEnd;
        const lead = Math.max(0, iframeEndAt - this.clock);
        const aim = {
            iframeEndAt,
            x: player.pos.x + player.vel.x * lead,
            z: player.pos.z + player.vel.z * lead,
        };
        // The boss has not swung yet -> delay the chamber into the roll's recovery
        const atk = this.currentAttack;
        if (this.state === 'attack' && atk && this.attackStart !== null) {
            const swingStartClock = this.attackStart + atk.windup + (atk.hold || 0);
            const target = iframeEndAt + 0.05;
            if (this.clock < swingStartClock && target > swingStartClock) {
                atk.hold = (atk.hold || 0) + (target - swingStartClock);
                atk.delayedCatch = true;
                this.lastRollCatch = { iframeEndAt, windup: atk.windup, at: this.clock, extended: true };
                this.rollCatch = null;
                return;
            }
        }
        // Mid-swing / recovery -> arm the catch for the next follow-up
        this.rollCatch = aim;
    }

    tryReact(kind) {
        if (this.reactTimer > 0 || this.pendingReaction || this.reactionCd > 0) return false;
        if (Math.random() >= this.diff.reactChance) return false;
        this.reactTimer = this.diff.reactionDelay;
        this.pendingReaction = kind;
        return true;
    }

    executeReaction(player, ctx) {
        const kind = this.pendingReaction;
        this.pendingReaction = null;
        if (this.dead || !player || player.dead || player.state === 'victory') return;
        const dist = this.distTo(player);
        this.reactionCd = Math.max(0.9, 2.6 * this.diff.thinkMult);
        if (kind === 'punishHeal') {
            if (dist < 3.0) return this.startAttack('jab', ctx);
            if (this.ready('dashThrust')) return this.startAttack('dashThrust', ctx);
            if (this.ready('lungeThrust')) return this.startAttack('lungeThrust', ctx);
            return this.startAttack('jab', ctx);
        }
        if (kind === 'punishWhiff') {
            if (dist < 2.6) return this.startAttack('jab', ctx);
            if (this.ready('lungeThrust')) return this.startAttack('lungeThrust', ctx);
            return this.startAttack('slashR', ctx);
        }
        // Player attack startup
        if (dist < 2.3 && this.difficulty === 'hard') return this.startAttack('jab', ctx);
        if (Math.random() < 0.6 || this.guardCd > 0) {
            this.state = 'evade';
            this.stateTime = 0;
            this.chooseEvadeDir(player);
            ctx?.onBossEvent?.('evade', {});
        } else {
            this.state = 'block';
            this.stateTime = 0;
            this.guardCd = 3.0;
        }
        return null;
    }

    chooseEvadeDir(player) {
        const dx = player.pos.x - this.pos.x;
        const dz = player.pos.z - this.pos.z;
        const len = Math.hypot(dx, dz) || 1;
        if (len < 2.2) {
            // Too close for a crowd step: hop straight back
            this.evadeDir.x = -dx / len;
            this.evadeDir.z = -dz / len;
            return;
        }
        // Otherwise circle sideways out of the swing
        const side = Math.random() < 0.5 ? -1 : 1;
        this.evadeDir.x = (-dz / len) * side;
        this.evadeDir.z = (dx / len) * side;
    }

    perceive(dt, player, ctx) {
        if (this.reactTimer > 0) {
            this.reactTimer -= dt;
            if (this.reactTimer <= 0) this.executeReaction(player, ctx);
            return;
        }
        if (player.state === 'roll') this.readRoll(player, dt);
        else this.rollCatchSeen = false;
        const free = ['idle', 'stalk', 'approach', 'block'].includes(this.state);
        if (!free || this.pendingReaction) return;
        // Heal punish: nearest answer, fast jab when close
        if (player.state === 'heal' && player.stateTime < COMBAT_TUNING.HEAL_DURATION * 0.5 && this.tryReact('punishHeal')) return;
        // Attack startup read
        const atk = player.currentAttack;
        if (player.state === 'attack' && atk && player.stateTime <= atk.windup * 0.9 && this.tryReact('attackStartup')) return;
        // Whiffed recovery punish
        if (player.state === 'attack' && atk && player.stateTime > atk.windup + atk.active &&
            this.distTo(player) < 3.6 && this.tryReact('punishWhiff')) return;
    }

    // ------------------------------------------------------------------
    // Decisions
    // ------------------------------------------------------------------

    decide(player, ctx) {
        if (!player || player.dead || player.state === 'victory') {
            this.state = 'idle';
            this.stateTime = 0;
            this.thinkTimer = 0.5;
            return null;
        }
        const dist = this.distTo(player);
        const toPlayer = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
        this._dist = dist;
        this.scheduleThink();
        // Turn punish: the player is behind us -> snapping backhand or spin
        if (dist < 4.2 && Math.abs(angleDiff(toPlayer, this.heading)) > 1.92) {
            const spin = this.phase >= 2 && Math.random() < 0.35;
            return this.startString(spin ? 'spinPunish' : 'backhandPunish', ctx);
        }
        const band = this.bandOf(dist);
        const pool = BOSS_STRING_LIST.filter((s) => s.band === band && (!s.minPhase || this.phase >= s.minPhase));
        if (pool.length) {
            const options = pool.map((s) => [s.id, s.weight * (s.id === 'bashChain' && player.state === 'block' ? 2.4 : 1)]);
            const attackRoll = Math.random() < Math.min(1, (this.phase >= 2 ? 0.85 : 0.72) * this.diff.aggression);
            if (attackRoll) return this.startString(pickWeighted(options), ctx);
        }
        if (band === 'close' && Math.random() < 0.25) {
            this.state = 'backstep';
            this.stateTime = 0;
            return null;
        }
        this.state = band === 'mid' ? 'stalk' : 'approach';
        this.stateTime = 0;
        return null;
    }

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------

    update(dt, player, ctx) {
        this.clock += dt;
        this.stateTime += dt;
        for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
        this.thinkTimer = Math.max(0, this.thinkTimer - dt);
        this.reactionCd = Math.max(0, this.reactionCd - dt);
        this.guardCd = Math.max(0, this.guardCd - dt);
        if (this.poise > 0) {
            if (this.poiseDelay > 0) this.poiseDelay = Math.max(0, this.poiseDelay - dt);
            else this.poise = Math.max(0, this.poise - this.maxPoise * COMBAT_TUNING.POISE_REGEN_RATE * dt);
        }
        if (this.state !== 'stanceBreak') this.vulnerable = false;

        if (this.dead) {
            this.vel.set(0, 0, 0);
            this.rig.pose('dead', this.stateTime, dt, { progress: clamp01(this.stateTime / 1.2) });
            this.rig.root.rotation.y = this.heading;
            return;
        }

        this._player = player;
        const playerGone = player.dead || player.state === 'victory';
        if (playerGone && !['idle', 'stanceBreak', 'roar', 'dead'].includes(this.state)) {
            // Stand down: cancel anything committed and hold position
            this.currentAttack = null;
            this.attackName = null;
            this.string = null;
            this.stringId = null;
            this.stringSteps = [];
            this.vel.set(0, 0, 0);
            this.state = 'idle';
            this.stateTime = 0;
        }
        if (!playerGone) this.perceive(dt, player, ctx);

        if (this.pendingPhase > this.phase && !['attack', 'stanceBreak', 'roar'].includes(this.state)) {
            this.applyPhaseTransition(ctx);
        }

        const dx = player.pos.x - this.pos.x;
        const dz = player.pos.z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        const toPlayer = Math.atan2(dx, dz);
        this._dist = dist;

        switch (this.state) {
            case 'idle':
            case 'approach': {
                this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 7);
                const sp = (dist > BAND_MID ? 5.2 : 3.6) * (this.phase >= 2 ? 1.15 : 1);
                if (dist > 2.2 && !playerGone) {
                    forward(this.heading, _t2);
                    this.vel.x = _t2.x * sp;
                    this.vel.z = _t2.z * sp;
                    if (this.state === 'idle') this.state = 'approach';
                } else {
                    this.vel.set(0, 0, 0);
                    this.state = 'idle';
                }
                if (this.thinkTimer <= 0 && !playerGone) this.decide(player, ctx);
                break;
            }
            case 'stalk': {
                // Slow circling stalk with the blade low, holding mid range
                this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 9);
                this.strafeTimer -= dt;
                if (this.strafeTimer <= 0) {
                    this.strafeTimer = 0.55 + Math.random() * 0.7;
                    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
                }
                const tangent = toPlayer + (Math.PI / 2) * this.strafeDir;
                const radial = dist - 3.2;
                const sp = 2.2 * (this.phase >= 2 ? 1.15 : 1);
                forward(tangent, _t2);
                this.vel.x = _t2.x * sp + (dx / (dist || 1)) * radial * 1.2;
                this.vel.z = _t2.z * sp + (dz / (dist || 1)) * radial * 1.2;
                if (this.thinkTimer <= 0 && !playerGone) this.decide(player, ctx);
                break;
            }
            case 'backstep': {
                const p = Math.min(1, this.stateTime / 0.35);
                const sp = (2 * 1.6 / 0.35) * (1 - p);
                this.vel.x = (dx / (dist || 1)) * -sp;
                this.vel.z = (dz / (dist || 1)) * -sp;
                if (this.stateTime > 0.35) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.thinkTimer = 0.15;
                }
                break;
            }
            case 'block': {
                this.vel.set(0, 0, 0);
                this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 12);
                if (this.stateTime > 0.65) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.thinkTimer = 0.05;
                }
                break;
            }
            case 'evade': {
                const p = Math.min(1, this.stateTime / 0.35);
                const sp = 6.0 * (1 - easeOut(p) * 0.5);
                this.vel.x = this.evadeDir.x * sp;
                this.vel.z = this.evadeDir.z * sp;
                if (this.stateTime > 0.35) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.thinkTimer = 0.1;
                }
                break;
            }
            case 'roar': {
                this.vel.set(0, 0, 0);
                if (this.stateTime > COMBAT_TUNING.TRANSITION_DURATION) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.breatherTimer = 0.6 * this.diff.breather;
                    this.thinkTimer = this.breatherTimer;
                }
                break;
            }
            case 'stanceBreak': {
                this.vel.set(0, 0, 0);
                if (this.stateTime > this.staggerDuration) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.staggerDuration = COMBAT_TUNING.STANCE_BREAK_POISE;
                    this.vulnerable = false;
                    this.thinkTimer = 0.15;
                }
                break;
            }
            case 'attack': {
                const atk = this.currentAttack;
                const t = this.stateTime;
                const chamber = atk.windup;
                const hold = atk.hold || 0;
                const swingStart = chamber + hold;
                const swingEnd = swingStart + atk.active;
                const total = swingEnd + atk.recover;

                // ER tracking: rotate hard until 75 % of the windup, then commit
                if (t < chamber * 0.75 && !playerGone) {
                    this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * (atk.turnPunish ? 11 : 7));
                }

                if (t < chamber) {
                    this.vel.set(0, 0, 0);
                    if (atk.backstep) {
                        forward(this.heading, _t2);
                        const step = (atk.backstep * dt / Math.max(chamber, 0.01)) * 0.5;
                        this.pos.x -= _t2.x * step;
                        this.pos.z -= _t2.z * step;
                        clampToArena(this.pos);
                    }
                } else if (t < swingStart) {
                    if (!this.delayAnnounced) {
                        this.delayAnnounced = true;
                        ctx?.onBossEvent?.('delay', { name: atk.name });
                    }
                    this.vel.set(0, 0, 0);
                } else if (t < swingEnd) {
                    if (atk.leap) {
                        // Leaping slam: travel to the captured target over the active
                        // window on a parabolic arc, capped per step (never a teleport)
                        this.vel.set(0, 0, 0);
                        if (!this.leapStarted) {
                            this.leapStarted = true;
                            this.leapTo = { x: player.pos.x, z: player.pos.z };
                            ctx?.onBossEvent?.('leap', {});
                        }
                        const lx = (this.leapTo ? this.leapTo.x : this.pos.x) - this.pos.x;
                        const lz = (this.leapTo ? this.leapTo.z : this.pos.z) - this.pos.z;
                        const ld = Math.hypot(lx, lz);
                        if (ld > 1e-4) {
                            const step = Math.min(ld, MAX_ATTACK_TRAVEL_PER_STEP);
                            this.pos.x += (lx / ld) * step;
                            this.pos.z += (lz / ld) * step;
                        }
                        const p = clamp01((t - swingStart) / Math.max(atk.active, 0.001));
                        this.leapP = p;
                        this.pos.y = COMBAT_TUNING.LEAP_HEIGHT * 4 * p * (1 - p);
                        clampToArena(this.pos);
                    } else if (atk.aoe) {
                        this.vel.set(0, 0, 0);
                        if (t >= chamber + (atk.impactDelay || 0)) this.impactAoe(atk, player, ctx);
                    } else {
                        forward(this.heading, _t2);
                        if (atk.dash) {
                            const speed = (atk.dash / Math.max(atk.active, 0.01)) * 0.7;
                            this.vel.x = _t2.x * speed;
                            this.vel.z = _t2.z * speed;
                        } else {
                            this.vel.x = _t2.x * 2.0;
                            this.vel.z = _t2.z * 2.0;
                        }
                        if (!this.attackHitDone && !playerGone && this.meleeCheck(atk, player)) {
                            this.attackHitDone = true;
                            const res = player.receiveHit(atk, this, ctx);
                            ctx?.onPlayerHit?.(res, atk, player, this);
                        }
                    }
                } else {
                    this.vel.x *= Math.pow(0.001, dt);
                    this.vel.z *= Math.pow(0.001, dt);
                    if (atk.leap && !this.impactDone) {
                        this.pos.y = 0;
                        this.impactAoe(atk, player, ctx);
                    }
                }

                if (t >= total) this.finishAttackStep(ctx);
                break;
            }
        }

        // Integrate — bounded per-step travel while attacking; never overshoot
        // through the player; clampToArena keeps everything in the arena
        let mx = this.vel.x * dt;
        let mz = this.vel.z * dt;
        if (this.state === 'attack' && this.currentAttack && !this.currentAttack.leap) {
            const stepLen = Math.hypot(mx, mz);
            if (stepLen > MAX_ATTACK_TRAVEL_PER_STEP) {
                const s = MAX_ATTACK_TRAVEL_PER_STEP / stepLen;
                mx *= s;
                mz *= s;
            }
            if (!playerGone) {
                const px = player.pos.x - this.pos.x;
                const pz = player.pos.z - this.pos.z;
                const d = Math.hypot(px, pz);
                if (d > 0.001) {
                    const toward = (mx * px + mz * pz) / d;
                    if (toward > 0 && toward > d - ATTACK_STOP_DIST) {
                        const s = Math.max(0, d - ATTACK_STOP_DIST) / toward;
                        mx *= s;
                        mz *= s;
                    }
                }
            }
        }
        this.pos.x += mx;
        this.pos.z += mz;
        clampToArena(this.pos);

        // Body collision
        if (!player.dead) {
            const px = this.pos.x - player.pos.x;
            const pz = this.pos.z - player.pos.z;
            const d = Math.hypot(px, pz);
            const minD = 1.05;
            if (d < minD && d > 0.001) {
                const push = (minD - d) / 2;
                this.pos.x += (px / d) * push;
                this.pos.z += (pz / d) * push;
                player.pos.x -= (px / d) * push;
                player.pos.z -= (pz / d) * push;
            }
        }

        this.rig.root.position.copy(this.pos);
        this.rig.root.rotation.y = this.heading;
        this.pose(dt);
    }

    /** Radial AoE impact: 'land' (+ 'shockwave' for the nova), then the hit. */
    impactAoe(atk, player, ctx) {
        if (this.impactDone) return;
        this.impactDone = true;
        const radius = atk.radius || 3.0;
        ctx?.onBossEvent?.('land', { x: this.pos.x, z: this.pos.z, radius });
        if (atk.nova) ctx?.onBossEvent?.('shockwave', { x: this.pos.x, z: this.pos.z, radius, duration: 0.35 });
        if (!player || player.dead || player.state === 'victory') return;
        if (this.distTo(player) <= radius + 0.35) {
            const res = player.receiveHit(atk, this, ctx);
            ctx?.onPlayerHit?.(res, atk, player, this);
        }
    }

    pose(dt) {
        let glow = 0;
        const speed = Math.hypot(this.vel.x, this.vel.z);
        if (this.state === 'attack' && this.currentAttack) {
            const atk = this.currentAttack;
            const chamber = atk.windup;
            const hold = atk.hold || 0;
            const swingStart = chamber + hold;
            const windupP = Math.min(1, this.stateTime / Math.max(chamber, 0.001));
            const swingP = clamp01((this.stateTime - swingStart) / atk.active);
            const recoverP = clamp01((this.stateTime - swingStart - atk.active) / atk.recover);
            const held = this.stateTime >= chamber && this.stateTime < swingStart
                ? Math.max(0, this.stateTime - chamber) : 0;
            const airborne = atk.leap && this.stateTime < swingStart + atk.active;
            this.rig.pose('attack', this.stateTime, dt, {
                attackType: atk.type,
                windup: this.stateTime < chamber ? windupP : 0,
                progress: swingP,
                recover: recoverP,
                hold: held,
                charge: 0,
                air: airborne ? this.leapP : 0,
            });
            glow = this.stateTime < chamber ? windupP
                : this.stateTime < swingStart ? 1
                : Math.max(0, 1 - swingP * 2);
        } else if (this.state === 'stanceBreak') {
            this.rig.pose('stanceBreak', this.stateTime, dt, { progress: clamp01(this.stateTime / this.staggerDuration) });
        } else if (this.state === 'roar') {
            this.rig.pose('roar', this.stateTime, dt, { progress: clamp01(this.stateTime / COMBAT_TUNING.TRANSITION_DURATION) });
        } else if (this.state === 'block') {
            this.rig.pose('block', this.stateTime, dt, {});
        } else if (this.state === 'evade' || this.state === 'backstep') {
            this.rig.pose('backstep', this.stateTime, dt, { progress: clamp01(this.stateTime / 0.35) });
        } else if ((this.state === 'stalk' || this.state === 'approach') && speed > 0.3) {
            const local = localMove(this.vel, this.heading);
            this.rig.pose('run', this.stateTime, dt, { moveSpeed: local.speed, moveX: local.x, moveZ: local.z });
        } else {
            this.rig.pose('idle', this.stateTime, dt, {});
        }
        // Blade emissive: cold steel in phase 1, ember-orange from phase 2 on
        const e = this.rig.blade.material.emissive;
        if (this.phase >= 2) {
            e.setRGB(0.45 + glow * 0.5, 0.14 + glow * 0.22, 0.05 + glow * 0.03);
        } else {
            e.setRGB(0.35 + glow * 0.55, 0.35 - glow * 0.28, 0.35 - glow * 0.32);
        }
    }

    /** Melee arc check vs target. Returns true if in range + arc. */
    meleeCheck(atk, target) {
        _tv.subVectors(target.pos, this.pos);
        _tv.y = 0;
        const dist = _tv.length();
        if (dist > atk.range + 0.5) return false;
        return Math.abs(angleDiff(Math.atan2(_tv.x, _tv.z), this.heading)) < atk.arc / 2;
    }
}
