/**
 * Souls-like Battle Game - Effects & HUD
 * Pooled particles (single Points buffer), trauma-based screen shake,
 * hit-stop (freeze frames), full-screen DOM flashes, floating damage
 * numbers, and a DOM HUD (bars/estus/overlays) updated via transforms.
 */
import * as THREE from './three.module.min.js?v=1';

// ================= Particle Pool =================
export class ParticlePool {
    constructor(scene, max = 140) {
        this.max = max;
        this.pos = new Float32Array(max * 3);
        this.col = new Float32Array(max * 3);
        this.vel = new Float32Array(max * 3);
        this.life = new Float32Array(max);   // remaining seconds
        this.decay = new Float32Array(max);
        this.gravity = new Float32Array(max);
        this.head = 0;
        this.alive = 0;

        this.geo = new THREE.BufferGeometry();
        this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
        this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
        this.points = new THREE.Points(this.geo, new THREE.PointsMaterial({
            size: 0.09, vertexColors: true, transparent: true, opacity: 0.95,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        this.points.frustumCulled = false;
        scene.add(this.points);

        // Park all particles far below until spawned
        for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -999;
        this._c = new THREE.Color();
    }

    spawn(x, y, z, count, { color = 0xffffff, speed = 3, spread = 1, up = 1.5, life = 0.5, gravity = 6 } = {}) {
        this._c.set(color);
        for (let n = 0; n < count; n++) {
            const i = this.head;
            this.head = (this.head + 1) % this.max;
            this.pos[i * 3] = x;
            this.pos[i * 3 + 1] = y;
            this.pos[i * 3 + 2] = z;
            const a = Math.random() * Math.PI * 2;
            const r = (0.3 + Math.random() * 0.7) * speed;
            this.vel[i * 3] = Math.cos(a) * r * spread;
            this.vel[i * 3 + 1] = (Math.random() * 0.9 + 0.2) * up;
            this.vel[i * 3 + 2] = Math.sin(a) * r * spread;
            this.life[i] = life * (0.6 + Math.random() * 0.8);
            this.decay[i] = 1 / this.life[i];
            this.gravity[i] = gravity;
            // slight color jitter
            const j = 0.8 + Math.random() * 0.3;
            this.col[i * 3] = Math.min(1, this._c.r * j);
            this.col[i * 3 + 1] = Math.min(1, this._c.g * j);
            this.col[i * 3 + 2] = Math.min(1, this._c.b * j);
        }
    }

    update(dt) {
        for (let i = 0; i < this.max; i++) {
            if (this.life[i] <= 0) continue;
            this.life[i] -= dt;
            if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
            this.vel[i * 3 + 1] -= this.gravity[i] * dt;
            this.pos[i * 3] += this.vel[i * 3] * dt;
            this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
            this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
            if (this.pos[i * 3 + 1] < 0.03) { this.pos[i * 3 + 1] = 0.03; this.vel[i * 3 + 1] *= -0.4; }
        }
        this.geo.attributes.position.needsUpdate = true;
        this.geo.attributes.color.needsUpdate = true;
    }
}

// ================= Screen Shake =================
export class ScreenShake {
    constructor() { this.trauma = 0; }
    add(amount) { this.trauma = Math.min(1, this.trauma + amount); }
    /** Writes offsets into camRig and decays trauma. */
    apply(dt, camRig) {
        this.trauma = Math.max(0, this.trauma - dt * 1.6);
        const s = this.trauma * this.trauma;
        const t = performance.now() * 0.03;
        camRig.shakeX = s * 0.35 * (Math.sin(t * 1.3) + Math.sin(t * 3.7) * 0.5);
        camRig.shakeY = s * 0.3 * (Math.cos(t * 1.7) + Math.sin(t * 4.3) * 0.5);
        camRig.shakeZ = s * 0.1 * Math.sin(t * 2.3);
    }
}

// ================= Hit Stop =================
export class HitStop {
    constructor() { this.timer = 0; }
    /** Freeze gameplay for ms milliseconds (rendering continues). */
    freeze(ms) { this.timer = Math.max(this.timer, ms / 1000); }
    /** Returns true if gameplay should be frozen this frame. */
    tick(dt) {
        if (this.timer > 0) { this.timer -= dt; return true; }
        return false;
    }
}

// ================= DOM HUD =================
export class HUD {
    constructor(container, getText) {
        this.getText = getText;
        const root = document.createElement('div');
        root.className = 'game-hud';
        root.innerHTML = `
            <div class="hud-player">
                <div class="hud-bar hud-hp"><div class="hud-bar-fill"></div></div>
                <div class="hud-bar hud-stamina"><div class="hud-bar-fill"></div></div>
                <div class="hud-estus"></div>
            </div>
            <div class="hud-boss">
                <div class="hud-boss-name"></div>
                <div class="hud-bar hud-boss-hp"><div class="hud-bar-fill"></div></div>
            </div>
            <div class="hud-center"></div>
            <div class="hud-flash"></div>
            <div class="hud-numbers"></div>
        `;
        container.appendChild(root);
        this.root = root;
        this.hpFill = root.querySelector('.hud-hp .hud-bar-fill');
        this.stFill = root.querySelector('.hud-stamina .hud-bar-fill');
        this.bossFill = root.querySelector('.hud-boss-hp .hud-bar-fill');
        this.bossName = root.querySelector('.hud-boss-name');
        this.bossWrap = root.querySelector('.hud-boss');
        this.estusWrap = root.querySelector('.hud-estus');
        this.center = root.querySelector('.hud-center');
        this.flashEl = root.querySelector('.hud-flash');
        this.numbers = root.querySelector('.hud-numbers');
        this._last = { hp: -1, st: -1, boss: -1, estus: -1 };
        this._numPool = [];
        this._flashTimer = null;
    }

    setBossName(name) { this.bossName.textContent = name; }
    showBossBar(show) { this.bossWrap.classList.toggle('visible', show); }

    setBars(hp, stamina, estus, estusMax, bossHp) {
        const l = this._last;
        if (hp !== l.hp) { this.hpFill.style.transform = `scaleX(${Math.max(0, hp)})`; l.hp = hp; }
        if (stamina !== l.st) { this.stFill.style.transform = `scaleX(${Math.max(0, stamina)})`; l.st = stamina; }
        if (bossHp !== l.boss) { this.bossFill.style.transform = `scaleX(${Math.max(0, bossHp)})`; l.boss = bossHp; }
        if (estus !== l.estus) {
            l.estus = estus;
            this.estusWrap.innerHTML = '';
            for (let i = 0; i < estusMax; i++) {
                const pip = document.createElement('span');
                pip.className = 'estus-pip' + (i < estus ? ' full' : '');
                this.estusWrap.appendChild(pip);
            }
        }
    }

    /** Big centered text (countdown, YOU DIED, VICTORY...). */
    showCenter(text, { cls = '', duration = 0 } = {}) {
        this.center.innerHTML = text ? `<div class="hud-center-text ${cls}">${text}</div>` : '';
        if (duration > 0) {
            clearTimeout(this._centerTimer);
            this._centerTimer = setTimeout(() => { this.center.innerHTML = ''; }, duration);
        }
    }

    flash(color, ms = 180) {
        this.flashEl.style.background = color;
        this.flashEl.classList.add('on');
        clearTimeout(this._flashTimer);
        this._flashTimer = setTimeout(() => this.flashEl.classList.remove('on'), ms);
    }

    /** Floating damage number at screen-projected position. */
    damageNumber(text, sx, sy, cls = '') {
        let el = this._numPool.pop();
        if (!el) {
            el = document.createElement('div');
            el.className = 'dmg-num';
            this.numbers.appendChild(el);
        }
        el.className = 'dmg-num on ' + cls;
        el.textContent = text;
        el.style.left = sx + 'px';
        el.style.top = sy + 'px';
        el.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
        clearTimeout(el._t);
        el._t = setTimeout(() => { el.classList.remove('on'); }, 800);
    }

    destroy() { this.root.remove(); }
}

/** Project a world position to HUD (canvas) pixel coordinates. */
const _v = new THREE.Vector3();
export function worldToScreen(pos, camera, canvas) {
    _v.copy(pos).project(camera);
    return {
        x: (_v.x * 0.5 + 0.5) * canvas.clientWidth,
        y: (-_v.y * 0.5 + 0.5) * canvas.clientHeight,
        behind: _v.z > 1,
    };
}
