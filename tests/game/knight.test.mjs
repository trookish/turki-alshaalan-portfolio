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
