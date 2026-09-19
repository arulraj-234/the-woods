export class Physics {
    constructor(isInfinite = true) {
        this.isInfinite = isInfinite;
        this.obstacles = []; // { x, y, r, type }
    }

    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    addObstacle(x, y, r, type = 'obstacle') {
        this.obstacles.push({ x, y, r, type });
    }

    // Check collision for circle against all active obstacles
    checkCollisionCircle(px, py, pr = 14) {
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            if (!obs.r || obs.r <= 0) continue;
            const dx = px - obs.x;
            const dy = py - obs.y;
            const minDist = pr + obs.r;
            if (dx * dx + dy * dy < minDist * minDist) {
                return true;
            }
        }
        return false;
    }

    // Move entity with separate axis collision and smooth circular slide resolution
    moveEntity(entity, dx, dy, speed) {
        const pr = entity.r || 14;
        const targetX = entity.x + dx * speed;
        const targetY = entity.y + dy * speed;

        let moved = false;

        // 1. Try moving directly
        if (!this.checkCollisionCircle(targetX, targetY, pr)) {
            entity.x = targetX;
            entity.y = targetY;
            moved = true;
        } else {
            // 2. Separate axis slide
            if (!this.checkCollisionCircle(targetX, entity.y, pr)) {
                entity.x = targetX;
                moved = true;
            }
            if (!this.checkCollisionCircle(entity.x, targetY, pr)) {
                entity.y = targetY;
                moved = true;
            }
        }

        // 3. Smooth circular overlap resolve to prevent sticking/jittering against cylinders
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            if (!obs.r || obs.r <= 0) continue;
            const ox = entity.x - obs.x;
            const oy = entity.y - obs.y;
            const distSq = ox * ox + oy * oy;
            const minDist = pr + obs.r;
            if (distSq < minDist * minDist && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                entity.x += (ox / dist) * overlap;
                entity.y += (oy / dist) * overlap;
                moved = true;
            }
        }

        return moved;
    }
}
