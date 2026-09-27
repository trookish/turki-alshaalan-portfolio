/**
 * Souls-like Battle Game - Engine Module
 * Renderer, scene, camera rig, arena environment, lighting.
 * Kept deliberately cheap for mobile: Lambert materials, blob shadows,
 * no shadow maps, capped pixel ratio, fog to shorten draw distance.
 */
import * as THREE from 'three';

export const ARENA_RADIUS = 14;

/** Construct the environment without a canvas, DOM, or WebGL context. */
export function buildArena(scene, { isMobile = false, reducedMotion = false } = {}) {
    const group = new THREE.Group();
    group.name = 'ashen-cathedral';
    scene.add(group);
    const floor = new THREE.Mesh(
        new THREE.CylinderGeometry(ARENA_RADIUS + 0.35, ARENA_RADIUS + 0.65, 0.6, isMobile ? 64 : 96),
        new THREE.MeshLambertMaterial({ color: 0x293139 }),
    );
    floor.name = 'arena-foundation';
    floor.position.y = -0.32;
    floor.updateMatrix();
    group.add(floor);

    // All repeated masonry shares buffers and materials. No image textures or shadows.
    const stone = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const paleStone = new THREE.MeshLambertMaterial({ color: 0x78818a });
    const darkStone = new THREE.MeshLambertMaterial({ color: 0x414b56 });
    const bronze = new THREE.MeshLambertMaterial({ color: 0x9b8153, emissive: 0x37220d, emissiveIntensity: 0.18 });
    const mortar = new THREE.LineBasicMaterial({ color: 0x252c33, transparent: true, opacity: 0.66 });
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let seed = 173;
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    const mesh = (name, geometry, material, x = 0, y = 0, z = 0) => {
        const object = new THREE.Mesh(geometry, material);
        object.name = name;
        object.position.set(x, y, z);
        group.add(object);
        return object;
    };
    const batch = (name, geometry, material, placements, tint) => {
        const object = new THREE.InstancedMesh(geometry, material, placements.length);
        object.name = name;
        placements.forEach((p, i) => {
            dummy.position.set(p.x || 0, p.y || 0, p.z || 0);
            dummy.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
            dummy.scale.set(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
            dummy.updateMatrix();
            object.setMatrixAt(i, dummy.matrix);
            if (tint) object.setColorAt(i, color.set(tint).multiplyScalar(0.78 + random() * 0.38));
        });
        object.instanceMatrix.needsUpdate = true;
        if (object.instanceColor) object.instanceColor.needsUpdate = true;
        object.computeBoundingSphere();
        group.add(object);
        return object;
    };
    const ring = (name, inner, outer, material, y = 0.015) => mesh(name,
        new THREE.RingGeometry(inner, outer, isMobile ? 80 : 128).rotateX(-Math.PI / 2), material, 0, y);
    const box = new THREE.BoxGeometry(1, 1, 1);

    // Wedge-shaped flagstones leave real, dark radial grout lines between courses.
    const courses = [2.5, 4.5, 6.7, 9, 11.4, 13.7];
    for (let course = 0; course < courses.length - 1; course++) {
        const count = 24 + course * 8;
        const angle = Math.PI * 2 / count;
        const geometry = new THREE.RingGeometry(courses[course] + 0.025, courses[course + 1] - 0.025,
            3, 1, 0.003, angle - 0.006).rotateX(-Math.PI / 2);
        batch(`radial-paving-${course}`, geometry, stone,
            Array.from({ length: count }, (_, i) => ({ ry: i * angle + (course % 2) * angle / 2, y: 0.002 })),
            course % 2 ? 0x737b80 : 0x666f77);
    }
    mesh('sigil-stone', new THREE.CircleGeometry(2.48, 64).rotateX(-Math.PI / 2), darkStone, 0, 0.003);
    ring('sigil-outer-inlay', 2.35, 2.39, bronze);
    ring('sigil-inner-inlay', 1.62, 1.65, bronze);
    ring('processional-inlay', 8.95, 9.015, bronze);
    ring('perimeter-inlay', 13.68, 13.78, bronze);
    ring('raised-border', 13.8, 14.35, paleStone, -0.01);
    ring('outer-step', 14.36, 15.15, darkStone, -0.17);
    ring('ash-apron', 15.16, 17.5, darkStone, -0.36);

    // An eight-point pilgrim seal, deliberately worn rather than an emissive neon disc.
    const sigilVertices = [];
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const radius = i % 2 ? 1.7 : 2.23;
        const toPoint = (r, angle) => [Math.cos(angle) * r, 0.025, Math.sin(angle) * r];
        sigilVertices.push(...toPoint(0.45, a - 0.15), ...toPoint(radius, a), ...toPoint(0.45, a + 0.15));
        sigilVertices.push(...toPoint(0.45, a + 0.15), ...toPoint(radius, a), ...toPoint(0.77, a + 0.025));
    }
    const sigilGeometry = new THREE.BufferGeometry();
    sigilGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sigilVertices, 3));
    sigilGeometry.computeVertexNormals();
    // Reversed winding keeps this horizontal etching facing the overhead light.
    sigilGeometry.scale(1, 1, -1);
    mesh('central-sigil', sigilGeometry, bronze);

    const cracks = [];
    for (let i = 0; i < (isMobile ? 60 : 100); i++) {
        const a = random() * Math.PI * 2;
        const radius = 2.8 + random() * 10.5;
        let x = Math.cos(a) * radius;
        let z = Math.sin(a) * radius;
        for (let j = 0; j < 3; j++) {
            const nx = x + (random() - 0.5) * 0.48;
            const nz = z + (random() - 0.5) * 0.48;
            cracks.push(x, 0.012, z, nx, 0.012, nz);
            x = nx;
            z = nz;
        }
    }
    const crackGeometry = new THREE.BufferGeometry();
    crackGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cracks, 3));
    const crackLines = new THREE.LineSegments(crackGeometry, mortar);
    crackLines.name = 'weathered-cracks';
    group.add(crackLines);

    const edgeBlocks = [];
    const buttresses = [];
    const plinths = [];
    const capitals = [];
    const shafts = [];
    const archStones = [];
    const archAccents = [];
    for (let i = 0; i < 40; i++) {
        const a = i * Math.PI * 2 / 40;
        edgeBlocks.push({ x: Math.cos(a) * 14.55, z: Math.sin(a) * 14.55, y: -0.06,
            ry: -a, sx: 0.55, sy: 0.18, sz: 2.13 });
    }
    batch('perimeter-coping', box, stone, edgeBlocks, 0x7a7d79);

    // A roofless nave surrounds (never obstructs) the combat space. Broken alternation
    // and open bays also keep the bounded camera's eye clear of opaque walls.
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI * 2 / 12;
        const x = Math.cos(a) * 19;
        const z = Math.sin(a) * 19;
        const height = i % 3 === 0 ? 8.6 : 6.1 + random() * 1.9;
        buttresses.push({ x, z, y: height / 2 - 0.2, ry: -a, sx: 1.35, sy: height, sz: 1.55 });
        plinths.push({ x, z, y: 0.3, ry: -a, sx: 2.25, sy: 0.75, sz: 2.2 });
        capitals.push({ x, z, y: height - 0.16, ry: -a, sx: 1.64, sy: 0.35, sz: 1.8 });
        shafts.push({ x: x * 0.95, z: z * 0.95, y: height * 0.48, sy: height * 0.92 });
        // A stone ogive, assembled from shared voussoirs along a pointed curve.
        // Every fourth arch is fractured at its apex, exposing the night sky.
        const bayA = a + Math.PI / 12;
        const bx = Math.cos(bayA) * 18.7;
        const bz = Math.sin(bayA) * 18.7;
        const tangentX = -Math.sin(bayA);
        const tangentZ = Math.cos(bayA);
        for (const side of [-1, 1]) {
            for (let segment = 0; segment < 8; segment++) {
                if (i % 4 === 1 && segment > 4) continue;
                const t = (segment + 0.5) / 8;
                const offset = side * 4.15 * (1 - t * t);
                const rise = 5.7 + t * 4.3;
                const slope = side * -8.3 * t / 4.3;
                const p = { x: bx + tangentX * offset, z: bz + tangentZ * offset, y: rise,
                    ry: -bayA, rx: -Math.atan(slope), sx: 0.56, sy: 0.66, sz: 0.68 };
                archStones.push(p);
                archAccents.push({ ...p, x: p.x * 0.977, z: p.z * 0.977, sx: 0.17, sz: 0.27 });
            }
        }
    }
    batch('cathedral-buttresses', box, stone, buttresses, 0x67717b);
    batch('buttress-plinths', box, stone, plinths, 0x717981);
    batch('fractured-capitals', box, stone, capitals, 0x788089);
    batch('clustered-columns', new THREE.CylinderGeometry(0.25, 0.34, 1, 7), darkStone, shafts);
    batch('pointed-arches', box, stone, archStones, 0x7c8791);
    batch('arch-mouldings', box, paleStone, archAccents);

    const rubble = [];
    for (let i = 0; i < (isMobile ? 54 : 90); i++) {
        const a = random() * Math.PI * 2;
        const radius = 17.3 + random() * 5.8;
        const scale = 0.25 + random() * 0.68;
        rubble.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius, y: scale * 0.25 - 0.1,
            rx: random() * 0.7, ry: random() * Math.PI, rz: random() * 0.5,
            sx: scale * 1.65, sy: scale * 0.65, sz: scale });
    }
    batch('fallen-masonry', box, stone, rubble, 0x68747c);

    const farRuins = [];
    const mountains = [];
    for (let i = 0; i < 22; i++) {
        const a = i / 22 * Math.PI * 2;
        const radius = 37 + random() * 9;
        const height = 5 + random() * 15;
        farRuins.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius,
            y: height / 2 - 1, ry: -a, sx: 2 + random() * 2, sy: height, sz: 2.4 });
        mountains.push({ x: Math.cos(a + 0.11) * 64, z: Math.sin(a + 0.11) * 64,
            y: 4, ry: random() * Math.PI, sx: 10 + random() * 10, sy: 16 + random() * 14, sz: 13 });
    }
    batch('distant-ruined-spires', box, darkStone, farRuins);
    batch('mountain-silhouettes', new THREE.ConeGeometry(1, 1, 5),
        new THREE.MeshBasicMaterial({ color: 0x263341 }), mountains);

    scene.background = new THREE.Color(0x202e3e);
    scene.fog = new THREE.Fog(0x202e3e, 25, 92);
    group.add(new THREE.HemisphereLight(0xbacde4, 0x776553, 1.65));
    const moonlight = new THREE.DirectionalLight(0xd2e2ff, 2.05);
    moonlight.position.set(-12, 22, -9);
    group.add(moonlight);
    const warmRim = new THREE.DirectionalLight(0xe4ad78, 0.65);
    warmRim.position.set(8, 8, 12);
    group.add(warmRim);
    const moon = mesh('moon', new THREE.SphereGeometry(3.4, 20, 12),
        new THREE.MeshBasicMaterial({ color: 0xd5e0e5, fog: false }), -31, 33, -55);
    // A translucent shell supplies a restrained halo without bloom/postprocessing.
    mesh('moon-halo', new THREE.SphereGeometry(4.2, 16, 10),
        new THREE.MeshBasicMaterial({ color: 0x92abc6, transparent: true, opacity: 0.07, depthWrite: false, fog: false }),
        moon.position.x, moon.position.y, moon.position.z);

    const braziers = Array.from({ length: 6 }, (_, i) => {
        const a = i / 6 * Math.PI * 2 + Math.PI / 6;
        return { x: Math.cos(a) * 16.7, z: Math.sin(a) * 16.7, y: 0.64 };
    });
    const iron = new THREE.MeshLambertMaterial({ color: 0x393d43 });
    batch('brazier-feet', box, darkStone, braziers.map((p) => ({ ...p, y: 0.06, sx: 1.05, sy: 0.28, sz: 1.05 })));
    batch('brazier-stems', new THREE.CylinderGeometry(0.16, 0.28, 1.28, 8), iron, braziers);
    batch('brazier-bowls', new THREE.CylinderGeometry(0.59, 0.22, 0.35, 10), iron,
        braziers.map((p) => ({ ...p, y: 1.35 })));
    batch('brazier-rims', new THREE.TorusGeometry(0.56, 0.048, 4, 12).rotateX(-Math.PI / 2), bronze,
        braziers.map((p) => ({ ...p, y: 1.54 })));
    const fireGeometry = new THREE.ConeGeometry(0.3, 0.95, 5);
    fireGeometry.translate(0, 0.475, 0);
    const flamePlacements = braziers.map((p) => ({ ...p, y: 1.51 }));
    const flames = batch('brazier-flames', fireGeometry,
        new THREE.MeshBasicMaterial({ color: 0xffa346 }), flamePlacements);
    const cores = batch('brazier-fire-cores', fireGeometry,
        new THREE.MeshBasicMaterial({ color: 0xffdfa1 }),
        flamePlacements.map((p) => ({ ...p, sx: 0.62, sy: 0.7, sz: 0.62 })));
    flames.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const torches = [1, 4].map((index) => {
        const torch = new THREE.PointLight(0xffac5b, 17, 14, 1.5);
        torch.position.set(braziers[index].x, 2.2, braziers[index].z);
        group.add(torch);
        return torch;
    });

    const ashCount = isMobile ? 78 : 150;
    const emberCount = isMobile ? 36 : 60;
    const count = ashCount + emberCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const a = random() * Math.PI * 2;
        const r = Math.sqrt(random()) * 16;
        const base = i * 3;
        if (i < ashCount) {
            positions[base] = Math.cos(a) * r;
            positions[base + 1] = 0.15 + random() * 3.6;
            positions[base + 2] = Math.sin(a) * r;
            color.set(0xa8b4c1).multiplyScalar(0.55 + random() * 0.4);
        } else {
            const brazier = braziers[(i - ashCount) % braziers.length];
            positions[base] = brazier.x + (random() - 0.5) * 0.65;
            positions[base + 1] = 1.7 + random() * 2.1;
            positions[base + 2] = brazier.z + (random() - 0.5) * 0.65;
            color.set(0xffb564);
        }
        color.toArray(colors, base);
        phases[i] = random() * Math.PI * 2;
    }
    const basePositions = positions.slice();
    const ashGeometry = new THREE.BufferGeometry();
    const ashAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
    ashGeometry.setAttribute('position', ashAttribute);
    ashGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // Include the small animated drift in the culling bound once, not every frame.
    ashGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 20);
    const ash = new THREE.Points(ashGeometry, new THREE.PointsMaterial({
        vertexColors: true, size: 0.055, transparent: true, opacity: 0.63, depthWrite: false,
    }));
    ash.name = 'pooled-ash-and-embers';
    group.add(ash);

    let time = 0;
    function update(dt) {
        if (reducedMotion || !Number.isFinite(dt) || dt <= 0) return;
        time += Math.min(dt, 0.1);
        for (let i = 0; i < braziers.length; i++) {
            const p = flamePlacements[i];
            const sway = Math.sin(time * 4.8 + i * 1.9);
            dummy.position.set(p.x, p.y, p.z);
            dummy.rotation.set(0, time * 0.18 + i, sway * 0.075);
            dummy.scale.set(1 + sway * 0.08, 1 + Math.sin(time * 6.2 + i) * 0.15, 1);
            dummy.updateMatrix();
            flames.setMatrixAt(i, dummy.matrix);
            dummy.scale.multiplyScalar(0.65);
            dummy.updateMatrix();
            cores.setMatrixAt(i, dummy.matrix);
        }
        flames.instanceMatrix.needsUpdate = true;
        cores.instanceMatrix.needsUpdate = true;
        torches.forEach((torch, i) => { torch.intensity = 17 + Math.sin(time * 4.2 + i * 2.1) * 1.2; });
        for (let i = 0; i < count; i++) {
            const base = i * 3;
            const phase = phases[i];
            positions[base] = basePositions[base] + Math.sin(time * 0.22 + phase) * 0.24;
            positions[base + 2] = basePositions[base + 2] + Math.cos(time * 0.17 + phase) * 0.18;
            positions[base + 1] = i < ashCount
                ? basePositions[base + 1] + Math.sin(time * 0.26 + phase) * 0.1
                : 1.65 + ((basePositions[base + 1] - 1.65 + time * 0.52) % 2.4);
        }
        ashAttribute.needsUpdate = true;
    }
    group.updateMatrixWorld(true);
    return { group, update, setReducedMotion(value) { reducedMotion = Boolean(value); } };
}

// ---------- Camera solver (pure math; shared by the live rig and tests) ----------
const SOLVER_FOV = 55;
const FIGHTER_HALF = 0.95;
const FIGHTER_HEIGHT = 3.2;
const EYE_RADIUS_LIMIT = 15.15;     // float-safe budget inside the decorative masonry
const solverCamera = new THREE.PerspectiveCamera(SOLVER_FOV, 1, 0.12, 140);
const _solvePoint = new THREE.Vector3();
const _solveEye = new THREE.Vector3();
const _solveLook = new THREE.Vector3();
const _cornerScratch = [];

function fighterCorners(pos) {
    _cornerScratch.length = 0;
    for (const x of [-FIGHTER_HALF, FIGHTER_HALF]) {
        for (const z of [-FIGHTER_HALF, FIGHTER_HALF]) {
            for (const y of [0, FIGHTER_HEIGHT]) {
                _cornerScratch.push([pos.x + x, pos.y + y, pos.z + z]);
            }
        }
    }
    return _cornerScratch;
}

/** Worst normalized corner violation; every corner inside the frame scores < 1. */
function framingViolation(position, look, aspect, fighters) {
    solverCamera.aspect = aspect;
    solverCamera.updateProjectionMatrix();
    solverCamera.position.copy(position);
    solverCamera.lookAt(look);
    solverCamera.updateMatrixWorld(true);
    let worst = 0;
    for (const fighter of fighters) {
        for (const [x, y, z] of fighterCorners(fighter)) {
            _solvePoint.set(x, y, z).project(solverCamera);
            worst = Math.max(worst, Math.abs(_solvePoint.x) / 0.85, Math.abs(_solvePoint.y) / 0.83, Math.abs(_solvePoint.z));
        }
    }
    return worst;
}

/**
 * Aspect-aware camera targets that frame the fighters and keep the eye inside
 * the arena's masonry. Locked cameras look along the boss -> player axis so
 * camera-relative movement orientation never flips.
 */
export function solveCameraTargets({ playerPos, bossPos, aspect, locked = true, playerHeading = 0, hint = null }) {
    const safeAspect = Number.isFinite(aspect) && aspect > 0.1 ? aspect : 16 / 10;
    const back = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const fighters = [];
    let sep = 0;
    if (locked && bossPos) {
        back.set(playerPos.x - bossPos.x, 0, playerPos.z - bossPos.z);
        sep = back.length();
        if (sep < 1e-4) back.set(0, 0, 1); else back.divideScalar(sep);
        mid.set((playerPos.x + bossPos.x) / 2, playerPos.y, (playerPos.z + bossPos.z) / 2);
        fighters.push(playerPos, bossPos);
    } else {
        back.set(-Math.sin(playerHeading), 0, -Math.cos(playerHeading));
        mid.copy(playerPos);
        fighters.push(playerPos);
    }
    // The eye slides along `back` from the midpoint; the look target stays on the
    // same axis line, so (eye - look) keeps pointing boss -> player exactly.
    const dot = mid.x * back.x + mid.z * back.z;
    const span = dot * dot + EYE_RADIUS_LIMIT * EYE_RADIUS_LIMIT - (mid.x * mid.x + mid.z * mid.z);
    const sMax = Math.max(0.8, -dot + Math.sqrt(Math.max(0.25, span)));
    const wantedLook = Math.min(2.4, 0.18 * sep);
    const lookOffsets = [...new Set([0, wantedLook, Math.min(4, 0.38 * sep)])].sort((a, b) => a - b);
    const heights = [4.2, 5, 5.8, 6.8, 8, 9.6, 11.6, 14, 17, 21, 27, 34, 41];
    const spans = [3, 4, 5, 6.2, 7.5, 9, 10.5, 12, 13.5];
    const candidates = [];
    for (const h of heights) {
        for (const s of spans) {
            for (const lookOff of lookOffsets) {
                const sEff = Math.min(s, sMax);
                if (sEff <= lookOff + 0.8) continue;
                candidates.push({
                    h, s: sEff, lookOff,
                    cost: Math.abs(h - 5.8) + Math.abs(sEff - 6.2) + Math.abs(lookOff - wantedLook),
                });
            }
        }
    }
    if (hint && Number.isFinite(hint.h) && Number.isFinite(hint.s)) {
        candidates.push({ h: hint.h, s: Math.min(hint.s, sMax), lookOff: hint.lookOff || 0, cost: -1 });
    }
    candidates.sort((a, b) => a.cost - b.cost);
    let best = null;
    let bestViolation = Infinity;
    for (const candidate of candidates) {
        _solveEye.copy(mid).addScaledVector(back, candidate.s);
        _solveEye.y = Math.min(42, Math.max(4, playerPos.y + candidate.h));
        _solveLook.copy(mid).addScaledVector(back, candidate.lookOff);
        _solveLook.y = playerPos.y + 1.5;
        const violation = framingViolation(_solveEye, _solveLook, safeAspect, fighters);
        if (violation < 1) {
            return {
                position: _solveEye.clone(),
                look: _solveLook.clone(),
                hint: { h: candidate.h, s: candidate.s, lookOff: candidate.lookOff },
            };
        }
        if (violation < bestViolation) {
            bestViolation = violation;
            best = { h: candidate.h, s: candidate.s, lookOff: candidate.lookOff, eye: _solveEye.clone(), look: _solveLook.clone() };
        }
    }
    if (!best) {
        // Degenerate geometry: frame from above the midpoint rather than crash.
        return {
            position: new THREE.Vector3(mid.x, Math.min(42, Math.max(4, playerPos.y + 8)), mid.z),
            look: new THREE.Vector3(mid.x, playerPos.y + 1.5, mid.z),
            hint: null,
        };
    }
    return {
        position: best.eye,
        look: best.look,
        hint: { h: best.h, s: best.s, lookOff: best.lookOff },
    };
}

export function createEngine(canvas, isMobile) {
    // ---------- Renderer ----------
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile,
        powerPreference: 'high-performance',
        stencil: false,
    });
    const dprCap = isMobile ? 1.25 : 1.75;
    let dprScale = 1;
    const applyPixelRatio = () => {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap) * dprScale);
    };
    applyPixelRatio();
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ---------- Scene & atmosphere ----------
    const scene = new THREE.Scene();
    const reducedQuery = typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    let reducedMotion = reducedQuery ? reducedQuery.matches : false;
    const arena = buildArena(scene, { isMobile, reducedMotion });

    const camera = new THREE.PerspectiveCamera(SOLVER_FOV, 16 / 10, 0.12, 170);
    camera.position.set(0, 5.8, 8);

    // ---------- Camera rig ----------
    const camRig = {
        mode: 'lock', // 'lock' | 'free'
        pos: new THREE.Vector3(0, 5.8, 8),
        look: new THREE.Vector3(0, 1.5, 0),
        shakeX: 0,
        shakeY: 0,
        shakeZ: 0,
        _hint: null,
        _desiredPos: new THREE.Vector3(),
        _desiredLook: new THREE.Vector3(),
    };

    function updateCamera(dt, playerPos, playerHeading, bossPos, locked) {
        const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
        const stiffness = 1 - Math.pow(0.0015, safeDt); // frame-rate independent damping
        const solution = solveCameraTargets({
            playerPos,
            bossPos,
            aspect: camera.aspect,
            locked: Boolean(locked && bossPos),
            playerHeading,
            hint: camRig._hint,
        });
        camRig._hint = solution.hint;
        camRig._desiredPos.copy(solution.position);
        camRig._desiredLook.copy(solution.look);
        camRig.pos.lerp(camRig._desiredPos, stiffness);
        camRig.look.lerp(camRig._desiredLook, stiffness);

        const shakeScale = reducedMotion ? 0 : 1;
        const shakeX = camRig.shakeX * shakeScale;
        const shakeY = camRig.shakeY * shakeScale;
        const shakeZ = camRig.shakeZ * shakeScale;
        camera.position.set(camRig.pos.x + shakeX, camRig.pos.y + shakeY, camRig.pos.z + shakeZ);
        camera.lookAt(camRig.look.x + shakeX * 0.5, camRig.look.y + shakeY * 0.5, camRig.look.z);
    }

    // ---------- Resize ----------
    function resize() {
        const parent = canvas.parentElement;
        const w = (parent ? parent.clientWidth : canvas.clientWidth) || 1;
        const h = (parent ? parent.clientHeight : canvas.clientHeight) || 1;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
    }
    const onWindowResize = () => resize();
    const onMotionChange = (event) => {
        reducedMotion = Boolean(event.matches);
        arena.setReducedMotion(reducedMotion);
    };
    window.addEventListener('resize', onWindowResize);
    if (reducedQuery && reducedQuery.addEventListener) reducedQuery.addEventListener('change', onMotionChange);
    resize();

    // ---------- Adaptive resolution (hysteresis on sustained slow frames) ----------
    let slowFrames = 0;
    let fastFrames = 0;
    function updatePerformance(frameSeconds) {
        if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) return;
        const ms = frameSeconds * 1000;
        if (ms > 22) { slowFrames += 1; fastFrames = 0; }
        else if (ms < 12) { fastFrames += 1; slowFrames = 0; }
        else { slowFrames = 0; fastFrames = 0; }
        if (slowFrames >= 45 && dprScale > 0.7) {
            dprScale = Math.max(0.7, dprScale - 0.15);
            slowFrames = 0;
            applyPixelRatio();
            resize();
        } else if (fastFrames >= 240 && dprScale < 1) {
            dprScale = Math.min(1, dprScale + 0.1);
            fastFrames = 0;
            applyPixelRatio();
            resize();
        }
    }

    // ---------- Per-frame environment animation ----------
    function updateEnvironment(dt) {
        arena.update(dt);
    }

    function render() {
        renderer.render(scene, camera);
    }

    function getStats() {
        const info = renderer.info;
        return {
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            pixelRatio: renderer.getPixelRatio(),
        };
    }

    return {
        renderer, scene, camera,
        updateCamera, updateEnvironment, render, resize, camRig,
        getStats, updatePerformance, arena,
        dispose() {
            window.removeEventListener('resize', onWindowResize);
            if (reducedQuery && reducedQuery.removeEventListener) reducedQuery.removeEventListener('change', onMotionChange);
            const disposed = new Set();
            scene.traverse((object) => {
                if (object.geometry && !disposed.has(object.geometry)) {
                    disposed.add(object.geometry);
                    object.geometry.dispose();
                }
                const materials = Array.isArray(object.material) ? object.material : (object.material ? [object.material] : []);
                for (const material of materials) {
                    if (disposed.has(material)) continue;
                    disposed.add(material);
                    for (const value of Object.values(material)) {
                        if (value && value.isTexture && !disposed.has(value)) {
                            disposed.add(value);
                            value.dispose();
                        }
                    }
                    material.dispose();
                }
            });
            renderer.dispose();
        },
    };
}

/** Clamp a position vector to stay inside the arena. */
export function clampToArena(pos, radius = ARENA_RADIUS - 1.1) {
    const d = Math.hypot(pos.x, pos.z);
    if (d > radius) {
        const s = radius / d;
        pos.x *= s;
        pos.z *= s;
    }
}