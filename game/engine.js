/**
 * Souls-like Battle Game - Engine Module
 * Renderer, scene, camera rig, arena environment, lighting.
 * Kept deliberately cheap for mobile: Lambert materials, blob shadows,
 * no shadow maps, capped pixel ratio, fog to shorten draw distance.
 */
import * as THREE from './three.module.min.js?v=1';

export const ARENA_RADIUS = 14;

export function createEngine(canvas, isMobile) {
    // ---------- Renderer ----------
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile,
        powerPreference: 'high-performance',
        stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ---------- Scene & atmosphere ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090a);
    scene.fog = new THREE.Fog(0x07090a, 16, 34);

    const camera = new THREE.PerspectiveCamera(55, 16 / 10, 0.1, 60);
    camera.position.set(0, 4.5, 8);

    // ---------- Lighting ----------
    scene.add(new THREE.AmbientLight(0x8fa88f, 0.55));

    const moonLight = new THREE.DirectionalLight(0xbfd8c9, 1.1);
    moonLight.position.set(6, 12, 4);
    scene.add(moonLight);

    const rimLight = new THREE.DirectionalLight(0x4ade80, 0.35);
    rimLight.position.set(-8, 6, -6);
    scene.add(rimLight);

    // Torch point lights (few, shadowless)
    const torchColor = 0xff9a3c;
    const torches = [];
    for (let i = 0; i < 3; i++) {
        const t = new THREE.PointLight(torchColor, 12, 14, 1.8);
        const a = (i / 3) * Math.PI * 2 + 0.5;
        t.position.set(Math.cos(a) * (ARENA_RADIUS - 1.2), 2.6, Math.sin(a) * (ARENA_RADIUS - 1.2));
        scene.add(t);
        torches.push(t);
    }

    // ---------- Arena ----------
    const arena = new THREE.Group();
    scene.add(arena);

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x23282a });
    const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x181c1e });
    const accentMat = new THREE.MeshLambertMaterial({ color: 0x2a4a38, emissive: 0x1a3a2a, emissiveIntensity: 0.6 });

    // Floor
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS + 0.6, 0.5, 40), stoneMat);
    floor.position.y = -0.25;
    arena.add(floor);

    // Accent ring inlay on the floor
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ARENA_RADIUS * 0.62, 0.08, 6, 48), accentMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    arena.add(ring);

    // Outer wall blocks
    const wallGeo = new THREE.BoxGeometry(2.4, 1.6, 0.8);
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const block = new THREE.Mesh(wallGeo, i % 2 ? darkStoneMat : stoneMat);
        block.position.set(Math.cos(a) * (ARENA_RADIUS + 0.9), 0.8, Math.sin(a) * (ARENA_RADIUS + 0.9));
        block.rotation.y = -a + Math.PI / 2;
        arena.add(block);
    }

    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.45, 0.6, 5.4, 8);
    const capGeo = new THREE.BoxGeometry(1.4, 0.4, 1.4);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const px = Math.cos(a) * (ARENA_RADIUS - 2.2);
        const pz = Math.sin(a) * (ARENA_RADIUS - 2.2);
        const pillar = new THREE.Mesh(pillarGeo, darkStoneMat);
        pillar.position.set(px, 2.7, pz);
        arena.add(pillar);
        const cap = new THREE.Mesh(capGeo, stoneMat);
        cap.position.set(px, 5.6, pz);
        arena.add(cap);
    }

    // Torch flames (glowing boxes, flickered in update)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa64d });
    const flameGeo = new THREE.BoxGeometry(0.22, 0.34, 0.22);
    const flames = torches.map((t) => {
        const f = new THREE.Mesh(flameGeo, flameMat);
        f.position.copy(t.position);
        arena.add(f);
        return f;
    });

    // Sky stars (cheap points)
    const starCount = isMobile ? 120 : 220;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * 20;
        starPos[i * 3] = Math.cos(a) * r;
        starPos[i * 3 + 1] = 6 + Math.random() * 26;
        starPos[i * 3 + 2] = Math.sin(a) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9fdfb8, size: 0.14, sizeAttenuation: true }));
    scene.add(stars);

    // ---------- Camera rig ----------
    const camRig = {
        mode: 'lock', // 'lock' | 'free'
        pos: new THREE.Vector3(0, 4.5, 8),
        look: new THREE.Vector3(0, 1.2, 0),
        shakeX: 0,
        shakeY: 0,
        shakeZ: 0,
        _desiredPos: new THREE.Vector3(),
        _desiredLook: new THREE.Vector3(),
    };

    const _tmpA = new THREE.Vector3();
    const _tmpB = new THREE.Vector3();

    /**
     * Locked-on camera: sits behind the player relative to the boss,
     * looking at a point biased toward the boss. Free camera: hovers
     * behind the player's current heading.
     */
    function updateCamera(dt, playerPos, playerHeading, bossPos, locked) {
        const stiffness = 1 - Math.pow(0.0015, dt); // frame-rate independent damping

        if (locked && bossPos) {
            _tmpA.subVectors(playerPos, bossPos); // boss -> player direction
            _tmpA.y = 0;
            if (_tmpA.lengthSq() < 0.0001) _tmpA.set(0, 0, 1);
            _tmpA.normalize();

            camRig._desiredPos.copy(playerPos).addScaledVector(_tmpA, 6.2);
            camRig._desiredPos.y = playerPos.y + 3.4;

            camRig._desiredLook.copy(playerPos).lerp(bossPos, 0.35);
            camRig._desiredLook.y = playerPos.y + 1.4;
        } else {
            _tmpB.set(-Math.sin(playerHeading), 0, -Math.cos(playerHeading));
            camRig._desiredPos.copy(playerPos).addScaledVector(_tmpB, 6.0);
            camRig._desiredPos.y = playerPos.y + 3.6;
            camRig._desiredLook.copy(playerPos);
            camRig._desiredLook.y = playerPos.y + 1.3;
        }

        camRig.pos.lerp(camRig._desiredPos, stiffness);
        camRig.look.lerp(camRig._desiredLook, stiffness);

        camera.position.set(camRig.pos.x + camRig.shakeX, camRig.pos.y + camRig.shakeY, camRig.pos.z + camRig.shakeZ);
        camera.lookAt(camRig.look.x + camRig.shakeX * 0.5, camRig.look.y + camRig.shakeY * 0.5, camRig.look.z);
    }

    // ---------- Resize ----------
    function resize() {
        const parent = canvas.parentElement;
        if (!parent) return;
        const w = parent.clientWidth;
        // Keep a cinematic 16:10 inside the container; on mobile leave
        // room for the touch controls below the canvas.
        const vhCap = window.innerHeight * (isMobile ? 0.5 : 0.62);
        const h = Math.max(220, Math.min(Math.round(w * 0.625), Math.round(vhCap)));
        renderer.setSize(w, h, false);
        canvas.style.width = '100%';
        canvas.style.height = h + 'px';
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    // ---------- Per-frame environment animation ----------
    let envT = 0;
    function updateEnvironment(dt) {
        envT += dt;
        for (let i = 0; i < flames.length; i++) {
            const f = flames[i];
            const s = 1 + Math.sin(envT * 11 + i * 2.1) * 0.18 + Math.sin(envT * 23 + i) * 0.08;
            f.scale.set(s, 1 + Math.sin(envT * 17 + i * 3.7) * 0.25, s);
            torches[i].intensity = 10 + Math.sin(envT * 13 + i * 1.7) * 2.5;
        }
        stars.rotation.y += dt * 0.004;
    }

    function render() {
        renderer.render(scene, camera);
    }

    return {
        renderer, scene, camera,
        updateCamera, updateEnvironment, render, resize, camRig,
        dispose() {
            window.removeEventListener('resize', resize);
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
