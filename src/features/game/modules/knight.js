/**
 * Souls-like Battle Game - Knight Rig
 * Procedural low-poly knight. Hierarchy:
 *   root → spin (roll/death) → body (bob) → legs + upper (lean/torso/arms)
 * Legs never inherit attack lean. All states crossfade via last-applied pose.
 */
import * as THREE from 'three';

const legH = 0.695;
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
    'stepLX', 'stepLY', 'stepLZ', 'stepRX', 'stepRY', 'stepRZ',
    'armRX', 'armRY', 'armRZ',
    'armLX', 'armLY', 'armLZ',
    'swordX', 'swordY', 'swordZ',
    'shieldX', 'shieldY', 'shieldZ',
    'blobOp',
];

// Free-chain states fold the legs directly; every other state is foot-IK grounded.
const FREE_KNEE = { roll: 0.55, heal: 1.55, dead: 0.28 };
const STEP_KEYS = ['stepLX', 'stepLY', 'stepLZ', 'stepRX', 'stepRY', 'stepRZ'];

function restPose() {
    return {
        spinX: 0, bodyY: legH, bodyX: 0,
        upperX: 0, upperY: 0, upperZ: 0,
        headX: 0, headY: 0, headZ: 0,
        legLX: 0, legRX: 0,
        stepLX: -0.012, stepLY: 0.09, stepLZ: 0.05,
        stepRX: 0.012, stepRY: 0.09, stepRZ: -0.05,
        armRX: 0, armRY: 0, armRZ: 0,
        armLX: 0, armLY: 0, armLZ: 0,
        swordX: 0, swordY: 0, swordZ: 0,
        shieldX: 0, shieldY: 0.15, shieldZ: 0,
        blobOp: 0.42,
    };
}

export function createKnight({ color = 0x4ade80, darkColor = 0x1a1d1f, scale = 1, isBoss = false } = {}) {
    // Per-rig resources are shared by matching parts, never by separately disposed rigs.
    const armorMat = new THREE.MeshStandardMaterial({ color: isBoss ? 0x48484b : 0x747d83, metalness: 0.72, roughness: 0.48, flatShading: true });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xa0a9ad, metalness: 0.8, roughness: 0.36, flatShading: true });
    const darkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(darkColor).lerp(new THREE.Color(0x28292b), 0.65), metalness: 0.28, roughness: 0.82 });
    const accent = new THREE.Color(color).lerp(new THREE.Color(0x4c5150), 0.65).multiplyScalar(0.7);
    const clothMat = new THREE.MeshLambertMaterial({ color: accent, side: THREE.DoubleSide });
    const visorMat = new THREE.MeshBasicMaterial({ color: isBoss ? 0xdf622c : 0x090b0d });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const round = new THREE.CylinderGeometry(1, 0.86, 1, 8);
    const plate = new THREE.CylinderGeometry(1, 0.78, 1, 6);
    const group = (name, parent, x = 0, y = 0, z = 0) => {
        const node = new THREE.Group();
        node.name = name;
        node.position.set(x, y, z);
        parent?.add(node);
        return node;
    };
    const mesh = (name, parent, geometry, material, dimensions, position = [0, 0, 0]) => {
        const node = new THREE.Mesh(geometry, material);
        node.name = name;
        node.scale.set(...dimensions);
        node.position.set(...position);
        node.castShadow = true;
        parent.add(node);
        return node;
    };
    const outline = (points, depth) => {
        const shape = new THREE.Shape();
        points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.008, bevelThickness: 0.008 });
        geometry.translate(0, 0, -depth / 2);
        return geometry;
    };

    const root = group('knight');
    const spin = group('spin', root);
    const body = group('hips', spin, 0, legH);
    const upper = group('upper', body);
    mesh('mail', upper, box, darkMat, [0.46, 0.52, 0.3], [0, 0.27, 0]);
    const torso = mesh('breastplate', upper, plate, armorMat, [isBoss ? 0.395 : 0.34, 0.5, isBoss ? 0.25 : 0.22], [0, 0.31, 0.012]);
    mesh('belt', upper, box, darkMat, [0.5, 0.085, 0.34], [0, 0.065, 0]);
    for (const side of [-1, 1]) {
        const tasset = mesh('tasset', upper, plate, armorMat, [0.13, 0.2, 0.15], [side * 0.19, -0.03, 0]);
        tasset.rotation.z = side * 0.12;
    }
    const tabard = group('tabard', upper, 0, 0.08, 0.195);
    mesh('tabard-upper', tabard, box, clothMat, [0.2, 0.22, 0.018], [0, -0.11, 0]);
    const tabardTip = group('tabard-tip', tabard, 0, -0.22, 0);
    mesh('tabard-hem', tabardTip, box, clothMat, [0.185, 0.22, 0.018], [0, -0.11, 0]);
    mesh('gorget', upper, round, edgeMat, [0.19, 0.08, 0.16], [0, 0.59, 0]);

    const head = group('head', upper, 0, torsoH + headH / 2 + 0.025);
    mesh('helmet', head, round, armorMat, [0.18, 0.31, 0.17]);
    const visor = mesh('visor', head, box, visorMat, [0.258, 0.032, 0.026], [0, 0.025, 0.156]);
    const plume = group('plume', head, 0, 0.16, -0.02);
    mesh('crest', plume, box, clothMat, [0.055, 0.105, 0.235], [0, 0.025, -0.035]);
    if (isBoss) {
        const hornGeometry = new THREE.ConeGeometry(0.065, 0.38, 5);
        for (const side of [-1, 1]) {
            const horn = mesh(`horn-${side}`, head, hornGeometry, edgeMat, [1, 1, 1], [side * 0.205, 0.19, -0.025]);
            horn.rotation.z = -side * 0.45;
            horn.rotation.x = -0.24;
        }
        const crownGeometry = outline([[-0.15, 0], [-0.15, 0.18], [-0.075, 0.10], [0, 0.25], [0.075, 0.10], [0.15, 0.18], [0.15, 0]], 0.035);
        mesh('crown', head, crownGeometry, armorMat, [1, 1, 1], [0, 0.10, 0.025]);
    }

    const limbs = {};
    for (const [side, sign] of [['L', -1], ['R', 1]]) {
        const leg = group(`hip-${side}`, body, sign * 0.155);
        leg.rotation.order = 'ZXY';
        mesh(`cuisses-${side}`, leg, plate, armorMat, [0.115, 0.28, 0.12], [0, -0.16, 0]);
        const knee = group(`knee-${side}`, leg, 0, -0.34, 0);
        mesh(`poleyn-${side}`, knee, round, edgeMat, [0.12, 0.12, 0.12], [0, -0.005, 0.025]);
        mesh(`greave-${side}`, knee, plate, armorMat, [0.095, 0.26, 0.10], [0, -0.17, 0]);
        const foot = group(`ankle-${side}`, knee, 0, -0.30, 0);
        foot.rotation.order = 'XZY';
        mesh(`sabatons-${side}`, foot, box, darkMat, [0.21, 0.14, 0.32], [0, -0.015, 0.075]);
        const arm = group(`shoulder-${side}`, upper, sign * (isBoss ? 0.415 : 0.36), 0.53, 0);
        mesh(`pauldron-${side}`, arm, plate, armorMat, [isBoss ? 0.235 : 0.19, isBoss ? 0.21 : 0.16, 0.18], [sign * 0.025, -0.035, 0]);
        mesh(`pauldron-lame-${side}`, arm, plate, edgeMat, [0.158, 0.095, 0.151], [sign * 0.025, -0.13, 0]);
        mesh(`rerebrace-${side}`, arm, round, darkMat, [0.09, 0.23, 0.10], [0, -0.17, 0]);
        const elbow = group(`elbow-${side}`, arm, 0, -0.29, 0);
        mesh(`couter-${side}`, elbow, round, edgeMat, [0.10, 0.105, 0.10]);
        mesh(`vambrace-${side}`, elbow, plate, armorMat, [0.094, 0.21, 0.10], [0, -0.12, 0]);
        mesh(`gauntlet-${side}`, elbow, box, darkMat, [0.15, 0.13, 0.15], [0, -0.255, 0]);
        limbs[`leg${side}`] = leg;
        limbs[`knee${side}`] = knee;
        limbs[`foot${side}`] = foot;
        limbs[`arm${side}`] = arm;
        limbs[`elbow${side}`] = elbow;
    }
    const { legL, legR, armR, armL, elbowR, elbowL } = limbs;
    const sword = group('sword', elbowR, 0, -0.27, 0);
    mesh('grip', sword, round, darkMat, [0.031, 0.15, 0.031], [0, 0.025, 0]);
    mesh('crossguard', sword, box, edgeMat, [0.27, 0.045, 0.075], [0, -0.055, 0]);
    mesh('pommel', sword, round, edgeMat, [0.042, 0.058, 0.04], [0, 0.125, 0]);
    const bladeGeometry = outline([[-0.042, -0.08], [-0.04, -0.70], [0, -0.94], [0.04, -0.70], [0.042, -0.08]], 0.023);
    const blade = mesh('blade', sword, bladeGeometry, edgeMat, [1, 1, 1]);
    mesh('blade-ridge', sword, box, armorMat, [0.014, 0.62, 0.034], [0, -0.4, 0]);

    const shield = group('shield', elbowL, -0.035, -0.14, 0.13);
    const shieldGeometry = outline([[-0.26, 0.22], [0, 0.31], [0.26, 0.22], [0.22, -0.06], [0, -0.43], [-0.22, -0.06]], 0.045);
    mesh('shield-rim', shield, shieldGeometry, edgeMat, [1, 1, 1]);
    mesh('shield-face', shield, shieldGeometry, clothMat, [0.90, 0.90, 1], [0, 0, 0.032]);
    const insignia = mesh('shield-insignia', shield, plate, edgeMat, [0.065, 0.30, 0.028], [0, 0.005, 0.068]);
    insignia.rotation.z = 0.15;

    const cape = group('cape', upper, 0, 0.52, -0.19);
    mesh('cape-upper', cape, box, clothMat, [0.49, 0.40, 0.018], [0, -0.20, -0.015]);
    const capeTip = group('cape-tip', cape, 0, -0.4, -0.015);
    mesh('cape-hem', capeTip, box, clothMat, [0.53, 0.40, 0.018], [0, -0.20, 0]);

    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
    const blob = mesh('contact-shadow', root, new THREE.CircleGeometry(0.49, 16), shadowMat, [1, 1, 1], [0, 0.018, 0]);
    blob.rotation.x = -Math.PI / 2;
    if (isBoss) blob.scale.set(1.3, 1.85, 1); // cover the wide heavy stance
    blob.castShadow = false;
    root.scale.setScalar(scale);
    // Heavier fighters compress deeper into swings and breathe slower.
    const weight = isBoss ? 1.35 : 1;
    const tempo = isBoss ? 0.82 : 1;

    const rig = {
        root, spin, body, upper, head, torso, sword, shield, blade, blob, plume, visor,
        ...limbs, cape, capeTip, tabard, tabardTip,
        _prevState: 'idle',
        _blend: 1,
        _legBlend: 1,
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
            tgt.bodyY = legH - 0.028 * w * weight;
            // Shield braces during windup
            tgt.armLX = lerp(0, -0.3, w);
            tgt.armLY = lerp(rest.armLY, 0.2, w);
            return;
        }

        // --- Active swing: chamber → follow-through (snaps early, settles late) ---
        const s = easeOut(clamp01(swingP));
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
        tgt.bodyY = legH - Math.sin(clamp01(swingP) * Math.PI) * 0.04 * weight;

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

    /** Fold the leg chain directly (rolls, kneels, corpses) with a level sole. */
    function poseLegChain(side, hip, knee) {
        limbs[`leg${side}`].rotation.set(hip, 0, 0);
        limbs[`knee${side}`].rotation.x = knee;
        limbs[`foot${side}`].rotation.set(-hip - knee, 0, 0);
    }

    let tgt = rig._tgt;
    let last = rig._last;
    let gaitPhase = 0;

    // Two-link IK keeps a support sole on the floor while the other knee lifts.
    function plantFoot(side) {
        const widen = isBoss ? 1 : 0;
        const dx = tgt[`step${side}X`] + (side === 'L' ? -0.03 : 0.03) * widen;
        const dz = tgt[`step${side}Z`] + (side === 'L' ? 0.042 : -0.042) * widen;
        const dy = tgt.bodyY - tgt[`step${side}Y`];
        const vertical = Math.hypot(dx, dy);
        const reach = Math.min(0.6395, Math.max(0.10, Math.hypot(vertical, dz)));
        const thigh = 0.34;
        const shin = 0.30;
        const knee = Math.PI - Math.acos(Math.max(-1, Math.min(1, (thigh * thigh + shin * shin - reach * reach) / (2 * thigh * shin))));
        const hip = -Math.atan2(dz, vertical) - Math.acos(Math.max(-1, Math.min(1, (thigh * thigh + reach * reach - shin * shin) / (2 * thigh * reach))));
        const lateral = Math.atan2(dx, dy);
        limbs[`leg${side}`].rotation.set(hip, 0, lateral);
        limbs[`knee${side}`].rotation.x = knee;
        limbs[`foot${side}`].rotation.set(-hip - knee, 0, -lateral);
    }

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
                gaitPhase = (gaitPhase + Math.max(0, dt) * (6.5 + speed * 1.4)) % (Math.PI * 2);
                const f = gaitPhase;
                const s = Math.sin(f);
                let moveX = opts.moveX || 0;
                let moveZ = opts.moveZ ?? (moveX ? 0 : 1);
                const magnitude = Math.hypot(moveX, moveZ) || 1;
                moveX /= magnitude;
                moveZ /= magnitude;
                const stride = (moveZ < 0 ? 0.19 : 0.26) * intensity;
                for (const [side, offset] of [['L', 0], ['R', 0.5]]) {
                    const phase = (f / (Math.PI * 2) + offset) % 1;
                    const swing = Math.max(0, (phase - 0.6) / 0.4);
                    const along = phase < 0.6 ? lerp(stride, -stride, phase / 0.6) : lerp(-stride, stride, easeInOut(swing));
                    tgt[`step${side}X`] = along * moveX;
                    tgt[`step${side}Z`] = along * moveZ;
                    tgt[`step${side}Y`] = 0.09 + Math.sin(swing * Math.PI) * 0.18 * intensity;
                }
                tgt.armRX = -0.5 - s * 0.24 * intensity * (moveZ < 0 ? -1 : 1);
                tgt.armLX = -0.38 + s * 0.13 * intensity * (moveZ < 0 ? -1 : 1);
                tgt.armRZ = -0.13;
                tgt.armLZ = 0.12;
                tgt.swordX = -0.42;
                tgt.bodyY = legH - 0.018 * intensity + Math.sin(f * 2) * 0.009 * intensity;
                tgt.upperX = (moveZ < 0 ? -0.09 : 0.12) * intensity + Math.sin(f * 2) * 0.02 * intensity;
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
                const wobble = Math.sin(clamp01(progress) * Math.PI * 2.6) * 0.085 * fade;
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
                tgt.bodyY = legH - 0.05 * fade * weight;
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
                tgt.bodyY = legH + hop * 0.055 * weight;
                tgt.upperX = -0.05;
                tgt.armLX = -0.35;
                tgt.legLX = 0.1;
                tgt.legRX = -0.1;
                tgt.headX = -0.18;
                break;
            }
            default: { // idle
                const b = Math.sin(t * 2.15 * tempo) * 0.028;
                const sway = Math.sin(t * 1.25 * tempo) * 0.05;
                const drift = Math.sin(t * 0.75 * tempo);
                const braced = isBoss ? 1 : 0;
                tgt.upperX = b * 0.55 + 0.2 * braced;
                tgt.bodyY = legH + Math.sin(t * 2.15 * tempo) * 0.016;
                tgt.armRX = 0.08 + b + sway * 0.45 - 0.34 * braced;
                tgt.armRZ = -0.05 + sway * 0.3 - 0.12 * braced;
                tgt.armLX = -0.06 - b - 0.38 * braced;
                tgt.armLZ = 0.04 + 0.18 * braced;
                tgt.headY = drift * 0.1;
                tgt.headX = Math.sin(t * 1.6) * 0.03 + 0.06 * braced;
                tgt.swordZ = sway * 0.4;
                tgt.swordX = 0.32 * braced;
                tgt.legLX = 0.03;
                tgt.legRX = -0.03;
                tgt.shieldY = 0.15;
                break;
            }
        }

        // Heavy fighters settle deeper into the ground in every grounded state.
        if (isBoss && state !== 'roll' && state !== 'dead' && state !== 'heal') tgt.bodyY -= 0.075;

        // Crossfade from last applied pose on soft transitions
        if (state !== rig._prevState) {
            const hard = HARD_STATES.has(state) || HARD_STATES.has(rig._prevState);
            rig._prevState = state;
            rig._blend = hard ? 1 : 0;
            if (hard) rig._legBlend = 0;
        }

        if (rig._blend < 1) {
            rig._blend = Math.min(1, rig._blend + dt / 0.1);
            const b = easeInOut(rig._blend);
            for (let i = 0; i < POSE_KEYS.length; i++) {
                const k = POSE_KEYS[i];
                tgt[k] = lerp(last[k], tgt[k], b);
            }
        }

        // Feet glide into a new stance even when the pose itself snaps hard.
        if (rig._legBlend < 1) {
            rig._legBlend = Math.min(1, rig._legBlend + dt / 0.12);
            const b = easeOut(rig._legBlend);
            for (let i = 0; i < STEP_KEYS.length; i++) {
                const k = STEP_KEYS[i];
                tgt[k] = lerp(last[k], tgt[k], b);
            }
        }

        // Apply to scene graph
        spin.rotation.x = tgt.spinX;
        body.position.y = tgt.bodyY;
        body.rotation.x = tgt.bodyX;
        upper.rotation.set(tgt.upperX, tgt.upperY, tgt.upperZ);
        head.rotation.set(tgt.headX, tgt.headY, tgt.headZ);
        // Legs: grounded states solve through the foot IK so soles stay planted
        // even when a stance leans; rolls, kneels and corpses fold the chain.
        const freeLegs = state === 'roll' || state === 'heal' || state === 'dead';
        if (freeLegs) {
            poseLegChain('L', tgt.legLX, FREE_KNEE[state]);
            poseLegChain('R', tgt.legRX, FREE_KNEE[state] * 0.82);
        } else {
            tgt.stepLZ += tgt.legLX * 0.42;
            tgt.stepRZ += tgt.legRX * 0.42;
            plantFoot('L');
            plantFoot('R');
        }
        armR.rotation.set(tgt.armRX, tgt.armRY, tgt.armRZ);
        armL.rotation.set(tgt.armLX, tgt.armLY, tgt.armLZ);
        sword.rotation.set(tgt.swordX, tgt.swordY, tgt.swordZ);
        shield.rotation.set(tgt.shieldX, tgt.shieldY, tgt.shieldZ);
        blob.material.opacity = tgt.blobOp;

        // Plume trails upper lean
        plume.rotation.x = -tgt.upperX * 0.5 + Math.sin(t * 4.2) * 0.04;
        plume.rotation.z = -tgt.upperZ * 0.7 + Math.sin(t * 3.1) * 0.03;

        // Cloth trails the torso instead of standing rigid
        capeTip.rotation.x = -tgt.upperX * 0.5 + Math.sin(t * 2.7) * 0.05 - (tgt.bodyY - legH) * 1.6;
        capeTip.rotation.z = -tgt.upperY * 0.55 + Math.sin(t * 2.2 + 1.1) * 0.045;
        tabardTip.rotation.x = tgt.upperX * 0.4 + Math.sin(t * 3.1 + 1.2) * 0.04 + (tgt.bodyY - legH) * 1.4;

        // Remember for next crossfade
        for (let i = 0; i < POSE_KEYS.length; i++) {
            const k = POSE_KEYS[i];
            last[k] = tgt[k];
        }
    };

    return rig;
}
