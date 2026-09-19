export class InputHandler {
    constructor() {
        this.keys = {};
        this.attached = false;
        this.attach();
    }

    attach() {
        if (!this.attached) {
            window.addEventListener('keydown', this.handleKeyDown);
            window.addEventListener('keyup', this.handleKeyUp);
            window.addEventListener('blur', this.handleBlur);
            this.attached = true;
        }
    }

    handleBlur = () => {
        this.keys = {};
    };

    handleKeyDown = (e) => {
        this.keys[e.code] = true;
        if (e.key) {
            this.keys[e.key.toLowerCase()] = true;
        }
    };

    handleKeyUp = (e) => {
        this.keys[e.code] = false;
        if (e.key) {
            this.keys[e.key.toLowerCase()] = false;
        }
    };

    isDown(...codes) {
        return codes.some(code => !!this.keys[code]);
    }

    isSprinting() {
        return this.isDown('ShiftLeft', 'ShiftRight', 'shift', 'Space', ' ');
    }

    getAxis() {
        let dx = 0;
        let dy = 0;

        if (this.isDown('ArrowUp', 'KeyW', 'w', 'W')) dy -= 1;
        if (this.isDown('ArrowDown', 'KeyS', 's', 'S')) dy += 1;
        if (this.isDown('ArrowLeft', 'KeyA', 'a', 'A')) dx -= 1;
        if (this.isDown('ArrowRight', 'KeyD', 'd', 'D')) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        return { dx, dy };
    }

    cleanup() {
        if (this.attached) {
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
            window.removeEventListener('blur', this.handleBlur);
            this.attached = false;
        }
        this.keys = {};
    }
}
