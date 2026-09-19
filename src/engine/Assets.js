// Asset manager and sprite dictionary for 2.5D pixel-art graphics

function processSpriteTransparency(img, threshold = 228) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = d[idx];
            const g = d[idx + 1];
            const b = d[idx + 2];

            // Remove white/near-white background
            if (r > threshold && g > threshold && b > threshold) {
                d[idx + 3] = 0;
            } else {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);

    // Crop to character bounding box
    const pad = 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(canvas.width - 1, maxX + pad);
    maxY = Math.min(canvas.height - 1, maxY + pad);

    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const cCtx = croppedCanvas.getContext('2d');
    cCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    return croppedCanvas;
}

function extractCharacterSprite(img, col, row) {
    const colW = (img.naturalWidth || img.width) / 3;
    const rowH = (img.naturalHeight || img.height) / 2;
    const sx = col * colW;
    const sy = row * rowH;

    const targetW = 320;
    const targetH = 600;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetW;
    tempCanvas.height = targetH;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(img, sx, sy, colW, rowH, 0, 0, targetW, targetH);

    const imgData = tCtx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;

    // Background seed color from top-left corner
    const bgR = d[0], bgG = d[1], bgB = d[2];

    const isBgPixel = (x, y) => {
        const idx = (y * targetW + x) * 4;
        const r = d[idx], g = d[idx + 1], b = d[idx + 2];
        const dist = Math.hypot(r - bgR, g - bgG, b - bgB);

        // Outside cream background
        if (dist < 65 || (r > 195 && g > 190 && b > 180 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25)) return true;

        // Ground shadow on floor (below knees/feet level)
        if (y > targetH * 0.66) {
            if (r > 85 && g > 85 && b > 80 && Math.abs(r - g) < 45 && Math.abs(g - b) < 45 && Math.abs(r - b) < 55) {
                return true;
            }
        }

        return false;
    };

    // Flood fill (BFS) from all 4 borders
    const visited = new Uint8Array(targetW * targetH);
    const queue = [];

    // Push top and bottom borders
    for (let x = 0; x < targetW; x++) {
        queue.push(x, 0);
        visited[x] = 1;
        queue.push(x, targetH - 1);
        visited[(targetH - 1) * targetW + x] = 1;
    }
    // Push left and right borders
    for (let y = 0; y < targetH; y++) {
        queue.push(0, y);
        visited[y * targetW] = 1;
        queue.push(targetW - 1, y);
        visited[y * targetW + (targetW - 1)] = 1;
    }

    let head = 0;
    while (head < queue.length) {
        const qx = queue[head++];
        const qy = queue[head++];
        const qIdx = (qy * targetW + qx) * 4;

        if (isBgPixel(qx, qy)) {
            d[qIdx + 3] = 0; // Make transparent

            // Expand to 4 orthogonal neighbors
            const neighbors = [
                qx + 1, qy,
                qx - 1, qy,
                qx, qy + 1,
                qx, qy - 1
            ];
            for (let i = 0; i < 8; i += 2) {
                const nx = neighbors[i];
                const ny = neighbors[i + 1];
                if (nx >= 0 && nx < targetW && ny >= 0 && ny < targetH) {
                    const nPos = ny * targetW + nx;
                    if (!visited[nPos]) {
                        visited[nPos] = 1;
                        queue.push(nx, ny);
                    }
                }
            }
        }
    }

    tCtx.putImageData(imgData, 0, 0);

    // Find accurate bounding box of remaining character pixels
    let minX = targetW, minY = targetH, maxX = 0, maxY = 0;
    for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
            if (d[(y * targetW + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (minX > maxX || minY > maxY) {
        minX = 0; minY = 0; maxX = targetW - 1; maxY = targetH - 1;
    }

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    const cropped = document.createElement('canvas');
    cropped.width = cropW;
    cropped.height = cropH;
    const cCtx = cropped.getContext('2d');
    cCtx.drawImage(tempCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    return cropped;
}

class AssetManager {
    constructor() {
        this.images = {};
        this.characterThumbs = {};
        this.loaded = false;
        this.loadPromise = null;
    }

    loadAll() {
        if (this.loadPromise) return this.loadPromise;

        const assetUrls = {
            plants: '/assets/plants.png',
            props: '/assets/props.png',
            portal: '/assets/portal.png',
            environment: '/assets/environment.png',
            phantom_portrait: '/assets/phantom_portrait.jpg',
            phantom_raw: '/assets/phantom_stalker.jpg',
            characters_raw: '/assets/characters.jpg'
        };

        const promises = Object.entries(assetUrls).map(([key, url]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    if (key === 'phantom_raw') {
                        try {
                            const transparentCanvas = processSpriteTransparency(img, 228);
                            this.images['phantom'] = transparentCanvas;
                        } catch (e) {
                            console.warn('Phantom transparency processing failed, using raw image', e);
                            this.images['phantom'] = img;
                        }
                    } else if (key === 'characters_raw') {
                        try {
                            // Extract Character Sprites:
                            // Col 1, Row 1: Rugged survivor with fur sash & beard (Player)
                            const playerSprite = extractCharacterSprite(img, 1, 1);
                            // Col 2, Row 0: Cap & vest woodsman hunter (Hunter)
                            const hunterSprite = extractCharacterSprite(img, 2, 0);
                            // Col 1, Row 0: Muscular brawler warrior
                            const brawlerSprite = extractCharacterSprite(img, 1, 0);
                            // Col 0, Row 0: Blue tunic female warrior
                            const warriorSprite = extractCharacterSprite(img, 0, 0);
                            // Col 0, Row 1: Ponytail fighter
                            const rogueSprite = extractCharacterSprite(img, 0, 1);
                            // Col 2, Row 1: Red hood fighter
                            const redHoodSprite = extractCharacterSprite(img, 2, 1);

                            this.images['player'] = playerSprite;
                            this.images['hunter'] = hunterSprite;
                            this.images['char_survivor'] = playerSprite;
                            this.images['char_hunter'] = hunterSprite;
                            this.images['char_brawler'] = brawlerSprite;
                            this.images['char_warrior'] = warriorSprite;
                            this.images['char_rogue'] = rogueSprite;
                            this.images['char_redhood'] = redHoodSprite;

                            const rosterMap = {
                                char_survivor: playerSprite,
                                char_rogue: rogueSprite,
                                char_hunter: hunterSprite,
                                char_warrior: warriorSprite,
                                char_redhood: redHoodSprite,
                                char_brawler: brawlerSprite
                            };

                            Object.entries(rosterMap).forEach(([cId, cCanvas]) => {
                                try {
                                    this.characterThumbs[cId] = cCanvas.toDataURL();
                                } catch {}
                            });
                        } catch (e) {
                            console.warn('Character sprite extraction failed', e);
                        }
                    } else {
                        this.images[key] = img;
                    }
                    resolve();
                };
                img.onerror = () => {
                    console.warn('Failed to load image:', url);
                    resolve(); // Soft fail so game continues
                };
            });
        });

        this.loadPromise = Promise.all(promises).then(() => {
            this.loaded = true;
        });

        return this.loadPromise;
    }

    getImage(key) {
        return this.images[key] || null;
    }

    getCharacterThumb(id) {
        return this.characterThumbs[id] || null;
    }
}

export const CHARACTER_ROSTER = [
    {
        id: 'char_survivor',
        name: 'Vance',
        title: 'The Survivor',
        tagline: 'Rugged frontiersman with an indomitable spirit.',
        perkTitle: 'Resolute Walker',
        perkDesc: 'Balanced survival traits with solid baseline stats.',
        unlocked: true,
        perk: { speedMult: 1.0, fuelBurn: 1.0, sprintMult: 1.45, wardRadius: 1.0, threatRange: 450, torchBonus: 0 }
    },
    {
        id: 'char_rogue',
        name: 'Lyra',
        title: 'The Shadow Walker',
        tagline: 'Swift scout trained to outrun what lurks in the mist.',
        perkTitle: 'Ghost Fleet',
        perkDesc: '+15% Sprint Speed boost. Outruns phantoms with ease.',
        unlocked: true,
        perk: { speedMult: 1.06, fuelBurn: 1.0, sprintMult: 1.65, wardRadius: 1.0, threatRange: 450, torchBonus: 0 }
    },
    {
        id: 'char_hunter',
        name: 'Gideon',
        title: 'The Woodsman',
        tagline: 'Seasoned tracker who knows how to nurse a flickering flame.',
        perkTitle: 'Ember Keeper',
        perkDesc: '+20% Torch Fuel efficiency. Torch burns 20% slower.',
        unlocked: true,
        perk: { speedMult: 1.0, fuelBurn: 0.80, sprintMult: 1.45, wardRadius: 1.0, threatRange: 450, torchBonus: 0 }
    },
    {
        id: 'char_warrior',
        name: 'Rowan',
        title: 'The Vanguard',
        tagline: 'Holy sentinel sworn to defend ancient consecration stones.',
        perkTitle: 'Aegis Ward',
        perkDesc: '+20% Ring of Protection radius. Broader sanctuary.',
        unlocked: true,
        perk: { speedMult: 1.0, fuelBurn: 1.0, sprintMult: 1.45, wardRadius: 1.22, threatRange: 450, torchBonus: 0 }
    },
    {
        id: 'char_redhood',
        name: 'Scarlet',
        title: 'The Crimson Tracker',
        tagline: 'Her senses are sharpened by generations surviving in the dark.',
        perkTitle: 'Predator Sight',
        perkDesc: 'Senses threat chevrons and eyes in the dark from further away (550px).',
        unlocked: true,
        perk: { speedMult: 1.0, fuelBurn: 1.0, sprintMult: 1.45, wardRadius: 1.0, threatRange: 550, torchBonus: 0 }
    },
    {
        id: 'char_brawler',
        name: 'Torin',
        title: 'The Ironclad',
        tagline: 'A fearless wanderer fueled by the thrill of the hunt.',
        perkTitle: 'Trophy Hunter',
        perkDesc: 'Gains +5 bonus score for every torch collected (+20 total).',
        unlocked: true,
        perk: { speedMult: 1.0, fuelBurn: 1.0, sprintMult: 1.45, wardRadius: 1.0, threatRange: 450, torchBonus: 5 }
    }
];

export const assets = new AssetManager();

// Pre-defined sprite slices [sheet, sx, sy, sw, sh, anchorX, anchorY, colliderR]
// anchor is normalized (0 to 1) relative to sprite size, pointing to the base center of the object on the ground
export const SPRITE_DEFS = {
    // --- TREES FROM PLANTS.PNG ---
    // Row 0: Green Forest
    tree_green_tall: { sheet: 'plants', sx: 10, sy: 10, sw: 110, sh: 190, anchorX: 0.5, anchorY: 0.92, colliderR: 18, type: 'tree' },
    tree_green_oak: { sheet: 'plants', sx: 125, sy: 20, sw: 125, sh: 175, anchorX: 0.5, anchorY: 0.92, colliderR: 20, type: 'tree' },
    tree_green_pine: { sheet: 'plants', sx: 255, sy: 35, sw: 95, sh: 155, anchorX: 0.5, anchorY: 0.92, colliderR: 16, type: 'tree' },
    tree_green_round: { sheet: 'plants', sx: 355, sy: 55, sw: 85, sh: 135, anchorX: 0.5, anchorY: 0.92, colliderR: 16, type: 'tree' },
    tree_green_grand: { sheet: 'plants', sx: 535, sy: 35, sw: 125, sh: 155, anchorX: 0.5, anchorY: 0.92, colliderR: 22, type: 'tree' },

    // Row 1: Autumn Gold
    tree_autumn_tall: { sheet: 'plants', sx: 10, sy: 215, sw: 110, sh: 190, anchorX: 0.5, anchorY: 0.92, colliderR: 18, type: 'tree' },
    tree_autumn_oak: { sheet: 'plants', sx: 125, sy: 225, sw: 125, sh: 175, anchorX: 0.5, anchorY: 0.92, colliderR: 20, type: 'tree' },
    tree_autumn_round: { sheet: 'plants', sx: 355, sy: 260, sw: 85, sh: 135, anchorX: 0.5, anchorY: 0.92, colliderR: 16, type: 'tree' },

    // Row 2: Dark Enchanted Woods
    tree_dark_tall: { sheet: 'plants', sx: 10, sy: 425, sw: 110, sh: 190, anchorX: 0.5, anchorY: 0.92, colliderR: 18, type: 'tree' },
    tree_dark_oak: { sheet: 'plants', sx: 125, sy: 435, sw: 125, sh: 175, anchorX: 0.5, anchorY: 0.92, colliderR: 20, type: 'tree' },
    tree_dark_grand: { sheet: 'plants', sx: 535, sy: 440, sw: 125, sh: 155, anchorX: 0.5, anchorY: 0.92, colliderR: 22, type: 'tree' },

    // Row 3: Crimson Dusk
    tree_crimson_tall: { sheet: 'plants', sx: 10, sy: 630, sw: 110, sh: 190, anchorX: 0.5, anchorY: 0.92, colliderR: 18, type: 'tree' },
    tree_crimson_oak: { sheet: 'plants', sx: 125, sy: 640, sw: 125, sh: 175, anchorX: 0.5, anchorY: 0.92, colliderR: 20, type: 'tree' },

    // --- TREES FROM ENVIRONMENT.PNG (Deadwood, Cypress) ---
    tree_cypress_green: { sheet: 'environment', sx: 790, sy: 95, sw: 60, sh: 170, anchorX: 0.5, anchorY: 0.95, colliderR: 14, type: 'tree' },
    tree_cypress_autumn: { sheet: 'environment', sx: 790, sy: 295, sw: 60, sh: 170, anchorX: 0.5, anchorY: 0.95, colliderR: 14, type: 'tree' },
    tree_dead_twisted: { sheet: 'environment', sx: 775, sy: 485, sw: 95, sh: 150, anchorX: 0.5, anchorY: 0.95, colliderR: 16, type: 'tree' },

    // --- ROCKS & BOULDERS ---
    rock_mossy_large: { sheet: 'environment', sx: 290, sy: 655, sw: 105, sh: 80, anchorX: 0.5, anchorY: 0.8, colliderR: 28, type: 'rock' },
    rock_grey_cluster: { sheet: 'environment', sx: 435, sy: 570, sw: 60, sh: 55, anchorX: 0.5, anchorY: 0.8, colliderR: 20, type: 'rock' },
    rock_red_pillar: { sheet: 'environment', sx: 110, sy: 670, sw: 70, sh: 60, anchorX: 0.5, anchorY: 0.8, colliderR: 20, type: 'rock' },
    rock_slate: { sheet: 'environment', sx: 450, sy: 695, sw: 65, sh: 50, anchorX: 0.5, anchorY: 0.8, colliderR: 18, type: 'rock' },

    // --- ANCIENT RUINS & SHRINES (PROPS.PNG) ---
    prop_statue_angel: { sheet: 'props', sx: 190, sy: 16, sw: 64, sh: 155, anchorX: 0.5, anchorY: 0.92, colliderR: 24, type: 'shrine' },
    prop_obelisk_rune: { sheet: 'props', sx: 16, sy: 16, sw: 56, sh: 76, anchorX: 0.5, anchorY: 0.9, colliderR: 18, type: 'shrine' },
    prop_gazebo_shrine: { sheet: 'props', sx: 335, sy: 207, sw: 84, sh: 90, anchorX: 0.5, anchorY: 0.85, colliderR: 35, type: 'shrine' },
    prop_stone_dais: { sheet: 'props', sx: 234, sy: 261, sw: 82, sh: 35, anchorX: 0.5, anchorY: 0.7, colliderR: 28, type: 'shrine' },
    prop_portal_base: { sheet: 'props', sx: 16, sy: 157, sw: 161, sh: 95, anchorX: 0.5, anchorY: 0.85, colliderR: 40, type: 'shrine' },

    // --- DECORATIVE BUSHES ---
    bush_green: { sheet: 'plants', sx: 680, sy: 40, sw: 45, sh: 35, anchorX: 0.5, anchorY: 0.8, colliderR: 0, type: 'bush' },
    bush_autumn: { sheet: 'plants', sx: 680, sy: 245, sw: 45, sh: 35, anchorX: 0.5, anchorY: 0.8, colliderR: 0, type: 'bush' },
    bush_dusk: { sheet: 'plants', sx: 680, sy: 640, sw: 45, sh: 35, anchorX: 0.5, anchorY: 0.8, colliderR: 0, type: 'bush' }
};

// Portal Animation Helper (12 frames, 272 x 112 per frame)
export function drawAnimatedPortal(ctx, worldX, worldY, frameIndex) {
    const img = assets.getImage('portal');
    if (!img) return;

    const frameW = 272;
    const frameH = 112;
    const f = Math.floor(frameIndex) % 12;

    const scale = 0.85;
    const drawW = frameW * scale;
    const drawH = frameH * scale;

    ctx.drawImage(
        img,
        f * frameW, 0, frameW, frameH,
        worldX - drawW / 2, worldY - drawH * 0.8, drawW, drawH
    );
}

// Draw a sprite anchored at base
export function drawSprite(ctx, spriteKey, worldX, worldY, scale = 0.8) {
    const def = SPRITE_DEFS[spriteKey];
    if (!def) return;

    const img = assets.getImage(def.sheet);
    if (!img) return;

    const w = def.sw * scale;
    const h = def.sh * scale;
    const dx = worldX - w * def.anchorX;
    const dy = worldY - h * def.anchorY;

    ctx.drawImage(img, def.sx, def.sy, def.sw, def.sh, dx, dy, w, h);
}
