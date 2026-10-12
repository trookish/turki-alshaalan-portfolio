import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKnight } from '../../src/features/game/modules/knight.js';

function meshes(rig) {
    const result = [];
    rig.root.traverse(node => { if (node.isMesh) result.push(node); });
    return result;
}

function advance(rig, state, duration = 0.6, opts = {}, dt = 1 / 60) {
    for (let time = dt; time <= duration + 1e-8; time += dt) rig.pose(state, time, dt, opts);
}

function hasAncestor(node, ancestor) {
    for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent === ancestor) return true;
    }
    return false;
}

test('builds an articulated steel silhouette without breaking the public rig', () => {
    const rig = createKnight({ color: 0x4ade80, darkColor: 0x14201a, scale: 1.2 });
    for (const key of ['root', 'spin', 'body', 'upper', 'head', 'torso', 'armR', 'armL',
        'sword', 'shield', 'blade', 'legL', 'legR', 'blob', 'plume']) {
        assert.ok(rig[key]?.isObject3D, `missing compatible ${key}`);
    }
    assert.equal(typeof rig.pose, 'function');
    assert.equal(rig.root.scale.x, 1.2);
    for (const side of ['L', 'R']) {
        assert.ok(rig[`knee${side}`]?.isObject3D, `missing articulated knee ${side}`);
        assert.ok(hasAncestor(rig[`knee${side}`], rig[`leg${side}`]));
        assert.ok(rig[`elbow${side}`]?.isObject3D, `missing articulated elbow ${side}`);
        assert.ok(hasAncestor(rig[`elbow${side}`], rig[`arm${side}`]));
        assert.ok(hasAncestor(rig[`foot${side}`], rig[`knee${side}`]));
    }
    assert.ok(rig.torso.material.isMeshStandardMaterial);
    assert.ok(rig.torso.material.metalness >= 0.5);
    const hsl = rig.torso.material.color.getHSL({});
    assert.ok(hsl.s < 0.22, 'accent color must not paint the entire armor');
    assert.ok(meshes(rig).length >= 35, 'layered silhouette needs more than block limbs');
    assert.ok(meshes(rig).length <= 50, 'mobile mesh budget exceeded');
    assert.ok(rig.cape?.children.length > 0, 'segmented cape missing');
    assert.ok(rig.blade.geometry.getAttribute('position').count > 8);
});

test('boss crown and ember visor follow the helmet on a heavier silhouette', () => {
    const player = createKnight();
    const boss = createKnight({ isBoss: true, color: 0xef4444 });
    const horns = meshes(boss).filter(node => node.name.startsWith('horn-'));
    assert.equal(horns.length, 2, 'boss needs distinct horns, not just a red player');
    assert.ok(boss.root.getObjectByName('crown'));
    assert.ok(boss.torso.scale.x > player.torso.scale.x);
    assert.notEqual(boss.visor.material.color.getHex(), player.visor.material.color.getHex());
    for (const rig of [player, boss]) {
        for (const attachment of [rig.visor, rig.plume, ...horns.filter(node => hasAncestor(node, rig.head))]) {
            assert.ok(hasAncestor(attachment, rig.head), `${attachment.name} must inherit head motion`);
            const before = attachment.getWorldPosition(new THREE.Vector3());
            rig.head.rotation.y += 0.45;
            const after = attachment.getWorldPosition(new THREE.Vector3());
            assert.ok(before.distanceTo(after) > 0.001, `${attachment.name} detached from helmet motion`);
        }
        assert.ok(meshes(rig).length <= 50);
    }
});

test('gait articulates knees with a grounded support foot for forward, strafe and backpedal', () => {
    const forward = createKnight();
    const sideways = createKnight();
    const backward = createKnight();
    const knees = [];
    let lateralTravel = 0;
    let backpedalSpread = 0;
    for (let frame = 0; frame < 150; frame++) {
        const t = frame / 60;
        forward.pose('run', t, 1 / 60, { moveSpeed: 3, moveZ: 1 });
        sideways.pose('run', t, 1 / 60, { moveSpeed: 3, moveX: 1, moveZ: 0 });
        backward.pose('run', t, 1 / 60, { moveSpeed: 3, moveZ: -1 });
        knees.push(forward.kneeL.rotation.x);
        lateralTravel = Math.max(lateralTravel, Math.abs(sideways.legL.rotation.z));
        backpedalSpread = Math.max(backpedalSpread, Math.abs(forward.legL.rotation.x - backward.legL.rotation.x));
        if (frame > 30) {
            for (const rig of [forward, sideways, backward]) {
                const left = rig.footL.getWorldPosition(new THREE.Vector3());
                const right = rig.footR.getWorldPosition(new THREE.Vector3());
                assert.ok(Math.min(left.y, right.y) < 0.13, 'both feet float during a grounded stride');
                assert.ok(Math.min(left.y, right.y) >= 0.075, 'support foot goes through floor');
                assert.ok(rig.kneeL.rotation.x >= 0 && rig.kneeR.rotation.x >= 0, 'knees bend backwards');
            }
        }
    }
    assert.ok(Math.max(...knees) - Math.min(...knees) > 0.4, 'knees do not bend through the stride');
    assert.ok(lateralTravel > 0.12, 'locked strafe must move sideways instead of running in place');
    assert.ok(backpedalSpread > 0.12, 'backpedal ignored');
});

function feetHeights(rig) {
    rig.root.updateMatrixWorld(true);
    const left = rig.footL.getWorldPosition(new THREE.Vector3());
    const right = rig.footR.getWorldPosition(new THREE.Vector3());
    return [left.y, right.y];
}

test('grounded stances keep both soles near the floor through attacks and guards', () => {
    for (const isBoss of [false, true]) {
        const rig = createKnight({ isBoss });
        // Hand off from a sprint so stale gait knees would show up immediately.
        for (let f = 0; f < 30; f++) rig.pose('run', f / 60, 1 / 60, { moveSpeed: 3, moveZ: 1 });
        const states = [
            ['attack', { attackType: 0, windup: 0.5, progress: 0, recover: 0 }],
            ['attack', { attackType: 2, windup: 0, progress: 0.5, recover: 0 }],
            ['attack', { attackType: 2, windup: 0, progress: 0, recover: 0.5 }],
            ['attack', { attackType: 3, windup: 0, progress: 0.4, recover: 0 }],
            ['block', {}],
            ['stagger', { progress: 0.5 }],
            ['guardbroken', { progress: 0.5 }],
            ['victory', {}],
        ];
        for (const [state, opts] of states) {
            for (let f = 0; f < 24; f++) {
                rig.pose(state, f / 60, 1 / 60, opts);
                const [l, r] = feetHeights(rig);
                const bound = f < 8 ? 0.32 : 0.16;
                assert.ok(l > 0.03 && l < bound && r > 0.03 && r < bound,
                    `${state} (boss=${isBoss}) floats or clips a sole: ${l.toFixed(3)} / ${r.toFixed(3)}`);
            }
        }
    }
});

test('attack entry glides the feet into stance instead of teleporting', () => {
    const rig = createKnight();
    for (let f = 0; f < 40; f++) rig.pose('run', f / 60, 1 / 60, { moveSpeed: 3, moveZ: 1 });
    feetHeights(rig);
    const prev = rig.footL.getWorldPosition(new THREE.Vector3());
    let maxStep = 0;
    for (let f = 0; f < 12; f++) {
        rig.pose('attack', f / 60, 1 / 60, { attackType: 2, windup: Math.min(1, f / 8), progress: 0, recover: 0 });
        const now = rig.footL.getWorldPosition(new THREE.Vector3());
        maxStep = Math.max(maxStep, now.distanceTo(prev));
        prev.copy(now);
    }
    assert.ok(maxStep < 0.22, `foot teleported ${(maxStep).toFixed(3)} into the attack stance`);
});

test('the swing snaps early and the torso sweeps through the slash', () => {
    const rig = createKnight();
    for (let f = 0; f < 10; f++) rig.pose('idle', f / 60, 1 / 60, {});
    const samples = [];
    const torso = [];
    for (let f = 0; f <= 10; f++) {
        rig.pose('attack', 0.6, 1 / 60, { attackType: 0, windup: 0, progress: f / 10, recover: 0 });
        samples.push(rig.armR.rotation.y);
        torso.push(rig.upper.rotation.y);
    }
    const early = Math.abs(samples[2] - samples[0]);
    const late = Math.abs(samples[10] - samples[8]);
    assert.ok(early > late * 1.5, `swing must snap early (early ${early.toFixed(3)}, late ${late.toFixed(3)})`);
    const sweep = Math.max(...torso) - Math.min(...torso);
    assert.ok(sweep > 0.7, `torso must sweep through the slash (range ${sweep.toFixed(3)})`);
});

test('the boss swings carry visibly more weight than the player', () => {
    const dip = (rig) => {
        let low = Infinity;
        for (let f = 0; f <= 12; f++) {
            rig.pose('attack', 0.6, 1 / 60, { attackType: 2, windup: 0, progress: f / 12, recover: 0 });
            low = Math.min(low, rig.body.position.y);
        }
        return 0.695 - low;
    };
    const hero = dip(createKnight());
    const boss = dip(createKnight({ isBoss: true }));
    assert.ok(hero > 0.01, 'overhead smashes must compress the body');
    assert.ok(boss > hero * 1.2, `boss dip ${boss.toFixed(3)} must exceed player dip ${hero.toFixed(3)}`);
});

test('the boss settles into a wider, loaded stance', () => {
    const hero = createKnight();
    const boss = createKnight({ isBoss: true });
    hero.pose('idle', 1, 1 / 60, {});
    boss.pose('idle', 1, 1 / 60, {});
    hero.root.updateMatrixWorld(true);
    boss.root.updateMatrixWorld(true);
    const spread = (rig) => rig.footL.getWorldPosition(new THREE.Vector3())
        .distanceTo(rig.footR.getWorldPosition(new THREE.Vector3()));
    assert.ok(spread(boss) > spread(hero), 'the boss stance must be wider than the player stance');
    assert.ok(boss.body.position.y < hero.body.position.y, 'the boss must stand sunk into its knees');
});

test('cloth trails the torso instead of standing rigid', () => {
    const rig = createKnight();
    let capeMotion = 0;
    let prev = null;
    for (let f = 0; f < 24; f++) {
        rig.pose('attack', 0.6, 1 / 60, {
            attackType: 0,
            windup: f < 12 ? f / 12 : 0,
            progress: f >= 12 ? (f - 12) / 12 : 0,
            recover: 0,
        });
        if (prev !== null) {
            capeMotion += Math.abs(rig.capeTip.rotation.x - prev.x) + Math.abs(rig.capeTip.rotation.z - prev.z);
        }
        prev = { x: rig.capeTip.rotation.x, z: rig.capeTip.rotation.z };
    }
    assert.ok(capeMotion > 0.2, `cape must swing with the slash (travel ${capeMotion.toFixed(3)})`);
});

// ---------------------------------------------------------------- overhaul coverage

function worldOf(node) {
    node.updateWorldMatrix(true, false);
    return node.getWorldPosition(new THREE.Vector3());
}

function settle(rig, state, opts, frames = 40, dt = 1 / 60) {
    for (let f = 0; f < frames; f++) rig.pose(state, f * dt, dt, opts);
}

const GROUND_BAND = { low: 0.03, high: 0.17 };

function assertSoles(rig, label) {
    const l = worldOf(rig.footL).y;
    const r = worldOf(rig.footR).y;
    assert.ok(l > GROUND_BAND.low && l < GROUND_BAND.high, `${label}: left sole ${l.toFixed(3)} out of band`);
    assert.ok(r > GROUND_BAND.low && r < GROUND_BAND.high, `${label}: right sole ${r.toFixed(3)} out of band`);
}

test('blade anchors ride the sword for weapon trails', () => {
    const rig = createKnight({ isBoss: true });
    assert.ok(rig.bladeTip?.isObject3D, 'bladeTip anchor missing');
    assert.ok(rig.bladeBase?.isObject3D, 'bladeBase anchor missing');
    assert.ok(hasAncestor(rig.bladeTip, rig.sword) && hasAncestor(rig.bladeBase, rig.sword),
        'trail anchors must be parented inside the sword so they follow the blade');
    rig.root.updateMatrixWorld(true);
    const before = [worldOf(rig.bladeTip), worldOf(rig.bladeBase)];
    assert.ok(before[0].distanceTo(before[1]) > 0.6, 'tip and base must be a real blade-length apart');
    assert.ok(before[0].y < before[1].y, 'bladeTip must sit past bladeBase toward the point');
    rig.sword.rotation.z += 0.7;
    rig.root.updateMatrixWorld(true);
    const after = [worldOf(rig.bladeTip), worldOf(rig.bladeBase)];
    assert.ok(before[0].distanceTo(after[0]) > 0.2, 'bladeTip does not follow sword rotation');
    assert.ok(before[1].distanceTo(after[1]) > 0.02, 'bladeBase does not follow sword rotation');
});

test('idle holds a combat guard stance instead of a neutral stand', () => {
    const rig = createKnight();
    for (let f = 0; f < 30; f++) rig.pose('idle', f / 60, 1 / 60, {});
    assert.ok(Math.abs(rig.armL.rotation.x) > 0.25, 'shield arm must be raised in guard');
    assert.ok(Math.abs(rig.armR.rotation.x) > 0.15, 'sword arm must not hang neutral');
    assert.ok(Math.abs(rig.shield.rotation.y) > 0.2, 'shield must be turned across the body');
    const spread = worldOf(rig.footL).distanceTo(worldOf(rig.footR));
    assert.ok(spread > 0.2, 'guard stance must be staggered, not feet together');
    assertSoles(rig, 'idle guard');
});

test('roll tumbles forward and stays a compact tumble', () => {
    const rig = createKnight();
    settle(rig, 'idle', {}, 10);
    let minAnyY = Infinity;
    let minHip = Infinity;
    let maxHip = -Infinity;
    const path = [];
    for (let f = 0; f <= 48; f++) {
        const p = f / 48;
        rig.pose('roll', f / 60, 1 / 60, { progress: p });
        rig.root.updateMatrixWorld(true);
        for (const node of [rig.head, rig.body, rig.footL, rig.footR, rig.kneeL, rig.kneeR, rig.elbowL, rig.elbowR]) {
            const y = worldOf(node).y;
            assert.ok(Number.isFinite(y), `${node.name} NaN during roll`);
            minAnyY = Math.min(minAnyY, y);
        }
        minHip = Math.min(minHip, worldOf(rig.body).y);
        maxHip = Math.max(maxHip, worldOf(rig.body).y);
        path.push(worldOf(rig.head).z);
    }
    assert.ok(path[8] > path[1] + 0.2, `head must tumble toward +Z (f1 ${path[1].toFixed(2)} f8 ${path[8].toFixed(2)})`);
    assert.ok(minAnyY > -0.005, `roll dips below the floor (min y ${minAnyY.toFixed(3)})`);
    assert.ok(minHip > 0.45 && maxHip < 1.05, `roll hips must stay bounded (${minHip.toFixed(3)}..${maxHip.toFixed(3)})`);
    const span = Math.max(...path) - Math.min(...path);
    assert.ok(span < 1.6, `roll sweeps an oversized arc (${span.toFixed(2)})`);
    settle(rig, 'idle', {}, 20);
    assert.ok(Math.abs(rig.spin.rotation.x) < 1e-3, 'roll leaves stale pitch on spin');
});

test('every new state and attack type stays finite and grounded', () => {
    const STATES = {
        backstep: { progress: 1 },
        knockdown: { progress: 1 },
        stanceBreak: { progress: 1 },
        roar: { progress: 1 },
        heal: { progress: 1 },
        stagger: { progress: 1 },
        guardbroken: { progress: 1 },
        block: {},
        parry: { progress: 1 },
        victory: {},
        dead: { progress: 1 },
    };
    for (const isBoss of [false, true]) {
        for (const [state, opts] of Object.entries(STATES)) {
            const rig = createKnight({ isBoss });
            settle(rig, state, opts, 40);
            settle(rig, state, opts, 20);
            for (const node of [rig.body, rig.head, rig.footL, rig.footR, rig.bladeTip, rig.armR, rig.spin]) {
                const p = worldOf(node);
                assert.ok([p.x, p.y, p.z].every(Number.isFinite), `${state} (boss=${isBoss}) produced a non-finite transform`);
            }
            for (const node of [rig.body, rig.head, rig.footL, rig.footR]) {
                assert.ok(worldOf(node).y > -0.02, `${state} (boss=${isBoss}) sinks a body part through the floor`);
            }
            assertSoles(rig, `${state} (boss=${isBoss})`);
        }
        for (const type of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
            const rig = createKnight({ isBoss });
            settle(rig, 'attack', { attackType: type, windup: 1, progress: 0, recover: 0 }, 24);
            settle(rig, 'attack', { attackType: type, windup: 0, progress: 0.55, recover: 0 }, 24);
            settle(rig, 'attack', { attackType: type, windup: 0, progress: 1, recover: 1 }, 40);
            for (const node of [rig.body, rig.head, rig.armR, rig.sword, rig.bladeTip, rig.shield]) {
                const p = worldOf(node);
                assert.ok([p.x, p.y, p.z].every(Number.isFinite), `attack type ${type} (boss=${isBoss}) non-finite`);
            }
            assertSoles(rig, `attack type ${type} (boss=${isBoss})`);
        }
    }
});

test('spin slash yaws a full turn and every other state resets the yaw', () => {
    const rig = createKnight();
    const yaw = [];
    for (let f = 0; f <= 30; f++) {
        rig.pose('attack', f / 60, 1 / 60, { attackType: 5, windup: 0, progress: f / 30, recover: 0 });
        yaw.push(rig.spin.rotation.y);
    }
    const turn = Math.min(...yaw);
    assert.ok(turn < -Math.PI * 1.9, `spin slash must turn most of a full circle (min ${turn.toFixed(2)})`);
    settle(rig, 'attack', { attackType: 5, windup: 0, progress: 1, recover: 1 }, 40);
    assert.ok(Math.abs(rig.spin.rotation.y) < 1e-3, `spin yaw must reset (${rig.spin.rotation.y.toFixed(3)})`);
    for (const [state, opts] of [['idle', {}], ['roll', { progress: 0.5 }], ['backstep', { progress: 0.5 }], ['knockdown', { progress: 0.5 }], ['roar', { progress: 0.5 }]]) {
        settle(rig, state, opts, 30);
        assert.ok(Math.abs(rig.spin.rotation.y) < 1e-3, `${state} inherited stale yaw`);
    }
    settle(rig, 'attack', { attackType: 1, windup: 0, progress: 0.5, recover: 0 }, 20);
    assert.ok(Math.abs(rig.spin.rotation.y) < 1e-3, 'non-spin attack types must not yaw the rig');
});

test('held delayed attacks stay chambered, load back and only tremble slowly', () => {
    const rig = createKnight();
    const held = (hold, frames = 40) => {
        let prev = null;
        let maxDelta = 0;
        for (let f = 0; f < frames; f++) {
            rig.pose('attack', f / 60, 1 / 60, { attackType: 2, hold, progress: 0, recover: 0 });
            if (prev !== null) maxDelta = Math.max(maxDelta, Math.abs(rig.armR.rotation.x - prev));
            prev = rig.armR.rotation.x;
        }
        rig.root.updateMatrixWorld(true);
        return {
            armX: rig.armR.rotation.x,
            tipY: worldOf(rig.bladeTip).y,
            tipZ: worldOf(rig.bladeTip).z,
            bodyZ: rig.body.position.z,
            maxDelta,
        };
    };
    const short = held(0.02);
    const long = held(2.0);
    assert.ok(short.armX < -2.2, `delayed attack must sit fully chambered (arm ${short.armX.toFixed(2)})`);
    assert.ok(Math.abs(long.armX - short.armX) < 0.35, 'hold must keep the chamber, not drift out of it');
    assert.ok(long.tipY > 1.2, `chambered blade stays overhead (tip ${long.tipY.toFixed(2)})`);
    assert.ok(long.tipZ < short.tipZ - 0.02, `held blade drifts further back (${short.tipZ.toFixed(2)} -> ${long.tipZ.toFixed(2)})`);
    assert.ok(long.bodyZ < short.bodyZ, 'held attack keeps weight shifted back');
    assert.ok(long.maxDelta < 0.012, `hold tremble must be slow and small (${long.maxDelta.toFixed(4)}/frame)`);
});

test('knockdown lies low midway then stands back up', () => {
    const rig = createKnight({ isBoss: true });
    const at = (p) => {
        settle(rig, 'knockdown', { progress: p }, 30);
        return { hip: worldOf(rig.body).y, head: worldOf(rig.head).y, pitch: rig.spin.rotation.x };
    };
    const low = at(0.45);
    const end = at(1);
    assert.ok(low.hip < 0.35, `knockdown must lie low (hip ${low.hip.toFixed(2)})`);
    assert.ok(low.head < 0.6 && low.head > 0.02, `knockdown head must rest near the floor (${low.head.toFixed(2)})`);
    assert.ok(Math.abs(low.pitch) > 1.2, 'knockdown must pitch the body onto its back');
    assert.ok(end.hip > 0.55 && Math.abs(end.pitch) < 0.35, `knockdown must stand back up (hip ${end.hip.toFixed(2)}, pitch ${end.pitch.toFixed(2)})`);
    assert.ok(end.head > low.head + 0.6, 'head must rise on recovery');
});

test('heal drinks standing with the flask arm raised to the visor', () => {
    const rig = createKnight();
    const distance = (p) => {
        settle(rig, 'heal', { progress: p, moveSpeed: 0 }, 30);
        return worldOf(rig.elbowR).distanceTo(worldOf(rig.visor));
    };
    const start = distance(0);
    const mid = distance(0.45);
    const end = distance(1);
    assert.ok(mid < start - 0.15, `heal must raise the flask arm toward the head (${start.toFixed(2)} -> ${mid.toFixed(2)})`);
    assert.ok(mid < end - 0.15, 'heal must lower the flask again at the end');
    const standingHip = (() => { settle(rig, 'idle', {}, 20); return worldOf(rig.body).y; })();
    settle(rig, 'heal', { progress: 0.45, moveSpeed: 0 }, 30);
    assert.ok(worldOf(rig.body).y > standingHip - 0.09, 'heal must stay standing, not kneel');
    // Walking heal drives the legs.
    let travel = 0;
    let prev = null;
    for (let f = 0; f < 120; f++) {
        rig.pose('heal', f / 60, 1 / 60, { progress: 0.5, moveSpeed: 2.2, moveZ: 1 });
        rig.root.updateMatrixWorld(true);
        const foot = worldOf(rig.footL);
        if (prev) travel += foot.distanceTo(prev);
        prev = foot.clone();
    }
    assert.ok(travel > 0.8, `walking heal must still stride (travel ${travel.toFixed(2)})`);
});

test('strafe cross-steps sideways while the torso keeps facing forward', () => {
    const rig = createKnight();
    let minX = Infinity;
    let maxX = -Infinity;
    let maxYaw = 0;
    for (let f = 0; f < 150; f++) {
        rig.pose('run', f / 60, 1 / 60, { moveSpeed: 2.4, moveX: 1, moveZ: 0 });
        rig.root.updateMatrixWorld(true);
        const l = worldOf(rig.footL);
        const r = worldOf(rig.footR);
        minX = Math.min(minX, l.x, r.x);
        maxX = Math.max(maxX, l.x, r.x);
        maxYaw = Math.max(maxYaw, Math.abs(rig.upper.rotation.y));
    }
    assert.ok(maxX - minX > 0.5, `strafe must stride laterally (span ${(maxX - minX).toFixed(2)})`);
    assert.ok(maxYaw < 0.2, `strafing torso must stay facing forward (yaw ${maxYaw.toFixed(2)})`);
});

test('gait flavours read as walk, jog and sprint', () => {
    const stride = (speed) => {
        const rig = createKnight();
        let reach = 0;
        let low = Infinity;
        let high = -Infinity;
        for (let f = 0; f < 180; f++) {
            rig.pose('run', f / 60, 1 / 60, { moveSpeed: speed, moveZ: 1 });
            rig.root.updateMatrixWorld(true);
            const l = worldOf(rig.footL);
            const r = worldOf(rig.footR);
            reach = Math.max(reach, Math.abs(l.z - r.z));
            low = Math.min(low, rig.body.position.y);
            high = Math.max(high, rig.body.position.y);
        }
        return { reach, bounce: high - low };
    };
    const walk = stride(2.0);
    const jog = stride(4.2);
    const sprint = stride(6.4);
    assert.ok(walk.reach < 0.38 && walk.bounce < 0.04, `walk must be short-stride and flat (${JSON.stringify(walk)})`);
    assert.ok(jog.reach > walk.reach && sprint.reach > jog.reach, 'stride must grow with speed');
    assert.ok(sprint.bounce > walk.bounce, 'sprint must carry more vertical travel than a walk');
});

test('leaping slam tucks its legs in the air and crouches into the floor', () => {
    const rig = createKnight();
    settle(rig, 'attack', { attackType: 4, windup: 1, progress: 0, recover: 0 }, 20);
    const crouch = rig.body.position.y;
    let maxHipAngle = 0;
    let footHigh = 0;
    let tipHigh = 0;
    for (let f = 0; f < 30; f++) {
        rig.pose('attack', f / 60, 1 / 60, { attackType: 4, windup: 0, progress: 0.02, air: f / 29, recover: 0 });
        rig.root.updateMatrixWorld(true);
        maxHipAngle = Math.max(maxHipAngle, Math.abs(rig.legL.rotation.x));
        footHigh = Math.max(footHigh, worldOf(rig.footL).y);
        tipHigh = Math.max(tipHigh, worldOf(rig.bladeTip).y);
        assert.ok(Number.isFinite(worldOf(rig.body).y), 'airborne leap produced NaN');
    }
    assert.ok(maxHipAngle < 1.6, 'airborne legs are tucked forward, not driven by the IK chain');
    assert.ok(footHigh > 0.25, `tucked feet must leave the floor (${footHigh.toFixed(2)})`);
    assert.ok(tipHigh > 1.6, `blade must sit overhead in the air (${tipHigh.toFixed(2)})`);
    let impact = Infinity;
    for (let f = 0; f <= 12; f++) {
        rig.pose('attack', 0.6, 1 / 60, { attackType: 4, windup: 0, progress: f / 12, recover: 0, air: 0 });
        impact = Math.min(impact, rig.body.position.y);
    }
    assert.ok(impact < crouch, `landing must crouch below the windup (${impact.toFixed(2)} vs ${crouch.toFixed(2)})`);
});

test('all-pairs crossfades avoid NaNs and foot teleports', () => {
    const PAIRS = {
        idle: {}, run: { moveSpeed: 2.4, moveZ: 1 }, attack: { attackType: 1, progress: 0.5 },
        backstep: { progress: 0.5 }, block: {}, parry: { progress: 0.5 }, stagger: { progress: 0.5 },
        guardbroken: { progress: 0.5 }, roar: { progress: 0.5 }, heal: { progress: 0.5 }, victory: {},
    };
    const TUCKED = { roll: { progress: 0.5 }, knockdown: { progress: 0.5 }, stanceBreak: { progress: 0.5 }, dead: { progress: 0.8 } };
    const rig = createKnight({ isBoss: true });
    let worst = 0;
    let worstPair = '';
    for (const [from, fromOpts] of Object.entries(PAIRS)) {
        for (const [to, toOpts] of Object.entries(PAIRS)) {
            if (from === to) continue;
            settle(rig, from, fromOpts, 30);
            const prevL = worldOf(rig.footL).clone();
            const prevR = worldOf(rig.footR).clone();
            for (let f = 0; f < 30; f++) {
                rig.pose(to, f / 60, 1 / 60, toOpts);
                const l = worldOf(rig.footL);
                const r = worldOf(rig.footR);
                assert.ok([l.x, l.y, l.z, r.x, r.y, r.z].every(Number.isFinite), `${from}->${to} produced NaN feet`);
                const jump = Math.max(l.distanceTo(prevL), r.distanceTo(prevR));
                if (jump > worst) { worst = jump; worstPair = `${from}->${to}@${f}`; }
                prevL.copy(l);
                prevR.copy(r);
            }
        }
    }
    assert.ok(worst < 0.30, `foot teleport during ${worstPair} (${worst.toFixed(3)})`);
    for (const [tucked, tuckOpts] of Object.entries(TUCKED)) {
        for (const [free, freeOpts] of Object.entries({ ...PAIRS, ...TUCKED })) {
            if (tucked === free) continue;
            const pairRig = createKnight();
            settle(pairRig, tucked, tuckOpts, 30);
            settle(pairRig, free, freeOpts, 30);
            for (const node of [pairRig.body, pairRig.head, pairRig.footL, pairRig.footR, pairRig.bladeTip]) {
                const p = worldOf(node);
                assert.ok([p.x, p.y, p.z].every(Number.isFinite), `${tucked}->${free} produced NaN on ${node.name}`);
            }
        }
    }
});

test('stance break kneels onto the floor and plants the blade', () => {
    const rig = createKnight();
    const standHip = (() => { settle(rig, 'idle', {}, 20); return worldOf(rig.body).y; })();
    settle(rig, 'stanceBreak', { progress: 0.5 }, 60);
    const hip = worldOf(rig.body).y;
    const knee = worldOf(rig.kneeR).y;
    const tip = worldOf(rig.bladeTip).y;
    const head = worldOf(rig.head).y;
    assert.ok(hip < standHip - 0.18, `stance break must drop onto a knee (hip ${hip.toFixed(2)})`);
    assert.ok(knee > -0.02 && knee < 0.2, `kneeling knee must reach the floor (${knee.toFixed(2)})`);
    assert.ok(tip > -0.06 && tip < 0.4, `blade tip must plant near the floor (${tip.toFixed(2)})`);
    assert.ok(head < 1.4, 'head must bow while broken');
    settle(rig, 'stanceBreak', { progress: 1 }, 40);
    assert.ok(worldOf(rig.body).y > hip + 0.15, 'stance break must recover to standing');
});

test('roar opens the chest and backstep hops clear', () => {
    const rig = createKnight();
    settle(rig, 'idle', {}, 20);
    const guardArm = rig.armL.rotation.z;
    settle(rig, 'roar', { progress: 0.5 }, 45);
    assert.ok(rig.armL.rotation.z > guardArm + 0.3, 'roar must fling the arms wide');
    assert.ok(rig.upper.rotation.x < 0.02, 'roar must open the chest, not hunch it');
    assertSoles(rig, 'roar');
    let hop = 0;
    for (let f = 0; f <= 18; f++) {
        rig.pose('backstep', f / 60, 1 / 60, { progress: f / 18 });
        hop = Math.max(hop, worldOf(rig.footL).y);
    }
    assert.ok(hop > 0.13, `backstep must lift a foot clear (${hop.toFixed(2)})`);
    settle(rig, 'backstep', { progress: 1 }, 60);
    assertSoles(rig, 'backstep recovery');
});

test('deaths settle onto the floor with the soles near the ground', () => {
    const rig = createKnight({ isBoss: true });
    let minY = Infinity;
    for (let f = 0; f <= 60; f++) {
        rig.pose('dead', f / 60, 1 / 60, { progress: f / 60 });
        rig.root.updateMatrixWorld(true);
        const head = worldOf(rig.head);
        const hip = worldOf(rig.body);
        assert.ok(Number.isFinite(head.y + hip.y), 'death produced NaN');
        minY = Math.min(minY, head.y, hip.y);
    }
    assert.ok(minY > 0.0, `death must not sink through the floor (${minY.toFixed(3)})`);
    assert.ok(worldOf(rig.head).y < 0.6, 'the fallen knight must end up on the floor');
    assertSoles(rig, 'dead');
});
