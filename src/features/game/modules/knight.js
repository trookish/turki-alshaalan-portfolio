/**
 * Souls-like Battle Game - Knight Rig
 * Procedural low-poly knight. Hierarchy:
 *   root → spin (somersault / spin-slash yaw) → body (hips) → legs + upper (torso/head/arms)
 *
 * Every state pose is rebuilt from `restPose()` (the combat-ready guard) so no channel leaks
 * between states. Legs run through a two-link foot IK while a state is grounded; tuck states
 * (roll, knockdown, kneel, leap, death) fold hip → knee → foot directly, and the two leg
 * solutions are blended so entering or leaving a tuck never teleports the feet.
 * Weight transfer comes from step targets and hip travel, not raw hip rotations.
 */
import * as THREE from 'three';

const legH = 0.695;      // hip height of a fully standing rig
const torsoH = 0.62;
const headH = 0.3;
const thigh = 0.34;
const shin = 0.30;
const ankleY = 0.09;     // resting ankle height (the IK target that puts a sole on the floor)
const maxReach = 0.6395;
const rollPivot = 0.78;  // somersault centre: near the middle of the tucked body so the tumble
                         // stays compact (hips orbit ~0.1 m, the head sweeps the ball radius)
const freeGlide = 0.13;  // seconds to fold the legs into / out of a direct chain

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function easeOut(x) { return 1 - (1 - x) * (1 - x); }
function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
function lerp(a, b, t) { return a + (b - a) * t; }
function approach(x, target, step) { return x < target ? Math.min(target, x + step) : Math.max(target, x - step); }

// States that snap the upper body into place (gameplay readability) instead of crossfading.
const HARD_STATES = new Set(['attack', 'roll', 'dead', 'parry', 'guardbroken', 'backstep', 'knockdown', 'stanceBreak', 'roar']);
// States that fold the leg chain directly instead of running the foot IK.
const TUCK_STATES = new Set(['roll', 'knockdown', 'stanceBreak', 'dead']);

const POSE_KEYS = [
    'spinX', 'spinY', 'pivot',
    'bodyX', 'bodyY', 'bodyZ', 'bodySide',
    'upperX', 'upperY', 'upperZ',
    'headX', 'headY', 'headZ',
    'legLX', 'legRX', 'kneeFL', 'kneeFR', 'ankleFL', 'ankleFR', 'freeLegs',
    'stepLX', 'stepLY', 'stepLZ', 'stepRX', 'stepRY', 'stepRZ',
    'armRX', 'armRY', 'armRZ',
    'armLX', 'armLY', 'armLZ',
    'swordX', 'swordY', 'swordZ',
    'shieldX', 'shieldY', 'shieldZ',
    'capeX', 'capeY', 'tabX', 'tabY',
    'blobOp',
];
const STEP_KEYS = ['stepLX', 'stepLY', 'stepLZ', 'stepRX', 'stepRY', 'stepRZ'];

/** Combat-ready guard stance (ER knight): shield half raised, sword low and ready. */
const GUARD = {
    spinX: 0, spinY: 0, pivot: 0,
    bodyX: 0, bodyY: legH - 0.02, bodyZ: 0, bodySide: 0,
    upperX: 0.06, upperY: 0.04, upperZ: 0,
    headX: -0.03, headY: 0, headZ: 0,
    legLX: 0, legRX: 0, kneeFL: 1.0, kneeFR: 1.0, ankleFL: 0, ankleFR: 0, freeLegs: 0,
    stepLX: -0.105, stepLY: ankleY, stepLZ: 0.105,
    stepRX: 0.105, stepRY: ankleY, stepRZ: -0.105,
    armRX: -0.34, armRY: 0.18, armRZ: -0.14,
    armLX: -0.54, armLY: 0.32, armLZ: 0.08,
    swordX: -0.34, swordY: 0, swordZ: 0.12,
    shieldX: -0.06, shieldY: 0.42, shieldZ: 0,
    capeX: 0, capeY: 0, tabX: 0, tabY: 0,
    blobOp: 0.42,
};

function restPose() { return { ...GUARD }; }

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
    // Weapon-trail anchors, children of the sword at the blade root and tip.
    const bladeBase = group('blade-base', sword, 0, -0.08, 0);
    const bladeTip = group('blade-tip', sword, 0, -0.94, 0);

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
    const widenX = isBoss ? 0.055 : 0;      // boss stance is wider
    const widenZ = isBoss ? 0.035 : 0;      // ...and staggered further front to back

    const rig = {
        root, spin, body, upper, head, torso, sword, shield, blade, blob, plume, visor,
        ...limbs, cape, capeTip, tabard, tabardTip, bladeTip, bladeBase,
        _prevState: 'idle',
        _blend: 1,
        _legBlend: 1,
        _freeAmt: 0,
        _spinX: 0,
        _spinY: 0,
        _tgt: restPose(),
        _last: restPose(),
    };

    // ---------------------------------------------------------------- pose helpers

    function mixKeys(a, b, k) {
        for (let i = 0; i < POSE_KEYS.length; i++) {
            const key = POSE_KEYS[i];
            tgt[key] = lerp(a[key] ?? GUARD[key] ?? 0, b[key] ?? GUARD[key] ?? 0, k);
        }
    }

    /** Attack keyframes: the chamber (windup end), the strike peak, the follow-through settle. */
    function attackDefs(type, charge) {
        const down = 0.05 * weight;
        switch (type) {
            case 1: // slash R→L: cocked out to the right, sweeps across to the left
                return {
                    impact: 0.62,
                    chamber: {
                        armRX: -1.42, armRY: 1.22, armRZ: -0.22, swordX: -0.5, swordZ: 0.6, swordY: -0.15,
                        upperX: 0.0, upperY: 0.56, upperZ: 0.05, headX: 0.02, headY: 0.24,
                        bodyY: legH - down, bodyZ: -0.055, bodySide: 0.02,
                        stepLX: -0.12, stepLZ: 0.1, stepRX: 0.12, stepRZ: -0.16, stepRY: 0.12,
                        armLX: -0.68, armLY: 0.36, shieldY: 0.46,
                    },
                    peak: {
                        armRX: -0.5, armRY: -1.28, armRZ: 0.16, swordX: 0.15, swordZ: -0.9, swordY: 0.12,
                        upperX: 0.2, upperY: -0.6, upperZ: -0.04, headX: 0.1, headY: -0.22,
                        bodyY: legH - 0.02, bodyZ: 0.12, bodySide: -0.01,
                        stepLX: -0.1, stepLZ: 0.26, stepRX: 0.1, stepRZ: -0.12,
                        armLX: -0.46, armLY: 0.22,
                    },
                    settle: {
                        armRX: -0.72, armRY: -1.0, armRZ: 0.05, swordX: -0.02, swordZ: -0.55,
                        upperX: 0.14, upperY: -0.36, upperZ: -0.02, headX: 0.05, headY: -0.12,
                        bodyY: legH - 0.03, bodyZ: 0.06,
                        stepLX: -0.1, stepLZ: 0.2, stepRX: 0.1, stepRZ: -0.11,
                        armLX: -0.5, armLY: 0.28,
                    },
                };
            case 2: // overhead smash
                return {
                    impact: 0.6,
                    chamber: {
                        armRX: -2.55, armRY: 0.16, armRZ: -0.18, swordX: 0.1, swordZ: 0, swordY: 0,
                        upperX: -0.22, upperY: 0.06, upperZ: 0, headX: -0.14, headY: 0,
                        bodyY: legH - 0.06 * weight, bodyZ: -0.05,
                        stepLX: -0.12, stepLZ: 0.1, stepRX: 0.12, stepRZ: -0.16, stepRY: 0.11,
                        armLX: -1.5, armLY: 0.24, armLZ: 0.1, shieldX: -0.2, shieldY: 0.4,
                    },
                    peak: {
                        armRX: 1.15, armRY: 0.02, armRZ: 0.14, swordX: -0.12, swordZ: 0,
                        upperX: 0.42, upperY: 0, upperZ: 0, headX: 0.3, headY: 0,
                        bodyY: legH - 0.1 * weight, bodyZ: 0.1,
                        stepLX: -0.1, stepLZ: 0.26, stepRX: 0.1, stepRZ: -0.1, stepRY: 0.1,
                        armLX: -1.2, armLY: 0.18, shieldX: -0.1,
                    },
                    settle: {
                        armRX: 0.62, armRY: 0.06, armRZ: 0.08, swordX: -0.05, swordZ: 0,
                        upperX: 0.36, upperY: 0, upperZ: 0, headX: 0.22, headY: 0,
                        bodyY: legH - 0.06 * weight, bodyZ: 0.05,
                        stepLX: -0.1, stepLZ: 0.22, stepRX: 0.1, stepRZ: -0.11,
                        armLX: -0.9, armLY: 0.2,
                    },
                };
            case 3: // thrust: cocked at the hip, punches through
                return {
                    impact: 0.5,
                    chamber: {
                        armRX: -1.2, armRY: 0.6, armRZ: 0.05, swordX: 1.35, swordZ: 0, swordY: 0,
                        upperX: 0.02, upperY: 0.5, upperZ: 0, headX: 0.02, headY: 0.2,
                        bodyY: legH - down, bodyZ: -0.09, bodySide: 0.02,
                        stepLX: -0.12, stepLZ: 0.1, stepRX: 0.12, stepRZ: -0.15, stepRY: 0.12,
                        armLX: -0.75, armLY: 0.4, shieldY: 0.44,
                    },
                    peak: {
                        armRX: -1.7, armRY: 0.06, armRZ: 0, swordX: 1.55, swordZ: 0, swordY: 0,
                        upperX: 0.26, upperY: -0.34, upperZ: 0, headX: 0.08, headY: -0.1,
                        bodyY: legH - 0.045, bodyZ: 0.16, bodySide: -0.01,
                        stepLX: -0.1, stepLZ: 0.32, stepRX: 0.1, stepRZ: -0.08,
                        armLX: -0.6, armLY: 0.26,
                    },
                    settle: {
                        armRX: -1.55, armRY: 0.1, armRZ: 0, swordX: 1.45, swordZ: 0,
                        upperX: 0.2, upperY: -0.2, upperZ: 0, headX: 0.05, headY: -0.06,
                        bodyY: legH - 0.03, bodyZ: 0.08,
                        stepLX: -0.1, stepLZ: 0.24, stepRX: 0.1, stepRZ: -0.1,
                        armLX: -0.6, armLY: 0.3,
                    },
                };
            case 4: // leaping slam: deep crouch → blade overhead in the air → floor smash
                return {
                    impact: 0.2,
                    chamber: {
                        armRX: -1.05, armRY: 0.5, armRZ: -0.1, swordX: 0.55, swordZ: -0.4,
                        upperX: 0.34, upperY: 0.2, upperZ: 0, headX: 0.16, headY: 0.1,
                        bodyY: legH - 0.26 * weight, bodyZ: -0.08,
                        stepLX: -0.17, stepLZ: 0.08, stepRX: 0.17, stepRZ: -0.12, stepRY: 0.1, stepLY: 0.1,
                        armLX: -1.0, armLY: 0.34, shieldX: -0.2,
                    },
                    peak: {
                        armRX: 0.95, armRY: 0.04, armRZ: 0.1, swordX: -0.2, swordZ: 0,
                        upperX: 0.6, upperY: 0, upperZ: 0, headX: 0.34, headY: 0,
                        bodyY: legH - 0.3 * weight, bodyZ: 0.12,
                        stepLX: -0.12, stepLZ: 0.2, stepRX: 0.12, stepRZ: -0.16, stepRY: 0.1, stepLY: 0.1,
                        armLX: -0.75, armLY: 0.3, shieldX: -0.1,
                    },
                    settle: {
                        armRX: 0.35, armRY: 0.08, armRZ: 0.05, swordX: -0.05, swordZ: 0,
                        upperX: 0.5, upperY: 0, upperZ: 0, headX: 0.28, headY: 0,
                        bodyY: legH - 0.19 * weight, bodyZ: 0.06,
                        stepLX: -0.12, stepLZ: 0.18, stepRX: 0.12, stepRZ: -0.14,
                        armLX: -0.7, armLY: 0.3,
                    },
                };
            case 5: // spin slash: full 360° body spin, blade extended, low crouch
                return {
                    impact: 0.42,
                    chamber: {
                        armRX: -1.5, armRY: -0.5, armRZ: -0.1, swordX: -0.15, swordZ: -0.6,
                        upperX: 0.1, upperY: -0.3, upperZ: -0.04, headX: 0.04, headY: -0.2,
                        bodyY: legH - 0.1 * weight, bodyZ: -0.05,
                        stepLX: -0.13, stepLZ: 0.1, stepRX: 0.13, stepRZ: -0.14, stepRY: 0.12,
                        armLX: -0.6, armLY: 0.3, shieldY: 0.45,
                    },
                    peak: {
                        armRX: -1.62, armRY: 0.05, armRZ: 0.05, swordX: 0.1, swordZ: 1.1, swordY: 0,
                        upperX: 0.12, upperY: 0.1, upperZ: 0, headX: 0.04, headY: 0.14,
                        bodyY: legH - 0.14 * weight, bodyZ: 0.02,
                        stepLX: -0.14, stepLZ: 0.14, stepRX: 0.14, stepRZ: -0.14,
                        armLX: -1.3, armLY: 0.5, shieldY: 0.4,
                    },
                    settle: {
                        armRX: -1.35, armRY: 0.22, armRZ: 0, swordX: 0.05, swordZ: 0.75,
                        upperX: 0.12, upperY: 0.16, upperZ: 0, headX: 0.02, headY: 0.1,
                        bodyY: legH - 0.1 * weight, bodyZ: 0,
                        stepLX: -0.13, stepLZ: 0.12, stepRX: 0.13, stepRZ: -0.13,
                        armLX: -1.1, armLY: 0.45,
                    },
                };
            case 6: // shield bash: shield punches out, body lunges behind it
                return {
                    impact: 0.34,
                    chamber: {
                        armRX: -0.55, armRY: 0.85, armRZ: -0.28, swordX: 0.5, swordZ: -0.5,
                        upperX: -0.06, upperY: -0.4, upperZ: -0.06, headX: 0.02, headY: -0.16,
                        bodyY: legH - down, bodyZ: -0.08, bodySide: -0.02,
                        stepLX: -0.14, stepLZ: 0.08, stepRX: 0.13, stepRZ: -0.15, stepRY: 0.12,
                        armLX: -0.85, armLY: 0.05, armLZ: 0.12, shieldX: -0.25, shieldY: 0.2,
                    },
                    peak: {
                        armLX: -1.45, armLY: 0.34, armLZ: 0.02, shieldX: -0.34, shieldY: 0.42,
                        armRX: -0.3, armRY: 0.75, armRZ: -0.34, swordX: 0.6, swordZ: -0.45,
                        upperX: 0.3, upperY: 0.24, upperZ: 0.06, headX: 0.14, headY: 0.1,
                        bodyY: legH - 0.05, bodyZ: 0.17, bodySide: 0.02,
                        stepLX: -0.12, stepLZ: 0.3, stepRX: 0.12, stepRZ: -0.1,
                    },
                    settle: {
                        armLX: -1.15, armLY: 0.42, shieldX: -0.2, shieldY: 0.46,
                        armRX: -0.42, armRY: 0.6, armRZ: -0.3, swordX: 0.35, swordZ: -0.35,
                        upperX: 0.22, upperY: 0.12, headX: 0.08,
                        bodyY: legH - 0.03, bodyZ: 0.09,
                        stepLX: -0.12, stepLZ: 0.22, stepRX: 0.12, stepRZ: -0.11,
                    },
                };
            case 7: { // charged heavy: two-handed overhead, chamber deepens with charge
                const deep = 0.35 * clamp01(charge);
                return {
                    impact: 0.58,
                    chamber: {
                        armRX: -2.45 - deep * 0.55, armRY: 0.1, armRZ: -0.2, swordX: 0.05, swordZ: 0,
                        armLX: -2.35 - deep * 0.5, armLY: -0.34, armLZ: -0.06, shieldX: -0.1, shieldY: 0.1,
                        upperX: -0.2 - deep * 0.14, upperY: 0.04, upperZ: 0, headX: -0.16 - deep * 0.1, headY: 0,
                        bodyY: legH - (0.06 + deep * 0.08) * weight, bodyZ: -0.06 - deep * 0.03,
                        stepLX: -0.13, stepLZ: 0.08, stepRX: 0.13, stepRZ: -0.17, stepRY: 0.11,
                    },
                    peak: {
                        armRX: 1.28, armRY: 0.02, armRZ: 0.16, swordX: -0.16, swordZ: 0,
                        armLX: 1.15, armLY: 0.2, shieldX: -0.1, shieldY: 0.2,
                        upperX: 0.56, upperY: 0, upperZ: 0, headX: 0.4, headY: 0,
                        bodyY: legH - 0.15 * weight, bodyZ: 0.14,
                        stepLX: -0.11, stepLZ: 0.3, stepRX: 0.11, stepRZ: -0.09, stepRY: 0.1,
                    },
                    settle: {
                        armRX: 0.7, armRY: 0.06, armRZ: 0.08, swordX: -0.05, swordZ: 0,
                        armLX: 0.5, armLY: 0.24, shieldX: -0.06,
                        upperX: 0.46, upperY: 0, upperZ: 0, headX: 0.3, headY: 0,
                        bodyY: legH - 0.08 * weight, bodyZ: 0.06,
                        stepLX: -0.11, stepLZ: 0.24, stepRX: 0.11, stepRZ: -0.1,
                    },
                };
            }
            case 8: // rising slash: low left → high right diagonal, shield forward
                return {
                    impact: 0.5,
                    chamber: {
                        armRX: 0.42, armRY: -0.85, armRZ: -0.2, swordX: -0.15, swordZ: -0.5, swordY: 0.3,
                        upperX: 0.3, upperY: -0.45, upperZ: -0.08, headX: 0.14, headY: -0.2,
                        bodyY: legH - 0.11 * weight, bodyZ: -0.04, bodySide: -0.02,
                        stepLX: -0.13, stepLZ: 0.1, stepRX: 0.13, stepRZ: -0.14, stepRY: 0.11,
                        armLX: -1.05, armLY: 0.42, armLZ: 0.05, shieldX: -0.2, shieldY: 0.5,
                    },
                    peak: {
                        armRX: -2.3, armRY: 1.05, armRZ: 0.16, swordX: 0.1, swordZ: 0.85, swordY: -0.2,
                        upperX: -0.16, upperY: 0.5, upperZ: 0.06, headX: -0.06, headY: 0.2,
                        bodyY: legH - 0.02, bodyZ: 0.06, bodySide: 0.01,
                        stepLX: -0.1, stepLZ: 0.22, stepRX: 0.1, stepRZ: -0.12,
                        armLX: -0.95, armLY: 0.38, shieldY: 0.5,
                    },
                    settle: {
                        armRX: -1.6, armRY: 0.85, armRZ: 0.08, swordX: 0, swordZ: 0.55,
                        upperX: -0.04, upperY: 0.3, upperZ: 0.03, headX: 0.0, headY: 0.12,
                        bodyY: legH - 0.03, bodyZ: 0.03,
                        stepLX: -0.1, stepLZ: 0.18, stepRX: 0.1, stepRZ: -0.12,
                        armLX: -0.8, armLY: 0.36,
                    },
                };
            case 9: // critical thrust: plunge forward-down, pull out in recover
                return {
                    impact: 0.42,
                    chamber: {
                        armRX: -1.1, armRY: 0.7, armRZ: 0.05, swordX: 1.25, swordZ: 0, swordY: 0,
                        upperX: -0.08, upperY: 0.55, upperZ: 0, headX: -0.06, headY: 0.22,
                        bodyY: legH - down, bodyZ: -0.1, bodySide: 0.02,
                        stepLX: -0.12, stepLZ: 0.08, stepRX: 0.13, stepRZ: -0.16, stepRY: 0.13,
                        armLX: -0.7, armLY: 0.36, shieldY: 0.44,
                    },
                    peak: {
                        armRX: -0.75, armRY: 0.14, armRZ: 0, swordX: 1.6, swordZ: 0, swordY: 0,
                        upperX: 0.55, upperY: -0.24, upperZ: 0, headX: 0.26, headY: -0.08,
                        bodyY: legH - 0.17 * weight, bodyZ: 0.22, bodySide: -0.01,
                        stepLX: -0.1, stepLZ: 0.38, stepRX: 0.1, stepRZ: -0.06,
                        armLX: -0.55, armLY: 0.3,
                    },
                    settle: {
                        armRX: -0.95, armRY: 0.2, armRZ: 0, swordX: 1.5, swordZ: 0,
                        upperX: 0.42, upperY: -0.14, upperZ: 0, headX: 0.2, headY: -0.05,
                        bodyY: legH - 0.1 * weight, bodyZ: 0.12,
                        stepLX: -0.1, stepLZ: 0.3, stepRX: 0.1, stepRZ: -0.08,
                        armLX: -0.55, armLY: 0.32,
                    },
                };
            default: // 10 (and up): low sweep — deep crouch, wide blade sweep near the floor
                return {
                    impact: 0.44,
                    chamber: {
                        armRX: -0.55, armRY: 1.15, armRZ: -0.1, swordX: 0.85, swordZ: 0.35, swordY: -0.1,
                        upperX: 0.34, upperY: 0.5, upperZ: 0.04, headX: 0.16, headY: 0.2,
                        bodyY: legH - 0.2 * weight, bodyZ: -0.06,
                        stepLX: -0.15, stepLZ: 0.1, stepRX: 0.15, stepRZ: -0.14, stepRY: 0.13,
                        armLX: -0.8, armLY: 0.3, shieldX: -0.16,
                    },
                    peak: {
                        armRX: -0.45, armRY: -1.3, armRZ: 0.05, swordX: 0.8, swordZ: -0.75, swordY: 0.1,
                        upperX: 0.42, upperY: -0.55, upperZ: -0.05, headX: 0.24, headY: -0.24,
                        bodyY: legH - 0.24 * weight, bodyZ: 0.08,
                        stepLX: -0.15, stepLZ: 0.24, stepRX: 0.15, stepRZ: -0.12,
                        armLX: -0.7, armLY: 0.26,
                    },
                    settle: {
                        armRX: -0.6, armRY: -1.0, armRZ: 0, swordX: 0.7, swordZ: -0.5,
                        upperX: 0.34, upperY: -0.3, upperZ: -0.02, headX: 0.18, headY: -0.14,
                        bodyY: legH - 0.16 * weight, bodyZ: 0.03,
                        stepLX: -0.14, stepLZ: 0.2, stepRX: 0.14, stepRZ: -0.12,
                        armLX: -0.66, armLY: 0.28,
                    },
                };
        }
    }

    /** Airborne keyframes for the leaping slam (type 4) while `opts.air` runs 0 → 1. */
    const LEAP_AIR = {
        armRX: -2.75, armRY: 0.12, armRZ: -0.16, swordX: 0.12, swordZ: 0, swordY: 0,
        armLX: -1.9, armLY: -0.2, armLZ: -0.04, shieldX: -0.16, shieldY: 0.24,
        upperX: -0.2, upperY: 0.05, upperZ: 0, headX: -0.2, headY: 0.06,
        legLX: -1.3, legRX: -0.95, kneeFL: 2.25, kneeFR: 1.75, ankleFL: 0, ankleFR: 0, freeLegs: 1,
        stepLX: -0.12, stepLZ: 0.02, stepRX: 0.12, stepRZ: -0.02,
        bodyY: legH - 0.05, bodyZ: 0.04,
        blobOp: 0.12,
    };

    function poseAttack(opts, t) {
        const type = opts.attackType || 0;
        const charge = clamp01(opts.charge || 0);
        const def = attackDefs(type, charge);
        const windup = clamp01(opts.windup || 0);
        const hold = Math.max(0, opts.hold || 0);
        const progress = clamp01(opts.progress || 0);
        const recover = clamp01(opts.recover || 0);
        const air = clamp01(opts.air || 0);
        const impact = def.impact ?? 0.66;

        // Delayed attack: fully chambered, weight parked on the back foot, slow tense tremble,
        // with the blade drifting a little further back the longer the hold runs.
        if (hold > 0.001) {
            const drift = clamp01(hold / 1.7);
            const tense = Math.sin(t * 5.2) * 0.017 * (0.3 + 0.7 * drift);
            mixKeys(GUARD, def.chamber, 1);
            tgt.armRX += tense;
            tgt.armRY += (def.chamber.armRY >= 0 ? 1 : -1) * 0.2 * drift;
            tgt.armRZ += tense * 0.6;
            tgt.swordX += -0.1 * drift + tense * 0.4;
            tgt.upperZ += tense * 0.5;
            tgt.headX += tense * 0.35;
            tgt.bodyY -= 0.035 * drift * weight;
            tgt.bodyZ -= 0.05 * drift;
            tgt.stepRZ -= 0.03 * drift;
            tgt.stepRY += 0.02 * drift;
            return;
        }

        if (windup > 0) {
            // Anticipation: settle back, load the hips onto the rear foot, shield braces.
            const w = easeOut(windup);
            mixKeys(GUARD, def.chamber, w);
            tgt.bodyY -= 0.02 * w * weight;
            tgt.bodyZ -= 0.03 * w;
            tgt.stepRZ -= 0.02 * w;
            tgt.headY = lerp(GUARD.headY, def.chamber.headY ?? 0, w) - 0.05 * w;
            return;
        }

        // Airborne phase of the leaping slam: blade overhead, legs tucked free.
        if (type === 4 && air > 0.02 && progress < 0.06) {
            mixKeys(def.chamber, LEAP_AIR, clamp01(0.25 + air * 0.85));
            tgt.freeLegs = 1;
            return;
        }

        if (progress < impact) {
            // Active swing: snaps into the strike, still travelling (follow-through).
            const k = easeOut(progress / impact);
            mixKeys(def.chamber, def.peak, k);
            tgt.bodyY -= Math.sin(k * Math.PI) * 0.03 * weight;
            if (type === 4) tgt.freeLegs = clamp01(air * 1.4) * (1 - clamp01(progress / 0.12));
            if (type === 5) tgt.spinY = -Math.PI * 2 * easeOut(clamp01(progress / impact));
        } else {
            // Settle late: the follow-through drifts back from the overshoot.
            const k = easeInOut((progress - impact) / (1 - impact));
            mixKeys(def.peak, def.settle, k);
            if (type === 5) tgt.spinY = -Math.PI * 2 * (1 - k * 0.02);
        }

        if (recover > 0) {
            // Guard returns: the blade comes back to the ready stance.
            const r = easeOutCubic(recover);
            mixKeys(def.settle, GUARD, r);
            if (type === 5) tgt.spinY = -Math.PI * 2 * (1 - clamp01(recover * 3));
            if (recover > 0.9) tgt.bodyY -= (1 - recover) * 2.5;
        }
    }

    // ---------------------------------------------------------------- movement / gait

    /** Walk / jog / sprint flavours: cadence, stride, foot lift, bounce and lean. */
    function gaitStyle(speed) {
        if (speed >= 5.2) return { stride: 0.4, cadence: 3.0, lift: 0.26, bounce: 0.03, lean: 0.24, duty: 0.42, swing: 0.3 };
        if (speed >= 3.3) return { stride: 0.29, cadence: 2.35, lift: 0.2, bounce: 0.021, lean: 0.14, duty: 0.5, swing: 0.22 };
        const k = clamp01(speed / 3.2);
        return { stride: 0.13 + 0.13 * k, cadence: 1.25 + 0.75 * k, lift: 0.085 + 0.045 * k, bounce: 0.008 + 0.006 * k, lean: 0.05 + 0.05 * k, duty: 0.62, swing: 0.1 + 0.08 * k };
    }

    /** One leg's place in the cycle: ground contact slides back, the swing arc lifts. */
    function legCycle(phase, style) {
        if (phase < style.duty) {
            const k = phase / style.duty;
            return { along: lerp(style.stride, -style.stride, k), lift: 0 };
        }
        const k = (phase - style.duty) / (1 - style.duty);
        return { along: lerp(-style.stride, style.stride, easeInOut(k)), lift: Math.sin(k * Math.PI) * style.lift };
    }

    function poseGait(dt, opts) {
        const speed = Math.max(0, opts.moveSpeed || 0);
        const style = gaitStyle(speed);
        const motion = clamp01(speed / 0.9);
        let moveX = opts.moveX || 0;
        let moveZ = opts.moveZ ?? (moveX ? 0 : 1);
        const magnitude = Math.hypot(moveX, moveZ) || 1;
        moveX /= magnitude;
        moveZ /= magnitude;
        const lateral = Math.abs(moveX) > 0.45 && Math.abs(moveX) > Math.abs(moveZ) + 0.15;
        const backpedal = moveZ < -0.45 && Math.abs(moveZ) > Math.abs(moveX) + 0.15;
        // The torso leans into the direction of travel but keeps facing forward while strafing.
        const lean = style.lean * motion * (backpedal ? -0.25 : lateral ? 0.35 : 1);
        const stride = style.stride * motion * (backpedal ? 0.72 : 1);

        gaitPhase = (gaitPhase + dt * Math.PI * 2 * style.cadence * Math.max(0.55, motion)) % (Math.PI * 2);
        const cycle = gaitPhase / (Math.PI * 2);

        for (const side of ['L', 'R']) {
            const phase = (cycle + (side === 'L' ? 0 : 0.5)) % 1;
            const step = legCycle(phase, { ...style, stride });
            // Crossing step: the trailing leg crosses behind the lead leg, torso still forward.
            const cross = lateral ? (side === 'L' ? -0.09 : 0.035) * Math.abs(moveX) : 0;
            tgt[`step${side}X`] = step.along * (lateral ? Math.sign(moveX) * 1.25 : moveX);
            tgt[`step${side}Z`] = lateral ? cross : step.along * Math.sign(moveZ || 1);
            tgt[`step${side}Y`] = ankleY + step.lift * motion;
        }
        // Weight rides ahead of the feet when backpedalling, over them when sprinting.
        tgt.bodyY = legH - 0.02 - 0.03 * motion * (style.lean > 0.2 ? 1 : 0) + Math.sin(gaitPhase * 2) * style.bounce * motion;
        tgt.bodyZ = backpedal ? 0.05 * motion : -0.02 * style.lean * 4 * motion;
        tgt.bodySide = lateral ? moveX * 0.03 * motion : 0;
        tgt.upperX = lean + Math.sin(gaitPhase * 2) * 0.015 * motion;
        tgt.upperZ = lateral ? -moveX * style.lean * 0.5 * motion : Math.sin(gaitPhase) * 0.03 * motion;
        tgt.upperY = lateral ? 0 : -Math.sin(gaitPhase) * 0.07 * motion;
        tgt.headX = -lean * 0.45 + (backpedal ? -0.02 : 0);
        tgt.headY = lateral ? moveX * 0.14 * motion : Math.sin(gaitPhase) * 0.03 * motion;

        const swing = Math.sin(gaitPhase) * style.swing * motion * (backpedal ? -1 : 1);
        tgt.armRX = -0.42 + swing * 0.55 - 0.1 * motion;
        tgt.armRY = 0.2 + 0.08 * motion;
        tgt.armRZ = -0.16 - 0.05 * motion;
        tgt.armLX = -0.5 - swing * 0.55 + 0.12 * motion * (backpedal ? 1 : 0);
        tgt.armLY = 0.3 + 0.06 * motion;
        tgt.armLZ = 0.08;
        tgt.swordX = -0.42 + swing * 0.3;
        tgt.shieldY = 0.42 - 0.06 * motion;
    }

    // ---------------------------------------------------------------- idle & guard

    function poseIdle(t) {
        const b = Math.sin(t * 2.15 * tempo);
        const sway = Math.sin(t * 1.25 * tempo) * 0.05;
        const drift = Math.sin(t * 0.75 * tempo);
        const braced = isBoss ? 1 : 0;
        tgt.bodyY = GUARD.bodyY + b * 0.014 - 0.02 * braced;
        tgt.bodyZ = b * 0.006;
        tgt.upperX = GUARD.upperX + b * 0.02 + 0.1 * braced;
        tgt.upperY = GUARD.upperY + drift * 0.03;
        tgt.upperZ = sway * 0.03;
        tgt.headY = drift * 0.12;
        tgt.headX = GUARD.headX + Math.sin(t * 1.6 * tempo) * 0.03 + 0.05 * braced;
        tgt.headZ = sway * 0.02;
        tgt.armRX = GUARD.armRX + b * 0.03 + sway * 0.12 - 0.05 * braced;
        tgt.armRY = GUARD.armRY + sway * 0.06;
        tgt.armRZ = GUARD.armRZ + sway * 0.05 - 0.05 * braced;
        tgt.swordX = GUARD.swordX - b * 0.05;
        tgt.swordZ = GUARD.swordZ + sway * 0.3;
        tgt.armLX = GUARD.armLX - b * 0.02 - 0.1 * braced;
        tgt.armLY = GUARD.armLY + sway * 0.04;
        tgt.armLZ = GUARD.armLZ + 0.06 * braced;
        tgt.shieldY = GUARD.shieldY - 0.04 * braced;
    }

    // ---------------------------------------------------------------- states

    function poseRoll(p) {
        // Forward somersault: +2π about the hips so the top of the body tumbles toward +Z.
        const turn = easeInOut(clamp01((p - 0.04) / 0.86));
        const tuck = Math.sin(clamp01((p - 0.02) / 0.86) * Math.PI);
        tgt.spinX = Math.PI * 2 * turn;
        tgt.pivot = rollPivot;
        tgt.bodyY = legH - 0.075 * tuck;                 // hips ride near the pivot while tucked
        tgt.upperX = 0.16 + 1.0 * tuck;                  // torso curls into the ball
        tgt.headX = 0.1 + 0.45 * tuck;
        tgt.armRX = -0.42 - 1.5 * tuck;
        tgt.armRY = 0.2 + 0.45 * tuck;
        tgt.armLX = -0.42 - 1.5 * tuck;
        tgt.armLY = 0.3 - 0.75 * tuck;
        tgt.swordX = -0.4 - 1.0 * tuck;
        tgt.swordZ = 0.12 + 0.3 * tuck;
        tgt.legLX = -1.62 * tuck;
        tgt.legRX = -1.5 * tuck;
        tgt.kneeFL = 1.0 + 1.35 * tuck;
        tgt.kneeFR = 1.0 + 1.25 * tuck;
        tgt.freeLegs = 1 - clamp01((p - 0.84) / 0.12);
        tgt.capeX = 0.7 * tuck + 0.25;
        tgt.tabX = -0.5 * tuck;
        tgt.blobOp = 0.42 * (1 - 0.6 * tuck);
        // Landing: soak the last of the tumble into the knees.
        const land = clamp01((p - 0.86) / 0.14);
        tgt.bodyY -= 0.06 * Math.sin(land * Math.PI);
        tgt.upperX = lerp(tgt.upperX, 0.3, land);
    }

    function poseBackstep(p) {
        // Quick backward hop: push off, small foot lift, land with a knee dip.
        const hop = Math.sin(clamp01(p / 0.55) * Math.PI);
        const lift = Math.sin(clamp01(p / 0.62) * Math.PI);
        const land = clamp01((p - 0.6) / 0.4);
        tgt.bodyY = legH - 0.02 + hop * 0.05 - 0.075 * Math.sin(land * Math.PI) * weight;
        tgt.bodyZ = 0.02 + 0.06 * hop;
        tgt.stepLZ = 0.105 - 0.16 * hop;
        tgt.stepRZ = -0.105 - 0.14 * hop;
        tgt.stepLY = ankleY + lift * 0.11;
        tgt.stepRY = ankleY + lift * 0.07;
        tgt.upperX = 0.02 - 0.06 * hop + 0.14 * land;
        tgt.armRX = -0.34 - 0.12 * hop;
        tgt.armLX = -0.54 - 0.3 * hop;
        tgt.armLY = 0.32 + 0.16 * hop;
        tgt.shieldY = 0.42 + 0.1 * hop;
        tgt.headX = -0.03 - 0.06 * hop;
        tgt.capeX = -0.35 * hop;
        tgt.tabX = 0.3 * hop;
    }

    function poseKnockdown(p) {
        // 0–0.22 thrown back and falls on the back, 0.22–0.6 lies, 0.6–1.0 rolls up to stand.
        const fall = easeOut(clamp01(p / 0.22));
        const lie = clamp01((p - 0.2) / 0.22);
        const rise = easeInOutCubic(clamp01((p - 0.6) / 0.36));
        tgt.spinX = -Math.PI / 2 * fall * (1 - rise);
        tgt.bodyY = legH - 0.09 * fall * (1 - rise);
        tgt.bodyZ = 0.18 * fall * (1 - rise);            // spine lifted clear of the floor while lying
        tgt.upperX = -0.34 * fall * (1 - lie) + 0.06 * lie * (1 - rise) + 0.55 * Math.sin(rise * Math.PI);
        tgt.headX = (-0.3 * fall * (1 - lie) + 0.14 * lie) * (1 - rise) + 0.3 * rise;
        tgt.upperY = 0.12 * fall * (1 - rise);
        tgt.armRX = lerp(-0.34, -0.15, fall) + 0.2 * rise;
        tgt.armRY = 0.18 + 0.2 * fall;
        tgt.armRZ = -0.14 - 1.15 * fall * (1 - rise);
        tgt.armLX = lerp(-0.54, -0.2, fall) + 0.25 * rise;
        tgt.armLZ = 0.08 + 1.0 * fall * (1 - rise);
        tgt.swordX = -0.34 - 0.5 * fall * (1 - rise);
        tgt.legLX = -1.15 * fall + 1.0 * rise;
        tgt.legRX = -1.05 * fall + 0.9 * rise;
        tgt.kneeFL = 1.0 + 0.85 * fall - 0.5 * rise;
        tgt.kneeFR = 1.0 + 0.9 * fall - 0.5 * rise;
        tgt.freeLegs = 1 - clamp01((p - 0.82) / 0.14);
        tgt.capeX = 0.5 * fall;
        tgt.blobOp = 0.42 * (1 - 0.6 * fall * (1 - rise));
    }

    function poseStanceBreak(t, p) {
        // Poise break: drop onto one knee, sword tip planted, head bowed, slow heave; rise late.
        const drop = easeOut(clamp01(p / 0.18));
        const rise = easeInOutCubic(clamp01((p - 0.85) / 0.15));
        const kneel = drop * (1 - rise);
        const heave = Math.sin(t * 2.6 * tempo) * 0.035 * kneel;
        tgt.bodyY = legH - 0.275 * kneel;
        tgt.bodyZ = -0.04 * kneel;
        tgt.upperX = 0.06 + 0.3 * kneel + heave;
        tgt.upperY = -0.1 * kneel;
        tgt.headX = -0.03 + 0.42 * kneel + heave * 0.5;
        tgt.armRX = -0.34 - 1.05 * kneel + heave;
        tgt.armRY = 0.18 - 0.1 * kneel;
        tgt.armRZ = -0.14 - 0.06 * kneel;
        tgt.swordX = -0.34 + 2.2 * kneel;
        tgt.swordZ = 0.12 - 0.1 * kneel;
        tgt.armLX = -0.54 - 0.5 * kneel;
        tgt.armLY = 0.32 - 0.1 * kneel;
        tgt.shieldY = 0.42 - 0.15 * kneel;
        // Right leg kneels flat on the floor, left foot stays planted in front.
        tgt.legLX = -1.1 * kneel;
        tgt.legRX = 0.15 * kneel;
        tgt.kneeFL = 1.35 * kneel;
        tgt.kneeFR = 1.02 + 0.45 * kneel;
        tgt.ankleFR = 1.2 * kneel;
        tgt.freeLegs = 1 - clamp01((p - 0.82) / 0.14);
        tgt.stepLZ = 0.105 + 0.12 * kneel;
        tgt.stepRZ = -0.105 - 0.1 * kneel;
        tgt.capeX = -0.3 * kneel;
        tgt.tabX = 0.35 * kneel;
        tgt.blobOp = 0.42 - 0.08 * kneel;
    }

    function poseRoar(t, p) {
        // Gather 0–0.3, then chest out, arms flung wide, head back, low tremble; settle late.
        const gather = easeOut(clamp01(p / 0.3));
        const release = easeOut(clamp01((p - 0.3) / 0.22));
        const settle = easeInOut(clamp01((p - 0.82) / 0.18));
        const roar = release * (1 - settle);
        const tremble = Math.sin(t * 6.2 * tempo) * 0.014 * roar;
        tgt.bodyY = legH - 0.19 * gather * (1 - release) - 0.045 * roar;
        tgt.bodyZ = -0.06 * gather * (1 - release);
        tgt.upperX = 0.34 * gather * (1 - release) - 0.42 * roar + tremble;
        tgt.upperY = 0.1 * gather * (1 - release);
        tgt.upperZ = tremble * 0.6;
        tgt.headX = 0.2 * gather * (1 - release) - 0.55 * roar + tremble;
        tgt.armRX = -0.34 - 1.0 * roar - 0.35 * gather * (1 - release);
        tgt.armRY = 0.9 * roar;
        tgt.armRZ = -0.14 - 0.55 * roar;
        tgt.swordX = -0.34 - 0.5 * roar;
        tgt.swordZ = 0.3 * roar;
        tgt.armLX = -0.54 - 1.0 * roar;
        tgt.armLY = 0.32 - 0.72 * roar;
        tgt.armLZ = 0.08 + 0.5 * roar;
        tgt.shieldY = 0.42 - 0.2 * roar;
        tgt.stepLX = -0.105 - 0.06 * roar;
        tgt.stepRX = 0.105 + 0.06 * roar;
        tgt.stepLZ = 0.105 - 0.02 * roar;
        tgt.stepRZ = -0.105 + 0.04 * roar;
        tgt.capeX = -0.55 * roar;
        tgt.tabX = 0.4 * roar;
        tgt.blobOp = 0.42 + 0.05 * roar;
    }

    function poseHeal(t, dt, opts) {
        // Standing flask drink: legs walk when moving, otherwise the planted guard stance.
        if (Math.max(0, opts.moveSpeed || 0) > 0.3) poseGait(dt, opts);
        else poseIdle(t);
        const p = clamp01(opts.progress || 0);
        const up = p < 0.15 ? easeOut(p / 0.15) : p < 0.75 ? 1 : 1 - easeOut(clamp01((p - 0.75) / 0.25));
        const gulp = p > 0.2 && p < 0.72 ? Math.sin(t * 7.5) * 0.03 : 0;
        tgt.armRX = lerp(tgt.armRX, -2.15, up);
        tgt.armRY = lerp(tgt.armRY, -0.5, up);
        tgt.armRZ = lerp(tgt.armRZ, -0.3, up);
        tgt.swordX = lerp(tgt.swordX, -1.5, up);        // blade laid back along the forearm
        tgt.swordZ = lerp(tgt.swordZ, 0.55, up);
        tgt.headX = lerp(tgt.headX, -0.36 + gulp, up);
        tgt.upperX = lerp(tgt.upperX, -0.1, up);
        tgt.upperY = lerp(tgt.upperY, 0.08, up);
        tgt.armLX = lerp(tgt.armLX, -0.72, up);
        tgt.armLY = lerp(tgt.armLY, 0.24, up);
        tgt.shieldY = lerp(tgt.shieldY, 0.3, up);
        tgt.bodyZ = lerp(tgt.bodyZ, -0.03, up);
        tgt.bodyY -= 0.015 * up;
    }

    function poseDead(p) {
        const fall = easeOutCubic(clamp01(p * 1.15));
        const bounce = p > 0.85 ? Math.sin(((p - 0.85) / 0.15) * Math.PI) * 0.05 : 0;
        tgt.spinX = -Math.PI / 2 * fall;
        tgt.bodyY = legH * (1 - fall * 0.78) + bounce * 0.3;
        tgt.bodyZ = 0.17 * fall;                 // spine rests on the floor plane
        tgt.upperX = 0.3 * fall;
        tgt.legLX = 0.06 * fall;
        tgt.legRX = 0.05 * fall;
        tgt.kneeFL = 1.0 - 0.82 * fall;          // legs sprawl out flat
        tgt.kneeFR = 1.0 - 0.78 * fall;
        tgt.freeLegs = clamp01(fall * 3);
        tgt.armRZ = -0.7 * fall;
        tgt.armLZ = 0.55 * fall;
        tgt.armRX = -0.45 * fall;
        tgt.headX = 0.45 * fall;
        tgt.capeX = 0.3 * fall;
        tgt.blobOp = 0.42 * (1 - fall * 0.55);
    }

    function poseBlock(t) {
        const brace = Math.sin(t * 8.5) * 0.008;
        mixKeys(GUARD, {
            armLX: -1.28 + brace, armLY: 0.42, armLZ: 0.06,
            shieldX: -0.16, shieldY: 0.52,
            armRX: -0.34, armRY: 0.55, armRZ: -0.3, swordX: 0.55, swordZ: -0.4,
            upperX: 0.16, upperY: 0.12, upperZ: brace * 0.5, headX: 0.05,
            bodyY: legH - 0.075 * weight, bodyZ: -0.03,
            stepLX: -0.13, stepLZ: 0.16, stepRX: 0.13, stepRZ: -0.16, stepRY: 0.1,
        }, 1);
    }

    function poseParry(p) {
        const sweep = Math.sin(clamp01(p) * Math.PI);
        mixKeys(GUARD, {
            armLX: -0.95 - sweep * 0.75, armLY: 0.3 + sweep * 1.15, armLZ: 0.08 + sweep * 0.2,
            shieldX: -0.1 - sweep * 0.2, shieldY: 0.5 + sweep * 0.25,
            upperX: 0.06, upperY: sweep * 0.34,
            headY: sweep * 0.16,
            armRX: -0.34 - sweep * 0.1, armRY: 0.18 + sweep * 0.2,
            bodyY: legH - 0.02 - sweep * 0.02, bodyZ: -0.02 * sweep,
            stepLZ: 0.105 + 0.06 * sweep, stepRZ: -0.105 - 0.04 * sweep,
        }, 1);
    }

    function poseStagger(p) {
        // One damped jolt: a single impulse that decays, then settles back into the guard.
        const impulse = Math.sin(clamp01(p * 1.15) * Math.PI) * (1 - 0.35 * clamp01(p));
        const settle = p > 0.55 ? Math.sin(((p - 0.55) / 0.45) * Math.PI) * 0.055 : 0;
        mixKeys(GUARD, {
            upperX: 0.06 - 0.42 * impulse + settle * 0.4,
            upperZ: 0.24 * impulse,
            headX: -0.03 - 0.4 * impulse + settle * 0.4,
            headZ: -0.1 * impulse,
            armRZ: -0.14 - 0.5 * impulse,
            armLZ: 0.08 + 0.45 * impulse,
            armRX: -0.34 - 0.3 * impulse,
            armLX: -0.54 - 0.25 * impulse,
            swordX: -0.34 + 0.3 * impulse,
            bodyY: legH - 0.02 - 0.06 * impulse * weight,
            bodyZ: -0.07 * impulse,
            stepLZ: 0.105 + 0.04 * impulse,
            stepRZ: -0.105 - 0.11 * impulse,
        }, 1);
    }

    function poseGuardbroken(t, p) {
        // Guard knocked open and reeling: two slow damped swings, no fast buzz.
        const fade = 1 - clamp01(p) * 0.35;
        const reel = Math.sin(clamp01(p) * Math.PI * 2.2) * fade;
        mixKeys(GUARD, {
            upperX: 0.06 - 0.4 - reel * 0.1,
            upperZ: reel * 0.34,
            headX: -0.03 - 0.45 + reel * 0.1,
            headZ: -reel * 0.16,
            armRZ: -0.14 - 1.05 - reel * 0.12,
            armLZ: 0.08 + 1.0 + reel * 0.12,
            armRX: -0.54,
            armLX: -0.74,
            swordX: -0.34 + 0.4 * fade,
            bodyY: legH - 0.02 - 0.075 * weight - Math.abs(reel) * 0.02,
            bodyZ: -0.06 - reel * 0.03,
            stepLX: -0.16, stepLZ: 0.12, stepRX: 0.14, stepRZ: -0.17,
            capeX: 0.25 * fade,
        }, 1);
    }

    function poseVictory(t) {
        const hop = Math.abs(Math.sin(t * 3.2));
        mixKeys(GUARD, {
            armRX: Math.PI - 0.3 + Math.sin(t * 3.2) * 0.12, armRY: 0.05, armRZ: -0.18,
            swordX: 0.4, swordZ: 0,
            armLX: -0.5, armLY: 0.3,
            bodyY: legH - 0.01 + hop * 0.05 * weight,
            upperX: -0.05, upperY: 0.02, headX: -0.18,
            stepLX: -0.12, stepLZ: 0.08, stepRX: 0.12, stepRZ: -0.08,
            capeX: -0.2 * hop,
        }, 1);
    }

    // ---------------------------------------------------------------- leg solving

    let tgt = rig._tgt;
    let last = rig._last;
    let gaitPhase = 0;

    /** Foot-IK angles: the ankle lands on (stepX, stepY, stepZ) with a level sole. */
    function legAngles(side) {
        const dx = tgt[`step${side}X`] + (side === 'L' ? -widenX : widenX);
        const dz = tgt[`step${side}Z`] + (side === 'L' ? widenZ : -widenZ);
        const dy = tgt.bodyY - tgt[`step${side}Y`];
        const vertical = Math.hypot(dx, dy);
        const reach = clamp(Math.hypot(vertical, dz), 0.10, maxReach);
        const knee = Math.PI - Math.acos(clamp((thigh * thigh + shin * shin - reach * reach) / (2 * thigh * shin), -1, 1));
        const hip = -Math.atan2(dz, vertical) - Math.acos(clamp((thigh * thigh + reach * reach - shin * shin) / (2 * thigh * reach), -1, 1));
        const lateral = Math.atan2(dx, dy);
        return { hip, knee, ankle: -hip - knee - tgt.bodyX, lateral };
    }

    /** Blend the grounded IK stance with the direct leg chain used by tuck states. */
    function applyLegs() {
        const f = rig._freeAmt;
        for (const side of ['L', 'R']) {
            const ik = legAngles(side);
            const fold = tgt[`leg${side}X`];
            const bend = tgt[`kneeF${side}`];
            const hip = lerp(ik.hip, fold, f);
            const knee = lerp(ik.knee, bend, f);
            const ankle = lerp(ik.ankle, -fold - bend + tgt[`ankleF${side}`], f);
            const lateral = ik.lateral * (1 - f);
            limbs[`leg${side}`].rotation.set(hip, 0, lateral);
            limbs[`knee${side}`].rotation.x = knee;
            limbs[`foot${side}`].rotation.set(ankle, 0, -lateral);
        }
    }

    // ---------------------------------------------------------------- frame

    rig.pose = function pose(state, t, dt, opts = {}) {
        tgt = restPose();
        const dtSafe = clamp(dt || 0, 0, 0.05);
        const progress = clamp01(opts.progress || 0);

        switch (state) {
            case 'run':
                poseGait(dtSafe, opts);
                break;
            case 'attack':
                poseAttack(opts, t);
                break;
            case 'roll':
                poseRoll(progress);
                break;
            case 'backstep':
                poseBackstep(progress);
                break;
            case 'knockdown':
                poseKnockdown(progress);
                break;
            case 'stanceBreak':
                poseStanceBreak(t, progress);
                break;
            case 'roar':
                poseRoar(t, progress);
                break;
            case 'heal':
                poseHeal(t, dtSafe, opts);
                break;
            case 'dead':
                poseDead(progress);
                break;
            case 'block':
                poseBlock(t);
                break;
            case 'parry':
                poseParry(progress);
                break;
            case 'stagger':
                poseStagger(progress);
                break;
            case 'guardbroken':
                poseGuardbroken(t, progress);
                break;
            case 'victory':
                poseVictory(t);
                break;
            default: // idle
                poseIdle(t);
                break;
        }

        // Heavy fighters settle deeper into the ground in every grounded state.
        if (isBoss && !TUCK_STATES.has(state)) tgt.bodyY -= 0.075;

        // Crossfade from the last applied pose on soft transitions.
        if (state !== rig._prevState) {
            const hard = HARD_STATES.has(state) || HARD_STATES.has(rig._prevState);
            rig._prevState = state;
            rig._blend = hard ? 1 : 0;
            if (hard) rig._legBlend = 0;
        }

        if (rig._blend < 1) {
            rig._blend = Math.min(1, rig._blend + dtSafe / 0.1);
            const b = easeInOut(rig._blend);
            for (let i = 0; i < POSE_KEYS.length; i++) {
                const k = POSE_KEYS[i];
                tgt[k] = lerp(last[k], tgt[k], b);
            }
        }

        // Feet glide into a new stance even when the pose itself snaps hard.
        if (rig._legBlend < 1) {
            rig._legBlend = Math.min(1, rig._legBlend + dtSafe / 0.12);
            const b = easeOut(rig._legBlend);
            for (let i = 0; i < STEP_KEYS.length; i++) {
                const k = STEP_KEYS[i];
                tgt[k] = lerp(last[k], tgt[k], b);
            }
        }

        // Fold the leg chain in and out of tuck states without snapping the joints.
        rig._freeAmt = approach(rig._freeAmt, clamp01(tgt.freeLegs), dtSafe / freeGlide);

        // --- Apply to the scene graph ---
        spin.position.y = tgt.pivot;
        spin.rotation.set(tgt.spinX, tgt.spinY, 0);
        body.position.set(tgt.bodySide, tgt.bodyY - tgt.pivot, tgt.bodyZ);
        body.rotation.x = tgt.bodyX;
        upper.rotation.set(tgt.upperX, tgt.upperY, tgt.upperZ);
        head.rotation.set(tgt.headX, tgt.headY, tgt.headZ);
        applyLegs();
        armR.rotation.set(tgt.armRX, tgt.armRY, tgt.armRZ);
        armL.rotation.set(tgt.armLX, tgt.armLY, tgt.armLZ);
        sword.rotation.set(tgt.swordX, tgt.swordY, tgt.swordZ);
        shield.rotation.set(tgt.shieldX, tgt.shieldY, tgt.shieldZ);
        blob.material.opacity = clamp01(tgt.blobOp);

        // Secondary motion: plume, cape and tabard trail the torso, the tumble and any yaw spin.
        const spinVel = dtSafe > 0 ? (tgt.spinY - rig._spinY) / dtSafe : 0;
        const tumbleVel = dtSafe > 0 ? (tgt.spinX - rig._spinX) / dtSafe : 0;
        rig._spinY = tgt.spinY;
        rig._spinX = tgt.spinX;
        const yawLag = clamp(spinVel * 0.16, -0.9, 0.9);
        const tumbleLag = clamp(tumbleVel * 0.05, -0.8, 0.8);
        plume.rotation.x = -tgt.upperX * 0.5 - 0.3 * tumbleLag + Math.sin(t * 4.2) * 0.04;
        plume.rotation.z = -tgt.upperZ * 0.7 + Math.sin(t * 3.1) * 0.03;
        capeTip.rotation.x = -tgt.upperX * 0.5 - (tgt.bodyY - legH) * 1.9 + tgt.capeX + tumbleLag * 0.5 + Math.sin(t * 2.7) * 0.05;
        capeTip.rotation.y = -tgt.upperY * 0.55 + tgt.capeY + yawLag + Math.sin(t * 2.2 + 1.1) * 0.045;
        tabardTip.rotation.x = tgt.upperX * 0.4 + (tgt.bodyY - legH) * 1.5 + tgt.tabX + tumbleLag * 0.35 + Math.sin(t * 3.1 + 1.2) * 0.04;
        tabardTip.rotation.y = -tgt.upperY * 0.35 + tgt.tabY - yawLag * 0.6;

        // Remember for the next crossfade.
        for (let i = 0; i < POSE_KEYS.length; i++) {
            const k = POSE_KEYS[i];
            last[k] = tgt[k];
        }
    };

    return rig;
}
