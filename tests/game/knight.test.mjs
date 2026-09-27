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
