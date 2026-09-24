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
            const minDist = pr + obs.r;

            // Fast AABB pre-filter (eliminates 95% of distance math)
            const dx = px - obs.x;
            if (dx > minDist || dx < -minDist) continue;
            const dy = py - obs.y;
            if (dy > minDist || dy < -minDist) continue;

            if (dx * dx + dy * dy < minDist * minDist) {
                return true;
            }
        }
        return false;
    }

    // Move entity with separate axis collision, circular tangent sliding, and overlap pushback
    moveEntity(entity, dx, dy, speed) {
        const pr = entity.r || 14;
        const targetX = entity.x + dx * speed;
        const targetY = entity.y + dy * speed;

        // 1. Try direct unobstructed movement
        if (!this.checkCollisionCircle(targetX, targetY, pr)) {
            entity.x = targetX;
            entity.y = targetY;
            return true;
        }

        let moved = false;

        // 2. Separate axis sliding (maintain full movement speed along the unobstructed axis)
        const canMoveX = !this.checkCollisionCircle(targetX, entity.y, pr);
        const canMoveY = !this.checkCollisionCircle(entity.x, targetY, pr);

        if (canMoveX && !canMoveY && Math.abs(dx) > 0.001) {
            // Y blocked: slide horizontally at full speed
            const slideX = entity.x + Math.sign(dx) * speed;
            if (!this.checkCollisionCircle(slideX, entity.y, pr)) {
                entity.x = slideX;
            } else {
                entity.x = targetX;
            }
            moved = true;
        } else if (canMoveY && !canMoveX && Math.abs(dy) > 0.001) {
            // X blocked: slide vertically at full speed
            const slideY = entity.y + Math.sign(dy) * speed;
            if (!this.checkCollisionCircle(entity.x, slideY, pr)) {
                entity.y = slideY;
            } else {
                entity.y = targetY;
            }
            moved = true;
        }

        // 3. Tangent sliding against circular obstacles
        if (!moved) {
            for (let i = 0; i < this.obstacles.length; i++) {
                const obs = this.obstacles[i];
                if (!obs.r || obs.r <= 0) continue;

                const ox = entity.x - obs.x;
                const oy = entity.y - obs.y;
                const distSq = ox * ox + oy * oy;
                const minDist = pr + obs.r;

                // If within collision influence radius
                if (distSq < (minDist + speed) * (minDist + speed) && distSq > 0.0001) {
                    const dist = Math.sqrt(distSq);
                    const nx = ox / dist;
                    const ny = oy / dist;

                    // Dot product of velocity with normal
                    const vx = dx * speed;
                    const vy = dy * speed;
                    const dot = vx * nx + vy * ny;

                    if (dot < 0) {
                        // Project velocity onto obstacle tangent
                        const slideX = vx - dot * nx;
                        const slideY = vy - dot * ny;
                        const slideLen = Math.hypot(slideX, slideY);

                        if (slideLen > 0.001) {
                            // 1st priority: Glide at full speed along circular perimeter tangent
                            const fullSlideX = (slideX / slideLen) * speed;
                            const fullSlideY = (slideY / slideLen) * speed;
                            const testFullX = entity.x + fullSlideX;
                            const testFullY = entity.y + fullSlideY;

                            if (!this.checkCollisionCircle(testFullX, testFullY, pr)) {
                                entity.x = testFullX;
                                entity.y = testFullY;
                                moved = true;
                                break;
                            }
                        }

                        // 2nd priority: Fallback to direct tangent projection if full slide blocked
                        const testX = entity.x + slideX;
                        const testY = entity.y + slideY;

                        if (!this.checkCollisionCircle(testX, testY, pr)) {
                            entity.x = testX;
                            entity.y = testY;
                            moved = true;
                            break;
                        }
                    }
                }
            }
        }

        // 4. Overlap resolution to prevent sticking or penetration
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            if (!obs.r || obs.r <= 0) continue;
            const minDist = pr + obs.r;

            const ox = entity.x - obs.x;
            if (ox > minDist || ox < -minDist) continue;
            const oy = entity.y - obs.y;
            if (oy > minDist || oy < -minDist) continue;

            const distSq = ox * ox + oy * oy;
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
