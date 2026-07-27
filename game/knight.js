/**
 * Souls-like Battle Game - Knight Rig
 * Both characters (green player knight, red boss knight) share this
 * low-poly procedural rig. All animation is code-driven: walk cycles,
 * 3-hit combo swings, dodge rolls, blocks, parries, staggers, deaths.
 * No skinned meshes / no external assets -> fast on mobile.
 */
import * as THREE from './three.module.min.js?v=1';

const legH = 0.72;
const torsoH = 0.62;
const headH = 0.3;

export function createKnight({ color = 0x4ade80, darkColor = 0x1a1d1f, scale = 1 } = {}) {
    const armorMat = new THREE.MeshLambertMaterial({ color });
    const darkMat = new THREE.MeshLambertMaterial({ color: darkColor });
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xc9d1d3, emissive: 0x555555, emissiveIntensity: 0.25 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x0b0f0c });

    const root = new THREE.Group();      // at ground level
    const body = new THREE.Group();      // bobs/rolls
    body.position.y = legH;
    root.add(body);

    // Legs (pivot at hip)
    const legGeo = new THREE.BoxGeometry(0.2, legH, 0.24);
    legGeo.translate(0, -legH / 2, 0);
    const legL = new THREE.Mesh(legGeo, darkMat);
    legL.position.set(-0.14, 0, 0);
    const legR = new THREE.Mesh(legGeo, darkMat);
    legR.position.set(0.14, 0, 0);
    body.add(legL, legR);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, torsoH, 0.34), armorMat);
    torso.position.y = torsoH / 2 + 0.02;
    body.add(torso);

    // Belt skirt
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), darkMat);
    skirt.position.y = 0.02;
    body.add(skirt);

    // Head + visor
    const head = new THREE.Mesh(new THREE.BoxGeometry(headH, headH, headH), armorMat);
    head.position.y = torsoH + headH / 2 + 0.06;
    body.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(headH * 0.8, 0.06, 0.04), visorMat);
    visor.position.set(0, torsoH + headH / 2 + 0.06, headH / 2 + 0.01);
    body.add(visor);
    // Plume
    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.3), armorMat);
    plume.position.set(0, torsoH + headH + 0.12, -0.03);
    body.add(plume);

    // Right arm group (sword) - pivot at shoulder
    const armR = new THREE.Group();
    armR.position.set(0.36, torsoH - 0.06, 0);
    body.add(armR);
    const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), armorMat);
    armRMesh.position.y = -0.22;
    armR.add(armRMesh);
    // Sword: guard + blade, pointing down at rest
    const sword = new THREE.Group();
    sword.position.set(0, -0.46, 0);
    armR.add(sword);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.06), darkMat);
    sword.add(guard);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.03), bladeMat);
    blade.position.y = -0.5;
    sword.add(blade);

    // Left arm group (shield) - pivot at shoulder
    const armL = new THREE.Group();
    armL.position.set(-0.36, torsoH - 0.06, 0);
    body.add(armL);
    const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.16), armorMat);
    armLMesh.position.y = -0.2;
    armL.add(armLMesh);
    // Shield
    const shield = new THREE.Group();
    shield.position.set(-0.1, -0.4, 0.05);
    armL.add(shield);
    const shieldFace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.42), darkMat);
    shield.add(shieldFace);
    const shieldBoss = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.16), armorMat);
    shield.add(shieldBoss);

    // Blob shadow
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false });
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), shadowMat);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    root.add(blob);

    root.scale.setScalar(scale);

    const rig = {
        root, body, head, torso, armR, armL, sword, shield, blade, legL, legR, blob,
        // Live pose state, written by pose() and applied in applyPose()
        anim: { state: 'idle', t: 0, moveSpeed: 0, attackType: 0, progress: 0 },
        _euler: new THREE.Euler(),
    };

    /**
     * Drive the rig from a high level animation state.
     * state: idle|run|attack|roll|block|parry|stagger|guardbroken|heal|dead|victory
     * t: seconds in current state; progress: 0..1 normalized state progress
     * attackType: 0 slash L->R, 1 slash R->L, 2 overhead, 3 thrust
     */
    rig.pose = function pose(state, t, dt, opts = {}) {
        const speed = opts.moveSpeed || 0;
        const progress = opts.progress || 0;
        const attackType = opts.attackType || 0;
        const windup = opts.windup || 0; // 0..1 during attack windup (telegraph)

        // Reset to neutral base each frame (cheap, deterministic)
        body.position.y = legH;
        body.rotation.set(0, 0, 0);
        head.rotation.set(0, 0, 0);
        torso.rotation.set(0, 0, 0);
        legL.rotation.set(0, 0, 0);
        legR.rotation.set(0, 0, 0);
        armR.rotation.set(0, 0, 0);
        armL.rotation.set(0, 0, 0);
        sword.rotation.set(0, 0, 0);
        shield.rotation.set(0, 0, 0);
        blob.material.opacity = 0.42;

        switch (state) {
            case 'run': {
                const f = t * (7 + speed * 0.6);
                const s = Math.sin(f);
                legL.rotation.x = s * 0.85;
                legR.rotation.x = -s * 0.85;
                armR.rotation.x = -s * 0.5;
                armL.rotation.x = s * 0.5;
                body.position.y = legH + Math.abs(Math.cos(f)) * 0.06;
                body.rotation.x = 0.12;
                break;
            }
            case 'attack': {
                poseAttack(attackType, progress, windup);
                break;
            }
            case 'roll': {
                // Full body somersault around local X axis
                body.rotation.x = -Math.PI * 2 * easeOut(progress);
                body.position.y = legH * (1 - 0.35 * Math.sin(progress * Math.PI));
                legL.rotation.x = 1.6; legR.rotation.x = 1.6;
                armR.rotation.x = -0.6; armL.rotation.x = -0.6;
                blob.material.opacity = 0.42 * (1 - 0.5 * Math.sin(progress * Math.PI));
                break;
            }
            case 'block': {
                armL.rotation.set(-1.15, 0.35, 0);
                shield.rotation.set(0, 0.5, 0);
                body.rotation.x = 0.08;
                armR.rotation.set(-0.3, 0, -0.25);
                break;
            }
            case 'parry': {
                // Shield sweeps outward then returns
                const sweep = Math.sin(progress * Math.PI);
                armL.rotation.set(-0.9 - sweep * 0.6, 0.3 + sweep * 0.9, 0);
                body.rotation.y = sweep * 0.25;
                break;
            }
            case 'stagger':
            case 'guardbroken': {
                const wobble = Math.sin(t * 18) * 0.06 * (1 - progress);
                body.rotation.x = -0.35 - wobble;
                body.rotation.z = wobble * 2;
                head.rotation.x = -0.4;
                armR.rotation.z = -0.9;
                armL.rotation.z = 0.9;
                legL.rotation.x = 0.3; legR.rotation.x = -0.15;
                break;
            }
            case 'heal': {
                body.rotation.x = 0.15;
                legL.rotation.x = -1.9; legR.rotation.x = 0.5; // kneel-ish
                body.position.y = legH * 0.62;
                armR.rotation.set(-2.3, 0, 0); // hand to face
                break;
            }
            case 'dead': {
                const p = Math.min(1, progress * 1.4);
                body.rotation.x = -Math.PI / 2 * easeOut(p);
                body.position.y = legH * (1 - p * 0.75);
                blob.material.opacity = 0.42 * (1 - p * 0.6);
                break;
            }
            case 'victory': {
                armR.rotation.set(Math.PI - 0.3, 0, 0);
                sword.rotation.x = 0.4;
                body.position.y = legH + Math.abs(Math.sin(t * 3)) * 0.05;
                break;
            }
            default: { // idle breathing
                const b = Math.sin(t * 2.2) * 0.02;
                torso.rotation.x = b;
                armR.rotation.x = 0.06 + b;
                armL.rotation.x = -0.04 - b;
                body.position.y = legH + Math.sin(t * 2.2) * 0.012;
            }
        }
    };

    /** Attack poses: windup (telegraph) then fast swing then recover. */
    function poseAttack(type, progress, windup) {
        if (windup > 0) {
            // Telegraph: raise sword back, slow menacing lean
            const w = easeOut(windup);
            switch (type) {
                case 2: // overhead
                    armR.rotation.set(-2.4 * w, 0, -0.2 * w);
                    body.rotation.x = -0.15 * w;
                    break;
                case 3: // thrust
                    armR.rotation.set(-1.5 * w, 0.5 * w, 0);
                    sword.rotation.x = 1.35 * w;
                    body.rotation.y = 0.5 * w;
                    break;
                case 1: // R->L
                    armR.rotation.set(-1.3 * w, -1.2 * w, 0);
                    sword.rotation.z = 1.35 * w;
                    body.rotation.y = -0.6 * w;
                    break;
                default: // L->R
                    armR.rotation.set(-1.3 * w, 1.2 * w, 0);
                    sword.rotation.z = -1.35 * w;
                    body.rotation.y = 0.6 * w;
            }
            return;
        }
        // Active swing: progress 0..1 over the swing
        const s = easeInOut(progress);
        switch (type) {
            case 2: // overhead smash
                armR.rotation.set(-2.4 + s * 3.4, 0, -0.2 + s * 0.2);
                body.rotation.x = -0.15 + s * 0.5;
                break;
            case 3: // thrust forward
                armR.rotation.set(-1.5 - s * 0.2, 0.5 - s * 0.5, 0);
                sword.rotation.x = 1.5;
                body.rotation.y = 0.5 - s * 0.9;
                body.rotation.x = s * 0.25;
                break;
            case 1: // R->L horizontal
                armR.rotation.set(-1.3, -1.2 + s * 2.4, 0);
                sword.rotation.z = 1.35;
                body.rotation.y = -0.6 + s * 1.1;
                break;
            default: // L->R horizontal
                armR.rotation.set(-1.3, 1.2 - s * 2.4, 0);
                sword.rotation.z = -1.35;
                body.rotation.y = 0.6 - s * 1.1;
        }
    }

    function easeOut(x) { return 1 - (1 - x) * (1 - x); }
    function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

    return rig;
}
