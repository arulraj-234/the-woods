import React, { useRef, useEffect } from 'react';
import { InputHandler } from '../engine/Input';
import { Physics } from '../engine/Physics';
import { assets, drawSprite, drawAnimatedPortal, SPRITE_DEFS, CHARACTER_ROSTER } from '../engine/Assets';
import { soundManager } from '../engine/SoundManager';
import { WorldGenerator } from '../engine/WorldGenerator';

// --- Constants ---
const MAX_FUEL = 1000;
const FUEL_DECAY = 0.45;

const LEVEL_CONFIGS = [
    { level: 1, minScore: 0, title: 'THE WHISPERING WOODS', hunters: 4, ghosts: 1, speedMult: 1.0 },
    { level: 2, minScore: 35, title: 'THE CRIMSON THICKET', hunters: 5, ghosts: 2, speedMult: 1.08 },
    { level: 3, minScore: 80, title: 'THE HAUNTED GROVE', hunters: 6, ghosts: 3, speedMult: 1.15 },
    { level: 4, minScore: 140, title: 'THE ANCIENT RUINS', hunters: 8, ghosts: 4, speedMult: 1.22 },
    { level: 5, minScore: 220, title: 'THE ENDLESS NIGHTMARE', hunters: 10, ghosts: 6, speedMult: 1.30 }
];

export default function GameCanvas({
    level = 1,
    score = 0,
    characterId = 'char_survivor',
    playerName = 'Survivor',
    settings = { volume: 0.8, screenShake: true, sfxEnabled: true },
    onLevelComplete,
    onGameOver,
    onScoreUpdate
}) {
    const canvasRef = useRef(null);
    const lightCanvasRef = useRef(null);
    const frameId = useRef(0);
    const inputRef = useRef(new InputHandler());
    const physicsRef = useRef(new Physics(true));
    const worldGenRef = useRef(new WorldGenerator());

    const characterDef = CHARACTER_ROSTER.find(c => c.id === characterId) || CHARACTER_ROSTER[0];
    const perk = characterDef.perk;

    const lastHeartbeatRef = useRef(0);

    const scoreRef = useRef(score);
    const callbacksRef = useRef({ onLevelComplete, onGameOver, onScoreUpdate });

    useEffect(() => {
        scoreRef.current = score;
        gameState.current.score = score;
    }, [score]);

    useEffect(() => {
        callbacksRef.current = { onLevelComplete, onGameOver, onScoreUpdate };
    });

    // Mutable Game State
    const gameState = useRef({
        player: {
            x: 0, y: 0, r: 14,
            w: 24, h: 24,
            angle: 0,
            facing: 1, // 1 for right, -1 for left (prevents rapid vertical flip jitter)
            walkPhase: 0, // distance-based walk accumulator
            fuel: MAX_FUEL,
            dead: false,
            moving: false,
            isSprinting: false
        },
        camera: { x: 0, y: 0 },
        enemies: [], // { id, x, y, r, angle, state, timer, type: 'hunter'|'ghost', alpha }
        particles: [], // { x, y, dx, dy, life, color, size }
        time: 0,
        score: score,
        currentLevel: level,
        levelBannerTimer: 0,
        levelBannerText: '',
        portalFrame: 0,
        lastDeflectTime: -9999, // Cooldown timer for Torin's Iron Resolve
        inSanctuary: false
    });

    // Sync settings to soundManager
    useEffect(() => {
        soundManager.setSettings(settings);
    }, [settings]);

    // Audio helper delegating to soundManager
    const playSound = (type, intensity = 1) => {
        if (type === 'heartbeat') soundManager.playHeartbeat(intensity);
        else if (type === 'levelup') soundManager.playLevelUp();
        else if (type === 'refuel') soundManager.playRefuel();
        else if (type === 'deflect') soundManager.playDeflect();
    };

    // Load assets on mount
    useEffect(() => {
        assets.loadAll();
    }, []);

    // Ensure input listeners are active and window focused
    useEffect(() => {
        const input = inputRef.current;
        if (input && input.attach) input.attach();
        window.focus();
        return () => {
            if (input && input.cleanup) input.cleanup();
        };
    }, []);

    // Cleanup audio loops on unmount
    useEffect(() => {
        return () => {
            soundManager.stopLoop('torchFire');
            soundManager.stopLoop('walk');
            soundManager.stopLoop('run');
            soundManager.stopLoop('chaseTension');
        };
    }, []);

    // Main Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const loop = () => {
            update();
            draw(ctx);
            frameId.current = requestAnimationFrame(loop);
        };
        frameId.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId.current);
    }, []);

    // Helper: Spawn an enemy around player at distance
    const spawnEnemyAroundPlayer = (type = 'hunter') => {
        const state = gameState.current;
        const angle = Math.random() * Math.PI * 2;
        const dist = 550 + Math.random() * 250; // Outside view perimeter
        const x = state.player.x + Math.cos(angle) * dist;
        const y = state.player.y + Math.sin(angle) * dist;

        return {
            id: Math.random(),
            x,
            y,
            r: type === 'ghost' ? 16 : 18,
            angle: Math.random() * Math.PI * 2,
            state: 'patrol',
            timer: 0,
            type,
            alpha: 0.7
        };
    };

    // Synchronize active enemies based on level
    const syncEnemiesForLevel = (targetLevel) => {
        const state = gameState.current;
        const config = LEVEL_CONFIGS[Math.min(targetLevel - 1, LEVEL_CONFIGS.length - 1)];

        const targetHunters = config.hunters;
        const targetGhosts = config.ghosts;

        let currentHunters = state.enemies.filter(e => e.type === 'hunter').length;
        let currentGhosts = state.enemies.filter(e => e.type === 'ghost').length;

        // Add missing hunters
        while (currentHunters < targetHunters) {
            state.enemies.push(spawnEnemyAroundPlayer('hunter'));
            currentHunters++;
        }

        // Add missing ghosts
        while (currentGhosts < targetGhosts) {
            state.enemies.push(spawnEnemyAroundPlayer('ghost'));
            currentGhosts++;
        }
    };

    const update = () => {
        const state = gameState.current;
        if (state.player.dead) return;

        const input = inputRef.current;
        const phys = physicsRef.current;
        const worldGen = worldGenRef.current;
        state.time++;

        const width = window.innerWidth;
        const height = window.innerHeight;

        // 1. Camera Centering
        state.camera.x = state.player.x - width / 2;
        state.camera.y = state.player.y - height / 2;

        // 2. Fetch Visible Chunks & Register Colliders
        const visibleChunks = worldGen.getVisibleChunks(state.camera.x, state.camera.y, width, height);
        const activeObstacles = [];
        const visibleObjects = [];

        visibleChunks.forEach(chunk => {
            chunk.objects.forEach(obj => {
                visibleObjects.push(obj);
                if (obj.r > 0) {
                    activeObstacles.push({ x: obj.x, y: obj.y, r: obj.r });
                }
            });
        });
        phys.setObstacles(activeObstacles);

        // 3. Player Movement & Sprint
        const { dx, dy } = input.getAxis();
        const isMoving = (dx !== 0 || dy !== 0);
        state.player.moving = isMoving;

        // Facing direction: only update when horizontal direction is intentional (prevents 60Hz vertical jitter)
        if (dx > 0.05) {
            state.player.facing = 1;
        } else if (dx < -0.05) {
            state.player.facing = -1;
        }

        // Sprint Mechanic: Holding Shift/Space with sufficient fuel
        const isSprinting = isMoving && input.isSprinting() && state.player.fuel > 30;
        state.player.isSprinting = isSprinting;

        const baseSpeed = 4 * (perk.speedMult || 1.0);
        const playerSpeed = isSprinting ? baseSpeed * (perk.sprintMult || 1.45) : baseSpeed;

        if (isMoving) {
            state.player.angle = Math.atan2(dy, dx);
            state.player.walkPhase += playerSpeed * 0.07;
            phys.moveEntity(state.player, dx, dy, playerSpeed);

            // Subtle ground dust kicked up from shoes/boots (strictly earth-toned, at ground level)
            const dustChance = isSprinting ? 0.55 : 0.08;
            if (Math.random() < dustChance) {
                const footSpread = (Math.random() - 0.5) * 8;
                state.particles.push({
                    x: state.player.x - Math.cos(state.player.angle) * 8 + footSpread,
                    y: state.player.y + 3 + Math.random() * 3, // Feet at bottom of character sprite
                    dx: -Math.cos(state.player.angle) * (isSprinting ? 1.3 : 0.4) + (Math.random() - 0.5) * 0.4,
                    dy: -Math.sin(state.player.angle) * 0.4 - Math.random() * 0.25,
                    life: isSprinting ? 22 : 16,
                    color: Math.random() < 0.5 ? 'rgba(105, 90, 75, 0.45)' : 'rgba(130, 115, 95, 0.35)', // Translucent dirt/earth
                    size: Math.random() * 2.5 + (isSprinting ? 2.4 : 1.6)
                });
            }
        }

        // 4. Torch Fuel & Embers (Sprint burns extra fuel, modulated by Lyra's / character perk)
        const sprintBurnMult = (perk.sprintBurnMult || 1.8);
        const fuelDecay = isSprinting
            ? FUEL_DECAY * sprintBurnMult * (perk.fuelBurn || 1.0)
            : FUEL_DECAY * (perk.fuelBurn || 1.0);
        state.player.fuel -= fuelDecay;

        // Rowan's Vanguard perk: Fuel steadily regenerates while inside consecrated sanctuary!
        if (state.inSanctuary && perk.sanctuaryHeal) {
            state.player.fuel = Math.min(MAX_FUEL, state.player.fuel + 1.2);
            if (Math.random() < 0.3) {
                state.particles.push({
                    x: state.player.x + (Math.random() - 0.5) * 20,
                    y: state.player.y - 10 + (Math.random() - 0.5) * 15,
                    dx: (Math.random() - 0.5) * 0.5,
                    dy: -Math.random() * 1.5 - 0.5,
                    life: 25,
                    color: '#FFF59D',
                    size: Math.random() * 2.5 + 1.2
                });
            }
        }

        if (state.player.fuel <= 0) {
            state.player.fuel = 0;
            if (!state.player.dead) {
                state.player.dead = true;
                soundManager.triggerDeath();
                if (callbacksRef.current.onGameOver) callbacksRef.current.onGameOver();
            }
            return;
        } else if (state.player.fuel > 0 && Math.random() < 0.38) {
            // Embers and dark soot flakes emitting directly from the raised torch flame
            // Matches drawCharacter: torch flame is at (x + facing * 19, y - 38)
            const facing = state.player.facing || 1;
            const flameX = state.player.x + facing * 19;
            const flameY = state.player.y - 38;
            const isSoot = Math.random() < 0.22; // 22% dark soot/ash, 78% glowing fiery embers

            state.particles.push({
                x: flameX + (Math.random() - 0.5) * 5,
                y: flameY + (Math.random() - 0.5) * 5,
                dx: (Math.random() - 0.5) * 0.8 + (facing * 0.25),
                dy: -Math.random() * 1.8 - 0.9, // Strong thermal updraft rising into the sky
                life: 28 + Math.random() * 16,
                color: isSoot
                    ? 'rgba(40, 32, 28, 0.75)' // Charcoal dark soot flake
                    : (Math.random() < 0.6 ? '#FFA500' : (Math.random() < 0.5 ? '#FFD700' : '#FF4500')), // Glowing flame ember
                size: isSoot ? (Math.random() * 1.8 + 1.2) : (Math.random() * 2.4 + 1.2)
            });
        }

        // 5. Score Progression & Survival Points
        if (state.time % 90 === 0) {
            state.score = (state.score || 0) + 1;
            scoreRef.current = state.score;
            if (callbacksRef.current.onScoreUpdate) {
                callbacksRef.current.onScoreUpdate(1); // Steady survival score (+1 point per 1.5s in the woods)
            }
        }

        const currentScore = state.score !== undefined ? state.score : (scoreRef.current || 0);
        let calculatedLevel = 1;
        for (let i = LEVEL_CONFIGS.length - 1; i >= 0; i--) {
            if (currentScore >= LEVEL_CONFIGS[i].minScore) {
                calculatedLevel = LEVEL_CONFIGS[i].level;
                break;
            }
        }

        if (calculatedLevel > state.currentLevel) {
            state.currentLevel = calculatedLevel;
            const cfg = LEVEL_CONFIGS[calculatedLevel - 1];
            state.levelBannerText = `LEVEL ${calculatedLevel}: ${cfg.title}`;
            state.levelBannerTimer = 180; // 3 seconds banner
            state.player.fuel = Math.min(MAX_FUEL, state.player.fuel + 350); // Level-up bonus fuel
            playSound('levelup');
            if (callbacksRef.current.onLevelComplete) {
                callbacksRef.current.onLevelComplete(calculatedLevel);
            }
        }

        if (state.levelBannerTimer > 0) state.levelBannerTimer--;

        // Sync enemy population for current level
        syncEnemiesForLevel(state.currentLevel);

        // Check if player is standing within an activated Ring of Protection (perk-scaled radius)
        const wardScale = perk.wardRadius || 1.0;
        const wardRadiusX = 110 * wardScale;
        const wardRadiusY = 58 * wardScale;

        let inSanctuary = false;
        visibleObjects.forEach(obj => {
            if (obj.isShrine && obj.activated) {
                const dx = (state.player.x - obj.x) / wardRadiusX;
                const dy = (state.player.y - obj.y) / wardRadiusY;
                if (dx * dx + dy * dy <= 1.05) {
                    inSanctuary = true;
                }
            }
        });
        state.inSanctuary = inSanctuary;

        // 6. Object Interactions (Torches, Shrines & Portals)
        const torchPickupDist = 65 * (perk.pickupRangeMult || 1.0);
        visibleObjects.forEach(obj => {
            if (obj.hasTorch) {
                const dist = Math.hypot(obj.x - state.player.x, obj.y - state.player.y);
                if (dist < torchPickupDist) {
                    // Balanced fuel refill: +135 base fuel (+ Vance / Gideon bonuses)
                    const fuelGain = 135 + (perk.torchFuelBonus || 0);
                    state.player.fuel = Math.min(MAX_FUEL, state.player.fuel + fuelGain);
                    obj.hasTorch = false;
                    spawnParticles(obj.x, obj.y - 15, '#FFA500', 12);
                    playSound('refuel');
                    const torchPts = 15 + (perk.torchBonus || 0);
                    state.score = (state.score || 0) + torchPts;
                    scoreRef.current = state.score;
                    if (callbacksRef.current.onScoreUpdate) {
                        callbacksRef.current.onScoreUpdate(torchPts);
                    }
                }
            } else if (obj.isShrine && !obj.activated) {
                const dist = Math.hypot(obj.x - state.player.x, obj.y - state.player.y);
                if (dist < 80) {
                    obj.activated = true;
                    state.player.fuel = MAX_FUEL; // Full refuel blessing
                    state.levelBannerText = `${obj.shrineName ? obj.shrineName.toUpperCase() : 'ANCIENT SHRINE'} CONSECRATED! RING OF PROTECTION ACTIVE`;
                    state.levelBannerTimer = 180;

                    // Holy golden shockwave particles
                    for (let i = 0; i < 45; i++) {
                        const angle = (i / 45) * Math.PI * 2;
                        const spd = 2 + Math.random() * 5.5;
                        state.particles.push({
                            x: obj.x,
                            y: obj.y - 15,
                            dx: Math.cos(angle) * spd,
                            dy: Math.sin(angle) * spd,
                            life: 45,
                            color: i % 3 === 0 ? '#FFF59D' : (i % 3 === 1 ? '#FFD700' : '#FFFFFF'),
                            size: Math.random() * 4 + 2.5
                        });
                    }

                    // Holy blast: knock back and pacify all nearby enemies
                    state.enemies.forEach(e => {
                        const edist = Math.hypot(e.x - obj.x, e.y - obj.y);
                        if (edist < 450) {
                            const eAngle = Math.atan2(e.y - obj.y, e.x - obj.x);
                            e.x += Math.cos(eAngle) * 180;
                            e.y += Math.sin(eAngle) * 180;
                            e.state = 'patrol';
                        }
                    });

                    playSound('levelup');
                }
            } else if (obj.isPortal && !obj.portalUsed) {
                const dist = Math.hypot(obj.x - state.player.x, obj.y - state.player.y);
                if (dist < 60) {
                    obj.portalUsed = true;
                    state.player.fuel = MAX_FUEL;
                    spawnParticles(obj.x, obj.y - 30, '#00FFFF', 25);
                    playSound('levelup');
                }
            }
        });

        // 7. Enemy AI (Hunters & Ghosts) - Restored Threat & Survival Tension
        const config = LEVEL_CONFIGS[Math.min(state.currentLevel - 1, LEVEL_CONFIGS.length - 1)];
        const speedMult = config.speedMult;
        let minThreatDist = 9999;
        let isChased = false;

        // Torin's Iron Resolve / Lethal Blow Handler
        const handleLethalContact = (enemy) => {
            if (inSanctuary || state.player.dead) return;

            const deflectCooldown = 35 * 60; // 35s cooldown
            if (perk.ironStun && (state.time - state.lastDeflectTime >= deflectCooldown)) {
                state.lastDeflectTime = state.time;
                const knockAngle = Math.atan2(enemy.y - state.player.y, enemy.x - state.player.x);
                enemy.x += Math.cos(knockAngle) * 120;
                enemy.y += Math.sin(knockAngle) * 120;
                enemy.state = 'patrol';
                enemy.timer = 140; // 2.3s stunned
                playSound('deflect');
                state.levelBannerText = 'IRON RESOLVE DEFLECTED LETHAL ATTACK!';
                state.levelBannerTimer = 140;

                // Golden iron deflection shockwave
                for (let i = 0; i < 30; i++) {
                    const a = (i / 30) * Math.PI * 2;
                    const spd = 2 + Math.random() * 5;
                    state.particles.push({
                        x: state.player.x,
                        y: state.player.y - 10,
                        dx: Math.cos(a) * spd,
                        dy: Math.sin(a) * spd,
                        life: 35,
                        color: i % 2 === 0 ? '#FFD700' : '#FFFFFF',
                        size: Math.random() * 3.5 + 2
                    });
                }
                return;
            }

            state.player.dead = true;
            soundManager.triggerDeath();
            if (callbacksRef.current.onGameOver) callbacksRef.current.onGameOver();
        };

        state.enemies.forEach(e => {
            const distToPlayer = Math.hypot(e.x - state.player.x, e.y - state.player.y);

            // Despawn & Reposition if drifted too far away (> 950px) - Smart Leash in Rear/Flanks
            if (distToPlayer > 950) {
                const heading = state.player.moving ? state.player.angle : Math.random() * Math.PI * 2;
                const rearAngle = heading + Math.PI + (Math.random() - 0.5) * (Math.PI * 0.9);
                const newDist = 620 + Math.random() * 220;
                e.x = state.player.x + Math.cos(rearAngle) * newDist;
                e.y = state.player.y + Math.sin(rearAngle) * newDist;
                e.state = 'patrol';
                return;
            }

            // Repel enemies from active Ring of Protection around shrines
            visibleObjects.forEach(obj => {
                if (obj.isShrine && obj.activated) {
                    const repelX = 120 * wardScale;
                    const repelY = 65 * wardScale;
                    const dx = (e.x - obj.x) / repelX;
                    const dy = (e.y - obj.y) / repelY;
                    if (dx * dx + dy * dy < 1.0) {
                        const seAngle = Math.atan2(e.y - obj.y, e.x - obj.x);
                        e.x += Math.cos(seAngle) * 4;
                        e.y += Math.sin(seAngle) * 4;
                        e.state = 'patrol';
                    }
                }
            });

            if (e.state === 'chase' || e.state === 'alert') {
                if (distToPlayer < minThreatDist) minThreatDist = distToPlayer;
                if (e.state === 'chase') isChased = true;
            }

            if (e.type === 'ghost') {
                // --- GHOST / PHANTOM AI (Phases through trees/rocks, eerie spectral stalker) ---
                e.alpha = 0.35 + Math.sin(state.time * 0.08 + e.id) * 0.3;

                // Lyra's Ghost Stealth: phantoms only detect her at 140px vs 250px!
                const ghostDetectRange = perk.ghostStealth ? 140 : 250;

                if (distToPlayer < ghostDetectRange) {
                    if (e.state !== 'chase') {
                        soundManager.triggerGhostStalk();
                    }
                    e.state = 'chase';
                    isChased = true;
                    const angleToPlayer = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                    e.angle = angleToPlayer;

                    // Obstacle Drag: phantoms suffer slight drag while gliding through solid obstacles
                    const insideObstacle = phys.checkCollisionCircle(e.x, e.y, 12);
                    const obstacleDrag = insideObstacle ? 0.78 : 1.0;

                    // Ghost Chase Speed: 2.55 * speedMult (Fast and supernatural)
                    const ghostSpeed = 2.55 * speedMult * obstacleDrag;
                    e.x += Math.cos(e.angle) * ghostSpeed;
                    e.y += Math.sin(e.angle) * ghostSpeed;

                    // Ghost mist particle
                    if (Math.random() < 0.25) {
                        state.particles.push({
                            x: e.x + (Math.random() - 0.5) * 12,
                            y: e.y + (Math.random() - 0.5) * 12,
                            dx: (Math.random() - 0.5) * 0.5,
                            dy: -Math.random() * 0.8,
                            life: 30,
                            color: '#80DEEA',
                            size: Math.random() * 3 + 2
                        });
                    }
                } else {
                    e.state = 'patrol';
                    // Drift slowly in current angle
                    e.x += Math.cos(e.angle) * 0.8;
                    e.y += Math.sin(e.angle) * 0.8;
                    if (Math.random() < 0.02) e.angle += (Math.random() - 0.5) * 1.5;
                }

                // Lethal contact with player (deflectable by Torin, warded by Sanctuary)
                if (distToPlayer < 28) {
                    handleLethalContact(e);
                }
            } else {
                // --- HUNTER AI (Physical: Dangerous, relentless, but BLOCKED by trees & rocks!) ---
                // Player walks at 4.0 and sprints at 5.8-7.0. Hunter chases at 3.35 * speedMult.
                // Walking leaves the hunter hot on your heels; sprinting or dodging around trees lets you escape!
                const hunterChaseSpeed = 3.35 * speedMult;
                const hunterPatrolSpeed = 1.1;

                if (e.state === 'patrol') {
                    const dx = Math.cos(e.angle);
                    const dy = Math.sin(e.angle);
                    // Move with full obstacle collision (cannot pass through trees or rocks)
                    const moved = phys.moveEntity(e, dx, dy, hunterPatrolSpeed);
                    if (!moved || Math.random() < 0.015) {
                        e.angle = Math.random() * Math.PI * 2;
                    }

                    if (distToPlayer < 290 && state.player.fuel > 0) {
                        e.state = 'alert';
                        e.timer = 16;
                        e.angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                        spawnParticles(e.x, e.y, '#FF3333', 4);
                        soundManager.triggerHunterAlert();
                    }
                } else if (e.state === 'alert') {
                    e.angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                    e.timer--;
                    if (e.timer <= 0) e.state = 'chase';
                } else if (e.state === 'chase') {
                    isChased = true;
                    const angleToPlayer = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                    e.angle = angleToPlayer;
                    const dx = Math.cos(e.angle);
                    const dy = Math.sin(e.angle);

                    // Move with strict physical collision - BLOCKED by trees, rocks, and shrines
                    const moved = phys.moveEntity(e, dx, dy, hunterChaseSpeed);

                    // If blocked head-on by an obstacle, slide/steer around it
                    if (!moved) {
                        const slideAngle1 = e.angle + 0.9;
                        const slideAngle2 = e.angle - 0.9;
                        const s1 = phys.moveEntity(e, Math.cos(slideAngle1), Math.sin(slideAngle1), hunterChaseSpeed * 0.85);
                        if (!s1) {
                            phys.moveEntity(e, Math.cos(slideAngle2), Math.sin(slideAngle2), hunterChaseSpeed * 0.85);
                        }
                    }

                    if (distToPlayer > 560) e.state = 'patrol';

                    // Lethal contact with player (deflectable by Torin, warded by Sanctuary)
                    if (distToPlayer < 30) {
                        handleLethalContact(e);
                    }
                }
            }
        });

        // 8. Procedural Heartbeat Tension Audio
        if (minThreatDist < 450) {
            const urgency = 1 - (minThreatDist / 450);
            const beatInterval = Math.max(16, Math.floor(55 - urgency * 38));
            if (state.time - lastHeartbeatRef.current >= beatInterval) {
                lastHeartbeatRef.current = state.time;
                playSound('heartbeat', 0.3 + urgency * 0.7);
            }
        }

        // Dynamic Audio Updates (Footsteps, Torch Fire, Threat Tension)
        soundManager.updateMovement({
            isMoving: state.player.moving,
            isSprinting: state.player.isSprinting,
            dead: state.player.dead
        });

        soundManager.updateTorch({
            fuelRatio: state.player.fuel / MAX_FUEL,
            dead: state.player.dead
        });

        soundManager.updateThreatTension({
            minThreatDist,
            isChased,
            dead: state.player.dead
        });

        // 9. Update Portal Animation Frame
        state.portalFrame += 0.15;

        // 10. Update Particles
        updateParticles();
    };

    const updateParticles = () => {
        const state = gameState.current;
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.dx; p.y += p.dy; p.life--; p.size *= 0.95;
            if (p.life <= 0) state.particles.splice(i, 1);
        }
    };

    const spawnParticles = (x, y, color, count) => {
        for (let i = 0; i < count; i++) {
            gameState.current.particles.push({
                x, y, dx: (Math.random() - 0.5) * 4, dy: (Math.random() - 0.5) * 4,
                life: 35, color, size: Math.random() * 4 + 2
            });
        }
    };

    // --- Drawing Functions ---

    // Draw Ghost / Phantom Entity (Ghostface Stalker)
    const drawGhost = (ctx, x, y, angle, alpha = 0.7) => {
        ctx.save();
        ctx.translate(x, y);

        const phantomSprite = assets.getImage('phantom');
        if (phantomSprite) {
            // Shadow beneath floating phantom
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 14, 18, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Floating bob wave
            const floatBob = Math.sin(gameState.current.time * 0.12 + x) * 4;

            // Flip facing based on movement direction (left/right, with deadzone to eliminate oscillation)
            const flip = Math.cos(angle) < -0.05 ? -1 : 1;
            ctx.scale(flip, 1);

            // Ethereal spectral opacity
            ctx.globalAlpha = Math.min(1, alpha * 1.1);

            // Ghostly cyan spectral aura
            ctx.shadowColor = '#00E5FF';
            ctx.shadowBlur = 15;

            // Draw Phantom sprite (proportional size ~48x48)
            const targetH = 48;
            const aspect = phantomSprite.width / phantomSprite.height;
            const targetW = targetH * aspect;

            ctx.drawImage(phantomSprite, -targetW / 2, -targetH + 12 + floatBob, targetW, targetH);
        } else {
            // Undulating ghost body fallback
            ctx.fillStyle = `rgba(178, 235, 242, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(0, -6, 14, Math.PI, 0); // Head dome
            const wave = Math.sin(gameState.current.time * 0.2 + x) * 3;
            ctx.lineTo(14, 12 + wave);
            ctx.lineTo(7, 8 - wave);
            ctx.lineTo(0, 14 + wave);
            ctx.lineTo(-7, 8 - wave);
            ctx.lineTo(-14, 12 + wave);
            ctx.closePath();
            ctx.fill();

            // Inner glowing core
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(0, -4, 8, 0, Math.PI * 2);
            ctx.fill();

            // Ghostly Glowing Eyes
            ctx.fillStyle = '#00E5FF';
            ctx.beginPath();
            ctx.arc(-4, -6, 2.5, 0, Math.PI * 2);
            ctx.arc(4, -6, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    };

    // Draw Human Character (Player or Hunter) with authentic 2.5D pixel-art sprites
    const drawCharacter = (ctx, x, y, angle, isPlayer, fuelRatio, isMoving = false) => {
        ctx.save();
        ctx.translate(x, y);

        const sprite = isPlayer
            ? (assets.getImage(characterId) || assets.getImage('player'))
            : (assets.getImage('char_hunter') || assets.getImage('hunter'));

        if (sprite) {
            // 1. Ground Shadow (Realistic 2.5D contact shadow)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 3, 16, 7.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. Facing direction flip (smooth horizontal facing, eliminates 60Hz vertical flip jitter)
            const facing = isPlayer
                ? (gameState.current.player.facing || 1)
                : (Math.cos(angle) < -0.05 ? -1 : 1);
            ctx.scale(facing, 1);

            // 3. Movement Animation (Smooth distance-based walk bounce, no tilt jitter)
            const time = gameState.current.time;
            const walkBob = isMoving
                ? (isPlayer ? Math.sin(gameState.current.player.walkPhase) * 2.0 : Math.sin(time * 0.2) * 2.0)
                : Math.sin(time * 0.05) * 0.6;

            // 4. Draw Character Sprite
            const targetH = 52;
            const sW = sprite.naturalWidth || sprite.width || 800;
            const sH = sprite.naturalHeight || sprite.height || 1400;
            const aspect = sW / sH;
            const targetW = targetH * aspect;
            const drawX = -targetW / 2;
            const drawY = -targetH + 4 + walkBob;

            ctx.drawImage(sprite, drawX, drawY, targetW, targetH);

            // 5. Equipment Overlays
            if (isPlayer) {
                // Torch Arm & Animated Fire
                ctx.save();
                const torchX = 13;
                const torchY = -23 + walkBob;

                // Torch wooden shaft
                ctx.strokeStyle = '#4E342E';
                ctx.lineWidth = 3.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(torchX - 3, torchY + 7);
                ctx.lineTo(torchX + 6, torchY - 13);
                ctx.stroke();

                // Torch iron head bracket
                ctx.fillStyle = '#795548';
                ctx.fillRect(torchX + 4, torchY - 17, 5, 5);

                // Animated Fire & Flame Glow
                if (fuelRatio > 0) {
                    const flameX = torchX + 6;
                    const flameY = torchY - 17;
                    const flicker = Math.sin(Date.now() * 0.02) * 1.5;
                    const r = Math.max(3.5, 5.5 + (fuelRatio * 5.5) + flicker);

                    // Outer fire glow
                    ctx.fillStyle = 'rgba(255, 68, 0, 0.9)';
                    ctx.beginPath(); ctx.arc(flameX, flameY, r, 0, Math.PI * 2); ctx.fill();

                    // Mid amber flame core
                    ctx.fillStyle = 'rgba(255, 180, 0, 0.95)';
                    ctx.beginPath(); ctx.arc(flameX, flameY, r * 0.65, 0, Math.PI * 2); ctx.fill();

                    // Inner brilliant heart
                    ctx.fillStyle = 'rgba(255, 255, 220, 0.98)';
                    ctx.beginPath(); ctx.arc(flameX, flameY - 1, r * 0.35, 0, Math.PI * 2); ctx.fill();

                    // Warm torch illumination halo
                    const g = ctx.createRadialGradient(flameX, flameY, 2, flameX, flameY, 38);
                    g.addColorStop(0, 'rgba(255, 200, 60, 0.55)');
                    g.addColorStop(0.5, 'rgba(255, 110, 20, 0.25)');
                    g.addColorStop(1, 'rgba(255, 60, 0, 0)');
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(flameX, flameY, 38, 0, Math.PI * 2); ctx.fill();
                } else {
                    // Burned out coal tip
                    ctx.fillStyle = '#212121';
                    ctx.beginPath(); ctx.arc(torchX + 6, torchY - 15, 2.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            } else {
                // Hunter: Steel Hunting Machete + Menacing Red Eye Glint
                ctx.save();
                const bladeX = 13;
                const bladeY = -21 + walkBob;

                // Machete Blade
                ctx.strokeStyle = '#B0BEC5';
                ctx.lineWidth = 3.5;
                ctx.lineCap = 'square';
                ctx.beginPath();
                ctx.moveTo(bladeX - 2, bladeY + 8);
                ctx.lineTo(bladeX + 8, bladeY - 12);
                ctx.stroke();

                // Steel edge shine
                ctx.strokeStyle = '#ECEFF1';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(bladeX + 8, bladeY - 12);
                ctx.lineTo(bladeX + 11, bladeY - 16);
                ctx.stroke();

                // Grip
                ctx.strokeStyle = '#263238';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(bladeX - 4, bladeY + 12);
                ctx.lineTo(bladeX - 2, bladeY + 7);
                ctx.stroke();

                // Menacing predator eye glints
                ctx.fillStyle = '#FF1744';
                ctx.shadowColor = '#FF1744';
                ctx.shadowBlur = 7;
                ctx.beginPath();
                ctx.arc(-2, -37 + walkBob, 1.8, 0, Math.PI * 2);
                ctx.arc(3, -37 + walkBob, 1.8, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        } else {
            // Procedural fallback
            ctx.rotate(angle);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath(); ctx.ellipse(0, 5, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = isPlayer ? '#546E7A' : '#3E2723';
            ctx.fillRect(-12, -10, 24, 20);
            ctx.fillStyle = '#FFCC80';
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = isPlayer ? '#3E2723' : '#000000';
            ctx.beginPath(); ctx.arc(0, 0, 11, Math.PI, 0); ctx.fill();
            if (isPlayer) {
                ctx.save();
                ctx.rotate(-0.3);
                ctx.fillStyle = '#FFCC80';
                ctx.fillRect(12, -5, 15, 6);
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(25, -8, 5, 20);
                if (fuelRatio > 0) {
                    const flicker = Math.sin(Date.now() * 0.02) * 2;
                    const r = Math.max(4, 6 + (fuelRatio * 6) + flicker);
                    ctx.fillStyle = 'rgba(255, 75, 0, 0.9)';
                    ctx.beginPath(); ctx.arc(27, -12, r, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }
        }

        ctx.restore();
    };

    // Draw Torch flame and bracket on a static tree or prop
    const drawObjectTorch = (ctx, x, y) => {
        // Torch bracket
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(x + 6, y - 10, 8, 4);
        ctx.fillStyle = '#C19A6B';
        ctx.fillRect(x + 10, y - 18, 4, 18);

        const flicker = Math.sin(Date.now() * 0.015 + x) * 2;
        const r = 7 + flicker;

        ctx.fillStyle = 'rgba(255, 90, 0, 0.85)';
        ctx.beginPath(); ctx.arc(x + 12, y - 22, r, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(255, 230, 80, 0.95)';
        ctx.beginPath(); ctx.arc(x + 12, y - 23, r * 0.55, 0, Math.PI * 2); ctx.fill();

        const tg = ctx.createRadialGradient(x + 12, y - 22, 3, x + 12, y - 22, 35);
        tg.addColorStop(0, 'rgba(255, 200, 50, 0.5)');
        tg.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(x + 12, y - 22, 35, 0, Math.PI * 2); ctx.fill();
    };

    // Draw World Object (Sprite or procedural fallback)
    const drawWorldObject = (ctx, obj) => {
        // Base shadow on ground
        if (obj.r > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(obj.x, obj.y + 4, obj.r * 1.15, obj.r * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Sacred Shrine Ring of Protection (Only visible when shrine is activated)
        if (obj.isShrine && obj.activated) {
            const time = gameState.current.time;
            const pulse = (Math.sin(time * 0.05) + 1) / 2;
            const wardScale = perk.wardRadius || 1.0;
            const radiusX = 110 * wardScale;
            const radiusY = 58 * wardScale;

            ctx.save();

            // Soft golden ground glow inside the protected perimeter
            const glow = ctx.createRadialGradient(obj.x, obj.y, 10, obj.x, obj.y, radiusX);
            const baseAlpha = 0.18 + pulse * 0.06;
            glow.addColorStop(0, `rgba(255, 235, 140, ${baseAlpha * 1.6})`);
            glow.addColorStop(0.7, `rgba(255, 215, 80, ${baseAlpha * 0.6})`);
            glow.addColorStop(1, 'rgba(255, 215, 80, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.ellipse(obj.x, obj.y, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();

            // Rotating ethereal dashed inner ring
            const innerRadiusX = radiusX * 0.72;
            const innerRadiusY = radiusY * 0.72;
            ctx.strokeStyle = `rgba(255, 240, 160, ${0.28 + (1 - pulse) * 0.18})`;
            ctx.lineWidth = 1.2;
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -time * 0.4;
            ctx.beginPath();
            ctx.ellipse(obj.x, obj.y, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]); // reset dash

            // Outer primary Ring of Protection with celestial golden radiance
            ctx.strokeStyle = `rgba(255, 245, 160, ${0.75 + pulse * 0.25})`;
            ctx.lineWidth = 2.2;
            ctx.shadowColor = 'rgba(255, 215, 60, 0.85)';
            ctx.shadowBlur = 12 + pulse * 6;
            ctx.beginPath();
            ctx.ellipse(obj.x, obj.y, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.stroke();

            // 4 golden rune beacons slowly orbiting along the Ring of Protection perimeter
            for (let i = 0; i < 4; i++) {
                const runeAngle = (i / 4) * Math.PI * 2 + (time * 0.012);
                const rx = obj.x + Math.cos(runeAngle) * radiusX;
                const ry = obj.y + Math.sin(runeAngle) * radiusY;
                ctx.fillStyle = '#FFF8E1';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        if (obj.isPortal) {
            drawAnimatedPortal(ctx, obj.x, obj.y, gameState.current.portalFrame);
        } else if (obj.spriteKey && SPRITE_DEFS[obj.spriteKey] && assets.loaded) {
            drawSprite(ctx, obj.spriteKey, obj.x, obj.y, 0.85);
        } else {
            // Procedural pine fallback if assets still loading
            ctx.fillStyle = '#1a472a';
            for (let i = 0; i < 3; i++) {
                const size = 30 - (i * 5);
                ctx.beginPath();
                ctx.moveTo(obj.x, obj.y - 10 - (i * 15));
                for (let j = 0; j < 5; j++) {
                    const a = (j / 5) * Math.PI * 2;
                    ctx.lineTo(obj.x + Math.cos(a) * size, obj.y + Math.sin(a) * size);
                }
                ctx.fill();
            }
        }

        // Shrine Floating Label & Interaction Prompt
        if (obj.isShrine) {
            const time = gameState.current.time;
            const floatY = Math.sin(time * 0.08 + obj.x) * 4;
            const def = SPRITE_DEFS[obj.spriteKey];
            const topOffset = def ? (def.sh * 0.85 + 20) : 70;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = 'bold 11px "Courier Prime", monospace';

            if (obj.activated) {
                ctx.fillStyle = 'rgba(255, 245, 157, 0.95)';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 8;
                ctx.fillText(`${obj.shrineName || 'CONSECRATED SHRINE'}`, obj.x, obj.y - topOffset + floatY);
                ctx.font = '9px monospace';
                ctx.fillStyle = 'rgba(178, 255, 178, 0.9)';
                ctx.fillText(`[RING OF PROTECTION ACTIVE]`, obj.x, obj.y - topOffset + floatY + 13);
            } else {
                ctx.fillStyle = 'rgba(255, 224, 130, 0.95)';
                ctx.shadowColor = '#FFA000';
                ctx.shadowBlur = 10;
                ctx.fillText(`${obj.shrineName || 'ANCIENT SHRINE'}`, obj.x, obj.y - topOffset + floatY);
                ctx.font = '9px monospace';
                ctx.fillStyle = 'rgba(255, 248, 225, 0.85)';
                ctx.fillText(`(APPROACH TO ACTIVATE)`, obj.x, obj.y - topOffset + floatY + 13);
            }
            ctx.restore();
        }

        // Draw torch if attached to this object
        if (obj.hasTorch) {
            drawObjectTorch(ctx, obj.x, obj.y);
        }
    };

    const draw = (ctx) => {
        const state = gameState.current;
        const cam = state.camera;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const fuelRatio = state.player.fuel / MAX_FUEL;

        // 1. Ground - Seamless dark atmospheric forest floor (no tiles/grids)
        ctx.fillStyle = '#0e160d';
        ctx.fillRect(0, 0, width, height);

        // 2. Fetch Visible Objects from Active Chunks
        const visibleChunks = worldGenRef.current.getVisibleChunks(cam.x, cam.y, width, height);
        const visibleObjects = [];
        visibleChunks.forEach(chunk => {
            chunk.objects.forEach(obj => {
                // Viewport cull
                if (obj.x >= cam.x - 120 && obj.x <= cam.x + width + 120 &&
                    obj.y >= cam.y - 120 && obj.y <= cam.y + height + 120) {
                    visibleObjects.push(obj);
                }
            });
        });

        // 3. 2.5D Y-Depth Sorted Render Queue (Rounded integer camera prevents subpixel shimmer)
        const roundCamX = Math.round(cam.x);
        const roundCamY = Math.round(cam.y);

        ctx.save();
        ctx.translate(-roundCamX, -roundCamY);

        const renderQueue = [];

        // Add Environment Objects
        visibleObjects.forEach(obj => {
            renderQueue.push({
                y: obj.y,
                render: () => drawWorldObject(ctx, obj)
            });
        });

        // Add Enemies
        state.enemies.forEach(e => {
            if (e.x >= roundCamX - 80 && e.x <= roundCamX + width + 80 &&
                e.y >= roundCamY - 80 && e.y <= roundCamY + height + 80) {
                renderQueue.push({
                    y: e.y,
                    render: () => {
                        if (e.type === 'ghost') {
                            drawGhost(ctx, e.x, e.y, e.angle, e.alpha);
                        } else {
                            drawCharacter(ctx, e.x, e.y, e.angle, false, 0, e.state === 'chase' || e.state === 'patrol');
                        }
                    }
                });
            }
        });

        // Add Player
        renderQueue.push({
            y: state.player.y,
            render: () => drawCharacter(ctx, state.player.x, state.player.y, state.player.angle, true, fuelRatio, state.player.moving)
        });

        // Sort by base Y coordinate for realistic 2.5D depth
        renderQueue.sort((a, b) => a.y - b.y);

        // Execute render queue
        renderQueue.forEach(item => item.render());

        // Particles
        state.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });

        ctx.restore();

        // 4. Lighting System (Off-Screen Darkness Mask)
        const px = state.player.x - roundCamX;
        const py = state.player.y - roundCamY;

        const maxR = 90 + (fuelRatio * 220);
        const flicker = (Math.random() - 0.5) * 8;
        const currentR = fuelRatio > 0 ? Math.max(25, maxR + flicker) : 0;

        if (!lightCanvasRef.current) {
            lightCanvasRef.current = document.createElement('canvas');
        }
        const lightCanvas = lightCanvasRef.current;
        if (lightCanvas.width !== width || lightCanvas.height !== height) {
            lightCanvas.width = width;
            lightCanvas.height = height;
        }

        const lCtx = lightCanvas.getContext('2d');
        lCtx.clearRect(0, 0, width, height);

        // Fill deep darkness
        lCtx.fillStyle = 'rgba(2, 6, 12, 0.94)';
        lCtx.fillRect(0, 0, width, height);

        // Cut lights out of darkness
        lCtx.globalCompositeOperation = 'destination-out';

        // Player Torch Light
        if (currentR > 0) {
            const lGrad = lCtx.createRadialGradient(px, py, 15, px, py, currentR);
            lGrad.addColorStop(0, 'rgba(0,0,0,1)');
            lGrad.addColorStop(0.7, 'rgba(0,0,0,0.85)');
            lGrad.addColorStop(1, 'rgba(0,0,0,0)');
            lCtx.fillStyle = lGrad;
            lCtx.beginPath();
            lCtx.arc(px, py, currentR, 0, Math.PI * 2);
            lCtx.fill();
        }

        // Tree / Ruin Torches
        visibleObjects.forEach(t => {
            if (!t.hasTorch) return;
            const tx = t.x - roundCamX;
            const ty = t.y - roundCamY;
            const tr = 110 + Math.sin(state.time * 0.1 + t.x) * 6;
            const tGrad = lCtx.createRadialGradient(tx, ty, 8, tx, ty, tr);
            tGrad.addColorStop(0, 'rgba(0,0,0,0.95)');
            tGrad.addColorStop(0.65, 'rgba(0,0,0,0.7)');
            tGrad.addColorStop(1, 'rgba(0,0,0,0)');
            lCtx.fillStyle = tGrad;
            lCtx.beginPath();
            lCtx.arc(tx, ty, tr, 0, Math.PI * 2);
            lCtx.fill();
        });

        // Cosmic Portal Glow in Darkness
        visibleObjects.forEach(obj => {
            if (!obj.isPortal) return;
            const ox = obj.x - roundCamX;
            const oy = obj.y - roundCamY;
            const pGrad = lCtx.createRadialGradient(ox, oy, 15, ox, oy, 150);
            pGrad.addColorStop(0, 'rgba(0,0,0,0.95)');
            pGrad.addColorStop(1, 'rgba(0,0,0,0)');
            lCtx.fillStyle = pGrad;
            lCtx.beginPath();
            lCtx.arc(ox, oy, 150, 0, Math.PI * 2);
            lCtx.fill();
        });

        // Sacred Shrine Light Beacons in Darkness
        visibleObjects.forEach(obj => {
            if (!obj.isShrine) return;
            const sx = obj.x - roundCamX;
            const sy = obj.y - roundCamY;
            const sRadius = obj.activated ? 240 : (170 + Math.sin(state.time * 0.08 + obj.x) * 12);
            const sGrad = lCtx.createRadialGradient(sx, sy, 10, sx, sy, sRadius);
            sGrad.addColorStop(0, 'rgba(0,0,0,1)');
            sGrad.addColorStop(0.65, obj.activated ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.65)');
            sGrad.addColorStop(1, 'rgba(0,0,0,0)');
            lCtx.fillStyle = sGrad;
            lCtx.beginPath();
            lCtx.arc(sx, sy, sRadius, 0, Math.PI * 2);
            lCtx.fill();
        });

        lCtx.globalCompositeOperation = 'source-over';

        // Draw darkness overlay
        ctx.drawImage(lightCanvas, 0, 0);

        // Warm illumination screen blend (Player Torch, Tree Torches, and Shrines)
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        if (currentR > 0) {
            const warmGlow = ctx.createRadialGradient(px, py, 5, px, py, currentR);
            warmGlow.addColorStop(0, 'rgba(255, 170, 50, 0.35)');
            warmGlow.addColorStop(0.5, 'rgba(255, 110, 20, 0.16)');
            warmGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = warmGlow;
            ctx.beginPath();
            ctx.arc(px, py, currentR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Tree torches warm screen blend
        visibleObjects.forEach(t => {
            if (!t.hasTorch) return;
            const tx = t.x - roundCamX;
            const ty = t.y - roundCamY;
            const treeGlow = ctx.createRadialGradient(tx, ty, 5, tx, ty, 110);
            treeGlow.addColorStop(0, 'rgba(255, 180, 50, 0.3)');
            treeGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
            ctx.fillStyle = treeGlow;
            ctx.beginPath();
            ctx.arc(tx, ty, 110, 0, Math.PI * 2);
            ctx.fill();
        });

        // Sacred Shrines golden holy screen blend
        visibleObjects.forEach(s => {
            if (!s.isShrine) return;
            const sx = s.x - roundCamX;
            const sy = s.y - roundCamY;
            const sRadius = s.activated ? 240 : 170;
            const shrineGlow = ctx.createRadialGradient(sx, sy, 5, sx, sy, sRadius);
            if (s.activated) {
                shrineGlow.addColorStop(0, 'rgba(255, 245, 160, 0.45)');
                shrineGlow.addColorStop(0.5, 'rgba(255, 215, 80, 0.22)');
                shrineGlow.addColorStop(1, 'rgba(255, 180, 50, 0)');
            } else {
                shrineGlow.addColorStop(0, 'rgba(255, 215, 80, 0.32)');
                shrineGlow.addColorStop(0.6, 'rgba(255, 170, 40, 0.14)');
                shrineGlow.addColorStop(1, 'rgba(255, 140, 0, 0)');
            }
            ctx.fillStyle = shrineGlow;
            ctx.beginPath();
            ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();

        // Scarlet's Predator Radar Ping
        if (perk.radarPing) {
            const pingCycle = (state.time % 130) / 130; // 0 to 1
            const pingRadius = pingCycle * 650;
            const pingAlpha = (1 - pingCycle) * 0.25;
            ctx.save();
            ctx.strokeStyle = `rgba(255, 165, 0, ${pingAlpha})`;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(px, py, pingRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 5. Threat Indicators (Eyes in the Dark & Directional Chevrons)
        const eyeDetectRange = perk.eyeRange || 500;
        let minThreatDist = 9999;
        state.enemies.forEach(e => {
            const dist = Math.hypot(e.x - state.player.x, e.y - state.player.y);
            if (e.state === 'chase' || e.state === 'alert') {
                if (dist < minThreatDist) minThreatDist = dist;
            }

            // Glowing Eyes in the Darkness (Extended to 600px for Scarlet)
            if (dist < eyeDetectRange) {
                const ex = e.x - roundCamX;
                const ey = e.y - roundCamY;
                if (ex >= -50 && ex <= width + 50 && ey >= -50 && ey <= height + 50) {
                    const isChasing = e.state === 'chase' || e.state === 'alert';
                    const alpha = Math.min(1, Math.max(0.3, 1 - (dist / eyeDetectRange)));
                    const eyeDist = 4;
                    const eyeAngle = e.angle;
                    const eyeFwd = 8;

                    const lx = ex + Math.cos(eyeAngle) * eyeFwd + Math.cos(eyeAngle - Math.PI / 2) * eyeDist;
                    const ly = ey + Math.sin(eyeAngle) * eyeFwd + Math.sin(eyeAngle - Math.PI / 2) * eyeDist;
                    const rx = ex + Math.cos(eyeAngle) * eyeFwd + Math.cos(eyeAngle + Math.PI / 2) * eyeDist;
                    const ry = ey + Math.sin(eyeAngle) * eyeFwd + Math.sin(eyeAngle + Math.PI / 2) * eyeDist;

                    ctx.save();
                    // Red for Hunters, Cyan for Ghosts
                    ctx.fillStyle = e.type === 'ghost' ? `rgba(0, 229, 255, ${alpha * 0.95})` : (isChasing ? `rgba(255, 30, 30, ${alpha * 0.95})` : `rgba(255, 120, 20, ${alpha * 0.7})`);
                    ctx.beginPath();
                    ctx.arc(lx, ly, isChasing ? 2.5 : 2, 0, Math.PI * 2);
                    ctx.arc(rx, ry, isChasing ? 2.5 : 2, 0, Math.PI * 2);
                    ctx.fill();

                    const aura = ctx.createRadialGradient(ex, ey, 2, ex, ey, 24);
                    const auraColor = e.type === 'ghost' ? '0, 229, 255' : '255, 0, 0';
                    aura.addColorStop(0, `rgba(${auraColor}, ${alpha * 0.35})`);
                    aura.addColorStop(1, `rgba(${auraColor}, 0)`);
                    ctx.fillStyle = aura;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 24, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Directional Threat Chevron (Range influenced by Scarlet's Predator Sight perk: 650px)
            const threatRange = perk.threatRange || 450;
            if (e.state === 'chase' && dist < threatRange) {
                const ex = e.x - roundCamX;
                const ey = e.y - roundCamY;
                const angle = Math.atan2(ey - height / 2, ex - width / 2);
                const edgePad = 35;
                const edgeX = Math.max(edgePad, Math.min(width - edgePad, width / 2 + Math.cos(angle) * (width / 2 - edgePad)));
                const edgeY = Math.max(edgePad, Math.min(height - edgePad, height / 2 + Math.sin(angle) * (height / 2 - edgePad)));

                const pingPulse = (Math.sin(state.time * 0.25) + 1) / 2;
                ctx.save();
                ctx.translate(edgeX, edgeY);
                ctx.rotate(angle);
                ctx.fillStyle = e.type === 'ghost' ? `rgba(0, 229, 255, ${0.5 + pingPulse * 0.5})` : `rgba(255, 30, 30, ${0.5 + pingPulse * 0.5})`;
                ctx.beginPath();
                ctx.moveTo(12, 0);
                ctx.lineTo(-6, -7);
                ctx.lineTo(-2, 0);
                ctx.lineTo(-6, 7);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        });

        // Pulsing Danger Vignette
        if (minThreatDist < 450) {
            const urgency = 1 - (minThreatDist / 450);
            const pulse = (Math.sin(state.time * (0.15 + urgency * 0.25)) + 1) / 2;
            const vigAlpha = urgency * 0.42 * (0.6 + pulse * 0.4);

            const vigGrad = ctx.createRadialGradient(
                width / 2, height / 2, Math.min(width, height) * 0.35,
                width / 2, height / 2, Math.max(width, height) * 0.72
            );
            vigGrad.addColorStop(0, 'rgba(255, 0, 0, 0)');
            vigGrad.addColorStop(1, `rgba(180, 10, 10, ${vigAlpha})`);
            ctx.fillStyle = vigGrad;
            ctx.fillRect(0, 0, width, height);
        }

        // 6. Level Up Announcement Banner
        if (state.levelBannerTimer > 0) {
            const bannerAlpha = Math.min(1, state.levelBannerTimer / 30);
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${bannerAlpha * 0.75})`;
            ctx.fillRect(0, height * 0.22, width, 50);

            ctx.font = 'bold 22px "Courier Prime", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(253, 203, 110, ${bannerAlpha})`;
            ctx.shadowColor = 'rgba(253, 203, 110, 0.8)';
            ctx.shadowBlur = 10;
            ctx.fillText(`${state.levelBannerText}`, width / 2, height * 0.22 + 32);
            ctx.restore();
        }

        // 7. HUD - Fuel Bar & Level Info
        const barW = 200;
        const barH = 10;
        const barX = width / 2 - barW / 2;
        const barY = height - 40;

        ctx.fillStyle = 'rgba(18, 14, 18, 0.88)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        ctx.fillStyle = fuelRatio > 0.3 ? '#e74d02' : '#b62602';
        ctx.fillRect(barX, barY, barW * fuelRatio, barH);

        ctx.strokeStyle = 'rgba(252, 180, 44, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

        ctx.fillStyle = '#f5ebe6';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`TORCH FUEL  |  LVL ${state.currentLevel}`, width / 2, barY - 10);

        // Sprint Status Indicator
        if (state.player.isSprinting) {
            ctx.save();
            ctx.fillStyle = '#fcb42c';
            ctx.font = 'bold 11px monospace';
            ctx.shadowColor = '#fcb42c';
            ctx.shadowBlur = 6;
            ctx.fillText(`SPRINTING`, width / 2, barY + 24);
            ctx.restore();
        }

        // Torin's Iron Resolve HUD Status
        if (perk.ironStun) {
            const deflectCooldown = 35 * 60;
            const elapsed = state.time - state.lastDeflectTime;
            const isReady = elapsed >= deflectCooldown;
            const remainingSec = Math.ceil((deflectCooldown - elapsed) / 60);

            ctx.save();
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            if (isReady) {
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 6;
                ctx.fillText(`IRON RESOLVE: [READY]`, width / 2, barY + 38);
            } else {
                ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
                ctx.fillText(`IRON RESOLVE: [RECHARGING ${remainingSec}s]`, width / 2, barY + 38);
            }
            ctx.restore();
        }

        if (state.inSanctuary) {
            ctx.save();
            ctx.fillStyle = '#fcb42c';
            ctx.font = 'bold 13px "Courier Prime", monospace';
            ctx.shadowColor = '#fcb42c';
            ctx.shadowBlur = 8;
            ctx.fillText(`RING OF PROTECTION ACTIVE: PURSUERS HELD AT BAY`, width / 2, barY - 28);
            ctx.restore();
        }
    };

    useEffect(() => {
        const resize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, []);

    return <canvas ref={canvasRef} style={{ display: 'block', position: 'fixed', top: 0, left: 0 }} />;
}
