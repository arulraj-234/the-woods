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

    // Move entity with separate axis collision for smooth sliding around obstacles
    moveEntity(entity, dx, dy, speed) {
        const pr = entity.r || 14;
        const nextX = entity.x + dx * speed;
        const nextY = entity.y + dy * speed;

        let movedX = false;
        let movedY = false;

        // X Axis
        if (!this.checkCollisionCircle(nextX, entity.y, pr)) {
            entity.x = nextX;
            movedX = true;
        }

        // Y Axis
        if (!this.checkCollisionCircle(entity.x, nextY, pr)) {
            entity.y = nextY;
            movedY = true;
        }

        return movedX || movedY;
    }
}

