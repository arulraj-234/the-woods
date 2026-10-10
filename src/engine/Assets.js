// Asset manager and sprite dictionary for 2.5D pixel-art graphics
// Standalone sliced sprites with zero runtime flood-fill or atlas bleeding

class AssetManager {
    constructor() {
        this.images = {};
        this.characterThumbs = {};
        this.loaded = false;
        this.loadPromise = null;
    }

    loadAll() {
        if (this.loadPromise) return this.loadPromise;

        const base = (import.meta.env.BASE_URL || './').replace(/\/+$/, '') + '/';

        const assetUrls = {
            portal: `${base}assets/portal.png`,
            phantom_portrait: `${base}assets/phantom_portrait.jpg`,
            phantom: `${base}assets/sprites/phantom.png`,
            char_survivor: `${base}characters/vance.png`,
            char_rogue: `${base}characters/lyra.png`,
            char_hunter: `${base}characters/gideon.png`,
            char_warrior: `${base}characters/rowan.png`,
            char_redhood: `${base}characters/scarlet.png`,
            char_brawler: `${base}characters/torin.png`
        };

        // Add all individual forest, rock, shrine, and prop sprites
        Object.keys(SPRITE_DEFS).forEach(spriteKey => {
            assetUrls[spriteKey] = `${base}assets/sprites/${spriteKey}.png`;
        });

        const promises = Object.entries(assetUrls).map(([key, url]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = () => {
                    this.images[key] = img;

                    if (key === 'char_survivor') {
                        this.images['player'] = img;
                    } else if (key === 'char_hunter') {
                        this.images['hunter'] = img;
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
        const base = (import.meta.env.BASE_URL || './').replace(/\/+$/, '') + '/';
        const imgMap = {
            char_survivor: `${base}characters/vance.png`,
            char_rogue: `${base}characters/lyra.png`,
            char_hunter: `${base}characters/gideon.png`,
            char_warrior: `${base}characters/rowan.png`,
            char_redhood: `${base}characters/scarlet.png`,
            char_brawler: `${base}characters/torin.png`
        };
        return imgMap[id] || null;
    }

    getPhantomPortrait() {
        const base = (import.meta.env.BASE_URL || './').replace(/\/+$/, '') + '/';
        return `${base}assets/phantom_portrait.jpg`;
    }
}

export const CHARACTER_ROSTER = [
    {
        id: 'char_survivor',
        name: 'Vance',
        title: 'The Survivor',
        tagline: 'Rugged frontiersman with an indomitable spirit.',
        perkTitle: 'Resolute Walker',
        perkDesc: 'Balanced survival traits: +2% speed, +15% fuel efficiency, and +20 bonus torch fuel.',
        unlocked: true,
        perk: { speedMult: 1.02, fuelBurn: 0.85, sprintMult: 1.55, wardRadius: 1.0, threatRange: 450, torchBonus: 0, torchFuelBonus: 20 }
    },
    {
        id: 'char_rogue',
        name: 'Lyra',
        title: 'The Shadow Walker',
        tagline: 'Swift scout trained to outrun what lurks in the mist.',
        perkTitle: 'Ghost Fleet',
        perkDesc: '+8% Walk Speed & +62% Sprint Burst. Burns 25% less sprint fuel and slips past phantoms.',
        unlocked: true,
        perk: { speedMult: 1.08, fuelBurn: 1.0, sprintMult: 1.62, sprintBurnMult: 1.25, wardRadius: 1.0, threatRange: 450, torchBonus: 0, ghostStealth: true }
    },
    {
        id: 'char_hunter',
        name: 'Gideon',
        title: 'The Woodsman',
        tagline: 'Seasoned tracker who knows how to nurse a flickering flame.',
        perkTitle: 'Ember Keeper',
        perkDesc: 'Torch burns 30% slower (43% longer sprint endurance!). +35% pickup range with +40 bonus fuel.',
        unlocked: true,
        perk: { speedMult: 1.0, fuelBurn: 0.70, sprintMult: 1.55, wardRadius: 1.0, threatRange: 450, torchBonus: 0, torchFuelBonus: 40, pickupRangeMult: 1.35 }
    },
    {
        id: 'char_warrior',
        name: 'Rowan',
        title: 'The Vanguard',
        tagline: 'Holy sentinel sworn to defend ancient consecration stones.',
        perkTitle: 'Aegis Ward',
        perkDesc: '+40% larger Ring of Protection radius. While inside sanctuary, torch fuel steadily regenerates!',
        unlocked: true,
        perk: { speedMult: 1.0, fuelBurn: 1.0, sprintMult: 1.54, wardRadius: 1.40, threatRange: 450, torchBonus: 0, sanctuaryHeal: true }
    },
    {
        id: 'char_redhood',
        name: 'Scarlet',
        title: 'The Crimson Tracker',
        tagline: 'Her senses are sharpened by generations surviving in the dark.',
        perkTitle: 'Predator Sight',
        perkDesc: 'Heightened senses: Detects stalker chevrons up to 650px away and reveals predator eyes in the dark at 600px.',
        unlocked: true,
        perk: { speedMult: 1.04, fuelBurn: 0.95, sprintMult: 1.55, wardRadius: 1.0, threatRange: 650, eyeRange: 600, torchBonus: 0 }
    },
    {
        id: 'char_brawler',
        name: 'Torin',
        title: 'The Ironclad',
        tagline: 'A fearless wanderer fueled by the thrill of the hunt.',
        perkTitle: 'Iron Resolve & Bounty',
        perkDesc: '+15 bonus score per torch. Iron Resolve: Deflects and knocks back the first lethal blow every 35s!',
        unlocked: true,
        perk: { speedMult: 0.98, fuelBurn: 1.05, sprintMult: 1.54, wardRadius: 1.0, threatRange: 450, torchBonus: 15, ironStun: true }
    }
];

export const assets = new AssetManager();

// Pre-defined standalone sprite configurations [sw, sh, anchorX, anchorY, colliderR, type]
// anchor is normalized (0 to 1) relative to sprite size, pointing to the base center of the object on the ground
export const SPRITE_DEFS = {
    // --- TREES ---
    // Lush Forest
    tree_green_tall: { sw: 110, sh: 190, anchorX: 0.5, anchorY: 0.92, colliderR: 18, type: 'tree' },
    tree_green_oak: { sw: 125, sh: 175, anchorX: 0.5, anchorY: 0.92, colliderR: 20, type: 'tree' },
    tree_green_pine: { sw: 95, sh: 155, anchorX: 0.5, anchorY: 0.92, colliderR: 16, type: 'tree' },
    tree_green_round: { sw: 85, sh: 135, anchorX: 0.5, anchorY: 0.92, colliderR: 16, type: 'tree' },
    tree_green_grand: { sw: 125, sh: 155, anchorX: 0.5, anchorY: 0.92, colliderR: 22, type: 'tree' },

    // Autumn Gold
    tree_autumn_tall: { sw: 110, sh: 190, anchorX: 0.5, anchorY: 0.92, colliderR: 18, type: 'tree' },
    tree_autumn_oak: { sw: 125, sh: 175, anchorX: 0.5, anchorY: 0.92, colliderR: 20, type: 'tree' },
    tree_autumn_round: { sw: 85, sh: 135, anchorX: 0.5, anchorY: 0.92, colliderR: 16, type: 'tree' },

    // Dark Enchanted Woods
    tree_dark_tall: { sw: 110, sh: 190, anchorX: 0.5, anchorY: 0.92, colliderR: 18, type: 'tree' },
    tree_dark_oak: { sw: 125, sh: 175, anchorX: 0.5, anchorY: 0.92, colliderR: 20, type: 'tree' },
    tree_dark_grand: { sw: 125, sh: 155, anchorX: 0.5, anchorY: 0.92, colliderR: 22, type: 'tree' },

    // Crimson Dusk
    tree_crimson_tall: { sw: 110, sh: 190, anchorX: 0.5, anchorY: 0.92, colliderR: 18, type: 'tree' },
    tree_crimson_oak: { sw: 125, sh: 175, anchorX: 0.5, anchorY: 0.92, colliderR: 20, type: 'tree' },

    // Cypress & Deadwood
    tree_cypress_green: { sw: 60, sh: 170, anchorX: 0.5, anchorY: 0.95, colliderR: 14, type: 'tree' },
    tree_cypress_autumn: { sw: 60, sh: 170, anchorX: 0.5, anchorY: 0.95, colliderR: 14, type: 'tree' },
    tree_dead_twisted: { sw: 95, sh: 150, anchorX: 0.5, anchorY: 0.95, colliderR: 16, type: 'tree' },

    // --- ROCKS & BOULDERS ---
    rock_mossy_large: { sw: 105, sh: 80, anchorX: 0.5, anchorY: 0.8, colliderR: 28, type: 'rock' },
    rock_grey_cluster: { sw: 60, sh: 55, anchorX: 0.5, anchorY: 0.8, colliderR: 20, type: 'rock' },
    rock_red_pillar: { sw: 70, sh: 60, anchorX: 0.5, anchorY: 0.8, colliderR: 20, type: 'rock' },
    rock_slate: { sw: 65, sh: 50, anchorX: 0.5, anchorY: 0.8, colliderR: 18, type: 'rock' },

    // --- ANCIENT RUINS & SHRINES ---
    prop_statue_angel: { sw: 64, sh: 155, anchorX: 0.5, anchorY: 0.92, colliderR: 24, type: 'shrine' },
    prop_obelisk_rune: { sw: 56, sh: 76, anchorX: 0.5, anchorY: 0.9, colliderR: 18, type: 'shrine' },
    prop_gazebo_shrine: { sw: 84, sh: 90, anchorX: 0.5, anchorY: 0.85, colliderR: 35, type: 'shrine' },
    prop_stone_dais: { sw: 82, sh: 35, anchorX: 0.5, anchorY: 0.7, colliderR: 28, type: 'shrine' },
    prop_portal_base: { sw: 161, sh: 95, anchorX: 0.5, anchorY: 0.85, colliderR: 40, type: 'shrine' },

    // --- DECORATIVE BUSHES ---
    bush_green: { sw: 45, sh: 35, anchorX: 0.5, anchorY: 0.8, colliderR: 0, type: 'bush' },
    bush_autumn: { sw: 45, sh: 35, anchorX: 0.5, anchorY: 0.8, colliderR: 0, type: 'bush' },
    bush_dusk: { sw: 45, sh: 35, anchorX: 0.5, anchorY: 0.8, colliderR: 0, type: 'bush' }
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

// Draw a standalone sprite anchored at its base
export function drawSprite(ctx, spriteKey, worldX, worldY, scale = 0.8) {
    const def = SPRITE_DEFS[spriteKey];
    if (!def) return;

    const img = assets.getImage(spriteKey);
    if (!img) return;

    const w = (def.sw || img.naturalWidth || img.width) * scale;
    const h = (def.sh || img.naturalHeight || img.height) * scale;
    const dx = worldX - w * def.anchorX;
    const dy = worldY - h * def.anchorY;

    ctx.drawImage(img, dx, dy, w, h);
}
