import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player, Boss, PLAYER_ATTACKS } from '../../src/features/game/modules/combat.js';

const STEP = 1 / 60;
function makeRig() {
    return {
        root: new THREE.Group(),
        blade: { material: { emissive: new THREE.Color() } },
        lastPose: null,
        pose(state, time, dt, options) { this.lastPose = { state, time, dt, ...options }; },
    };
}
function world() {
    const player = new Player(makeRig());
    const boss = new Boss(makeRig());
    const events = [];
    const ctx = {
        onPlayerHit: (...args) => events.push(['playerHit', ...args]),
        onBossHit: (...args) => events.push(['bossHit', ...args]),
        onBossRage: (target) => events.push(['phase', target.phase]),
        onPlayerHealed: () => events.push(['heal']),
    };
    const input = { moveVec: new THREE.Vector3(), sprint: false, locked: false };
    return { player, boss, ctx, input, events };
}
function advancePlayer(w, seconds) {
    for (let left = seconds; left > 1e-9; left -= STEP) {
        w.player.update(Math.min(STEP, left), w.input, w.boss, w.ctx);
    }
}
function advanceBoss(w, seconds) {
    for (let left = seconds; left > 1e-9; left -= STEP) {
        w.boss.update(Math.min(STEP, left), w.player, w.ctx);
    }
}
function faceToFace(w, distance = 2) {
    w.player.pos.set(0, 0, distance);
    w.player.heading = Math.PI;
    w.boss.pos.set(0, 0, 0);
    w.boss.heading = 0;
}
const hit = (damage = 24, extra = {}) => ({ damage, range: 3, arc: 2, ...extra });

test('nightmare reset has a limited survival budget and visible boss posture', () => {
    const { player, boss } = world();
    assert.equal(player.maxHp, 100);
    assert.equal(player.hp, 100);
    assert.equal(player.estusMax, 2);
    assert.equal(player.estus, 2);
    assert.equal(boss.maxHp, 900);
    assert.equal(boss.hp, 900);
    assert.equal(boss.phase, 1);
    assert.equal(boss.rage, false);
    assert.equal(boss.poise, 0);
    assert.equal(boss.maxPoise, 100);
});

test('roll requires and spends the full cost, returning an accepted boolean', () => {
    const { player } = world();
    const direction = new THREE.Vector3(1, 0, 0);
    player.stamina = 25.999;
    assert.equal(player.tryRoll(direction, false), false);
    assert.equal(player.state, 'idle');
    assert.equal(player.stamina, 25.999);
    player.stamina = 26;
    assert.equal(player.tryRoll(direction, false), true);
    assert.equal(player.stamina, 0);
    assert.equal(player.state, 'roll');
    assert.equal(player.tryRoll(direction, false), false);
});

test('buffered rolls preserve a vector snapshot through attack or hit recovery', () => {
    for (const state of ['attack', 'stagger', 'guardbroken']) {
        const w = world();
        const p = w.player;
        if (state === 'attack') p.startSwing(0);
        else p.state = state;
        const duration = state === 'attack' ? 0.62 : state === 'stagger' ? 0.45 : 2;
        p.stateTime = duration - 0.08;
        const direction = new THREE.Vector3(1, 0, 0);
        assert.equal(p.tryRoll(direction, true), true, state);
        direction.set(0, 0, -1);
        assert.doesNotThrow(() => advancePlayer(w, 0.1));
        assert.equal(p.state, 'roll', state);
        assert.equal(p.rollDir.x, 1, state);
        assert.equal(p.rollDir.z, 0, state);
        assert.equal(p.rollBuffer, false);
        assert.equal(p.bufferedRollDir, null);
    }
});

test('recovery buffers expire after 0.2 seconds rather than firing much later', () => {
    for (const action of ['attack', 'roll', 'heal']) {
        const w = world();
        w.player.state = 'guardbroken';
        if (action === 'attack') w.player.tryAttack();
        if (action === 'roll') w.player.tryRoll(new THREE.Vector3(1, 0, 0), false);
        if (action === 'heal') w.player.tryHeal(w.ctx);
        assert.equal(w.player[`${action}Buffer`], true, action);
        advancePlayer(w, 0.21);
        assert.equal(w.player[`${action}Buffer`], false, action);
        advancePlayer(w, 1.9);
        assert.equal(w.player.state, 'idle', action);
        assert.equal(w.player.estus, 2);
        assert.equal(w.player.bufferedRollDir, null);
    }
});

test('a buffered dodge beats combo, attack and heal without stale follow-ups', () => {
    for (const state of ['attack', 'stagger']) {
        const w = world();
        const p = w.player;
        if (state === 'attack') p.startSwing(0);
        else p.state = state;
        p.stateTime = state === 'attack' ? 0.55 : 0.38;
        p.tryAttack();
        p.tryHeal(w.ctx);
        p.tryRoll(new THREE.Vector3(1, 0, 0), false);
        p.tryAttack();
        advancePlayer(w, 0.1);
        assert.equal(p.state, 'roll', state);
        assert.equal(p.comboQueued, false);
        assert.equal(p.attackBuffer, false);
        assert.equal(p.healBuffer, false);
        advancePlayer(w, 0.6);
        assert.equal(p.state, 'idle');
        assert.equal(p.estus, 2);
    }
});

test('roll invulnerability is only 0.08–0.30s and the pose completes at 0.56s', () => {
    for (const [time, expected] of [[0.079, 'hit'], [0.08, 'dodged'], [0.299, 'dodged'], [0.30, 'hit'], [0.42, 'hit']]) {
        const w = world();
        faceToFace(w);
        w.player.tryRoll(new THREE.Vector3(1, 0, 0), false);
        advancePlayer(w, time);
        assert.equal(w.player.receiveHit(hit(), w.boss, w.ctx), expected, String(time));
    }
    const w = world();
    w.player.tryRoll(new THREE.Vector3(1, 0, 0), false);
    advancePlayer(w, 0.28);
    assert.equal(w.player.rig.lastPose.state, 'roll');
    assert.ok(Math.abs(w.player.rig.lastPose.progress - 0.5) < 1e-6);
    advancePlayer(w, 0.275);
    assert.equal(w.player.state, 'roll');
    advancePlayer(w, 0.01);
    assert.equal(w.player.state, 'idle');
});

test('held guard resumes after recovery without granting a new parry window', () => {
    for (const state of ['roll', 'attack', 'stagger', 'guardbroken', 'heal', 'parry']) {
        const w = world();
        const p = w.player;
        if (state === 'attack') p.startSwing(0);
        else p.state = state;
        const duration = { roll: 0.56, attack: 0.62, stagger: 0.45, guardbroken: 2, heal: 1.4, parry: 0.4 }[state];
        p.stateTime = duration - 0.05;
        p.setBlock(true);
        advancePlayer(w, 0.1);
        assert.equal(p.state, 'block', state);
        assert.equal(p.blockHeld, true);
        assert.equal(p.parryWindow, 0);
        p.setBlock(false);
        assert.equal(p.state, 'idle');
    }
});

test('parry is a short press window with cooldown, never carried into an attack', () => {
    const w = world();
    faceToFace(w);
    const p = w.player;
    p.setBlock(true);
    assert.ok(p.parryWindow >= 0.11 && p.parryWindow <= 0.13);
    advancePlayer(w, 0.13);
    p.setBlock(true);
    assert.equal(p.parryWindow, 0, 'holding does not renew');
    p.setBlock(false);
    p.setBlock(true);
    assert.equal(p.parryWindow, 0, 'rapid re-press cannot renew');
    assert.equal(p.receiveHit(hit(), w.boss, w.ctx), 'blocked');
    advancePlayer(w, 0.7);
    p.setBlock(false);
    p.setBlock(true);
    assert.ok(p.parryWindow > 0);
    p.tryAttack();
    assert.equal(p.parryWindow, 0);
    assert.equal(p.receiveHit(hit(), w.boss, w.ctx), 'hit');
});

// =====================================================================
// BOSS: three phases with safe, timed transitions
// =====================================================================
test('boss phases advance at hp thresholds behind a safe transition window', () => {
    const w = world();
    const { boss, player } = w;
    // Above 65%: nothing happens
    boss.hp = 700;
    boss.receiveHit(hit(10), player, w.ctx);
    advanceBoss(w, 0.1);
    assert.equal(boss.phase, 1);
    assert.equal(boss.rage, false);
    assert.equal(w.events.filter((e) => e[0] === 'phase').length, 0);
    // Cross 65% -> phase 2
    boss.hp = 590;
    boss.receiveHit(hit(10), player, w.ctx);
    advanceBoss(w, 0.1);
    assert.equal(boss.phase, 2);
    assert.equal(boss.rage, true);
    assert.equal(boss.state, 'transition');
    assert.equal(boss.attackName, null);
    assert.equal(boss.currentAttack, null);
    assert.equal(w.events.filter((e) => e[0] === 'phase').length, 1, 'exactly one banner per transition');
    // Transition window: no attacking, no movement, then resume
    const before = boss.pos.clone();
    for (let i = 0; i < 55; i++) {
        boss.update(STEP, player, w.ctx);
        assert.equal(boss.state, 'transition', `still transitioning at step ${i}`);
        assert.equal(boss.attackName, null);
    }
    assert.ok(boss.pos.distanceTo(before) < 1e-6, 'boss holds position during transition');
    boss.thinkTimer = 5; // keep AI quiet so the next hit is deterministic
    advanceBoss(w, 0.3);
    assert.notEqual(boss.state, 'transition', 'transition ends after ~1.1s');
    // Cross 30% -> phase 3
    boss.state = 'idle';
    boss.currentAttack = null;
    boss.attackName = null;
    boss.hp = 280;
    boss.receiveHit(hit(15), player, w.ctx);
    advanceBoss(w, 0.1);
    assert.equal(boss.phase, 3);
    assert.equal(boss.rage, true);
    assert.equal(boss.state, 'transition');
    assert.equal(w.events.filter((e) => e[0] === 'phase').length, 2);
});

test('a committed swing finishes before the phase transition applies', () => {
    const w = world();
    const { boss, player } = w;
    faceToFace(w, 2.4);
    boss.hp = 590;
    boss.startAttack('heavyOverhead');
    const atk = boss.currentAttack;
    advanceBoss(w, 0.9); // deep into the active window (windup 0.85)
    assert.equal(boss.state, 'attack');
    boss.receiveHit(hit(10), player, w.ctx); // crosses 65% -> phase 2 pending
    assert.equal(boss.state, 'attack', 'transition must not interrupt a committed swing');
    assert.equal(boss.phase, 1);
    assert.equal(boss.currentAttack, atk);
    assert.equal(w.events.filter((e) => e[0] === 'phase').length, 0);
    // Swing completes first, then the transition applies
    advanceBoss(w, 1.0);
    assert.equal(boss.phase, 2);
    assert.equal(boss.state, 'transition');
    assert.equal(w.events.filter((e) => e[0] === 'phase').length, 1);
});

// =====================================================================
// BOSS: per-phase scaling and readable phase-3 strings
// =====================================================================
test('each phase tightens windup, recover and cooldown pacing', () => {
    const w = world();
    const { boss } = w;
    const expect = {
        1: [1, 1, 1],
        2: [0.85, 0.85, 0.75],
        3: [0.72, 0.78, 0.62],
    };
    for (const phase of [1, 2, 3]) {
        boss.phase = phase;
        assert.equal(boss.windupMult, expect[phase][0], `windup p${phase}`);
        assert.equal(boss.recoverMult, expect[phase][1], `recover p${phase}`);
        assert.equal(boss.cdMult, expect[phase][2], `cd p${phase}`);
    }
});

test('no boss windup ever drops below the 0.26s floor in phase 3', () => {
    const w = world();
    const { boss } = w;
    boss.phase = 3;
    boss.rage = true;
    for (const name of ['jab', 'quickSlash', 'shieldBash', 'backstepSlash', 'comboSlash',
        'heavyOverhead', 'spinSlash', 'dashThrust', 'runningSlash', 'charge']) {
        boss.startAttack(name);
        assert.ok(boss.currentAttack, name);
        assert.ok(boss.currentAttack.windup >= 0.26 - 1e-9, `${name} windup ${boss.currentAttack.windup}`);
    }
});

test('a phase-3 comboSlash string is four hits ending on a readable swing', () => {
    const w = world();
    const { boss, player } = w;
    player.pos.set(0, 0, 4.0);
    player.heading = Math.PI;
    boss.pos.set(0, 0, 0);
    boss.heading = 0;
    boss.phase = 3;
    boss.rage = true;
    boss.startAttack('comboSlash');
    const swings = [];
    let lastStep = -1;
    for (let i = 0; i < 60 * 8 && swings.length < 4; i++) {
        boss.update(STEP, player, w.ctx);
        if (boss.state === 'attack' && boss.currentAttack && boss.stateTime < STEP * 1.5 && boss.comboStep !== lastStep) {
            lastStep = boss.comboStep;
            swings.push({ step: boss.comboStep, windup: boss.currentAttack.windup, recover: boss.currentAttack.recover });
        }
    }
    assert.deepEqual(swings.map((s) => s.step), [0, 1, 2, 3], 'phase-3 string is 4 hits');
    for (const s of swings) assert.ok(s.windup >= 0.26 - 1e-9, `hit ${s.step} windup ${s.windup}`);
    assert.ok(swings[3].recover >= 0.55 - 1e-9, `final recover ${swings[3].recover}`);
});

// =====================================================================
// BOSS: unblockable ground slam
// =====================================================================
test('quakeSlam is a long-telegraphed unblockable ground slam', () => {
    const w = world();
    const { boss, player } = w;
    // Attack data and ~7s cooldown at base pacing
    boss.startAttack('quakeSlam');
    const base = boss.currentAttack;
    assert.ok(base, 'quakeSlam exists');
    assert.equal(base.type, 2, 'overhead pose');
    assert.equal(base.parryable, false);
    assert.equal(base.chip, true);
    assert.ok(base.guardPressure >= 2.5, `guardPressure ${base.guardPressure}`);
    assert.ok(base.damage >= 38 && base.damage <= 42, `damage ${base.damage}`);
    assert.ok(base.arc >= 2.6, `arc ${base.arc}`);
    assert.ok(Math.abs(boss.cooldowns.quakeSlam - 7) < 1e-9, `cooldown ${boss.cooldowns.quakeSlam}`);
    // Long telegraph survives even the fastest phase-3 pacing
    boss.phase = 3;
    boss.rage = true;
    boss.startAttack('quakeSlam');
    assert.ok(boss.currentAttack.windup >= 0.85 - 1e-9, `windup ${boss.currentAttack.windup}`);
    // The name is the danger tell during the windup
    faceToFace(w, 2.5);
    advanceBoss(w, 0.3);
    assert.equal(boss.attackName, 'quakeSlam');
    // An active parry window cannot convert it
    player.setBlock(true);
    assert.ok(player.parryWindow > 0);
    const res = player.receiveHit(boss.currentAttack, boss, w.ctx);
    assert.notEqual(res, 'parried');
    assert.equal(player.riposteWindow, 0);
    // Control: the same setup parries a normal attack
    const w2 = world();
    faceToFace(w2, 2.5);
    w2.player.setBlock(true);
    assert.equal(w2.player.receiveHit(hit(20), w2.boss, w2.ctx), 'parried');
});

// =====================================================================
// BOSS: feints are grounded cancels, never teleports
// =====================================================================
test('feints cancel on the ground with no positional discontinuity', () => {
    const w = world();
    const { boss, player } = w;
    player.pos.set(0, 0, 4.2);
    player.heading = Math.PI;
    boss.pos.set(0, 0, 0);
    boss.heading = 0;
    boss.startAttack('heavyOverhead');
    boss.feinting = true;
    const seen = new Set(['heavyOverhead']);
    let maxStepDist = 0;
    const prev = boss.pos.clone();
    for (let i = 0; i < 60 * 1.0; i++) {
        boss.update(STEP, player, w.ctx);
        maxStepDist = Math.max(maxStepDist, Math.hypot(boss.pos.x - prev.x, boss.pos.z - prev.z));
        prev.copy(boss.pos);
        if (boss.attackName) seen.add(boss.attackName);
    }
    assert.ok(maxStepDist < 0.2, `feint teleported (${maxStepDist.toFixed(2)} units in one step)`);
    assert.ok(seen.has('jab') || seen.has('quickSlash'), 'feint cancels into a quick grounded follow-up');
});

// =====================================================================
// BOSS: committed swings (frozen heading, bounded dash, stand-down)
// =====================================================================
test('a committed swing freezes its heading through late windup and active', () => {
    const w = world();
    const { boss, player } = w;
    faceToFace(w, 3);
    boss.startAttack('heavyOverhead'); // windup 0.85 -> commit point at 0.51
    advanceBoss(w, 0.55);
    const frozen = boss.heading;
    // Player circles well behind the boss during the windup
    player.pos.set(Math.sin(2.4) * 3, 0, Math.cos(2.4) * 3);
    advanceBoss(w, 0.25); // still windup (t = 0.80 of 0.85)
    assert.ok(Math.abs(boss.heading - frozen) < 1e-9, 'heading frozen in the final windup 40%');
    advanceBoss(w, 0.25); // through the active window (ends at 1.01)
    assert.ok(Math.abs(boss.heading - frozen) < 1e-9, 'heading frozen through the active window');
});

test('dash attacks never overshoot the player or the per-frame travel cap', () => {
    const w = world();
    const { boss, player } = w;
    boss.pos.set(0, 0, 0);
    boss.heading = 0;
    player.pos.set(0, 0, 5);
    player.heading = Math.PI;
    boss.startAttack('charge'); // dash 16: would fly way past the player
    let maxStepDist = 0;
    const prev = boss.pos.clone();
    for (let i = 0; i < 60 * 2; i++) {
        boss.update(STEP, player, w.ctx);
        maxStepDist = Math.max(maxStepDist, Math.hypot(boss.pos.x - prev.x, boss.pos.z - prev.z));
        prev.copy(boss.pos);
        assert.ok(boss.pos.z < player.pos.z - 0.3, `overshot the player at step ${i}`);
        assert.ok(Math.abs(player.pos.z - 5) < 0.15, 'the player was bulldozed along the charge');
    }
    assert.ok(maxStepDist <= 0.6, `per-frame travel ${maxStepDist.toFixed(3)}`);
});

test('the boss stands down against a dead or victorious player', () => {
    for (const endState of ['dead', 'victory']) {
        const w = world();
        const { boss, player } = w;
        faceToFace(w, 2.2);
        player.state = endState;
        if (endState === 'dead') player.hp = 0;
        boss.startAttack('quickSlash');
        advanceBoss(w, 0.2); // mid-windup of what would be a swing
        assert.notEqual(boss.state, 'attack', endState);
        assert.equal(boss.attackName, null, endState);
        assert.equal(boss.currentAttack, null, endState);
        advanceBoss(w, 2.5);
        assert.ok(['idle', 'strafe'].includes(boss.state), `${endState}: ${boss.state}`);
        assert.equal(w.events.filter((e) => e[0] === 'playerHit').length, 0, endState);
    }
});

// =====================================================================
// BOSS: poise, stagger vulnerability and riposte safety
// =====================================================================
test('poise builds into a stagger that opens a riposte window', () => {
    const w = world();
    const { boss, player } = w;
    for (let i = 1; i <= 3; i++) {
        const res = boss.receiveHit(hit(30), player, w.ctx);
        assert.equal(res, 'hit');
        assert.equal(boss.poise, 30 * i, `poise after ${i} hits`);
        assert.notEqual(boss.state, 'staggered');
        assert.equal(boss.vulnerable, false);
    }
    boss.receiveHit(hit(30), player, w.ctx); // 120 >= maxPoise
    assert.equal(boss.poise, 0, 'poise resets on break');
    assert.equal(boss.state, 'staggered');
    assert.equal(boss.vulnerable, true);
    // Riposte damage lands only while vulnerable
    const riposte = hit(95, { riposte: true, type: 3 });
    const hpBefore = boss.hp;
    assert.equal(boss.receiveHit(riposte, player, w.ctx), 'hit');
    assert.equal(boss.hp, hpBefore - 95);
    // Stagger (~1.2s) ends -> vulnerability closes
    advanceBoss(w, 1.3);
    assert.notEqual(boss.state, 'staggered');
    assert.equal(boss.vulnerable, false);
    const hpAfter = boss.hp;
    assert.equal(boss.receiveHit(riposte, player, w.ctx), 'blocked');
    assert.equal(boss.hp, hpAfter, 'riposte is ignored outside the stagger');
});

test('riposte poise counts double and guarding keeps the blocked return', () => {
    const w = world();
    const { boss, player } = w;
    boss.receiveHit(hit(120), player, w.ctx); // one heavy hit breaks poise
    assert.equal(boss.state, 'staggered');
    assert.equal(boss.vulnerable, true);
    boss.poise = 0;
    boss.receiveHit(hit(20, { riposte: true, type: 3 }), player, w.ctx);
    assert.equal(boss.poise, 40, 'riposte poise accumulates double');
    // Guarded hits stay 'blocked' and never touch hp or poise
    const hpBefore = boss.hp;
    const poiseBefore = boss.poise;
    boss.state = 'block';
    assert.equal(boss.receiveHit(hit(30), player, w.ctx), 'blocked');
    assert.equal(boss.hp, hpBefore);
    assert.equal(boss.poise, poiseBefore);
});

// Next regression.
