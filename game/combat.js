/**
 * Souls-like Battle Game - Combat Module
 * Player controller (souls mechanics: dodge i-frames, parry -> riposte,
 * block/guard-break, stamina, estus, 3-hit combos, lock-on strafing)
 * and the Boss AI (distance-based decisions, delayed attacks, feints,
 * gap closers, heal punishes, rage phase, poise, occasional blocking).
 */
import * as THREE from './three.module.min.js?v=1';
import { clampToArena } from './engine.js?v=1';

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
            // Queue next combo hit near the end of current swing
            const atk = this.currentAttack;
            if (atk && this.stateTime > atk.windup + atk.active * 0.5 && this.comboIndex < PLAYER_ATTACKS.length - 1) {
                this.comboQueued = true;
            }
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
        if (this.busy || this.estus <= 0) return;
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
        if (this.state === 'roll' && this.stateTime > 0.04 && this.stateTime < 0.42) {
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
        // Clean hit
        this.hp -= atk.damage;
        this.staminaDelay = 0.8;
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this.stateTime = 0;
        } else {
            this.state = 'stagger';
            this.stateTime = 0;
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
                this.iframes = 0.01;
                if (p >= 1) {
                    this.state = 'idle';
                    this.stateTime = 0;
                }
                break;
            }
            case 'attack': {
                const atk = this.currentAttack;
                const t = this.stateTime;
                // Forward lunge during active phase
                if (t > atk.windup && t < atk.windup + atk.active) {
                    forward(this.heading, _v);
                    this.vel.x = _v.x * 2.2;
                    this.vel.z = _v.z * 2.2;
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
                    }
                }
                break;
            }
            case 'stagger':
                this.vel.x *= Math.pow(0.0001, dt);
                this.vel.z *= Math.pow(0.0001, dt);
                if (this.stateTime > 0.45) { this.state = 'idle'; this.stateTime = 0; }
                break;
            case 'guardbroken':
                this.vel.x *= Math.pow(0.0001, dt);
                this.vel.z *= Math.pow(0.0001, dt);
                if (this.stateTime > 2.0) { this.state = 'idle'; this.stateTime = 0; this.stamina = this.maxStamina * 0.5; }
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
                    this.estus--;
                    this.state = 'idle';
                    this.stateTime = 0;
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
            const activeP = Math.max(0, Math.min(1, (this.stateTime - atk.windup) / (atk.active + atk.recover * 0.5)));
            this.rig.pose('attack', this.stateTime, dt, {
                attackType: atk.type,
                windup: this.stateTime < atk.windup ? windupP : 0,
                progress: activeP,
            });
        } else if (this.state === 'run') {
            this.rig.pose('run', this.stateTime, dt, { moveSpeed: this.moveSpeed });
        } else {
            const dur = this.state === 'dead' ? 1.2
                : this.state === 'guardbroken' ? 2.0
                : this.state === 'stagger' ? 0.45
                : this.state === 'parry' ? 0.4
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
}

// ======================================================================
// BOSS
// ======================================================================
const BOSS_ATTACKS = {
    quickSlash:   { type: 0, windup: 0.45, active: 0.14, recover: 0.6, range: 2.7, arc: 2.0, damage: 12, cd: 1.2 },
    heavyOverhead:{ type: 2, windup: 0.90, active: 0.16, recover: 0.8, range: 2.9, arc: 1.5, damage: 24, cd: 2.4, guardPressure: 1.1 },
    comboSlash:   { type: 1, windup: 0.36, active: 0.13, recover: 0.34, range: 2.7, arc: 2.0, damage: 10, cd: 2.0 },
    dashThrust:   { type: 3, windup: 0.55, active: 0.24, recover: 0.7, range: 2.6, arc: 1.2, damage: 18, cd: 3.2, dash: 9 },
    shieldBash:   { type: 3, windup: 0.48, active: 0.14, recover: 0.65, range: 2.4, arc: 1.6, damage: 8, cd: 2.6, guardPressure: 2.6, chip: true },
};

export class Boss {
    constructor(rig) {
        this.rig = rig;
        this.pos = rig.root.position;
        this.name = 'BOSS';
        this.reset();
    }

    reset() {
        this.pos.set(0, 0, -5.5);
        this.heading = 0;                 // face +z (toward player spawn)
        this.vel = new THREE.Vector3();
        this.hp = this.maxHp = 260;
        this.state = 'idle';              // idle|approach|strafe|attack|recover|block|staggered|dead
        this.stateTime = 0;
        this.currentAttack = null;
        this.attackHitDone = false;
        this.comboStep = 0;
        this.thinkTimer = 0.5;
        this.strafeDir = 1;
        this.strafeTimer = 0;
        this.cooldowns = { quickSlash: 0, heavyOverhead: 0, comboSlash: 0, dashThrust: 0, shieldBash: 0 };
        this.blockTimer = 0;
        this.blockChanceCd = 0;
        this.hitCounter = 0;
        this.rage = false;
        this.feinting = false;
        this.dead = false;
        this.rig.root.visible = true;
    }

    get rageMult() { return this.rage ? 0.78 : 1; }

    onParried(ctx) {
        this.state = 'staggered';
        this.stateTime = 0;
        this.currentAttack = null;
        this.feinting = false;
    }

    receiveHit(atk, attacker, ctx) {
        if (this.dead) return 'dead';
        if (this.state === 'block') {
            return 'blocked';
        }
        let dmg = atk.damage;
        if (atk.riposte) dmg = atk.damage; // already boosted
        this.hp -= dmg;
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
        // Poise: light hits don't interrupt; every 4th hit or riposte staggers briefly
        if (!atk.riposte && this.state !== 'staggered' && this.hitCounter % 4 === 0 && this.state !== 'attack') {
            this.state = 'staggered';
            this.stateTime = -1.2; // shorter stagger (1.3s effective)
            this.currentAttack = null;
        }
        return 'hit';
    }

    /** Pick next action based on distance, cooldowns, player state. */
    decide(player) {
        _v.subVectors(player.pos, this.pos);
        const dist = _v.length();
        const r = Math.random();
        const rageBonus = this.rage ? 0.25 : 0;

        // Heal punish
        if (player.state === 'heal' && dist < 9.5 && this.cooldowns.dashThrust <= 0) {
            return this.startAttack('dashThrust');
        }
        // Gap closer
        if (dist > 6.5) {
            if (this.cooldowns.dashThrust <= 0 && r < 0.55 + rageBonus) return this.startAttack('dashThrust');
            this.state = 'approach';
            this.stateTime = 0;
            return;
        }
        // Melee range
        if (dist < 3.2) {
            // Anti-turtle
            if (player.state === 'block' && this.cooldowns.shieldBash <= 0 && r < 0.5 + rageBonus) {
                return this.startAttack('shieldBash');
            }
            if (this.rage && r < 0.22) {
                // Feint: starts overhead, cancels mid-windup into quick slash
                this.feinting = true;
                return this.startAttack('heavyOverhead');
            }
            if (this.cooldowns.comboSlash <= 0 && r < 0.4 + rageBonus) {
                this.comboStep = 0;
                return this.startAttack('comboSlash');
            }
            if (this.cooldowns.heavyOverhead <= 0 && r < 0.62) {
                return this.startAttack('heavyOverhead');
            }
            if (this.cooldowns.quickSlash <= 0) {
                return this.startAttack('quickSlash');
            }
            // Nothing ready: strafe and wait
            this.state = 'strafe';
            this.stateTime = 0;
            return;
        }
        // Mid range: close in or strafe
        if (r < 0.6) { this.state = 'approach'; } else { this.state = 'strafe'; }
        this.stateTime = 0;
    }

    startAttack(name) {
        const base = BOSS_ATTACKS[name];
        const mult = this.rageMult;
        this.currentAttack = {
            ...base,
            name,
            windup: base.windup * mult,
            recover: base.recover * (this.rage ? 0.8 : 1),
        };
        this.attackName = name;
        this.state = 'attack';
        this.stateTime = 0;
        this.attackHitDone = false;
        this.cooldowns[name] = base.cd * (this.rage ? 0.7 : 1);
    }

    update(dt, player, ctx) {
        this.stateTime += dt;
        for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
        this.blockChanceCd = Math.max(0, this.blockChanceCd - dt);

        if (this.dead) {
            this.vel.set(0, 0, 0);
            this.rig.pose('dead', this.stateTime, dt, { progress: Math.min(1, this.stateTime / 1.2) });
            this.rig.root.rotation.y = this.heading;
            return;
        }

        _v.subVectors(player.pos, this.pos);
        const dist = _v.length();
        const toPlayer = Math.atan2(_v.x, _v.z);

        // Reactive blocking: if player is mid-swing and boss is free, maybe block
        if (player.state === 'attack' && dist < 3.4 && this.blockChanceCd <= 0 &&
            ['idle', 'approach', 'strafe'].includes(this.state) && Math.random() < (this.rage ? 0.3 : 0.2)) {
            this.state = 'block';
            this.stateTime = 0;
            this.blockChanceCd = 3.5;
        }

        switch (this.state) {
            case 'idle':
            case 'approach': {
                this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 6);
                const sp = (dist > 6 ? 4.6 : 3.1) * (this.rage ? 1.3 : 1);
                if (dist > 2.2) {
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
                    this.thinkTimer = (this.rage ? 0.35 : 0.6) + Math.random() * 0.4;
                    this.decide(player);
                }
                break;
            }
            case 'strafe': {
                this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 8);
                this.strafeTimer -= dt;
                if (this.strafeTimer <= 0) {
                    this.strafeTimer = 0.8 + Math.random() * 1.2;
                    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
                }
                // Circle the player at ~3.5 units
                const tangent = toPlayer + Math.PI / 2 * this.strafeDir;
                const sp = 2.2 * (this.rage ? 1.35 : 1);
                const radial = dist - 3.2; // keep distance band
                forward(tangent, _v);
                this.vel.x = _v.x * sp + Math.sin(toPlayer) * radial * 1.2;
                this.vel.z = _v.z * sp + Math.cos(toPlayer) * radial * 1.2;
                this.thinkTimer -= dt;
                if (this.thinkTimer <= 0) {
                    this.thinkTimer = (this.rage ? 0.3 : 0.45) + Math.random() * 0.35;
                    this.decide(player);
                }
                break;
            }
            case 'block':
                this.vel.set(0, 0, 0);
                this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 10);
                if (this.stateTime > 0.7) { this.state = 'idle'; this.thinkTimer = 0.1; }
                break;
            case 'attack': {
                const atk = this.currentAttack;
                const t = this.stateTime;

                // Feint: cancel overhead mid-windup, sidestep, quick slash
                if (this.feinting && this.attackName === 'heavyOverhead' && t > atk.windup * 0.55) {
                    this.feinting = false;
                    // Sidestep
                    const side = toPlayer + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
                    forward(side, _v);
                    this.pos.x += _v.x * 1.4;
                    this.pos.z += _v.z * 1.4;
                    clampToArena(this.pos);
                    this.startAttack('quickSlash');
                    break;
                }

                // Tracking during early windup (then committed)
                if (t < atk.windup * 0.5) {
                    this.heading += angleDiff(toPlayer, this.heading) * Math.min(1, dt * 3.5);
                }

                if (t < atk.windup) {
                    this.vel.set(0, 0, 0);
                } else if (t < atk.windup + atk.active) {
                    // Dash attacks propel forward
                    if (atk.dash) {
                        forward(this.heading, _v);
                        this.vel.x = _v.x * (atk.dash / atk.active) * 0.55;
                        this.vel.z = _v.z * (atk.dash / atk.active) * 0.55;
                    } else {
                        forward(this.heading, _v);
                        this.vel.x = _v.x * 1.6;
                        this.vel.z = _v.z * 1.6;
                    }
                    if (!this.attackHitDone && !player.dead) {
                        if (this.meleeCheck(atk, player)) {
                            this.attackHitDone = true;
                            const res = player.receiveHit(atk, this, ctx);
                            ctx.onPlayerHit(res, atk, player, this);
                        }
                    }
                } else {
                    this.vel.x *= Math.pow(0.001, dt);
                    this.vel.z *= Math.pow(0.001, dt);
                }

                if (t > atk.windup + atk.active + atk.recover) {
                    // Chain combo slashes
                    if (this.attackName === 'comboSlash' && this.comboStep < 2 && dist < 4.5 && !player.dead) {
                        this.comboStep++;
                        const chain = { ...this.currentAttack, windup: 0.26 * this.rageMult, type: this.comboStep % 2 };
                        this.currentAttack = chain;
                        this.stateTime = 0;
                        this.attackHitDone = false;
                    } else {
                        this.state = 'idle';
                        this.stateTime = 0;
                        this.thinkTimer = (this.rage ? 0.3 : 0.55) + Math.random() * 0.35;
                        this.currentAttack = null;
                    }
                }
                break;
            }
            case 'staggered':
                this.vel.set(0, 0, 0);
                if (this.stateTime > 2.5) { this.state = 'idle'; this.stateTime = 0; this.thinkTimer = 0.2; }
                break;
        }

        // Integrate
        this.pos.x += this.vel.x * dt;
        this.pos.z += this.vel.z * dt;
        clampToArena(this.pos);

        // Body collision vs player (circles)
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

        // Rig transform + pose
        this.rig.root.position.copy(this.pos);
        this.rig.root.rotation.y = this.heading;

        if (this.state === 'attack' && this.currentAttack) {
            const atk = this.currentAttack;
            const windupP = Math.min(1, this.stateTime / atk.windup);
            const activeP = Math.max(0, Math.min(1, (this.stateTime - atk.windup) / (atk.active + atk.recover * 0.6)));
            this.rig.pose('attack', this.stateTime, dt, {
                attackType: atk.type,
                windup: this.stateTime < atk.windup ? windupP : 0,
                progress: activeP,
            });
            // Telegraph: blade glows during windup (brighter in rage)
            const glow = this.stateTime < atk.windup ? windupP : Math.max(0, 1 - activeP * 2);
            this.rig.blade.material.emissive.setRGB(0.35 + glow * (this.rage ? 0.9 : 0.5), 0.35 - glow * 0.25, 0.35 - glow * 0.3);
        } else {
            this.rig.blade.material.emissive.setRGB(0.35, 0.35, 0.35);
            if (this.state === 'staggered') {
                this.rig.pose('stagger', this.stateTime, dt, { progress: Math.max(0, Math.min(1, this.stateTime / 2.5)) });
            } else if (this.state === 'block') {
                this.rig.pose('block', this.stateTime, dt, {});
            } else if (this.state === 'approach' && (Math.abs(this.vel.x) + Math.abs(this.vel.z)) > 0.5) {
                this.rig.pose('run', this.stateTime, dt, { moveSpeed: 4 });
            } else if (this.state === 'strafe') {
                this.rig.pose('run', this.stateTime, dt, { moveSpeed: 2 });
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
