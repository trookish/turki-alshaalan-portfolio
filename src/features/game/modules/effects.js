/**
 * Souls-like Battle Game - Effects & HUD
 * Pooled particles (single Points buffer), weapon trails, shockwave rings,
 * area telegraphs, impact light flashes, trauma-based screen shake,
 * hit-stop (freeze frames), and a DOM HUD updated via transforms.
 */
import * as THREE from 'three';
import { makeGlowTexture } from './engine.js';

let sharedGlow = null;
const glowTexture = () => (sharedGlow ??= makeGlowTexture(32, 1.8));

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
        this.drag = new Float32Array(max);
        this.head = 0;

        this.geo = new THREE.BufferGeometry();
        this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
        this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
        this.points = new THREE.Points(this.geo, new THREE.PointsMaterial({
            size: 0.2, map: glowTexture(), vertexColors: true, transparent: true, opacity: 1,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        this.points.frustumCulled = false;
        this.points.renderOrder = 5;
        scene.add(this.points);

        // Park all particles far below until spawned
        for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -999;
        this._c = new THREE.Color();
    }

    /**
     * Burst of glowing particles. `dir` aims the burst (sparks); `intensity`
     * above 1 pushes the colour into bloom range.
     * @param {number} x @param {number} y @param {number} z @param {number} count
     * @param {{ color?: number, speed?: number, spread?: number, up?: number, life?: number, gravity?: number,
     *   dir?: { x: number, y: number, z: number } | null, intensity?: number, drag?: number, radius?: number }} [opts]
     */
    spawn(x, y, z, count, {
        color = 0xffffff, speed = 3, spread = 1, up = 1.5, life = 0.5, gravity = 6,
        dir = null, intensity = 1.4, drag = 0, radius = 0,
    } = {}) {
        this._c.set(color);
        for (let n = 0; n < count; n++) {
            const i = this.head;
            this.head = (this.head + 1) % this.max;
            const a = Math.random() * Math.PI * 2;
            const ra = radius * Math.sqrt(Math.random());
            this.pos[i * 3] = x + Math.cos(a) * ra;
            this.pos[i * 3 + 1] = y;
            this.pos[i * 3 + 2] = z + Math.sin(a) * ra;
            const r = (0.3 + Math.random() * 0.7) * speed;
            if (dir) {
                this.vel[i * 3] = dir.x * r + (Math.random() - 0.5) * spread * speed * 0.6;
                this.vel[i * 3 + 1] = (dir.y ?? 0) * r + (Math.random() * 0.9 + 0.2) * up;
                this.vel[i * 3 + 2] = dir.z * r + (Math.random() - 0.5) * spread * speed * 0.6;
            } else {
                this.vel[i * 3] = Math.cos(a) * r * spread;
                this.vel[i * 3 + 1] = (Math.random() * 0.9 + 0.2) * up;
                this.vel[i * 3 + 2] = Math.sin(a) * r * spread;
            }
            this.life[i] = life * (0.6 + Math.random() * 0.8);
            this.decay[i] = 1 / this.life[i];
            this.gravity[i] = gravity;
            this.drag[i] = drag;
            const j = (0.8 + Math.random() * 0.35) * intensity;
            this.col[i * 3] = this._c.r * j;
            this.col[i * 3 + 1] = this._c.g * j;
            this.col[i * 3 + 2] = this._c.b * j;
        }
    }

    update(dt) {
        for (let i = 0; i < this.max; i++) {
            if (this.life[i] <= 0) continue;
            this.life[i] -= dt;
            if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
            // Fade by dimming (additive blending), so each particle dies at its own pace.
            const fade = Math.max(0, 1 - dt * this.decay[i] * 0.9);
            this.col[i * 3] *= fade;
            this.col[i * 3 + 1] *= fade;
            this.col[i * 3 + 2] *= fade;
            const k = this.drag[i] > 0 ? Math.max(0, 1 - this.drag[i] * dt) : 1;
            this.vel[i * 3] *= k;
            this.vel[i * 3 + 2] *= k;
            this.vel[i * 3 + 1] -= this.gravity[i] * dt;
            this.pos[i * 3] += this.vel[i * 3] * dt;
            this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
            this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
            if (this.pos[i * 3 + 1] < 0.03) { this.pos[i * 3 + 1] = 0.03; this.vel[i * 3 + 1] *= -0.35; }
        }
        this.geo.attributes.position.needsUpdate = true;
        this.geo.attributes.color.needsUpdate = true;
    }
}

// ================= Weapon Trail =================
const TRAIL_VERT = `
attribute float alpha;
varying float vAlpha;
void main() {
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const TRAIL_FRAG = `
uniform vec3 color;
uniform float opacity;
varying float vAlpha;
void main() {
    float a = vAlpha * opacity;
    gl_FragColor = vec4(color * a, a);
}`;

/**
 * Ribbon swept between the blade's root and tip. Samples are taken every
 * rendered frame while the swing is live and fade out afterwards.
 */
export class WeaponTrail {
    constructor(scene, { segments = 18, color = 0xffffff, intensity = 1.6, opacity = 0.75 } = {}) {
        this.n = segments;
        this.tips = Array.from({ length: segments }, () => new THREE.Vector3());
        this.bases = Array.from({ length: segments }, () => new THREE.Vector3());
        this.count = 0;
        this.fade = 0;
        this.positions = new Float32Array(segments * 2 * 3);
        this.alphas = new Float32Array(segments * 2);
        const index = [];
        for (let i = 0; i < segments - 1; i++) {
            const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
            index.push(a, b, c, b, d, c);
        }
        this.geo = new THREE.BufferGeometry();
        this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
        this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
        this.geo.setIndex(index);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(color).multiplyScalar(intensity) },
                opacity: { value: opacity },
            },
            vertexShader: TRAIL_VERT,
            fragmentShader: TRAIL_FRAG,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
        });
        this.mesh = new THREE.Mesh(this.geo, this.material);
        this.mesh.frustumCulled = false;
        this.mesh.visible = false;
        this.mesh.renderOrder = 6;
        scene.add(this.mesh);
        this._tip = new THREE.Vector3();
        this._base = new THREE.Vector3();
    }

    setColor(color, intensity = 1.6) {
        this.material.uniforms.color.value.set(color).multiplyScalar(intensity);
    }

    /** @param {number} dt @param {boolean} active  @param {THREE.Object3D | null | undefined} tipObj  @param {THREE.Object3D | null | undefined} baseObj */
    update(dt, active, tipObj, baseObj) {
        if (!tipObj || !baseObj) { this.mesh.visible = false; return; }
        if (active) {
            tipObj.getWorldPosition(this._tip);
            baseObj.getWorldPosition(this._base);
            // A fresh swing restarts the ribbon instead of bridging from the last one.
            if (this.fade <= 0) this.count = 0;
            const last = this.tips.pop();
            const lastBase = this.bases.pop();
            this.tips.unshift(last.copy(this._tip));
            this.bases.unshift(lastBase.copy(this._base));
            this.count = Math.min(this.n, this.count + 1);
            this.fade = 1;
        } else if (this.fade > 0) {
            this.fade = Math.max(0, this.fade - dt * 5.5);
            if (this.fade === 0) this.count = 0;
        }
        if (this.count < 2 || this.fade <= 0) { this.mesh.visible = false; return; }
        const p = this.positions;
        const al = this.alphas;
        for (let i = 0; i < this.n; i++) {
            const k = Math.min(i, this.count - 1);
            const tip = this.tips[k];
            const base = this.bases[k];
            // Bias the inner edge toward the tip so the ribbon reads as a blade arc.
            p[i * 6] = base.x + (tip.x - base.x) * 0.35;
            p[i * 6 + 1] = base.y + (tip.y - base.y) * 0.35;
            p[i * 6 + 2] = base.z + (tip.z - base.z) * 0.35;
            p[i * 6 + 3] = tip.x;
            p[i * 6 + 4] = tip.y;
            p[i * 6 + 5] = tip.z;
            const life = i < this.count ? Math.pow(1 - i / (this.count - 1 || 1), 1.6) * this.fade : 0;
            al[i * 2] = life * 0.05;
            al[i * 2 + 1] = life;
        }
        this.geo.attributes.position.needsUpdate = true;
        this.geo.attributes.alpha.needsUpdate = true;
        this.mesh.visible = true;
    }

    dispose() {
        this.mesh.removeFromParent();
        this.geo.dispose();
        this.material.dispose();
    }
}

// ================= Shockwave rings =================
export class ShockwavePool {
    constructor(scene, size = 6) {
        this.items = [];
        const ring = new THREE.RingGeometry(0.82, 1, 72).rotateX(-Math.PI / 2);
        const disc = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
        for (let i = 0; i < size; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
                depthWrite: false, side: THREE.DoubleSide,
            });
            const flashMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, map: glowTexture(), transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
            });
            const mesh = new THREE.Mesh(ring, material);
            const flash = new THREE.Mesh(disc, flashMat);
            mesh.visible = flash.visible = false;
            mesh.renderOrder = flash.renderOrder = 4;
            scene.add(mesh, flash);
            this.items.push({ mesh, flash, t: 0, duration: 1, radius: 1, active: false, color: new THREE.Color() });
        }
        this.head = 0;
    }

    spawn(x, z, { radius = 3, duration = 0.55, color = 0xffb066, intensity = 1.8, y = 0.06 } = {}) {
        const item = this.items[this.head];
        this.head = (this.head + 1) % this.items.length;
        item.t = 0;
        item.duration = duration;
        item.radius = radius;
        item.active = true;
        item.color.set(color).multiplyScalar(intensity);
        item.mesh.material.color.copy(item.color);
        item.flash.material.color.copy(item.color);
        item.mesh.position.set(x, y, z);
        item.flash.position.set(x, y - 0.01, z);
        item.mesh.visible = item.flash.visible = true;
        this.update(0);
    }

    update(dt) {
        for (const item of this.items) {
            if (!item.active) continue;
            item.t += dt;
            const k = Math.min(1, item.t / item.duration);
            const grow = 1 - Math.pow(1 - k, 3);
            const r = Math.max(0.05, item.radius * (0.15 + grow * 0.85));
            item.mesh.scale.set(r, 1, r);
            item.mesh.material.opacity = (1 - k) * 0.95;
            item.flash.scale.set(item.radius * 0.9, 1, item.radius * 0.9);
            item.flash.material.opacity = Math.max(0, 1 - k * 2.4) * 0.85;
            if (k >= 1) {
                item.active = false;
                item.mesh.visible = item.flash.visible = false;
            }
        }
    }
}

// ================= Area telegraph =================
/** Danger disc that fills toward its edge as an area attack charges. */
export class AreaTelegraph {
    constructor(scene) {
        this.edge = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 96).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4a2a).multiplyScalar(1.6), transparent: true,
                opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        this.fill = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0xff3a1c, map: glowTexture(), transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false }));
        this.edge.visible = this.fill.visible = false;
        this.edge.renderOrder = this.fill.renderOrder = 4;
        scene.add(this.edge, this.fill);
        this.t = 0;
        this.duration = 1;
        this.radius = 1;
        this.active = false;
        this.follow = null;
    }

    /** @param {{ x: number, z: number } | null} follow keeps the disc centred on a moving caster */
    show(x, z, radius, duration, follow = null) {
        this.t = 0;
        this.duration = Math.max(0.1, duration);
        this.radius = radius;
        this.active = true;
        this.follow = follow;
        this.edge.position.set(x, 0.05, z);
        this.fill.position.set(x, 0.045, z);
        this.edge.scale.set(radius, 1, radius);
        this.edge.visible = this.fill.visible = true;
    }

    hide() {
        this.active = false;
        this.edge.visible = this.fill.visible = false;
    }

    update(dt) {
        if (!this.active) return;
        this.t += dt;
        if (this.follow) {
            this.edge.position.x = this.fill.position.x = this.follow.x;
            this.edge.position.z = this.fill.position.z = this.follow.z;
        }
        const k = Math.min(1, this.t / this.duration);
        const pulse = 0.65 + Math.sin(this.t * 18) * 0.25;
        this.edge.material.opacity = (0.35 + k * 0.6) * pulse;
        const r = this.radius * (0.1 + k * 0.9);
        this.fill.scale.set(r * 1.25, 1, r * 1.25);
        this.fill.material.opacity = 0.25 + k * 0.45;
        if (this.t >= this.duration + 0.05) this.hide();
    }
}

// ================= Impact light =================
/** One always-present point light; flashing never changes the shader light count. */
export class ImpactLight {
    constructor(scene) {
        this.light = new THREE.PointLight(0xffa860, 0, 9, 1.6);
        this.light.position.set(0, -50, 0);
        scene.add(this.light);
        this.t = 0;
        this.peak = 0;
        this.duration = 0.2;
    }

    flash(x, y, z, { color = 0xffa860, intensity = 28, duration = 0.22 } = {}) {
        this.light.color.set(color);
        this.light.position.set(x, y, z);
        this.peak = intensity;
        this.duration = duration;
        this.t = 0;
    }

    update(dt) {
        if (this.peak <= 0) return;
        this.t += dt;
        const k = Math.min(1, this.t / this.duration);
        this.light.intensity = this.peak * (1 - k) * (1 - k);
        if (k >= 1) { this.peak = 0; this.light.intensity = 0; }
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
const PHASE_NAMES = { 1: 'THE OATHBOUND', 2: 'NIGHTMARE AWAKENS', 3: 'ASHEN FURY' };

export class HUD {
    constructor(container, getText) {
        this.getText = getText;
        const root = document.createElement('div');
        root.className = 'game-hud';
        root.innerHTML = `
            <div class="hud-player">
                <div class="hud-bar hud-hp"><div class="hud-bar-lag"></div><div class="hud-bar-fill"></div></div>
                <div class="hud-bar hud-stamina"><div class="hud-bar-fill"></div></div>
            </div>
            <div class="hud-item" aria-hidden="true">
                <div class="hud-flask-icon"><span class="hud-flask-liquid"></span></div>
                <div class="hud-flask-count"></div>
                <div class="hud-item-label"></div>
            </div>
            <div class="hud-boss">
                <div class="hud-boss-head">
                    <div class="hud-boss-name"></div>
                    <div class="hud-boss-dmg"></div>
                </div>
                <div class="hud-bar hud-boss-hp"><div class="hud-bar-lag"></div><div class="hud-bar-fill"></div></div>
                <div class="hud-bar hud-poise"><div class="hud-bar-fill"></div></div>
                <div class="hud-phase"></div>
            </div>
            <div class="hud-tell"></div>
            <div class="hud-lock"></div>
            <div class="hud-center"></div>
            <div class="hud-flash"></div>
            <div class="hud-numbers"></div>
        `;
        container.appendChild(root);
        this.root = root;
        this.hpFill = root.querySelector('.hud-hp .hud-bar-fill');
        this.hpLag = root.querySelector('.hud-hp .hud-bar-lag');
        this.stFill = root.querySelector('.hud-stamina .hud-bar-fill');
        this.bossFill = root.querySelector('.hud-boss-hp .hud-bar-fill');
        this.bossLag = root.querySelector('.hud-boss-hp .hud-bar-lag');
        this.poiseFill = root.querySelector('.hud-poise .hud-bar-fill');
        this.bossName = root.querySelector('.hud-boss-name');
        this.bossDmg = root.querySelector('.hud-boss-dmg');
        this.bossWrap = root.querySelector('.hud-boss');
        this.itemWrap = root.querySelector('.hud-item');
        this.flaskCount = root.querySelector('.hud-flask-count');
        this.flaskLiquid = root.querySelector('.hud-flask-liquid');
        this.itemLabel = root.querySelector('.hud-item-label');
        this.itemLabel.textContent = this.getText('FLASK');
        this.phaseEl = root.querySelector('.hud-phase');
        this.tellEl = root.querySelector('.hud-tell');
        this.lockEl = root.querySelector('.hud-lock');
        this.center = root.querySelector('.hud-center');
        this.flashEl = root.querySelector('.hud-flash');
        this.numbers = root.querySelector('.hud-numbers');
        this._last = { hp: -1, st: -1, boss: -1, estus: -1, poise: -1, phase: 0 };
        this._numPool = [];
        this._flashTimer = null;
        this._tellTimer = null;
        this._centerTimer = null;
        this._dmgTimer = null;
        this._dmgTotal = 0;
        this._retryHandler = null;
    }

    setBossName(name) { this.bossName.textContent = name; }
    showBossBar(show) { this.bossWrap.classList.toggle('visible', show); }

    /** The lag layer holds lost health for a beat, then drains (the pale chunk). */
    _setLagged(fill, lag, value, previous) {
        fill.style.transform = `scaleX(${value})`;
        if (value >= previous || previous < 0) {
            lag.style.transition = 'none';
            lag.style.transform = `scaleX(${value})`;
            void lag.offsetWidth;
            lag.style.transition = '';
        } else {
            lag.style.transform = `scaleX(${value})`;
        }
    }

    setBars(hp, stamina, estus, estusMax, bossHp) {
        const l = this._last;
        const hpv = Math.max(0, Math.min(1, hp));
        if (hpv !== l.hp) { this._setLagged(this.hpFill, this.hpLag, hpv, l.hp); l.hp = hpv; }
        if (stamina !== l.st) {
            this.stFill.style.transform = `scaleX(${Math.max(0, stamina)})`;
            this.root.classList.toggle('stamina-low', stamina < 0.2);
            l.st = stamina;
        }
        if (bossHp !== undefined) {
            const bv = Math.max(0, Math.min(1, bossHp));
            if (bv !== l.boss) { this._setLagged(this.bossFill, this.bossLag, bv, l.boss); l.boss = bv; }
        }
        if (estus !== l.estus) {
            l.estus = estus;
            this.flaskCount.textContent = String(estus);
            this.flaskLiquid.style.transform = `scaleY(${estusMax ? Math.max(0.12, estus / estusMax) : 0})`;
            this.itemWrap.classList.toggle('empty', estus <= 0);
        }
    }

    /** Boss poise bar, phase line, and the riposte cue on the lock marker. */
    setBoss(hp, poise, phase, vulnerable) {
        const l = this._last;
        const hpFrac = Math.max(0, Math.min(1, hp));
        if (hpFrac !== l.boss) { this._setLagged(this.bossFill, this.bossLag, hpFrac, l.boss); l.boss = hpFrac; }
        const poiseFrac = Math.max(0, Math.min(1, poise));
        if (poiseFrac !== l.poise) { this.poiseFill.style.transform = `scaleX(${poiseFrac})`; l.poise = poiseFrac; }
        if (phase !== l.phase) { this.setPhase(phase); l.phase = phase; }
        this.lockEl.classList.toggle('riposte', Boolean(vulnerable));
    }

    setPhase(phase) {
        const label = this.getText('PHASE');
        const name = this.getText(PHASE_NAMES[phase] || PHASE_NAMES[1]);
        this.phaseEl.textContent = `${label} ${phase} · ${name}`;
        this.bossWrap.dataset.phase = String(phase);
    }

    /** Running damage total beside the boss name, as in the source games. */
    bossDamage(amount) {
        this._dmgTotal += Math.max(0, Math.round(amount));
        this.bossDmg.textContent = String(this._dmgTotal);
        this.bossDmg.classList.remove('pop');
        void this.bossDmg.offsetWidth;
        this.bossDmg.classList.add('pop');
        clearTimeout(this._dmgTimer);
        this._dmgTimer = setTimeout(() => { this._dmgTotal = 0; this.bossDmg.textContent = ''; }, 2600);
    }

    resetBossDamage() {
        clearTimeout(this._dmgTimer);
        this._dmgTotal = 0;
        this.bossDmg.textContent = '';
    }

    /** Transient combat line (tell warnings, heal confirmations). */
    setTell(text, { danger = false, duration = 1600 } = {}) {
        this.tellEl.textContent = text;
        this.tellEl.classList.toggle('danger', danger);
        clearTimeout(this._tellTimer);
        if (text && duration > 0) {
            this._tellTimer = setTimeout(() => { this.tellEl.textContent = ''; }, duration);
        }
    }

    /** World-anchored lock-on marker in canvas pixels. */
    showLock(show, x = 0, y = 0) {
        this.lockEl.style.display = show ? 'block' : 'none';
        if (show) {
            this.lockEl.style.left = `${x}px`;
            this.lockEl.style.top = `${y}px`;
        }
    }

    setLowHealth(on) {
        this.root.classList.toggle('low-health', Boolean(on));
    }

    /** Big centered text (countdown, YOU DIED, ENEMY FELLED...).
     * @param {string} text
     * @param {{ cls?: string, duration?: number, retry?: string | null, onRetry?: (() => void) | null, sub?: string }} [options]
     */
    showCenter(text, { cls = '', duration = 0, retry = null, onRetry = null, sub = '' } = {}) {
        clearTimeout(this._centerTimer);
        this._retryHandler = null;
        const retryHtml = retry ? `<button type="button" class="game-primary hud-retry">${retry}</button>` : '';
        const subHtml = sub ? `<div class="hud-sub">${sub}</div>` : '';
        this.center.innerHTML = text
            ? `<div class="hud-center-text ${cls}"><span class="hud-center-word">${text}</span>${subHtml}</div>${retryHtml}`
            : '';
        if (retry && onRetry) {
            const button = this.center.querySelector('.hud-retry');
            this._retryHandler = onRetry;
            button?.addEventListener('click', () => {
                const handler = this._retryHandler;
                this._retryHandler = null;
                handler?.();
            });
        }
        if (duration > 0) {
            this._centerTimer = setTimeout(() => { this.center.innerHTML = ''; this._retryHandler = null; }, duration);
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
        el.style.setProperty('--dy', '-40px');
        clearTimeout(el._t);
        el._t = setTimeout(() => { el.classList.remove('on'); this._numPool.push(el); }, 800);
    }

    destroy() {
        clearTimeout(this._flashTimer);
        clearTimeout(this._tellTimer);
        clearTimeout(this._centerTimer);
        clearTimeout(this._dmgTimer);
        this._retryHandler = null;
        this.root.remove();
    }
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
