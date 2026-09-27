import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import * as engineModule from '../../src/features/game/modules/engine.js';

const { ARENA_RADIUS } = engineModule;

function objectsIn(root, predicate) {
    const objects = [];
    root.traverse((object) => { if (predicate(object)) objects.push(object); });
    return objects;
}

test('arena builds without a DOM or WebGL and has a continuous playable floor', () => {
    assert.equal(typeof engineModule.buildArena, 'function');
    const scene = new THREE.Scene();
    const arena = engineModule.buildArena(scene, { isMobile: true });
    assert.ok(scene.children.includes(arena.group));
    const foundation = arena.group.getObjectByName('arena-foundation');
    assert.ok(foundation?.isMesh);
    foundation.geometry.computeBoundingBox();
    const box = foundation.geometry.boundingBox.clone().applyMatrix4(foundation.matrix);
    assert.ok(box.min.x <= -ARENA_RADIUS && box.max.x >= ARENA_RADIUS);
    assert.ok(box.min.z <= -ARENA_RADIUS && box.max.z >= ARENA_RADIUS);
    assert.ok(box.max.y <= 0.01, 'floor must not protrude through the fighters');
    assert.equal(ARENA_RADIUS, 14, 'combat and movement retain their existing radius');
});

test('cathedral stonework is instanced, finite, bounded, and outside the playable disc', () => {
    for (const isMobile of [true, false]) {
        const scene = new THREE.Scene();
        const { group } = engineModule.buildArena(scene, { isMobile });
        const instances = objectsIn(group, (object) => object.isInstancedMesh);
        assert.ok(instances.length >= 8, 'paving, trim, columns, arches, and rubble are batched');
        for (const name of ['radial-paving-0', 'cathedral-buttresses', 'pointed-arches', 'fallen-masonry', 'central-sigil']) {
            assert.ok(group.getObjectByName(name), `missing visual landmark: ${name}`);
        }
        const draws = objectsIn(group, (object) => object.isMesh || object.isLine || object.isPoints);
        assert.ok(draws.length <= 65, `${draws.length} draw objects exceeds the environment budget`);
        let triangles = 0;
        const matrix = new THREE.Matrix4();
        const point = new THREE.Vector3();
        const checked = new Set();
        group.updateMatrixWorld(true);
        group.traverse((object) => {
            assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${object.name} has invalid transforms`);
            assert.equal(object.castShadow, false);
            if (!object.geometry) return;
            const positions = object.geometry.attributes.position;
            if (!checked.has(positions)) {
                assert.ok(positions.array.every(Number.isFinite), `${object.name} has invalid vertices`);
                checked.add(positions);
            }
            if (object.isMesh) triangles += (object.geometry.index?.count ?? positions.count) / 3 * (object.count ?? 1);
            for (let i = 0; i < (object.isInstancedMesh ? object.count : 1); i++) {
                if (object.isInstancedMesh) object.getMatrixAt(i, matrix);
                else matrix.identity();
                matrix.premultiply(object.matrixWorld);
                assert.ok(matrix.elements.every(Number.isFinite), `${object.name} instance ${i} is invalid`);
                // Actual opaque stone geometry, not just a hand-maintained collider tag.
                if (!object.isMesh) continue;
                for (let v = 0; v < positions.count; v++) {
                    point.fromBufferAttribute(positions, v).applyMatrix4(matrix);
                    if (point.y > 0.3) {
                        assert.ok(Math.hypot(point.x, point.z) > ARENA_RADIUS - 1.1,
                            `${object.name} is a visible obstacle inside the traversable disc`);
                    }
                }
            }
        });
        assert.ok(triangles <= (isMobile ? 65000 : 95000), `${triangles} triangles exceeds the arena budget`);
    }
});

test('moonlit atmosphere batches ash and embers and freezes motion on request', () => {
    for (const isMobile of [true, false]) {
        const scene = new THREE.Scene();
        const arena = engineModule.buildArena(scene, { isMobile });
        assert.equal(typeof arena.update, 'function');
        assert.equal(typeof arena.setReducedMotion, 'function');
        assert.ok(scene.background.isColor && scene.background.b > scene.background.r);
        assert.ok(scene.background.b > 0.015, 'the fog horizon must not be pitch black');
        assert.ok(scene.fog.far > 60);
        const lights = objectsIn(scene, (o) => o.isPointLight);
        assert.ok(lights.length >= 1 && lights.length <= 2);
        assert.ok(lights.every((light) => !light.castShadow));
        assert.ok(objectsIn(scene, (o) => o.isHemisphereLight).length > 0, 'steel silhouettes need readable ambient fill');
        assert.ok(scene.getObjectByName('moon'));
        assert.ok(scene.getObjectByName('brazier-flames')?.isInstancedMesh);
        const points = objectsIn(scene, (o) => o.isPoints);
        assert.equal(points.length, 1, 'all drifting ash and embers share one draw');
        const attribute = points[0].geometry.attributes.position;
        const initial = attribute.array.slice();
        for (let i = 0; i < 20; i++) arena.update(1 / 60);
        assert.notDeepEqual(attribute.array, initial);
        assert.equal(points[0].geometry.attributes.position, attribute, 'animation must not replace buffers');
        arena.setReducedMotion(true);
        const frozen = attribute.array.slice();
        const flames = scene.getObjectByName('brazier-flames').instanceMatrix.array.slice();
        for (let i = 0; i < 30; i++) arena.update(1 / 60);
        assert.deepEqual(attribute.array, frozen);
        assert.deepEqual(scene.getObjectByName('brazier-flames').instanceMatrix.array, flames);
        arena.setReducedMotion(false);
        for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1 / 30]) arena.update(dt);
        assert.ok(attribute.array.every(Number.isFinite));
    }
});

function assertFightersFramed(solution, aspect, fighters) {
    const camera = new THREE.PerspectiveCamera(55, aspect, 0.12, 140);
    camera.position.copy(solution.position);
    camera.lookAt(solution.look);
    camera.updateMatrixWorld(true);
    for (const fighter of fighters) {
        for (const x of [-0.95, 0.95]) for (const z of [-0.95, 0.95]) for (const y of [0, 3.2]) {
            const projected = new THREE.Vector3(fighter.x + x, fighter.y + y, fighter.z + z).project(camera);
            assert.ok(Math.abs(projected.x) < 0.86 && Math.abs(projected.y) < 0.84
                && projected.z > -1 && projected.z < 1,
            `fighter clipped at aspect ${aspect}: ${projected.toArray()}`);
        }
    }
}

test('locked camera frames both full fighters in portrait and landscape without entering masonry', () => {
    assert.equal(typeof engineModule.solveCameraTargets, 'function');
    const cases = [
        [[0, 0, 3], [0, 0, -3]],
        [[0, 0, 0], [0, 0, 0]],
        [[0, 0, 12.8], [0, 0, 9.8]],
        [[12.5, 0, 0], [-12.5, 0, 0]],
        [[-9, 0, 9], [9, 0, -9]],
        [[-10.8, 0, -6.5], [-9.5, 0, -7]],
    ];
    for (const aspect of [0.36, 390 / 844, 1, 16 / 9, 21 / 9]) {
        for (const coordinates of cases) {
            const [playerPos, bossPos] = coordinates.map((v) => new THREE.Vector3(...v));
            const solution = engineModule.solveCameraTargets({ playerPos, bossPos, aspect, locked: true });
            assert.ok(solution.position.toArray().every(Number.isFinite));
            assert.ok(Math.hypot(solution.position.x, solution.position.z) <= 15.2,
                'camera eye must stay inside the decorative masonry');
            assert.ok(solution.position.y >= 4 && solution.position.y <= 42);
            assertFightersFramed(solution, aspect, [playerPos, bossPos]);
            const back = solution.position.clone().sub(solution.look).setY(0).normalize();
            const expectedBack = playerPos.clone().sub(bossPos).setY(0);
            if (expectedBack.lengthSq() > 0.001) assert.ok(back.dot(expectedBack.normalize()) > 0.999,
                'locked movement orientation must still follow boss -> player');
        }
    }
});
