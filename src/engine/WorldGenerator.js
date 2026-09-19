// Infinite procedural chunk-based world generator with diverse biomes and landmark generation

import { SPRITE_DEFS } from './Assets.js';

export const CHUNK_SIZE = 800;

// Seeded deterministic pseudo-random generator
function hash2(x, y, seed = 1337) {
    let h = seed ^ (x * 374761393) ^ (y * 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
}

function createRNG(seed) {
    let s = seed;
    return function() {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const SHRINE_TEMPLATES = [
    { key: 'prop_statue_angel', name: 'Shrine of the Seraph', radius: 24 },
    { key: 'prop_gazebo_shrine', name: 'Sanctuary of Light', radius: 34 },
    { key: 'prop_obelisk_rune', name: 'Runic Monolith of Warding', radius: 18 },
    { key: 'prop_stone_dais', name: 'Ancient Celestial Altar', radius: 26 }
];

// Biome definitions
const BIOMES = [
    {
        name: 'Lush Forest',
        trees: ['tree_green_oak', 'tree_green_tall', 'tree_green_pine', 'tree_green_round', 'tree_green_grand', 'tree_cypress_green'],
        rocks: ['rock_mossy_large', 'rock_grey_cluster'],
        props: ['bush_green'],
        torchChance: 0.14
    },
    {
        name: 'Autumn Grove',
        trees: ['tree_autumn_oak', 'tree_autumn_tall', 'tree_autumn_round', 'tree_cypress_autumn'],
        rocks: ['rock_slate', 'rock_grey_cluster'],
        props: ['bush_autumn'],
        torchChance: 0.16
    },
    {
        name: 'Enchanted Darkwoods',
        trees: ['tree_dark_oak', 'tree_dark_tall', 'tree_dark_grand', 'tree_dead_twisted'],
        rocks: ['rock_red_pillar', 'rock_mossy_large'],
        props: ['bush_dusk'],
        torchChance: 0.12
    },
    {
        name: 'Ancient Ruins',
        trees: ['tree_cypress_green', 'tree_dark_tall', 'tree_dead_twisted'],
        rocks: ['rock_slate', 'rock_mossy_large', 'rock_red_pillar'],
        props: ['prop_portal_base', 'rock_red_pillar', 'bush_green'],
        torchChance: 0.22
    }
];

export class WorldGenerator {
    constructor() {
        this.chunks = new Map(); // key: `${cx},${cy}` -> Chunk
        this.lastPruneTime = 0;
    }

    getChunk(cx, cy) {
        const key = `${cx},${cy}`;
        if (this.chunks.has(key)) {
            const chunk = this.chunks.get(key);
            chunk.lastAccess = Date.now();
            return chunk;
        }

        const chunk = this.generateChunk(cx, cy);
        this.chunks.set(key, chunk);
        return chunk;
    }

    generateChunk(cx, cy) {
        const seed = hash2(cx, cy);
        const rng = createRNG(seed);

        // Determine biome deterministically using coarse noise
        const biomeIndex = Math.floor(rng() * BIOMES.length);
        const biome = BIOMES[biomeIndex];

        const objects = [];
        const worldStartX = cx * CHUNK_SIZE;
        const worldStartY = cy * CHUNK_SIZE;

        // Dedicated Sacred Shrine Generation: Exactly 1 guaranteed shrine per 3x3 macro chunk grid (2400x2400px)
        let hasShrine = false;
        let shrineX = 0;
        let shrineY = 0;
        let shrineTemplate = null;

        const macroGridSize = 3; // 3x3 chunks = 2400x2400px
        const macroX = Math.floor(cx / macroGridSize);
        const macroY = Math.floor(cy / macroGridSize);
        const macroSeed = hash2(macroX, macroY, 8492);
        const macroRng = createRNG(macroSeed);

        let sChunkOffsetX = Math.floor(macroRng() * macroGridSize);
        let sChunkOffsetY = Math.floor(macroRng() * macroGridSize);

        let targetShrineCX = macroX * macroGridSize + sChunkOffsetX;
        let targetShrineCY = macroY * macroGridSize + sChunkOffsetY;

        // Prevent shrine from spawning directly inside the immediate 3x3 spawn buffer zone (chunks [-1..1], [-1..1])
        if (Math.abs(targetShrineCX) <= 1 && Math.abs(targetShrineCY) <= 1) {
            const signX = macroX >= 0 ? 1 : -1;
            const signY = macroY >= 0 ? 1 : -1;
            targetShrineCX = signX * 2;
            targetShrineCY = signY * 2;
        }

        if (cx === targetShrineCX && cy === targetShrineCY) {
            hasShrine = true;
            shrineX = worldStartX + 180 + macroRng() * (CHUNK_SIZE - 360);
            shrineY = worldStartY + 180 + macroRng() * (CHUNK_SIZE - 360);
            shrineTemplate = SHRINE_TEMPLATES[Math.floor(macroRng() * SHRINE_TEMPLATES.length)];
        }

        if (hasShrine && shrineTemplate) {
            objects.push({
                x: shrineX,
                y: shrineY,
                r: shrineTemplate.radius,
                spriteKey: shrineTemplate.key,
                isShrine: true,
                shrineName: shrineTemplate.name,
                activated: false,
                hasTorch: false,
                type: 'shrine'
            });
        }

        // Rare ancient cosmic portals in Ancient Ruins (at least 2000px away from spawn)
        const hasPortal = biome.name === 'Ancient Ruins' && rng() < 0.05 && Math.hypot(worldStartX, worldStartY) > 2000;
        if (hasPortal) {
            const px = worldStartX + 200 + rng() * 400;
            const py = worldStartY + 200 + rng() * 400;
            objects.push({
                x: px,
                y: py,
                r: 45,
                spriteKey: 'portal_animated',
                isPortal: true,
                hasTorch: false,
                type: 'portal'
            });
        }

        // Number of nature objects in chunk (7 to 12)
        const count = 7 + Math.floor(rng() * 6);

        for (let i = 0; i < count; i++) {
            const x = worldStartX + 50 + rng() * (CHUNK_SIZE - 100);
            const y = worldStartY + 50 + rng() * (CHUNK_SIZE - 100);

            // Safe clearing around spawn (0, 0)
            if (Math.hypot(x, y) < 220) continue;

            // Safe clearing around shrine if present in chunk
            if (hasShrine && Math.hypot(x - shrineX, y - shrineY) < 85) continue;

            const roll = rng();
            let spriteKey;

            if (roll < 0.65) {
                // Tree
                spriteKey = biome.trees[Math.floor(rng() * biome.trees.length)];
            } else if (roll < 0.88) {
                // Rock
                spriteKey = biome.rocks[Math.floor(rng() * biome.rocks.length)];
            } else {
                // Bush
                spriteKey = biome.props[Math.floor(rng() * biome.props.length)];
            }

            const def = SPRITE_DEFS[spriteKey];
            if (!def) continue;

            // Check if object holds a torch
            const isTreeOrRuin = def.type === 'tree' || def.type === 'ruin';
            const hasTorch = isTreeOrRuin && rng() < biome.torchChance;

            objects.push({
                x,
                y,
                r: def.colliderR,
                spriteKey,
                hasTorch,
                type: def.type
            });
        }

        return {
            cx,
            cy,
            biome: biome.name,
            objects,
            lastAccess: Date.now()
        };
    }

    // Returns all chunks currently visible on screen + padding
    getVisibleChunks(camX, camY, viewW, viewH) {
        const minCX = Math.floor((camX - 100) / CHUNK_SIZE);
        const maxCX = Math.floor((camX + viewW + 100) / CHUNK_SIZE);
        const minCY = Math.floor((camY - 100) / CHUNK_SIZE);
        const maxCY = Math.floor((camY + viewH + 100) / CHUNK_SIZE);

        const visibleChunks = [];
        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cy = minCY; cy <= maxCY; cy++) {
                visibleChunks.push(this.getChunk(cx, cy));
            }
        }

        this.pruneDistantChunks(minCX, maxCX, minCY, maxCY);
        return visibleChunks;
    }

    // Keep memory low by removing chunks far away from player
    pruneDistantChunks(minCX, maxCX, minCY, maxCY) {
        const now = Date.now();
        if (now - this.lastPruneTime < 5000) return;
        this.lastPruneTime = now;

        const margin = 4;
        for (const [key, chunk] of this.chunks.entries()) {
            if (
                chunk.cx < minCX - margin ||
                chunk.cx > maxCX + margin ||
                chunk.cy < minCY - margin ||
                chunk.cy > maxCY + margin
            ) {
                this.chunks.delete(key);
            }
        }
    }
}
