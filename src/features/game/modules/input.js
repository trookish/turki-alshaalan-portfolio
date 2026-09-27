/**
 * Analog joystick with a radial deadzone and a single owning pointer.
 * @param {HTMLElement} element
 * @param {HTMLElement | null} knob
 * @param {(x: number, y: number) => void} onMove
 */
export function bindJoystick(element, knob, onMove) {
    let pointer = null;
    let rect;
    let radius = 1;
    const place = (x, y) => {
        if (knob) knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    };
    const reset = () => {
        const id = pointer;
        pointer = null;
        if (id !== null && element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
        place(0, 0);
        onMove(0, 0);
    };
    const move = (event) => {
        if (event.pointerId !== pointer) return;
        const dx = event.clientX - rect.left - rect.width / 2;
        const dy = event.clientY - rect.top - rect.height / 2;
        const distance = Math.hypot(dx, dy);
        const magnitude = Math.min(1, distance / radius);
        const x = distance ? dx / distance : 0;
        const y = distance ? dy / distance : 0;
        place(x * magnitude * radius, y * magnitude * radius);
        const analog = magnitude <= 0.13 ? 0 : (magnitude - 0.13) / 0.87;
        onMove(x * analog, y * analog);
    };
    const down = (event) => {
        if (pointer !== null || event.button > 0) return;
        event.preventDefault();
        pointer = event.pointerId;
        rect = element.getBoundingClientRect();
        radius = Math.max(1, rect.width * 0.34);
        element.setPointerCapture(pointer);
        move(event);
    };
    const up = (event) => {
        if (event.pointerId === pointer) reset();
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(type, up);
    return {
        reset,
        dispose() {
            reset();
            element.removeEventListener('pointerdown', down);
            element.removeEventListener('pointermove', move);
            for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) element.removeEventListener(type, up);
        },
    };
}

/** Pointer ownership prevents one thumb from releasing another thumb's action. */
export function bindPointerButton(element, onDown, onUp = () => {}) {
    let pointer = null;
    let disposed = false;
    const reset = () => {
        if (pointer === null) return;
        const id = pointer;
        pointer = null;
        element.classList.remove('active');
        if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
        onUp();
    };
    const down = (event) => {
        if (disposed || pointer !== null || event.button > 0) return;
        event.preventDefault();
        pointer = event.pointerId;
        element.setPointerCapture(pointer);
        element.classList.add('active');
        onDown();
    };
    const up = (event) => {
        if (event.pointerId === pointer) reset();
    };
    element.addEventListener('pointerdown', down);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(type, up);
    return {
        reset,
        dispose() {
            if (disposed) return;
            disposed = true;
            reset();
            element.removeEventListener('pointerdown', down);
            for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) element.removeEventListener(type, up);
        },
    };
}
