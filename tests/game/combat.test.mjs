import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
    Player, Boss, PLAYER_ATTACKS, DIFFICULTIES, DIFFICULTY_ORDER,
} from '../../src/features/game/modules/combat.js';

const STEP = 1 / 60;

function makeRig() {
    return {
        root: new THREE.Group(),
        blade: { material: { emissive: new THREE.Color() } },
        lastPose: null,
        pose(state, time, dt, options) { this.lastPose = { state, time, dt, ...options }; },
    };
}

function world(difficulty = 'medium') {
    const player = new Player(makeRig(), { difficulty });
    const boss = new Boss(makeRig(), { difficulty });
    const events = [];
    const ctx = {
        onPlayerHit: (res, atk, p, b) => events.push(['playerHit', res, atk, { clock: boss.clock }]),
        onBossHit: (res, atk, b, p) => events.push(['bossHit', res, atk, { clock: boss.clock }]),
        onBossRage: (b) => events.push(['bossRage', b.phase]),
        onPlayerHealed: (p) => events.push(['heal', p]),
        onPlayerEvent: (kind, data) => events.push(['playerEvent', kind, data]),
        onBossEvent: (kind, data) => events.push(['bossEvent', kind, data]),
    };
    const input = { moveVec: new THREE.Vector3(), sprint: false, locked: false };
    return { player, boss, ctx, input, events };
}

const hasEvent = (events, group, kind) =>
    events.some((e) => e[0] === group && (kind === undefined || e[1] === kind));
const countEvent = (events, group, kind) =>
    events.filter((e) => e[0] === group && (kind === undefined || e[1] === kind)).length;

function advancePlayer(w, seconds, input = w.input) {
    for (let left = seconds; left > 1e-9; left -= STEP) {
        w.player.update(Math.min(STEP, left), input, w.boss, w.ctx);
    }
}
function advanceBoss(w, seconds) {
    for (let left = seconds; left > 1e-9; left -= STEP) {
        w.boss.update(Math.min(STEP, left), w.player, w.ctx);
    }
}
function advanceBoth(w, seconds, input = w.input) {
    for (let left = seconds; left > 1e-9; left -= STEP) {
        const dt = Math.min(STEP, left);
        w.player.update(dt, input, w.boss, w.ctx);
        w.boss.update(dt, w.player, w.ctx);
    }
}
function faceToFace(w, distance = 2.2) {
    w.player.pos.set(0, 0, distance);
    w.player.heading = Math.PI;
    w.player.vel.set(0, 0, 0);
    w.boss.pos.set(0, 0, 0);
    w.boss.heading = 0;
    w.boss.vel.set(0, 0, 0);
}
const hit = (damage = 24, extra = {}) => ({ damage, range: 3, arc: 2, ...extra });

/** Stub Math.random for a block, always restoring it afterwards. */
function inRandom(value, fn) {
    const original = Math.random;
    Math.random = typeof value === 'function' ? value : () => value;
    try { return fn(); } finally { Math.random = original; }
}
function sequence(values) {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
}

// =====================================================================
// Difficulty tables
// =====================================================================
test('difficulty tables are complete, frozen and strictly ordered', () => {
    const required = ['bossHp', 'bossDamage', 'windupMult', 'delayChance', 'maxDelay', 'reactChance',
        'reactionDelay', 'rollCatch', 'thinkMult', 'comboExtend', 'breather', 'aggression', 'playerHp',
        'flasks', 'healAmount', 'parryWindow', 'iframeStart', 'iframeEnd', 'poiseMax', 'playerDamage'];
    for (const name of DIFFICULTY_ORDER) {
        assert.ok(DIFFICULTIES[name], name);
        assert.ok(Object.isFrozen(DIFFICULTIES[name]), `${name} frozen`);
        for (const key of required) {
            assert.equal(typeof DIFFICULTIES[name][key], 'number', `${name}.${key}`);
        }
    }
    assert.deepEqual([...DIFFICULTY_ORDER], ['easy', 'medium', 'hard']);
    const e = DIFFICULTIES.easy;
    const m = DIFFICULTIES.medium;
    const h = DIFFICULTIES.hard;
    assert.ok(e.bossDamage < m.bossDamage && m.bossDamage < h.bossDamage, 'damage climbs');
    assert.ok(e.windupMult > m.windupMult && m.windupMult > h.windupMult, 'easy telegraphs longer');
    assert.ok(e.reactChance < m.reactChance && m.reactChance < h.reactChance, 'reads climb');
    assert.ok(e.reactionDelay > m.reactionDelay && m.reactionDelay > h.reactionDelay, 'reaction time drops');
    assert.ok(e.flasks > m.flasks && m.flasks > h.flasks, 'flasks drop');
    assert.ok(e.healAmount > m.healAmount && m.healAmount > h.healAmount, 'heals shrink');
    assert.ok(e.playerHp > m.playerHp && m.playerHp > h.playerHp, 'hp drops');
    assert.ok(e.parryWindow > m.parryWindow && m.parryWindow > h.parryWindow, 'parry shrinks');
    assert.ok(e.iframeEnd > m.iframeEnd && m.iframeEnd >= h.iframeEnd, 'i-frames shrink');
    assert.ok(e.delayChance < h.delayChance && e.maxDelay < h.maxDelay, 'delays grow');
    assert.ok(e.rollCatch <= m.rollCatch && m.rollCatch < h.rollCatch, 'roll catches grow');
    assert.ok(e.poiseMax < m.poiseMax && m.poiseMax < h.poiseMax, 'boss poise grows');
    assert.ok(e.breather > m.breather && m.breather > h.breather, 'breathers shrink');
    assert.ok(e.comboExtend < m.comboExtend && m.comboExtend < h.comboExtend, 'strings extend more');
    assert.ok(e.playerDamage > h.playerDamage, 'easy hands out more damage');
});

test('constructors default to medium and reset() applies the current difficulty', () => {
    const player = new Player(makeRig());
    assert.equal(player.difficulty, 'medium');
    assert.equal(player.maxHp, DIFFICULTIES.medium.playerHp);
    assert.equal(player.estusMax, 3);
    const boss = new Boss(makeRig());
    assert.equal(boss.maxHp, 850);
    assert.equal(boss.maxPoise, DIFFICULTIES.medium.poiseMax);
    // setDifficulty stores it; reset() applies the table
    player.setDifficulty('hard');
    player.reset();
    assert.equal(player.maxHp, 90);
    assert.equal(player.estusMax, 2);
    boss.setDifficulty('easy');
    boss.reset();
    assert.equal(boss.maxHp, 700);
    assert.equal(boss.maxPoise, 75);
    assert.equal(boss.phase, 1);
    // Unknown names fall back to medium, never crash
    const other = new Player(makeRig(), { difficulty: 'nightmare' });
    assert.equal(other.difficulty, 'medium');
    other.setDifficulty('nope');
    assert.equal(other.difficulty, 'medium');
});

test('roll i-frames come from the difficulty table', () => {
    for (const [difficulty, time, expected] of [
        ['easy', 0.33, 'dodged'], ['easy', 0.05, 'hit'],
        ['hard', 0.29, 'dodged'], ['hard', 0.33, 'hit'], ['medium', 0.33, 'hit'],
    ]) {
        const w = world(difficulty);
        faceToFace(w);
        w.player.tryRoll(new THREE.Vector3(1, 0, 0), false);
        advancePlayer(w, time);
        assert.equal(w.player.receiveHit(hit(), w.boss, w.ctx), expected, `${difficulty} @ ${time}`);
    }
});

// =====================================================================
// Player: light combo, running attack, roll attack, backstep
// =====================================================================
test('the light chain is a three-hit combo that ends back in idle', () => {
    const w = world();
    const p = w.player;
    faceToFace(w, 3);
    const seen = [];
    p.tryAttack();
    for (let i = 0; i < 60 * 4 && seen.length < 3; i++) {
        if (p.state === 'attack') {
            const type = p.currentAttack.type;
            if (seen[seen.length - 1] !== type) seen.push(type);
            // Chain by pressing late in each swing
            if (p.comboIndex === seen.length - 1 && p.stateTime > p.currentAttack.windup * 0.7) p.tryAttack();
        }
        advancePlayer(w, STEP);
    }
    assert.deepEqual(seen, PLAYER_ATTACKS.map((a) => a.type), 'three different swings');
    assert.equal(p.state, 'attack', 'still mid-combo');
    advancePlayer(w, 1.0);
    assert.equal(p.state, 'idle', 'combo closes');
    assert.equal(p.comboIndex, 0);
});

test('a sprinting player lunges and the roll window thrusts (type 3)', () => {
    const w = world();
    const p = w.player;
    faceToFace(w, 4);
    w.input.moveVec.set(0, 0, -1);
    w.input.sprint = true;
    advancePlayer(w, 0.1);
    assert.equal(p.state, 'run');
    assert.equal(p.tryAttack(), true);
    assert.equal(p.currentAttack.type, 3);
    assert.equal(p.currentAttack.running, true);
    assert.equal(p.currentAttack.rollAttack, undefined);
    // Roll attack inside the ~0.3s window after a roll
    const w2 = world();
    faceToFace(w2, 4);
    w2.player.tryRoll(new THREE.Vector3(1, 0, 0), false);
    advancePlayer(w2, 0.6);
    assert.equal(w2.player.state, 'idle');
    assert.ok(w2.player.rollAttackWindow > 0, 'window opened');
    assert.equal(w2.player.tryAttack(), true);
    assert.equal(w2.player.currentAttack.type, 3);
    assert.equal(w2.player.currentAttack.rollAttack, true);
});

test('a zero-direction dodge is a cheap backstep with short i-frames that travels ~1.8 units', () => {
    const w = world();
    const p = w.player;
    faceToFace(w, 6);
    const stamina = p.stamina;
    advancePlayer(w, 0.02);                    // one frame so the rig context is live
    assert.equal(p.tryRoll({ x: 0, z: 0 }, true), true);
    assert.equal(p.state, 'backstep');
    assert.equal(stamina - p.stamina, 16, 'backstep is cheaper than a roll');
    assert.ok(hasEvent(w.events, 'playerEvent', 'backstep'));
    // i-frames only inside 0.04..0.20
    assert.equal(p.receiveHit(hit(), w.boss, w.ctx), 'hit', 'not invulnerable on frame one');
    p.state = 'backstep'; p.stateTime = 0.1; p.hp = p.maxHp;
    assert.equal(p.receiveHit(hit(), w.boss, w.ctx), 'dodged');
    p.state = 'backstep'; p.stateTime = 0.25; p.hp = p.maxHp;
    assert.equal(p.receiveHit(hit(), w.boss, w.ctx), 'hit');
    // Travel: backstep from idle moves ~1.8 units backwards
    const w2 = world();
    faceToFace(w2, 8);
    const z0 = w2.player.pos.z;
    w2.player.tryRoll({ x: 0, z: 0 }, true);
    advancePlayer(w2, 0.42);
    assert.ok(Math.abs((w2.player.pos.z - z0) - 1.8) < 0.2, `backstep travelled ${w2.player.pos.z - z0}`);
    assert.equal(w2.player.state, 'idle');
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
        assert.equal(p.rollBuffer, false, state);
        assert.equal(p.bufferedRollDir, null, state);
    }
});

test('recovery buffers expire after ~0.2s instead of firing much later', () => {
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
        assert.equal(w.player.estus, 3);
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
        assert.equal(p.estus, 3, 'the queued heal never drank');
    }
});

// =====================================================================
// Player: heavies, guard counter, estus, knockdown
// =====================================================================
test('tapping heavy swings immediately and holding charges to a type 7 smash', () => {
    // Tap: release right away -> base poise damage
    const tap = world();
    tap.player.setHeavy(true);
    assert.equal(tap.player.state, 'attack');
    assert.equal(tap.player.currentAttack.type, 2);
    assert.equal(tap.player.currentAttack.heavy, true);
    tap.player.setHeavy(false);
    const tapPoise = tap.player.currentAttack.poiseDamage;
    const tapDamage = tap.player.currentAttack.damage;
    assert.equal(tap.player.currentAttack.type, 2, 'early release stays a heavy');
    // Hold: charge builds, pose receives opts.charge, one 'chargeReady' at full
    const held = world();
    held.player.setHeavy(true);
    advancePlayer(held, 0.45);
    assert.ok(held.player.rig.lastPose.charge > 0.4 && held.player.rig.lastPose.charge <= 0.55, 'chamber shows charge');
    assert.equal(countEvent(held.events, 'playerEvent', 'chargeReady'), 0);
    advancePlayer(held, 0.5);
    const charged = held.player.currentAttack;
    assert.equal(charged.type, 7, 'full charge unlocks the smash');
    assert.equal(charged.charged, true);
    assert.equal(countEvent(held.events, 'playerEvent', 'chargeReady'), 1, 'chargeReady fires once');
    assert.ok(charged.poiseDamage > tapPoise, `charged poise ${charged.poiseDamage} > tap ${tapPoise}`);
    assert.ok(charged.damage > tapDamage, 'charged hits harder');
    advancePlayer(held, 1.0);
    assert.equal(countEvent(held.events, 'playerEvent', 'chargeReady'), 1, 'still once');
});

test('a blocked hit opens a guard counter: fast rising slash with high poise damage', () => {
    const w = world();
    const { player, boss } = w;
    faceToFace(w, 2.2);
    player.setBlock(true);
    advancePlayer(w, 0.25);                    // let the parry window lapse into a plain block
    assert.equal(player.parryWindow, 0);
    const res = player.receiveHit(hit(20, { guardPressure: 0.5 }), boss, w.ctx);
    assert.equal(res, 'blocked');
    assert.ok(player.guardCounterWindow > 0, 'guard counter window opened by the block');
    player.setHeavy(true);
    assert.equal(player.state, 'attack');
    assert.equal(player.currentAttack.type, 8);
    assert.equal(player.currentAttack.guardCounter, true);
    assert.ok(player.currentAttack.poiseDamage > 36, `guard counter poise ${player.currentAttack.poiseDamage}`);
    assert.ok(hasEvent(w.events, 'playerEvent', 'guardCounter'));
    // A tap heavy (36 poise) is weaker than the guard counter (46)
    const plain = world();
    plain.player.setHeavy(true);
    plain.player.setHeavy(false);
    assert.ok(player.currentAttack.poiseDamage > plain.player.currentAttack.poiseDamage, 'counter > heavy tap');
});

test('estus: the flask commits on press, heals at 0.75s, and lets you walk', () => {
    const w = world('medium');
    const { player } = w;
    faceToFace(w, 4);
    player.hp = 20;
    const estus = player.estus;
    w.input.moveVec.set(0, 0, -1);
    assert.equal(player.tryHeal(w.ctx), true);
    assert.equal(player.estus, estus - 1, 'consumed on commit');
    advancePlayer(w, 0.7);
    assert.equal(player.hp, 20, 'not yet landed');
    assert.ok(Math.abs(player.moveSpeed - 1.4) < 0.05, `walk speed ${player.moveSpeed}`);
    assert.ok(Math.abs(player.rig.lastPose.moveSpeed - 1.4) < 0.05, 'pose receives moveSpeed');
    assert.equal(player.rig.lastPose.state, 'heal');
    advancePlayer(w, 0.1);
    assert.equal(player.hp, 20 + DIFFICULTIES.medium.healAmount, 'lands at ~0.75s');
    assert.ok(hasEvent(w.events, 'heal'));
    // An interrupt never refunds the flask
    const w2 = world();
    w2.player.hp = 20;
    w2.player.tryHeal(w2.ctx);
    w2.player.receiveHit(hit(5), w2.boss, w2.ctx);
    assert.equal(w2.player.estus, 2, 'flask stays spent after an interrupt');
});

test('knockdown: knockback, wake-up i-frames and a buffered roll-out after 0.9s', () => {
    const w = world();
    const { player, boss } = w;
    faceToFace(w, 2);
    const z0 = player.pos.z;
    const res = player.receiveHit(hit(20, { knockdown: true }), boss, w.ctx);
    assert.equal(res, 'hit');
    assert.equal(player.state, 'knockdown');
    assert.ok(hasEvent(w.events, 'playerEvent', 'knockdown'));
    advancePlayer(w, 0.26);
    assert.ok(Math.abs((player.pos.z - z0) - 1.5) < 0.2, `knocked back ${(player.pos.z - z0).toFixed(2)} units`);
    // Vulnerable in the first 0.25s, invulnerable after (ER wake-up i-frames)
    player.stateTime = 0.2;
    player.hp = player.maxHp;
    assert.equal(player.receiveHit(hit(10), boss, w.ctx), 'hit');
    player.stateTime = 1.0;
    assert.equal(player.receiveHit(hit(10), boss, w.ctx), 'dodged');
    // Too early to roll out
    player.stateTime = 0.6;
    assert.equal(player.tryRoll(new THREE.Vector3(1, 0, 0), true), false);
    assert.equal(player.state, 'knockdown');
    // From 0.9s a roll cancels the wake-up
    player.stateTime = 0.95;
    assert.equal(player.tryRoll(new THREE.Vector3(1, 0, 0), true), true);
    assert.equal(player.state, 'roll');
    // And without rolling, the wake-up ends at 1.4s
    const w2 = world();
    faceToFace(w2, 2);
    w2.player.receiveHit(hit(20, { knockdown: true }), w2.boss, w2.ctx);
    advancePlayer(w2, 1.45);
    assert.equal(w2.player.state, 'idle');
    assert.ok(hasEvent(w2.events, 'playerEvent', 'wakeup'));
});

// =====================================================================
// Boss: perception, delays, strings and roll catching
// =====================================================================
test('the boss punishes a heal inside the difficulty reaction delay', () => {
    for (const [difficulty, window] of [['hard', 0.12], ['medium', 0.26]]) {
        const w = world(difficulty);
        const { player, boss } = w;
        faceToFace(w, 6);
        boss.thinkTimer = 10;                 // freeze free-form decisions
        boss.reactTimer = 0;
        player.tryHeal(w.ctx);
        const start = boss.clock;
        advanceBoss(w, 0.5);
        assert.equal(boss.attackName, 'dashThrust', `${difficulty}: gap-closing punish`);
        const eventStep = boss.attackStart - start;
        assert.ok(eventStep <= window, `${difficulty}: reacted after ${eventStep.toFixed(3)}s`);
        assert.ok(eventStep >= DIFFICULTIES[difficulty].reactionDelay - 2 * STEP, `${difficulty}: not instant`);
    }
    // easy is slow, but the delay is still human
    const w = world('easy');
    faceToFace(w, 6);
    w.boss.thinkTimer = 10;
    w.player.tryHeal(w.ctx);
    inRandom(0, () => {
        advanceBoss(w, 0.6);
        assert.equal(w.boss.attackName, 'dashThrust');
        assert.ok(w.boss.attackStart >= DIFFICULTIES.easy.reactionDelay - 2 * STEP, 'no instant read');
    });
});

test('delayed attacks hold in the chamber and still land', () => {
    const w = world('hard');
    const { boss, player } = w;
    faceToFace(w, 2.5);
    inRandom(sequence([0.1, 0.5, 0.5]), () => {
        boss.startAttack('heavyOverhead', w.ctx);
        assert.ok(Math.abs(boss.currentAttack.hold - 0.35) < 1e-9, `hold ${boss.currentAttack.hold}`);
        // During the chamber nothing lands
        advanceBoss(w, 0.9);
        assert.equal(boss.state, 'attack');
        assert.equal(boss.delaying, true, 'boss.delaying while holding');
        assert.ok(boss.rig.lastPose.hold > 0, 'pose receives the hold');
        assert.equal(player.hp, player.maxHp);
        assert.ok(hasEvent(w.events, 'bossEvent', 'delay'));
        assert.equal(boss.rig.lastPose.state, 'attack');
        // ...then the swing resolves
        advanceBoss(w, 0.5);
        assert.ok(hasEvent(w.events, 'playerHit'), 'the held swing still lands');
        assert.ok(player.hp < player.maxHp);
    });
    // Difficulty drives the holds: the same roll delays hard but not easy
    const hard = world('hard');
    inRandom(0.36, () => hard.boss.startAttack('delayedThrust', hard.ctx));
    assert.ok(hard.boss.currentAttack.hold > 0, 'hard holds often');
    const easy = world('easy');
    inRandom(0.36, () => easy.boss.startAttack('delayedThrust', easy.ctx));
    assert.equal(easy.boss.currentAttack.hold, 0, 'easy rarely holds');
});

test('combo strings chain, branch and end on a breather window', () => {
    const w = world('medium');
    const { boss, player } = w;
    faceToFace(w, 2.4);
    inRandom(1, () => {                       // no extension rolls
        boss.startString('slashChain', w.ctx);
        assert.equal(boss.attackName, 'slashL');
        assert.equal(boss.stringId, 'slashChain');
        const seen = [boss.attackName];
        for (let i = 0; i < 60 * 4; i++) {
            boss.update(STEP, player, w.ctx);
            if (boss.state === 'attack' && boss.currentAttack && boss.stateTime < STEP * 1.5) {
                if (!seen.includes(boss.attackName)) seen.push(boss.attackName);
            }
        }
        assert.ok(seen.includes('slashR'), `string chained: ${seen.join(' -> ')}`);
        assert.equal(boss.string, null, 'string closed');
        assert.ok(boss.breatherTimer >= 0.62 - 1e-9, `breather ${boss.breatherTimer}`);
    });
    // branchBackoff: a player running away pulls a thrust instead of the overhead
    const w2 = world('medium');
    faceToFace(w2, 2.4);
    inRandom(1, () => {
        w2.boss.startString('slashChain', w2.ctx);
        const seen = [];
        for (let i = 0; i < 60 * 4; i++) {
            w2.player.vel.set(0, 0, 6);           // sprinting away from the boss
            w2.boss.update(STEP, w2.player, w2.ctx);
            if (w2.boss.state === 'attack' && w2.boss.currentAttack && w2.boss.stateTime < STEP * 1.5) {
                seen.push(w2.boss.attackName);
            }
        }
        assert.ok(seen.includes('lungeThrust'), `backing player pulls a thrust: ${seen.join(' -> ')}`);
    });
});

test('roll catch on hard re-times the follow-up to land after the i-frames', () => {
    for (const difficulty of ['hard', 'easy']) {
        const w = world(difficulty);
        const { boss, player } = w;
        faceToFace(w, 4);
        inRandom(0, () => {
            boss.startString('slashChain', w.ctx);        // slashL -> slashR
            advanceBoss(w, 0.45);                          // slashL is mid-swing
            const rollStart = boss.clock;
            player.tryRoll(new THREE.Vector3(0, 0, -1), true);
            advanceBoth(w, 1.4);
            const catchInfo = boss.lastRollCatch;
            if (difficulty === 'easy') {
                assert.equal(catchInfo, null, 'easy never times past a roll');
                return;
            }
            assert.ok(catchInfo, 'hard reads the roll');
            const hits = w.events.filter((e) => e[0] === 'playerHit' && e[1] === 'hit');
            assert.ok(hits.length, 'the caught follow-up still lands');
            const hitClock = hits[0][3].clock;
            assert.ok(hitClock >= catchInfo.iframeEndAt + 0.03,
                `landed at ${hitClock.toFixed(3)} vs iframe end ${catchInfo.iframeEndAt.toFixed(3)}`);
            assert.ok(hitClock <= rollStart + 0.56, 'caught the roll tail, not a guaranteed whiff');
        });
    }
});

test('the boss reacts to an attack startup by evading or blocking', () => {
    const w = world('hard');
    const { boss, player } = w;
    faceToFace(w, 3.2);
    boss.thinkTimer = 10;
    inRandom(0, () => {                       // forces the evade branch
        player.tryAttack();
        advanceBoss(w, 0.2);
        assert.ok(['evade', 'block'].includes(boss.state), boss.state);
    });
    assert.ok(hasEvent(w.events, 'bossEvent', 'evade'), 'boss answered the startup');
});

// =====================================================================
// Boss: tracking, turn punishes, spacing and movement bounds
// =====================================================================
test('tracking rotates hard, then commits at 75% of the windup through the active frames', () => {
    const w = world('hard');
    const { boss, player } = w;
    faceToFace(w, 3);
    boss.startAttack('slashL');                // windup 0.4 -> commit at 0.3
    assert.equal(boss.currentAttack.windup, 0.4);
    // Tracks a player circling out of the arc
    player.pos.set(Math.sin(1.2) * 3, 0, Math.cos(1.2) * 3);
    advanceBoss(w, 0.1);
    assert.ok(Math.abs(boss.heading) > 0.2, 'rotating toward the player during the windup');
    advanceBoss(w, 0.22);                      // past the 75% commit point
    const frozen = boss.heading;
    player.pos.set(Math.sin(2.6) * 3, 0, Math.cos(2.6) * 3);
    advanceBoss(w, 0.2);                       // remaining windup + active window
    assert.ok(Math.abs(boss.heading - frozen) < 1e-9, 'heading committed at 75% of the windup');
});

test('a player behind the boss eats a turning attack, not a slow shuffle', () => {
    const w = world('medium');
    const { boss, player } = w;
    boss.pos.set(0, 0, 0);
    boss.heading = 0;                          // facing +z
    player.pos.set(0, 0, -2.2);                // squarely behind
    player.heading = 0;
    boss.thinkTimer = 0;
    boss.decide(player, w.ctx);
    assert.equal(boss.stringId, 'backhandPunish');
    assert.equal(boss.attackName, 'backhandSlash');
    assert.equal(boss.currentAttack.turnPunish, true);
    advanceBoss(w, 0.18);                      // inside the windup: heading snaps around
    const toPlayer = Math.atan2(player.pos.x - boss.pos.x, player.pos.z - boss.pos.z);
    let diff = toPlayer - boss.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    assert.ok(Math.abs(diff) < 0.6, `snapped heading ${boss.heading.toFixed(2)} (off by ${diff.toFixed(2)})`);
});

test('dash attacks never overshoot, teleport or bulldoze the player', () => {
    const w = world('hard');
    const { boss, player } = w;
    boss.pos.set(0, 0, 0);
    boss.heading = 0;
    player.pos.set(0, 0, 5);
    player.heading = Math.PI;
    boss.startAttack('charge');
    let maxStepDist = 0;
    const prev = boss.pos.clone();
    for (let i = 0; i < 60 * 2; i++) {
        boss.update(STEP, player, w.ctx);
        maxStepDist = Math.max(maxStepDist, Math.hypot(boss.pos.x - prev.x, boss.pos.z - prev.z));
        prev.copy(boss.pos);
        assert.ok(boss.pos.z < player.pos.z - 0.5, `overshot the player at step ${i}`);
        assert.ok(Math.abs(player.pos.z - 5) < 1e-9, 'the player was bulldozed along the charge');
    }
    assert.ok(maxStepDist <= 0.55 + 1e-9, `per-step travel ${maxStepDist.toFixed(3)}`);
});

test('the leaping slam arcs onto the player without ever teleporting', () => {
    const w = world('hard');
    const { boss, player } = w;
    boss.pos.set(0, 0, 0);
    boss.heading = 0;
    player.pos.set(0, 0, 9);
    player.heading = Math.PI;
    boss.phase = 2;
    inRandom(sequence([0.1, 0, 0]), () => boss.startAttack('jumpSlam', w.ctx));
    assert.equal(boss.currentAttack.hold, 0);
    assert.equal(boss.currentAttack.type, 4);
    assert.equal(boss.currentAttack.leap, true);
    let maxStep = 0;
    let maxY = 0;
    const prev = boss.pos.clone();
    for (let i = 0; i < 60 * 3; i++) {
        boss.update(STEP, player, w.ctx);
        const step = Math.hypot(boss.pos.x - prev.x, boss.pos.z - prev.z);
        if (Math.hypot(player.pos.x - boss.pos.x, player.pos.z - boss.pos.z) > 2.2) {
            maxStep = Math.max(maxStep, step);     // the collision push only happens up close
        }
        maxY = Math.max(maxY, boss.pos.y);
        prev.copy(boss.pos);
    }
    assert.ok(maxStep <= 0.55 + 1e-9, `leap step ${maxStep.toFixed(3)}`);
    assert.ok(maxY > 0.8, `root leaves the ground (${maxY.toFixed(2)})`);
    assert.equal(boss.pos.y, 0, 'lands back on the floor');
    assert.ok(Math.hypot(player.pos.x - boss.pos.x, player.pos.z - boss.pos.z) <= 3.5, 'lands within range');
    assert.ok(hasEvent(w.events, 'bossEvent', 'land'));
    assert.ok(hasEvent(w.events, 'playerHit'), 'the slam connects');
    assert.equal(player.state, 'knockdown', 'slams knock the player down');
});

test('the boss stands down against a dead or victorious player', () => {
    for (const endState of ['dead', 'victory']) {
        const w = world();
        const { boss, player } = w;
        faceToFace(w, 2.2);
        player.state = endState;
        if (endState === 'dead') player.hp = 0;
        boss.startAttack('quickSlash');
        advanceBoss(w, 0.2);
        assert.notEqual(boss.state, 'attack', endState);
        assert.equal(boss.attackName, null, endState);
        assert.equal(boss.currentAttack, null, endState);
        advanceBoss(w, 2.5);
        assert.equal(boss.state, 'idle', endState);
        assert.equal(w.events.filter((e) => e[0] === 'playerHit').length, 0, endState);
    }
});

// =====================================================================
// Boss: phases, stance breaks, AoE
// =====================================================================
test('phase transitions roar behind a deferred, single banner', () => {
    const w = world();
    const { boss, player } = w;
    boss.hp = 700;
    boss.receiveHit(hit(10), player, w.ctx);
    advanceBoss(w, 0.1);
    assert.equal(boss.phase, 1, 'above 65% nothing happens');
    boss.hp = boss.maxHp * 0.65 + 5;
    boss.receiveHit(hit(10), player, w.ctx);
    advanceBoss(w, 0.1);
    assert.equal(boss.phase, 2);
    assert.equal(boss.rage, true);
    assert.equal(boss.state, 'roar');
    assert.equal(boss.currentAttack, null);
    assert.equal(countEvent(w.events, 'bossRage'), 1, 'exactly one banner');
    assert.ok(hasEvent(w.events, 'bossEvent', 'roar'));
    const before = boss.pos.clone();
    advanceBoss(w, 1.0);
    assert.equal(boss.state, 'roar');
    assert.ok(boss.pos.distanceTo(before) < 1e-6, 'roar holds position');
    advanceBoss(w, 0.5);
    assert.notEqual(boss.state, 'roar');
    advanceBoss(w, 2.0);
    assert.equal(countEvent(w.events, 'bossRage'), 1, 'no repeated banners');
});

test('a committed swing finishes before the phase transition applies', () => {
    const w = world();
    const { boss, player } = w;
    faceToFace(w, 2.4);
    boss.hp = boss.maxHp * 0.65 + 5;
    boss.startAttack('slashL');
    const atk = boss.currentAttack;
    advanceBoss(w, 0.2);                       // mid-windup
    assert.equal(boss.state, 'attack');
    boss.receiveHit(hit(10), player, w.ctx);   // crosses 65% -> pending phase 2
    assert.equal(boss.phase, 1);
    assert.equal(boss.state, 'attack', 'transition never interrupts a swing');
    assert.equal(boss.currentAttack, atk);
    advanceBoss(w, 1.2);
    assert.equal(boss.phase, 2);
    assert.equal(boss.state, 'roar');
    assert.equal(countEvent(w.events, 'bossRage'), 1);
});

test('phase 2 and 3 pace faster and the flaming blade suppresses the steel glow', () => {
    const w = world();
    const { boss } = w;
    const expect = { 1: [1, 1, 1], 2: [0.85, 0.85, 0.75], 3: [0.72, 0.78, 0.62] };
    for (const phase of [1, 2, 3]) {
        boss.phase = phase;
        assert.ok(Math.abs(boss.windupMult / DIFFICULTIES.medium.windupMult - expect[phase][0]) < 0.01, `windup p${phase}`);
        assert.equal(boss.recoverMult, expect[phase][1]);
        assert.equal(boss.cdMult, expect[phase][2]);
    }
    // Flaming blade: ember-orange emissive from phase 2 on
    boss.phase = 1;
    boss.startAttack('slashL');
    boss.update(STEP, w.player, w.ctx);
    const cold = boss.rig.blade.material.emissive.clone();
    boss.phase = 3;
    boss.startAttack('slashL');
    boss.update(STEP, w.player, w.ctx);
    const hot = boss.rig.blade.material.emissive;
    assert.ok(hot.r > hot.b, 'phase 2+ blade glows ember-orange');
    assert.ok(hot.b < cold.b, 'the steel-blue channel is suppressed once the blade is burning');
});

test('no windup ever drops below the readable floor in any phase or difficulty', () => {
    const names = ['jab', 'slashL', 'slashR', 'quickSlash', 'backhandSlash', 'shieldBash', 'risingSlash',
        'backstepSlash', 'lowSweep', 'heavyOverhead', 'delayedThrust', 'lungeThrust', 'spinSlash',
        'jumpSlam', 'quakeSlam', 'ashenNova', 'dashThrust', 'runningSlash', 'charge'];
    for (const difficulty of DIFFICULTY_ORDER) {
        for (const phase of [1, 3]) {
            const w = world(difficulty);
            w.boss.phase = phase;
            for (const name of names) {
                inRandom(1, () => w.boss.startAttack(name, w.ctx));   // no delays, no catches
                assert.ok(w.boss.currentAttack, `${difficulty} p${phase} ${name}`);
                assert.ok(w.boss.currentAttack.windup >= 0.26 - 1e-9,
                    `${difficulty} p${phase} ${name} windup ${w.boss.currentAttack.windup}`);
            }
        }
    }
});

test('difficulty scales boss damage on top of the phase bonus', () => {
    for (const [difficulty, expected] of [['easy', 7], ['medium', 10], ['hard', 14]]) {
        const w = world(difficulty);
        w.boss.startAttack('jab', w.ctx);
        assert.equal(w.boss.currentAttack.damage, expected, difficulty);
        if (difficulty === 'hard') {
            w.boss.phase = 3;
            w.boss.startAttack('jab', w.ctx);
            assert.ok(w.boss.currentAttack.damage > expected, 'phase 3 hits harder');
        }
    }
});

test('poise builds into a stance break that opens the riposte window', () => {
    const w = world('medium');
    const { boss, player } = w;
    for (let i = 1; i <= 5; i++) {
        assert.equal(boss.receiveHit(hit(30, { poiseDamage: 18 }), player, w.ctx), 'hit');
        assert.equal(boss.poise, 18 * i, `poise after ${i} hits`);
    }
    assert.notEqual(boss.state, 'stanceBreak');
    boss.receiveHit(hit(30, { poiseDamage: 18 }), player, w.ctx);   // 90 -> 108 >= 100
    assert.equal(boss.poise, 0, 'poise resets on break');
    assert.equal(boss.state, 'stanceBreak');
    assert.equal(boss.vulnerable, true);
    assert.ok(hasEvent(w.events, 'bossEvent', 'stanceBreak'));
    // Riposte damage lands only while vulnerable
    const riposte = hit(95, { riposte: true, type: 9 });
    const hpBefore = boss.hp;
    assert.equal(boss.receiveHit(riposte, player, w.ctx), 'hit');
    assert.equal(boss.hp, hpBefore - 95);
    // The kneel is ~1.6s; afterwards the same swing is ignored
    advanceBoss(w, 1.7);
    assert.notEqual(boss.state, 'stanceBreak');
    assert.equal(boss.vulnerable, false);
    const hpAfter = boss.hp;
    assert.equal(boss.receiveHit(riposte, player, w.ctx), 'blocked');
    assert.equal(boss.hp, hpAfter, 'riposte is ignored outside the stance break');
});

test('boss poise regenerates after ~3s without being hit', () => {
    const w = world('medium');
    const { boss, player } = w;
    boss.receiveHit(hit(10, { poiseDamage: 40 }), player, w.ctx);
    boss.receiveHit(hit(10, { poiseDamage: 40 }), player, w.ctx);
    advanceBoss(w, 2.5);
    assert.equal(boss.poise, 80, 'still frozen inside the regen delay');
    advanceBoss(w, 1.5);
    assert.ok(boss.poise < 80, `poise regenerated to ${boss.poise}`);
});

test('parry opens the stance break and the riposte critical', () => {
    const w = world('medium');
    const { player, boss } = w;
    faceToFace(w, 2.2);
    player.setBlock(true);
    assert.ok(player.parryWindow >= 0.14 && player.parryWindow <= 0.16);
    assert.equal(player.receiveHit(hit(20), boss, w.ctx), 'parried');
    assert.equal(boss.state, 'stanceBreak');
    assert.equal(boss.vulnerable, true);
    assert.ok(hasEvent(w.events, 'bossEvent', 'stanceBreak'));
    assert.ok(player.riposteWindow > 0);
    advancePlayer(w, 0.45);                    // out of the parry pose; the held guard resumes
    assert.equal(player.state, 'block');
    const hpBefore = boss.hp;
    assert.equal(player.tryAttack(), true);
    assert.equal(player.currentAttack.riposte, true);
    assert.equal(player.currentAttack.type, 9);
    advancePlayer(w, 0.5);
    assert.equal(boss.hp, hpBefore - 95 * DIFFICULTIES.medium.playerDamage, 'riposte lands');
    assert.ok(hasEvent(w.events, 'bossHit'));
    // Riposte safety: a non-vulnerable boss refuses the critical
    const w2 = world('medium');
    faceToFace(w2, 2.2);
    assert.equal(w2.player.canRiposte(), false, 'nothing to riposte');
    w2.player.tryAttack();
    assert.equal(w2.player.currentAttack.riposte, undefined, 'falls back to a normal swing');
});

test('unblockable AoE: quakeSlam hurts through a guard', () => {
    const w = world('hard');
    const { boss, player } = w;
    faceToFace(w, 2.4);
    boss.phase = 2;
    boss.startAttack('quakeSlam', w.ctx);
    assert.equal(boss.currentAttack.parryable, false);
    assert.equal(boss.currentAttack.unblockable, true);
    assert.ok(boss.currentAttack.windup >= 0.85);
    assert.ok(hasEvent(w.events, 'bossEvent', 'tell'), 'unblockable tell');
    player.setBlock(true);
    player.parryWindow = 0.2;
    const hp = player.hp;
    const res = player.receiveHit(boss.currentAttack, boss, w.ctx);
    assert.equal(res, 'hit', 'unblockables cannot be parried or guarded');
    assert.ok(player.hp < hp);
    assert.equal(player.riposteWindow, 0);
    assert.equal(player.state, 'knockdown', 'the slam knocks you down');
});

test('the ashen nova is a radial burst that a rolling player dodges through i-frames', () => {
    // Standing behind the boss (proves the AoE ignores the arc)
    const w = world('hard');
    const { boss, player } = w;
    boss.pos.set(0, 0, 0);
    boss.heading = 0;
    player.pos.set(0, 0, -3);
    player.heading = 0;
    boss.phase = 3;
    inRandom(1, () => {
        boss.startAttack('ashenNova', w.ctx);
        assert.equal(boss.currentAttack.aoe, true);
        assert.equal(boss.currentAttack.radius, 4.2);
        assert.equal(boss.currentAttack.nova, true);
        assert.equal(boss.currentAttack.unblockable, true);
        assert.equal(boss.currentAttack.knockdown, true);
        assert.ok(hasEvent(w.events, 'bossEvent', 'tell'));
        advanceBoss(w, 1.25);
        assert.ok(hasEvent(w.events, 'bossEvent', 'shockwave'));
        assert.ok(hasEvent(w.events, 'bossEvent', 'land'));
        assert.ok(hasEvent(w.events, 'playerHit'), 'standing in the radius hurts');
        assert.ok(player.hp < player.maxHp);
        assert.equal(player.state, 'knockdown');
    });
    // Rolling through the impact with i-frames takes nothing
    const w2 = world('hard');
    const { boss: boss2, player: player2 } = w2;
    boss2.pos.set(0, 0, 0);
    player2.pos.set(0, 0, -3);
    boss2.phase = 3;
    inRandom(1, () => {
        boss2.startAttack('ashenNova', w2.ctx);
        advanceBoss(w2, 1.1);
        player2.tryRoll(new THREE.Vector3(1, 0, 0), true);
        advanceBoth(w2, 0.16);
        assert.equal(player2.state, 'roll');
        assert.ok(hasEvent(w2.events, 'bossEvent', 'land'));
        assert.equal(player2.hp, player2.maxHp, 'i-frames dodge the nova');
        assert.equal(w2.events.filter((e) => e[0] === 'playerHit' && e[1] === 'hit').length, 0);
    });
});

test('a stance-broken boss shows the kneel pose and dies cleanly', () => {
    const w = world();
    const { boss, player } = w;
    boss.enterStanceBreak(w.ctx, 1.6);
    advanceBoss(w, 0.1);
    assert.equal(boss.rig.lastPose.state, 'stanceBreak');
    boss.hp = 5;
    boss.receiveHit(hit(30, { poiseDamage: 5 }), player, w.ctx);
    assert.equal(boss.dead, true);
    assert.equal(boss.hp, 0);
    assert.equal(boss.state, 'dead');
    assert.equal(boss.currentAttack, null);
    advanceBoss(w, 0.5);
    assert.equal(boss.rig.lastPose.state, 'dead');
});

// =====================================================================
// Rig contract: local move directions, trails, pose types
// =====================================================================
test('locked-on strafing passes the local move direction to the run pose', () => {
    const w = world();
    const { player } = w;
    player.pos.set(0, 0, 5.5);
    w.boss.pos.set(0, 0, -5.5);
    w.input.locked = true;
    // Strafe right: the player's +x is to their LEFT while facing -z
    w.input.moveVec.set(1, 0, 0);
    advancePlayer(w, 0.3);
    assert.equal(player.state, 'run');
    assert.equal(player.rig.lastPose.state, 'run');
    assert.ok(player.rig.lastPose.moveX <= -0.9, `strafe is local (moveX ${player.rig.lastPose.moveX})`);
    assert.ok(Math.abs(player.rig.lastPose.moveZ) < 0.35, `not a forward run (moveZ ${player.rig.lastPose.moveZ})`);
    // Backpedal away from the boss
    w.input.moveVec.set(0, 0, 1);
    advancePlayer(w, 0.3);
    assert.ok(player.rig.lastPose.moveZ < -0.9, `backpedal moveZ ${player.rig.lastPose.moveZ}`);
    // Pure sprint forward keeps +z local
    w.input.moveVec.set(0, 0, -1);
    w.input.sprint = true;
    advancePlayer(w, 0.3);
    assert.ok(player.rig.lastPose.moveZ > 0.9, 'forward keeps +z');
    assert.ok(player.rig.lastPose.moveSpeed > 6, 'sprint speed reaches the run pose');
});

test('the boss stalk passes local strafe directions and both fighters expose trailActive', () => {
    const w = world();
    const { boss, player } = w;
    boss.state = 'stalk';
    boss.thinkTimer = 10;
    player.pos.set(0, 0, 3.2);
    boss.pos.set(0, 0, 0);
    boss.heading = 0;
    inRandom(0.9, () => advanceBoss(w, 0.6));   // stable strafe direction
    assert.equal(boss.rig.lastPose.state, 'run');
    assert.ok(Math.abs(boss.rig.lastPose.moveX) > 0.3, `boss strafes locally (moveX ${boss.rig.lastPose.moveX})`);
    assert.ok(Math.abs(boss.rig.lastPose.moveZ) < 0.95);
    // Trails
    assert.equal(player.trailActive, false);
    player.startSwing(0);
    advancePlayer(w, 0.26);
    assert.equal(player.trailActive, true);
    boss.startAttack('slashL');
    advanceBoss(w, 0.45);
    assert.equal(boss.trailActive, true, 'boss trail during the active window');
});

test('pose types cover the whole moveset contract', () => {
    const w = world();
    const seen = {};
    const record = (label, run) => { run(); seen[label] = w.boss.currentAttack.type; };
    record('jab', () => w.boss.startAttack('jab', w.ctx));
    record('slashL', () => w.boss.startAttack('slashL', w.ctx));
    record('slashR', () => w.boss.startAttack('slashR', w.ctx));
    record('overhead', () => w.boss.startAttack('heavyOverhead', w.ctx));
    record('thrust', () => w.boss.startAttack('lungeThrust', w.ctx));
    record('jumpSlam', () => w.boss.startAttack('jumpSlam', w.ctx));
    record('spin', () => w.boss.startAttack('spinSlash', w.ctx));
    record('bash', () => w.boss.startAttack('shieldBash', w.ctx));
    record('rising', () => w.boss.startAttack('risingSlash', w.ctx));
    record('sweep', () => w.boss.startAttack('lowSweep', w.ctx));
    assert.deepEqual(seen, {
        jab: 3, slashL: 0, slashR: 1, overhead: 2, thrust: 3,
        jumpSlam: 4, spin: 5, bash: 6, rising: 8, sweep: 10,
    });
    // Player poses
    const p = w.player;
    p.setHeavy(true);
    assert.equal(p.currentAttack.type, 2);
    p.setHeavy(false);
    p.state = 'idle';
    p.stateTime = 0;
    p.guardCounterWindow = 0.5;
    p.setHeavy(true);
    assert.equal(p.currentAttack.type, 8);
    // Player states reach the rig
    for (const state of ['roll', 'backstep', 'stagger', 'knockdown']) {
        p.state = state;
        p.stateTime = 0.1;
        p.pose(STEP);
        assert.equal(p.rig.lastPose.state, state);
    }
});
