/**
 * Souls-like Battle Game - Combat Module
 * Player controller (souls mechanics: dodge i-frames, parry -> riposte,
 * block/guard-break, stamina, estus, 3-hit combos, lock-on strafing)
 * and the Boss AI (distance-based decisions, delayed attacks, feints,
 * gap closers, heal punishes, rage phase, poise, occasional blocking).
 */
import * as THREE from 'three';
import { clampToArena } from './engine.js';

const _v = new THREE.Vector3();

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

// ======================================================================
// PLAYER
// ======================================================================
export const PLAYER_ATTACKS = [
    { type: 0, windup: 0.22, active: 0.12, recover: 0.28, range: 2.1, arc: 1.9, damage: 22, stamina: 18 },
    { type: 1, windup: 0.16, active: 0.12, recover: 0.28, range: 2.1, arc: 1.9, damage: 24, stamina: 18 },
    { type: 2, windup: 0.30, active: 0.14, recover: 0.42, range: 2.3, arc: 1.4, damage: 34, stamina: 24 },
];
const RIPOSTE = { windup: 0.24, active: 0.14, recover: 0.5, range: 2.4, arc: 1.6, damage: 95, stamina: 0 };

export class Player {
    constructor(rig) {
        this.rig = rig;
        this.pos = rig.root.position;
        this.reset();
    }

    reset() {
        this.pos.set(0, 0, 5.5);
        this.heading = Math.PI;           // face -z (toward boss spawn)
        this.vel = new THREE.Vector3();
        this.hp = this.maxHp = 120;
        this.stamina = this.maxStamina = 100;
        this.estus = this.estusMax = 3;
        this.state = 'idle';
        this.stateTime = 0;
        this.comboIndex = 0;
        this.comboQueued = false;
        this.iframes = 0;
        this.parryWindow = 0;
        this.riposteWindow = 0;
        this.staminaDelay = 0;
        this.blockHeld = false;
        this.rollDir = new THREE.Vector3(0, 0, -1);
        this.currentAttack = null;
        this.attackHitDone = false;
        this.healed = false;
        this.moveSpeed = 0;
        this.attackBuffer = false;
        this.rollBuffer = false;
        this.healBuffer = false;
        this.bufferedRollDir = null;
        this.rig.root.visible = true;
    }

    get dead() { return this.state === 'dead'; }
    get busy() {
        return ['attack', 'roll', 'stagger', 'guardbroken', 'heal', 'dead', 'victory', 'parry'].includes(this.state);
    }

    spendStamina(n) {
        this.stamina = Math.max(0, this.stamina - n);
        this.staminaDelay = 0.8;
    }

    /** Edge-triggered actions from the input layer. */
    tryAttack() {
        if (this.dead) return;
        // Riposte?
        if (this.riposteWindow > 0 && this.state !== 'attack' && this.state !== 'roll' && this.state !== 'stagger') {
            this.state = 'attack';
            this.stateTime = 0;
            this.currentAttack = { ...RIPOSTE, riposte: true, type: 3 };
            this.attackHitDone = false;
            this.riposteWindow = 0;
            return;
        }
        if (this.state === 'attack') {
            // Buffer next combo hit from early in the swing (feel + readability)
            const atk = this.currentAttack;
            if (atk && this.stateTime > atk.windup * 0.6 && this.comboIndex < PLAYER_ATTACKS.length - 1) {
                this.comboQueued = true;
            }
            return;
        }
        // Buffer input out of roll / stagger recovery so late presses still land
        if (this.state === 'roll' && this.stateTime > 0.34) { this.attackBuffer = true; return; }
        if (this.state === 'stagger' || this.state === 'guardbroken' || this.state === 'parry') {
            this.attackBuffer = true;
            return;
        }
        if (this.busy) return;
        if (this.stamina < PLAYER_ATTACKS[0].stamina) return;
        this.startSwing(0);
    }

    startSwing(index) {
        const atk = PLAYER_ATTACKS[index];
        this.state = 'attack';
        this.stateTime = 0;
        this.comboIndex = index;
        this.comboQueued = false;
        this.currentAttack = atk;
        this.attackHitDone = false;
        this.spendStamina(atk.stamina);
    }

    tryRoll(moveDir, locked) {
        // Buffer roll out of attack recovery (last 0.12s) so cancels feel responsive
        if (this.state === 'attack' && this.currentAttack) {
            const a = this.currentAttack;
            if (this.stateTime > a.windup + a.active + a.recover - 0.12) {
                this.rollBuffer = true;
                this.bufferedRollDir = { x: moveDir.x, z: moveDir.z, locked };
            }
            return;
        }
        if (this.state === 'stagger' || this.state === 'guardbroken') {
            this.rollBuffer = true;
            return;
        }
        if (this.busy || this.stamina < 1) return;
        this.state = 'roll';
        this.stateTime = 0;
        this.spendStamina(20);
        this.iframes = 0;
        if (moveDir.lengthSq() > 0.01) {
            this.rollDir.copy(moveDir).normalize();
        } else if (locked) {
            // Default: roll backward (away from boss)
            forward(this.heading, this.rollDir).negate();
        } else {
            forward(this.heading, this.rollDir);
        }
        this.heading = Math.atan2(this.rollDir.x, this.rollDir.z);
    }

    tryHeal(ctx) {
        // Buffer heal out of recovery windows
        if (this.state === 'roll' || this.state === 'stagger' || this.state === 'guardbroken') {
            this.healBuffer = true;
            return;
        }
        if (this.busy || this.estus <= 0) return;
        this.estus--; // consume immediately — prevents free-heal on interrupt after commit
        this.state = 'heal';
        this.stateTime = 0;
        this.healed = false;
    }

    setBlock(held) {
        if (held && !this.blockHeld && !this.busy) {
            this.state = 'block';
            this.stateTime = 0;
            this.parryWindow = 0.18;      // parry active window on press
        }
        this.blockHeld = held;
        if (!held && this.state === 'block') {
            this.state = 'idle';
            this.stateTime = 0;
        }
    }

    /**
     * Incoming hit resolution. Returns outcome string.
     */
    receiveHit(atk, attacker, ctx) {
        if (this.dead) return 'dead';
        // Dodge i-frames (roll window)
        if (this.iframes > 0 || (this.state === 'roll' && this.stateTime > 0.04 && this.stateTime < 0.42)) {
            return 'dodged';
        }
        // Must be facing the attacker to parry/block
        _v.subVectors(attacker.pos, this.pos);
        const toAttacker = Math.atan2(_v.x, _v.z);
        const facing = Math.abs(angleDiff(toAttacker, this.heading)) < 1.1;

        if (this.parryWindow > 0 && facing && atk.parryable !== false) {
            this.parryWindow = 0;
            this.riposteWindow = 2.8;
            this.state = 'parry';
            this.stateTime = 0;
            attacker.onParried(ctx);
            return 'parried';
        }
        if (this.blockHeld && this.state === 'block' && facing) {
            const stamCost = atk.damage * (atk.guardPressure || 0.7);
            this.spendStamina(stamCost);
            if (atk.chip) this.hp = Math.max(1, this.hp - atk.damage * 0.15);
            if (this.stamina <= 0) {
                this.state = 'guardbroken';
                this.stateTime = 0;
                this.blockHeld = false;
                return 'guardbroken';
            }
            this.stateTime = -0.18; // brief block stun (extends block pose)
            return 'blocked';
        }
        // Clean hit — hyper-armor during active swing frames (no stagger cancel)
        this.hp -= atk.damage;
        this.staminaDelay = 0.8;
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this.stateTime = 0;
        } else {
            const a = this.currentAttack;
            const hyperArmor = this.state === 'attack' && a &&
                this.stateTime > a.windup && this.stateTime < a.windup + a.active;
            if (!hyperArmor) {
                this.state = 'stagger';
                this.stateTime = 0;
            }
        }
        this.comboQueued = false;
        return 'hit';
    }

    onParried(ctx) { /* player never gets parried by boss in this design */ }

    update(dt, input, boss, ctx) {
        this.stateTime += dt;
        this.iframes = Math.max(0, this.iframes - dt);
        this.parryWindow = Math.max(0, this.parryWindow - dt);
        this.riposteWindow = Math.max(0, this.riposteWindow - dt);
        this.staminaDelay = Math.max(0, this.staminaDelay - dt);

        // Stamina regen
        if (this.staminaDelay <= 0 && !this.dead) {
            const rate = this.state === 'block' ? 16 : 34;
            this.stamina = Math.min(this.maxStamina, this.stamina + rate * dt);
        }

        // Face boss when locked-on (except while rolling/attacking mid-swing)
        const locked = input.locked && boss && !boss.dead;
        if (locked && ['idle', 'run', 'block'].includes(this.state)) {
            _v.subVectors(boss.pos, this.pos);
            const want = Math.atan2(_v.x, _v.z);
            this.heading += angleDiff(want, this.heading) * Math.min(1, dt * 12);
        }

        let speedTarget = 0;
        switch (this.state) {
            case 'idle':
            case 'run': {
                const mv = input.moveVec; // camera-relative, normalized
                speedTarget = mv.length() > 0.1 ? (input.sprint && this.stamina > 1 ? 6.4 : 4.2) : 0;
                if (speedTarget > 0) {
                    this.state = 'run';
                    if (input.sprint) this.spendStamina(9 * dt);
                    if (!locked) {
                        const want = Math.atan2(mv.x, mv.z);
                        this.heading += angleDiff(want, this.heading) * Math.min(1, dt * 14);
                    }
                    // Locked-on: strafe - move in world space along mv
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
                const mv = input.moveVec;
                speedTarget = mv.length() > 0.1 ? 1.8 : 0;
                this.vel.x = mv.x * speedTarget;
                this.vel.z = mv.z * speedTarget;
                this.moveSpeed = speedTarget;
                break;
            }
            case 'roll': {
                const ROLL_TIME = 0.55;
                const p = this.stateTime / ROLL_TIME;
                const sp = 8.0 * (1 - easeOut(Math.min(1, p)) * 0.55);
                this.vel.x = this.rollDir.x * sp;
                this.vel.z = this.rollDir.z * sp;
                // i-frames active ~0.04–0.42s (matches receiveHit)
                this.iframes = (this.stateTime > 0.04 && this.stateTime < 0.42) ? 0.01 : 0;
                if (p >= 1) {
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
                // Forward lunge during active phase
                if (t > atk.windup && t < atk.windup + atk.active) {
                    forward(this.heading, _v);
                    this.vel.x = _v.x * 3.0;
                    this.vel.z = _v.z * 3.0;
                    // Hit check (once per swing)
                    if (!this.attackHitDone && boss && !boss.dead) {
                        const out = this.meleeCheck(atk, boss);
                        if (out) {
                            this.attackHitDone = true;
                            const res = boss.receiveHit(atk, this, ctx);
                            ctx.onBossHit(res, atk, boss, this);
                        }
                    }
                } else {
                    this.vel.x *= Math.pow(0.0001, dt);
                    this.vel.z *= Math.pow(0.0001, dt);
                }
                if (t > atk.windup + atk.active + atk.recover) {
                    if (this.comboQueued && this.stamina >= PLAYER_ATTACKS[Math.min(this.comboIndex + 1, 2)].stamina) {
                        // Face boss again for the follow-up
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
                if (this.stateTime > 2.0) { this.state = 'idle'; this.stateTime = 0; this.stamina = this.maxStamina * 0.5; this.flushBuffer(); }
                break;
            case 'heal': {
                this.vel.x *= Math.pow(0.0001, dt);
                this.vel.z *= Math.pow(0.0001, dt);
                if (!this.healed && this.stateTime >= 1.0) {
                    this.healed = true;
                    this.hp = Math.min(this.maxHp, this.hp + 45);
                    ctx.onPlayerHealed(this);
                }
                if (this.stateTime >= 1.4) {
                    // estus already consumed in tryHeal (prevents free-heal exploit)
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.flushBuffer();
                }
                break;
            }
            case 'parry':
                if (this.stateTime > 0.4) { this.state = 'idle'; this.stateTime = 0; }
                break;
            case 'dead':
            case 'victory':
                this.vel.set(0, 0, 0);
                break;
        }

        // Integrate
        this.pos.x += this.vel.x * dt;
        this.pos.z += this.vel.z * dt;
        clampToArena(this.pos);

        // Apply rig transform
        this.rig.root.position.copy(this.pos);
        this.rig.root.rotation.y = this.heading;

        // Pose
        const atk = this.currentAttack;
        if (this.state === 'attack' && atk) {
            const windupP = Math.min(1, this.stateTime / atk.windup);
            const swingP = Math.max(0, Math.min(1, (this.stateTime - atk.windup) / atk.active));
            const recoverP = Math.max(0, Math.min(1, (this.stateTime - atk.windup - atk.active) / atk.recover));
            this.rig.pose('attack', this.stateTime, dt, {
                attackType: atk.type,
                windup: this.stateTime < atk.windup ? windupP : 0,
                progress: swingP,
                recover: recoverP,
            });
        } else if (this.state === 'run') {
            this.rig.pose('run', this.stateTime, dt, { moveSpeed: this.moveSpeed });
        } else {
            const dur = this.state === 'dead' ? 1.2
                : this.state === 'guardbroken' ? 2.0
                : this.state === 'stagger' ? 0.45
                : this.state === 'parry' ? 0.4
                : this.state === 'heal' ? 1.4
                : this.state === 'victory' ? 99
                : 1;
            this.rig.pose(this.state, this.stateTime, dt, { progress: Math.max(0, Math.min(1, this.stateTime / dur)) });
        }
    }

    /** Melee arc check vs target. Returns true if in range + arc. */
    meleeCheck(atk, target) {
        _v.subVectors(target.pos, this.pos);
        _v.y = 0;
        const dist = _v.length();
        if (dist > atk.range + 0.55) return false;
        const toTarget = Math.atan2(_v.x, _v.z);
        return Math.abs(angleDiff(toTarget, this.heading)) < atk.arc / 2;
    }

    /** Fire off buffered inputs after recovery ends (roll/stagger/heal out). */
    flushBuffer() {
        if (this.attackBuffer) {
            this.attackBuffer = false;
            this.tryAttack();
            if (this.state === 'attack') return;
        }
        if (this.rollBuffer) {
            this.rollBuffer = false;
            const b = this.bufferedRollDir;
            this.bufferedRollDir = null;
            if (b) this.tryRoll(b, b.locked);
            if (this.state === 'roll') return;
        }
        if (this.healBuffer) {
            this.healBuffer = false;
            this.tryHeal();
            if (this.state === 'heal') return;
        }
    }
}

// ======================================================================
// BOSS — distance-banded movesets, reactive punishes, rage phase
// ======================================================================
const BOSS_ATTACKS = {
    // CLOSE (< 2.6)
    jab:           { type: 3, windup: 0.28, active: 0.10, recover: 0.35, range: 2.5, arc: 1.5, damage: 14, cd: 0.9, band: 'close' },
    quickSlash:    { type: 0, windup: 0.40, active: 0.14, recover: 0.52, range: 2.7, arc: 2.0, damage: 16, cd: 1.1, band: 'close' },
    shieldBash:    { type: 3, windup: 0.42, active: 0.14, recover: 0.55, range: 2.5, arc: 1.7, damage: 12, cd: 2.4, guardPressure: 2.8, chip: true, band: 'close' },
    backstepSlash: { type: 1, windup: 0.34, active: 0.16, recover: 0.48, range: 2.8, arc: 1.9, damage: 18, cd: 2.2, backstep: 2.2, band: 'close' },
    // MID (2.6 – 5.5)
    comboSlash:    { type: 1, windup: 0.34, active: 0.13, recover: 0.32, range: 2.8, arc: 2.1, damage: 14, cd: 1.8, band: 'mid' },
    heavyOverhead: { type: 2, windup: 0.85, active: 0.16, recover: 0.72, range: 3.0, arc: 1.6, damage: 30, cd: 2.6, guardPressure: 1.2, band: 'mid' },
    spinSlash:     { type: 0, windup: 0.55, active: 0.22, recover: 0.65, range: 3.2, arc: 3.4, damage: 22, cd: 3.4, band: 'mid' },
    // FAR (5.5 – 9)
    dashThrust:    { type: 3, windup: 0.50, active: 0.26, recover: 0.62, range: 2.8, arc: 1.3, damage: 22, cd: 2.8, dash: 11, band: 'far' },
    runningSlash:  { type: 0, windup: 0.55, active: 0.20, recover: 0.70, range: 3.0, arc: 2.0, damage: 20, cd: 3.2, dash: 13, band: 'far' },
    // VERY FAR (> 9) / heal punish
    charge:        { type: 3, windup: 0.75, active: 0.35, recover: 0.85, range: 3.0, arc: 1.4, damage: 28, cd: 4.0, dash: 16, band: 'vfar' },
};

const BAND_CLOSE = 2.6;
const BAND_MID = 5.5;
const BAND_FAR = 9.0;

function pickWeighted(list) {
    // list: [[name, weight], ...]
    let total = 0;
    for (let i = 0; i < list.length; i++) total += list[i][1];
    let roll = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
        roll -= list[i][1];
        if (roll <= 0) return list[i][0];
    }
    return list[list.length - 1][0];
}

export class Boss {
    constructor(rig) {
        this.rig = rig;
        this.pos = rig.root.position;
        this.name = 'BOSS';
        this.reset();
    }

    reset() {
        this.pos.set(0, 0, -5.5);
        this.heading = 0;
        this.vel = new THREE.Vector3();
        this.hp = this.maxHp = 320;
        this.state = 'idle';
        this.stateTime = 0;
        this.currentAttack = null;
        this.attackHitDone = false;
        this.comboStep = 0;
        this.thinkTimer = 0.4;
        this.strafeDir = 1;
        this.strafeTimer = 0;
        this.cooldowns = {};
        for (const k in BOSS_ATTACKS) this.cooldowns[k] = 0;
        this.blockChanceCd = 0;
        this.hitCounter = 0;
        this.rage = false;
        this.feinting = false;
        this.dead = false;
        this.staggerDuration = 2.5;
        this.lastBand = 'mid';
        this.reactiveCd = 0;
        this.rig.root.visible = true;
    }

    /** Rage = phase 2: shorter windups, faster recovers, tighter CDs. */
    get windupMult() { return this.rage ? 0.72 : 1; }
    get recoverMult() { return this.rage ? 0.78 : 1; }
    get cdMult() { return this.rage ? 0.65 : 1; }

    onParried() {
        this.state = 'staggered';
        this.stateTime = 0;
        this.staggerDuration = 2.5;
        this.currentAttack = null;
        this.feinting = false;
        this.attackName = null;
    }

    receiveHit(atk, attacker, ctx) {
        if (this.dead) return 'dead';
        if (this.state === 'block') return 'blocked';
        this.hp -= atk.damage;
        this.hitCounter++;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            this.state = 'dead';
            this.stateTime = 0;
            return 'hit';
        }
        if (!this.rage && this.hp < this.maxHp * 0.5) {
            this.rage = true;
            ctx.onBossRage(this);
        }
        // High poise: only every 6th hit (not during own swing) staggers briefly
        if (!atk.riposte && this.state !== 'staggered' && this.state !== 'attack' && this.hitCounter % 6 === 0) {
            this.state = 'staggered';
            this.stateTime = 0;
            this.staggerDuration = 0.4;
            this.currentAttack = null;
            this.attackName = null;
        }
        return 'hit';
    }

    bandOf(dist) {
        if (dist < BAND_CLOSE) return 'close';
        if (dist < BAND_MID) return 'mid';
        if (dist < BAND_FAR) return 'far';
        return 'vfar';
    }

    ready(name) { return (this.cooldowns[name] || 0) <= 0; }

    /**
     * Distance-banded decision + reactive punishes.
     * close: pressure / anti-turtle / backstep counters
     * mid: strings, feints, wide arcs
     * far: gap closers
     * vfar: charge / approach
     */
    decide(player) {
        _v.subVectors(player.pos, this.pos);
        const dist = _v.length();
        const band = this.bandOf(dist);
        this.lastBand = band;
        const pState = player.state;
        const rageW = this.rage ? 1.35 : 1;

        // --- Universal reactive punishes ---
        // Heal punish: closest available closer
        if (pState === 'heal') {
            if (dist > BAND_FAR && this.ready('charge')) return this.startAttack('charge');
            if (this.ready('dashThrust')) return this.startAttack('dashThrust');
            if (this.ready('runningSlash')) return this.startAttack('runningSlash');
        }
        // Anti-turtle
        if (pState === 'block' && dist < BAND_MID && this.ready('shieldBash')) {
            return this.startAttack('shieldBash');
        }
        // Player mid-swing in our face → backstep counter (phase 2 only, reactive)
        if (pState === 'attack' && dist < 2.4 && this.rage && this.reactiveCd <= 0 && this.ready('backstepSlash')) {
            this.reactiveCd = 4;
            return this.startAttack('backstepSlash');
        }

        // --- Band tables ---
        if (band === 'close') {
            const options = [];
            if (this.ready('jab')) options.push(['jab', 3 * rageW]);
            if (this.ready('quickSlash')) options.push(['quickSlash', 3 * rageW]);
            if (this.ready('shieldBash') && pState === 'block') options.push(['shieldBash', 4]);
            if (this.ready('backstepSlash') && (pState === 'attack' || pState === 'run')) options.push(['backstepSlash', 2.5 * rageW]);
            if (this.ready('comboSlash')) options.push(['comboSlash', 2.2 * rageW]);
            if (this.ready('heavyOverhead')) options.push(['heavyOverhead', 1.6]);
            if (this.ready('spinSlash') && this.rage) options.push(['spinSlash', 1.8]);
            if (options.length) {
                // Feint opener in rage: fake overhead into jab/slash
                if (this.rage && this.ready('heavyOverhead') && Math.random() < 0.28) {
                    this.startAttack('heavyOverhead');
                    this.feinting = true;
                    return;
                }
                return this.startAttack(pickWeighted(options));
            }
            // Everything on CD: short strafe, redecide fast
            this.state = 'strafe';
            this.stateTime = 0;
            this.thinkTimer = 0.12;
            return;
        }

        if (band === 'mid') {
            const options = [];
            if (this.ready('comboSlash')) options.push(['comboSlash', 3 * rageW]);
            if (this.ready('heavyOverhead')) options.push(['heavyOverhead', 2.2]);
            if (this.ready('spinSlash')) options.push(['spinSlash', 2 * rageW]);
            if (this.ready('quickSlash')) options.push(['quickSlash', 1.5 * rageW]);
            if (this.ready('jab')) options.push(['jab', 1.2 * rageW]);
            if (this.ready('dashThrust')) options.push(['dashThrust', 1.8 * rageW]);
            if (options.length) {
                if (this.rage && this.ready('heavyOverhead') && Math.random() < 0.22) {
                    this.startAttack('heavyOverhead');
                    this.feinting = true;
                    return;
                }
                return this.startAttack(pickWeighted(options));
            }
            this.state = Math.random() < 0.55 ? 'approach' : 'strafe';
            this.stateTime = 0;
            this.thinkTimer = 0.15;
            return;
        }

        if (band === 'far') {
            const options = [];
            if (this.ready('dashThrust')) options.push(['dashThrust', 3.5 * rageW]);
            if (this.ready('runningSlash')) options.push(['runningSlash', 3 * rageW]);
            if (this.ready('charge') && this.rage) options.push(['charge', 2]);
            if (options.length) return this.startAttack(pickWeighted(options));
            this.state = 'approach';
            this.stateTime = 0;
            this.thinkTimer = 0.1;
            return;
        }

        // vfar
        if (this.ready('charge')) return this.startAttack('charge');
        if (this.ready('runningSlash')) return this.startAttack('runningSlash');
        if (this.ready('dashThrust')) return this.startAttack('dashThrust');
        this.state = 'approach';
        this.stateTime = 0;
        this.thinkTimer = 0.08;
    }

    startAttack(name) {
        const base = BOSS_ATTACKS[name];
        if (!base) return;
        this.currentAttack = {
            ...base,
            name,
            windup: base.windup * this.windupMult,
            recover: base.recover * this.recoverMult,
            damage: this.rage ? Math.round(base.damage * 1.12) : base.damage,
        };
        this.attackName = name;
        this.state = 'attack';
        this.stateTime = 0;
        this.attackHitDone = false;
        this.feinting = false; // startAttack always clears; decide sets feinting AFTER if needed
        this.cooldowns[name] = base.cd * this.cdMult;
    }

    /** Called by decide before startAttack for feints — preserve flag. */
    startFeintedAttack(name) {
        this.startAttack(name);
        this.feinting = true;
    }

    update(dt, player, ctx) {
        this.stateTime += dt;
        for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
        this.blockChanceCd = Math.max(0, this.blockChanceCd - dt);
        this.reactiveCd = Math.max(0, this.reactiveCd - dt);

        if (this.dead) {
            this.vel.set(0, 0, 0);
            this.rig.pose('dead', this.stateTime, dt, { progress: Math.min(1, this.stateTime / 1.2) });
            this.rig.root.rotation.y = this.heading;
            return;
        }

        _v.subVectors(player.pos, this.pos);
        const dist = _v.length();
        const toPlayer = Math.atan2(_v.x, _v.z);

        // Reactive block if player swings while we're free
        if (player.state === 'attack' && dist < 3.4 && this.blockChanceCd <= 0 &&
            ['idle', 'approach', 'strafe'].includes(this.state) &&
            Math.random() < (this.rage ? 0.35 : 0.22)) {
            this.state = 'block';
            this.stateTime = 0;
            this.blockChanceCd = 3.2;
        }

        switch (this.state) {
            case 'idle':
            case 'approach': {
                this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 7);
                const sp = (dist > BAND_MID ? 5.2 : 3.6) * (this.rage ? 1.3 : 1);
                if (dist > 2.1) {
                    forward(this.heading, _v);
                    this.vel.x = _v.x * sp;
                    this.vel.z = _v.z * sp;
                    this.state = 'approach';
                } else {
                    this.vel.set(0, 0, 0);
                    this.state = 'idle';
                }
                this.thinkTimer -= dt;
                if (this.thinkTimer <= 0) {
                    // Phase 2 thinks much faster → relentless pressure
                    this.thinkTimer = (this.rage ? 0.22 : 0.4) + Math.random() * (this.rage ? 0.18 : 0.3);
                    this.decide(player);
                }
                break;
            }
            case 'strafe': {
                this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 9);
                this.strafeTimer -= dt;
                if (this.strafeTimer <= 0) {
                    this.strafeTimer = 0.55 + Math.random() * 0.7;
                    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
                }
                const tangent = toPlayer + (Math.PI / 2) * this.strafeDir;
                const sp = 2.6 * (this.rage ? 1.4 : 1);
                const radial = dist - 3.0;
                forward(tangent, _v);
                this.vel.x = _v.x * sp + Math.sin(toPlayer) * radial * 1.4;
                this.vel.z = _v.z * sp + Math.cos(toPlayer) * radial * 1.4;
                this.thinkTimer -= dt;
                if (this.thinkTimer <= 0) {
                    this.thinkTimer = (this.rage ? 0.2 : 0.32) + Math.random() * 0.25;
                    this.decide(player);
                }
                break;
            }
            case 'block':
                this.vel.set(0, 0, 0);
                this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 12);
                if (this.stateTime > (this.rage ? 0.55 : 0.7)) {
                    this.state = 'idle';
                    this.thinkTimer = 0.05;
                }
                break;
            case 'attack': {
                const atk = this.currentAttack;
                const t = this.stateTime;

                // Feint: cancel overhead mid-windup → sidestep → jab/slash
                if (this.feinting && this.attackName === 'heavyOverhead' && t > atk.windup * 0.52) {
                    this.feinting = false;
                    const side = toPlayer + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
                    forward(side, _v);
                    this.pos.x += _v.x * 1.5;
                    this.pos.z += _v.z * 1.5;
                    clampToArena(this.pos);
                    this.startAttack(Math.random() < 0.5 ? 'jab' : 'quickSlash');
                    break;
                }

                // Early windup tracking (then commit)
                if (t < atk.windup * 0.5) {
                    this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 4);
                }

                if (t < atk.windup) {
                    this.vel.set(0, 0, 0);
                    // Backstep attacks hop away during windup
                    if (atk.backstep) {
                        forward(this.heading, _v);
                        this.pos.x -= _v.x * atk.backstep * dt / Math.max(atk.windup, 0.01) * 0.5;
                        this.pos.z -= _v.z * atk.backstep * dt / Math.max(atk.windup, 0.01) * 0.5;
                        clampToArena(this.pos);
                    }
                } else if (t < atk.windup + atk.active) {
                    forward(this.heading, _v);
                    if (atk.dash) {
                        // Dash covers ground fast (distance / time, with slight scale)
                        const speed = (atk.dash / Math.max(atk.active, 0.01)) * 0.7;
                        this.vel.x = _v.x * speed;
                        this.vel.z = _v.z * speed;
                    } else {
                        this.vel.x = _v.x * 2.0;
                        this.vel.z = _v.z * 2.0;
                    }
                    if (!this.attackHitDone && !player.dead && this.meleeCheck(atk, player)) {
                        this.attackHitDone = true;
                        const res = player.receiveHit(atk, this, ctx);
                        ctx.onPlayerHit(res, atk, player, this);
                    }
                } else {
                    this.vel.x *= Math.pow(0.001, dt);
                    this.vel.z *= Math.pow(0.001, dt);
                }

                if (t > atk.windup + atk.active + atk.recover) {
                    // Chain combo: 3-hit string if player still in range
                    if (this.attackName === 'comboSlash' && this.comboStep < 2 && dist < 4.2 && !player.dead) {
                        this.comboStep++;
                        this.currentAttack = {
                            ...atk,
                            windup: 0.24 * this.windupMult,
                            type: this.comboStep % 2,
                            damage: Math.round(atk.damage * 0.95),
                        };
                        this.stateTime = 0;
                        this.attackHitDone = false;
                    } else {
                        this.comboStep = 0;
                        this.state = 'idle';
                        this.stateTime = 0;
                        this.thinkTimer = (this.rage ? 0.18 : 0.35) + Math.random() * (this.rage ? 0.15 : 0.3);
                        this.currentAttack = null;
                        this.attackName = null;
                    }
                }
                break;
            }
            case 'staggered':
                this.vel.set(0, 0, 0);
                if (this.stateTime > this.staggerDuration) {
                    this.state = 'idle';
                    this.stateTime = 0;
                    this.thinkTimer = 0.15;
                    this.staggerDuration = 2.5;
                }
                break;
        }

        // Integrate
        this.pos.x += this.vel.x * dt;
        this.pos.z += this.vel.z * dt;
        clampToArena(this.pos);

        // Body collision
        if (!player.dead) {
            _v.subVectors(this.pos, player.pos);
            _v.y = 0;
            const d = _v.length();
            const minD = 1.05;
            if (d < minD && d > 0.001) {
                const push = (minD - d) / 2;
                _v.normalize();
                this.pos.addScaledVector(_v, push);
                player.pos.addScaledVector(_v, -push);
            }
        }

        // Rig + pose
        this.rig.root.position.copy(this.pos);
        this.rig.root.rotation.y = this.heading;

        if (this.state === 'attack' && this.currentAttack) {
            const atk = this.currentAttack;
            const windupP = Math.min(1, this.stateTime / Math.max(atk.windup, 0.001));
            const swingP = Math.max(0, Math.min(1, (this.stateTime - atk.windup) / Math.max(atk.active, 0.001)));
            const recoverP = Math.max(0, Math.min(1, (this.stateTime - atk.windup - atk.active) / Math.max(atk.recover, 0.001)));
            this.rig.pose('attack', this.stateTime, dt, {
                attackType: atk.type,
                windup: this.stateTime < atk.windup ? windupP : 0,
                progress: swingP,
                recover: recoverP,
            });
            const glow = this.stateTime < atk.windup ? windupP : Math.max(0, 1 - swingP * 2);
            this.rig.blade.material.emissive.setRGB(
                0.35 + glow * (this.rage ? 0.95 : 0.55),
                0.35 - glow * 0.28,
                0.35 - glow * 0.32,
            );
        } else {
            this.rig.blade.material.emissive.setRGB(0.35, 0.35, 0.35);
            if (this.state === 'staggered') {
                const d = this.staggerDuration || 2.5;
                this.rig.pose('stagger', this.stateTime, dt, { progress: Math.max(0, Math.min(1, this.stateTime / d)) });
            } else if (this.state === 'block') {
                this.rig.pose('block', this.stateTime, dt, {});
            } else if (this.state === 'approach' && (Math.abs(this.vel.x) + Math.abs(this.vel.z)) > 0.5) {
                this.rig.pose('run', this.stateTime, dt, { moveSpeed: 5 });
            } else if (this.state === 'strafe') {
                this.rig.pose('run', this.stateTime, dt, { moveSpeed: 2.4 });
            } else {
                this.rig.pose('idle', this.stateTime, dt, {});
            }
        }
    }

    meleeCheck(atk, target) {
        _v.subVectors(target.pos, this.pos);
        _v.y = 0;
        const dist = _v.length();
        if (dist > atk.range + 0.5) return false;
        const toTarget = Math.atan2(_v.x, _v.z);
        return Math.abs(angleDiff(toTarget, this.heading)) < atk.arc / 2;
    }
}
