/**
 * Souls-like Battle Game - Knight Rig
 * Procedural low-poly knight. Hierarchy:
 *   root → spin (roll/death) → body (bob) → legs + upper (lean/torso/arms)
 * Legs never inherit attack lean. All states crossfade via last-applied pose.
 */
import * as THREE from 'three';

const legH = 0.72;
const torsoH = 0.62;
const headH = 0.3;

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function easeOut(x) { return 1 - (1 - x) * (1 - x); }
function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function lerp(a, b, t) { return a + (b - a) * t; }

// States that snap (gameplay readability) instead of crossfading
const HARD_STATES = new Set(['attack', 'roll', 'dead', 'parry', 'guardbroken']);

const POSE_KEYS = [
    'spinX', 'bodyY', 'bodyX',
    'upperX', 'upperY', 'upperZ',
    'headX', 'headY', 'headZ',
    'legLX', 'legRX',
    'armRX', 'armRY', 'armRZ',
    'armLX', 'armLY', 'armLZ',
    'swordX', 'swordY', 'swordZ',
    'shieldX', 'shieldY', 'shieldZ',
    'blobOp',
];

function restPose() {
    return {
        spinX: 0, bodyY: legH, bodyX: 0,
        upperX: 0, upperY: 0, upperZ: 0,
        headX: 0, headY: 0, headZ: 0,
        legLX: 0, legRX: 0,
        armRX: 0, armRY: 0, armRZ: 0,
        armLX: 0, armLY: 0, armLZ: 0,
        swordX: 0, swordY: 0, swordZ: 0,
        shieldX: 0, shieldY: 0.15, shieldZ: 0,
        blobOp: 0.42,
    };
}

export function createKnight({ color = 0x4ade80, darkColor = 0x1a1d1f, scale = 1 } = {}) {
    const armorMat = new THREE.MeshLambertMaterial({ color });
    const darkMat = new THREE.MeshLambertMaterial({ color: darkColor });
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xc9d1d3, emissive: 0x555555, emissiveIntensity: 0.25 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x0b0f0c });

    const root = new THREE.Group();

    // Spin layer: full-body rolls / death fall
    const spin = new THREE.Group();
    root.add(spin);

    // Body layer: vertical bob only
    const body = new THREE.Group();
    body.position.y = legH;
    spin.add(body);

    // Legs (pivot at hip) — never inherit upper lean
    const legGeo = new THREE.BoxGeometry(0.2, legH, 0.24);
    legGeo.translate(0, -legH / 2, 0);
    const legL = new THREE.Mesh(legGeo, darkMat);
    legL.position.set(-0.14, 0, 0);
    const legR = new THREE.Mesh(legGeo, darkMat);
    legR.position.set(0.14, 0, 0);
    body.add(legL, legR);

    // Upper layer: torso lean/twist, head, arms, sword, shield
    const upper = new THREE.Group();
    body.add(upper);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, torsoH, 0.34), armorMat);
    torso.position.y = torsoH / 2 + 0.02;
    upper.add(torso);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), darkMat);
    skirt.position.y = 0.02;
    upper.add(skirt);

    const head = new THREE.Mesh(new THREE.BoxGeometry(headH, headH, headH), armorMat);
    head.position.y = torsoH + headH / 2 + 0.06;
    upper.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(headH * 0.8, 0.06, 0.04), visorMat);
    visor.position.set(0, torsoH + headH / 2 + 0.06, headH / 2 + 0.01);
    upper.add(visor);

    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.3), armorMat);
    plume.position.set(0, torsoH + headH + 0.12, -0.03);
    upper.add(plume);

    const armR = new THREE.Group();
    armR.position.set(0.36, torsoH - 0.06, 0);
    upper.add(armR);
    const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), armorMat);
    armRMesh.position.y = -0.22;
    armR.add(armRMesh);

    const sword = new THREE.Group();
    sword.position.set(0, -0.46, 0);
    armR.add(sword);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.06), darkMat);
    sword.add(guard);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.03), bladeMat);
    blade.position.y = -0.5;
    sword.add(blade);

    const armL = new THREE.Group();
    armL.position.set(-0.36, torsoH - 0.06, 0);
    upper.add(armL);
    const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.16), armorMat);
    armLMesh.position.y = -0.2;
    armL.add(armLMesh);

    const shield = new THREE.Group();
    shield.position.set(-0.1, -0.4, 0.05);
    armL.add(shield);
    const shieldFace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.42), darkMat);
    shield.add(shieldFace);
    const shieldBoss = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.16), armorMat);
    shield.add(shieldBoss);

    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false });
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), shadowMat);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    root.add(blob);

    root.scale.setScalar(scale);

    const rig = {
        root, spin, body, upper, head, torso, armR, armL, sword, shield, blade, legL, legR, blob, plume,
        _prevState: 'idle',
        _blend: 1,
        _tgt: restPose(),
        _last: restPose(),
    };

    /** Windup chamber = start of the swing (continuous into active). */
    function attackStartPose(type) {
        switch (type) {
            case 2: // overhead — both arms up, blade high
                return { armRX: -2.55, armRY: 0.1, armRZ: -0.15, swordX: 0, swordZ: 0, upperX: -0.18, upperY: 0, legLX: 0.1, legRX: -0.1 };
            case 3: // thrust chamber — sword cocked back at hip
                return { armRX: -1.25, armRY: 0.55, armRZ: 0.05, swordX: 1.4, swordZ: 0, upperX: 0.02, upperY: 0.55, legLX: 0.08, legRX: -0.12 };
            case 1: // R→L chamber
                return { armRX: -1.35, armRY: -1.25, armRZ: 0, swordX: 0, swordZ: 1.4, upperX: 0.04, upperY: -0.55, legLX: 0.08, legRX: -0.1 };
            default: // L→R chamber
                return { armRX: -1.35, armRY: 1.25, armRZ: 0, swordX: 0, swordZ: -1.4, upperX: 0.04, upperY: 0.55, legLX: 0.1, legRX: -0.08 };
        }
    }

    /** Peak follow-through of the active swing. */
    function attackEndPose(type) {
        switch (type) {
            case 2: // smash down
                return { armRX: 1.15, armRY: 0, armRZ: 0.12, swordX: 0, swordZ: 0, upperX: 0.38, upperY: 0, legLX: 0.28, legRX: -0.18 };
            case 3: // punch through
                return { armRX: -1.75, armRY: 0.05, armRZ: 0, swordX: 1.55, swordZ: 0, upperX: 0.24, upperY: -0.4, legLX: 0.32, legRX: -0.22 };
            case 1: // finish R→L
                return { armRX: -1.3, armRY: 1.3, armRZ: 0, swordX: 0, swordZ: 1.4, upperX: 0, upperY: 0.5, legLX: 0.14, legRX: -0.1 };
            default: // finish L→R
                return { armRX: -1.3, armRY: -1.3, armRZ: 0, swordX: 0, swordZ: -1.4, upperX: 0, upperY: -0.5, legLX: 0.14, legRX: -0.1 };
        }
    }

    function poseAttack(type, windup, swingP, recoverP) {
        const start = attackStartPose(type);
        const end = attackEndPose(type);
        const rest = restPose();

        // --- Windup: rest → chamber (end of windup === start of swing) ---
        if (windup > 0) {
            const w = easeOut(clamp01(windup));
            tgt.armRX = lerp(rest.armRX, start.armRX, w);
            tgt.armRY = lerp(rest.armRY, start.armRY, w);
            tgt.armRZ = lerp(rest.armRZ, start.armRZ, w);
            tgt.swordX = lerp(rest.swordX, start.swordX, w);
            tgt.swordZ = lerp(rest.swordZ, start.swordZ, w);
            tgt.upperX = lerp(0, start.upperX, w);
            tgt.upperY = lerp(0, start.upperY, w);
            tgt.legLX = lerp(0, start.legLX, w);
            tgt.legRX = lerp(0, start.legRX, w);
            tgt.bodyY = legH - 0.02 * w;
            // Shield braces during windup
            tgt.armLX = lerp(0, -0.3, w);
            tgt.armLY = lerp(rest.armLY, 0.2, w);
            return;
        }

        // --- Active swing: chamber → follow-through ---
        const s = easeInOut(clamp01(swingP));
        tgt.armRX = lerp(start.armRX, end.armRX, s);
        tgt.armRY = lerp(start.armRY, end.armRY, s);
        tgt.armRZ = lerp(start.armRZ, end.armRZ, s);
        tgt.swordX = lerp(start.swordX, end.swordX, s);
        tgt.swordZ = lerp(start.swordZ, end.swordZ, s);
        tgt.upperX = lerp(start.upperX, end.upperX, s);
        tgt.upperY = lerp(start.upperY, end.upperY, s);
        tgt.legLX = lerp(start.legLX, end.legLX, s);
        tgt.legRX = lerp(start.legRX, end.legRX, s);
        tgt.armLX = lerp(-0.3, -0.4, s);
        // Compress down into the slash, then release
        tgt.bodyY = legH - Math.sin(clamp01(swingP) * Math.PI) * 0.04;

        // --- Recovery: follow-through → ready guard → settle ---
        if (recoverP > 0) {
            const r = easeOutCubic(clamp01(recoverP));
            const ready = {
                armRX: -0.4, armRY: 0.2, armRZ: -0.15,
                swordX: 0.15, swordZ: 0,
                upperX: 0.05, upperY: 0,
                legLX: 0.06, legRX: -0.06,
            };
            tgt.armRX = lerp(end.armRX, ready.armRX, r);
            tgt.armRY = lerp(end.armRY, ready.armRY, r);
            tgt.armRZ = lerp(end.armRZ, ready.armRZ, r);
            tgt.swordX = lerp(end.swordX, ready.swordX, r);
            tgt.swordZ = lerp(end.swordZ, ready.swordZ, r);
            tgt.upperX = lerp(end.upperX, ready.upperX, r);
            tgt.upperY = lerp(end.upperY, ready.upperY, r);
            tgt.legLX = lerp(end.legLX, ready.legLX, r);
            tgt.legRX = lerp(end.legRX, ready.legRX, r);
            tgt.armLX = lerp(-0.4, -0.05, r);
            tgt.armLY = lerp(0.2, rest.armLY, r);
            tgt.bodyY = legH;
            // Tiny settle at the very end
            if (recoverP > 0.88) {
                tgt.bodyY -= (1 - recoverP) * 0.25;
            }
        }
    }

    let tgt = rig._tgt;
    let last = rig._last;

    /**
     * opts.windup 0..1 | opts.progress (swing) 0..1 | opts.recover 0..1
     * opts.moveSpeed for run | opts.progress for timed states
     */
    rig.pose = function pose(state, t, dt, opts = {}) {
        tgt = restPose();
        const speed = opts.moveSpeed || 0;
        const progress = opts.progress || 0;
        const recover = opts.recover || 0;
        const attackType = opts.attackType || 0;
        const windup = opts.windup || 0;

        switch (state) {
            case 'run': {
                const intensity = Math.min(1, speed / 4.6);
                const f = t * (8.2 + speed * 0.55);
                const s = Math.sin(f);
                const c = Math.cos(f);

                tgt.legLX = s * 0.95 * intensity;
                tgt.legRX = -s * 0.95 * intensity;
                tgt.armRX = -s * 0.72 * intensity;
                tgt.armLX = s * 0.72 * intensity;
                tgt.armRZ = -0.08 * intensity;
                tgt.armLZ = 0.08 * intensity;

                tgt.bodyY = legH + Math.abs(c) * 0.06 * intensity - 0.01 * intensity;
                tgt.upperX = 0.12 * intensity + Math.sin(f * 2) * 0.02 * intensity;
                tgt.upperY = s * 0.08 * intensity;
                tgt.upperZ = Math.sin(f) * 0.03 * intensity;
                tgt.headX = -0.05 * intensity;
                tgt.swordX = s * 0.12 * intensity;
                break;
            }
            case 'attack':
                poseAttack(attackType, windup, progress, recover);
                break;
            case 'roll': {
                const p = clamp01(progress);
                const spinAmt = easeOutCubic(p);
                const tuck = Math.sin(p * Math.PI);
                tgt.spinX = -Math.PI * 2 * spinAmt;
                tgt.bodyY = legH * (1 - 0.35 * tuck);
                tgt.legLX = 1.2 + tuck * 0.5;
                tgt.legRX = 1.2 + tuck * 0.5;
                tgt.armRX = -0.5 - tuck * 0.4;
                tgt.armLX = -0.5 - tuck * 0.4;
                tgt.upperX = 0.3 * tuck;
                tgt.headX = 0.3 * tuck;
                tgt.blobOp = 0.42 * (1 - 0.55 * tuck);
                if (p > 0.85) {
                    const land = (p - 0.85) / 0.15;
                    tgt.bodyY = legH - 0.045 * (1 - land) * (1 - land);
                    tgt.legLX *= 1 - land * 0.65;
                    tgt.legRX *= 1 - land * 0.65;
                }
                break;
            }
            case 'block': {
                const brace = Math.sin(t * 22) * 0.012;
                tgt.armLX = -1.2 + brace;
                tgt.armLY = 0.35;
                tgt.armLZ = 0.05;
                tgt.upperX = 0.08;
                tgt.armRX = -0.35;
                tgt.armRZ = -0.3;
                tgt.legLX = 0.14;
                tgt.legRX = -0.1;
                tgt.headX = -0.04;
                tgt.shieldY = 0.5;
                tgt.shieldZ = 0;
                break;
            }
            case 'parry': {
                const sweep = Math.sin(clamp01(progress) * Math.PI);
                tgt.armLX = -0.95 - sweep * 0.7;
                tgt.armLY = 0.3 + sweep * 1.1;
                tgt.upperY = sweep * 0.3;
                tgt.upperX = 0.06;
                tgt.armRX = -0.25;
                tgt.shieldY = 0.5 + sweep * 0.2;
                break;
            }
            case 'stagger':
            case 'guardbroken': {
                const fade = 1 - clamp01(progress);
                const wobble = Math.sin(t * 18) * 0.07 * fade;
                const deep = state === 'guardbroken' ? 1.15 : 1;
                tgt.upperX = (-0.3 - wobble) * deep;
                tgt.upperZ = wobble * 2.2;
                tgt.headX = -0.4 * deep;
                tgt.armRZ = -1.0 - wobble;
                tgt.armLZ = 1.0 + wobble;
                tgt.armRX = -0.25;
                tgt.armLX = -0.2;
                tgt.legLX = 0.38;
                tgt.legRX = -0.22;
                tgt.bodyY = legH - 0.05 * fade;
                break;
            }
            case 'heal': {
                const p = clamp01(progress);
                const kneel = p < 0.7 ? easeInOut(p / 0.7) : 1 - easeOut((p - 0.7) / 0.3);
                tgt.upperX = 0.2 * kneel;
                tgt.legLX = -2.05 * kneel;
                tgt.legRX = 0.6 * kneel;
                tgt.bodyY = legH * (1 - 0.42 * kneel);
                tgt.armRX = -2.4 * kneel;
                tgt.armRY = 0.3 * kneel;
                tgt.headX = -0.28 * kneel;
                if (p > 0.35 && p < 0.75) {
                    tgt.headX += Math.sin(t * 16) * 0.06;
                    tgt.armRX += Math.sin(t * 16) * 0.05;
                }
                break;
            }
            case 'dead': {
                const p = easeOutCubic(clamp01(progress * 1.15));
                const bounce = p > 0.85 ? Math.sin(((p - 0.85) / 0.15) * Math.PI) * 0.05 : 0;
                tgt.spinX = -Math.PI / 2 * p;
                tgt.bodyY = legH * (1 - p * 0.78) + bounce * 0.3;
                tgt.legLX = 0.35 * p;
                tgt.legRX = 0.22 * p;
                tgt.armRZ = -0.7 * p;
                tgt.armLZ = 0.55 * p;
                tgt.armRX = -0.45 * p;
                tgt.headX = 0.45 * p;
                tgt.blobOp = 0.42 * (1 - p * 0.55);
                break;
            }
            case 'victory': {
                const hop = Math.abs(Math.sin(t * 3.2));
                tgt.armRX = Math.PI - 0.3 + Math.sin(t * 3.2) * 0.12;
                tgt.armRZ = -0.18;
                tgt.swordX = 0.4;
                tgt.bodyY = legH + hop * 0.055;
                tgt.upperX = -0.05;
                tgt.armLX = -0.35;
                tgt.legLX = 0.1;
                tgt.legRX = -0.1;
                tgt.headX = -0.18;
                break;
            }
            default: { // idle
                const b = Math.sin(t * 2.15) * 0.028;
                const sway = Math.sin(t * 1.25) * 0.05;
                const drift = Math.sin(t * 0.75);
                tgt.upperX = b * 0.55;
                tgt.bodyY = legH + Math.sin(t * 2.15) * 0.016;
                tgt.armRX = 0.08 + b + sway * 0.45;
                tgt.armRZ = -0.05 + sway * 0.3;
                tgt.armLX = -0.06 - b;
                tgt.armLZ = 0.04;
                tgt.headY = drift * 0.1;
                tgt.headX = Math.sin(t * 1.6) * 0.03;
                tgt.swordZ = sway * 0.4;
                tgt.legLX = 0.03;
                tgt.legRX = -0.03;
                tgt.shieldY = 0.15;
                break;
            }
        }

        // Crossfade from last applied pose on soft transitions
        if (state !== rig._prevState) {
            const hard = HARD_STATES.has(state) || HARD_STATES.has(rig._prevState);
            rig._prevState = state;
            rig._blend = hard ? 1 : 0;
        }

        if (rig._blend < 1) {
            rig._blend = Math.min(1, rig._blend + dt / 0.1);
            const b = easeInOut(rig._blend);
            for (let i = 0; i < POSE_KEYS.length; i++) {
                const k = POSE_KEYS[i];
                tgt[k] = lerp(last[k], tgt[k], b);
            }
        }

        // Apply to scene graph
        spin.rotation.x = tgt.spinX;
        body.position.y = tgt.bodyY;
        body.rotation.x = tgt.bodyX;
        upper.rotation.set(tgt.upperX, tgt.upperY, tgt.upperZ);
        head.rotation.set(tgt.headX, tgt.headY, tgt.headZ);
        legL.rotation.x = tgt.legLX;
        legR.rotation.x = tgt.legRX;
        armR.rotation.set(tgt.armRX, tgt.armRY, tgt.armRZ);
        armL.rotation.set(tgt.armLX, tgt.armLY, tgt.armLZ);
        sword.rotation.set(tgt.swordX, tgt.swordY, tgt.swordZ);
        shield.rotation.set(tgt.shieldX, tgt.shieldY, tgt.shieldZ);
        blob.material.opacity = tgt.blobOp;

        // Plume trails upper lean
        plume.rotation.x = -tgt.upperX * 0.5 + Math.sin(t * 4.2) * 0.04;
        plume.rotation.z = -tgt.upperZ * 0.7 + Math.sin(t * 3.1) * 0.03;

        // Remember for next crossfade
        for (let i = 0; i < POSE_KEYS.length; i++) {
            const k = POSE_KEYS[i];
            last[k] = tgt[k];
        }
    };

    return rig;
}
