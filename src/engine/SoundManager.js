// Comprehensive Sound & Audio Manager for The Woods
// Handles menu & game ambiance, torch fire crackle, walk/run footstep loops,
// dynamic chase tension, monster voices, and Web Audio procedural chimes.

class SoundManager {
    constructor() {
        this.masterVolume = 0.8;
        this.sfxEnabled = true;
        this.ambienceEnabled = true;

        this.initialized = false;
        this.audioCtx = null;

        // Long-running loop audio elements
        this.loops = {
            menuAmbience: this.createAudio('/audio/ambience_menu.mp3', true, 0.4),
            gameAmbience: this.createAudio('/audio/ambience_game.mp3', true, 0.45),
            torchFire: this.createAudio('/audio/torch_fire.mp3', true, 0.25),
            walk: this.createAudio('/audio/walk.mp3', true, 0.35),
            run: this.createAudio('/audio/run.mp3', true, 0.5),
            chaseTension: this.createAudio('/audio/chase_tension.mp3', true, 0.0) // Faded dynamically
        };

        // One-shot sound paths
        this.sfxUrls = {
            hunterAlert: '/audio/hunter_alert.mp3',
            ghostStalk: '/audio/ghost_stalk.mp3',
            playerDeath: '/audio/player_death.mp3',
            cineBoom: '/audio/cine_boom.mp3'
        };

        // SFX Throttle timers (timestamps)
        this.lastHunterAlert = 0;
        this.lastGhostStalk = 0;
        this.lastDeflectSound = 0;

        // Target volumes for smooth fades
        this.currentScreen = 'menu'; // 'menu' | 'game'
    }

    createAudio(url, loop = false, defaultVol = 0.5) {
        if (typeof window === 'undefined') return null;
        try {
            const audio = new Audio(url);
            audio.loop = loop;
            audio.preload = 'auto';
            audio._baseVolume = defaultVol;
            audio.volume = defaultVol * this.masterVolume;
            return audio;
        } catch {
            return null;
        }
    }

    // Unlock audio context and audio elements upon user interaction (browser policy)
    unlock() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx && !this.audioCtx) {
                this.audioCtx = new AudioCtx();
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
            }
        } catch {}
    }

    setSettings(settings = {}) {
        if (typeof settings.volume === 'number') {
            this.masterVolume = Math.max(0, Math.min(1, settings.volume));
        }
        if (typeof settings.sfxEnabled === 'boolean') {
            this.sfxEnabled = settings.sfxEnabled;
        }
        if (typeof settings.ambience === 'boolean') {
            this.ambienceEnabled = settings.ambience;
        }

        // Update active loop volumes
        Object.values(this.loops).forEach(audio => {
            if (audio) {
                const base = audio._baseVolume || 0.5;
                audio.volume = Math.max(0, Math.min(1, base * this.masterVolume));
            }
        });

        if (!this.ambienceEnabled) {
            this.stopLoop('menuAmbience');
            this.stopLoop('gameAmbience');
        } else {
            if (this.currentScreen === 'menu') {
                this.playMenuAmbience();
            } else if (this.currentScreen === 'game') {
                this.playGameAmbience();
            }
        }
    }

    safePlay(audio) {
        if (!audio) return;
        try {
            const promise = audio.play();
            if (promise && promise.catch) {
                promise.catch(() => {
                    // Browser prevented autoplay before gesture
                });
            }
        } catch {}
    }

    safePause(audio) {
        if (!audio) return;
        try {
            audio.pause();
        } catch {}
    }

    stopLoop(key) {
        const audio = this.loops[key];
        if (audio) {
            this.safePause(audio);
            try { audio.currentTime = 0; } catch {}
        }
    }

    // --- Screen Ambience Switching ---

    playMenuAmbience() {
        this.currentScreen = 'menu';
        this.stopLoop('gameAmbience');
        this.stopLoop('torchFire');
        this.stopLoop('walk');
        this.stopLoop('run');
        this.stopLoop('chaseTension');

        if (!this.ambienceEnabled) return;
        const menu = this.loops.menuAmbience;
        if (menu) {
            menu.volume = 0.42 * this.masterVolume;
            this.safePlay(menu);
        }
    }

    playGameAmbience() {
        this.currentScreen = 'game';
        this.stopLoop('menuAmbience');

        if (this.ambienceEnabled) {
            const game = this.loops.gameAmbience;
            if (game) {
                game.volume = 0.45 * this.masterVolume;
                this.safePlay(game);
            }
        }
    }

    // --- Dynamic In-Game Audio Updates ---

    updateMovement({ isMoving, isSprinting, dead }) {
        if (!this.sfxEnabled || dead || !isMoving) {
            this.safePause(this.loops.walk);
            this.safePause(this.loops.run);
            return;
        }

        if (isSprinting) {
            this.safePause(this.loops.walk);
            const runAudio = this.loops.run;
            if (runAudio) {
                runAudio.volume = 0.55 * this.masterVolume;
                if (runAudio.paused) this.safePlay(runAudio);
            }
        } else {
            this.safePause(this.loops.run);
            const walkAudio = this.loops.walk;
            if (walkAudio) {
                walkAudio.volume = 0.38 * this.masterVolume;
                if (walkAudio.paused) this.safePlay(walkAudio);
            }
        }
    }

    updateTorch({ fuelRatio, dead }) {
        const fire = this.loops.torchFire;
        if (!fire) return;

        if (!this.sfxEnabled || dead || fuelRatio <= 0) {
            this.safePause(fire);
            return;
        }

        // Modulate crackle volume with remaining flame strength
        const fireVol = (0.12 + fuelRatio * 0.28) * this.masterVolume;
        fire.volume = Math.max(0, Math.min(1, fireVol));
        if (fire.paused) {
            this.safePlay(fire);
        }
    }

    updateThreatTension({ minThreatDist, isChased, dead }) {
        const tension = this.loops.chaseTension;
        if (!tension) return;

        if (!this.sfxEnabled || dead || !isChased || minThreatDist > 500) {
            if (!tension.paused) {
                // Fade out
                const target = Math.max(0, tension.volume - 0.04);
                tension.volume = target;
                if (target <= 0.01) {
                    this.safePause(tension);
                }
            }
            return;
        }

        // Distance urgency (closer = louder tense strings/pulse)
        const urgency = 1 - Math.min(1, minThreatDist / 500);
        const targetVol = (0.2 + urgency * 0.55) * this.masterVolume;
        tension.volume = Math.max(0, Math.min(1, targetVol));
        if (tension.paused) {
            this.safePlay(tension);
        }
    }

    // --- One-Shot Events ---

    triggerHunterAlert() {
        if (!this.sfxEnabled) return;
        const now = Date.now();
        // At most once every 12 seconds
        if (now - this.lastHunterAlert < 12000) return;
        this.lastHunterAlert = now;

        this.playOneShot(this.sfxUrls.hunterAlert, 0.85);
    }

    triggerGhostStalk() {
        if (!this.sfxEnabled) return;
        const now = Date.now();
        // At most once every 9 seconds
        if (now - this.lastGhostStalk < 9000) return;
        this.lastGhostStalk = now;

        this.playOneShot(this.sfxUrls.ghostStalk, 0.7);
    }

    triggerDeath() {
        // Stop movement and tension loops
        this.safePause(this.loops.walk);
        this.safePause(this.loops.run);
        this.safePause(this.loops.torchFire);
        this.safePause(this.loops.chaseTension);

        if (!this.sfxEnabled) return;

        // Demon defeat scream + deep cinematic sub-bass boom
        this.playOneShot(this.sfxUrls.playerDeath, 0.9);
        setTimeout(() => {
            this.playOneShot(this.sfxUrls.cineBoom, 0.95);
        }, 180);
    }

    triggerCineBoom() {
        if (!this.sfxEnabled) return;
        this.playOneShot(this.sfxUrls.cineBoom, 0.85);
    }

    playOneShot(url, volMult = 1.0) {
        if (!this.sfxEnabled || typeof window === 'undefined') return;
        try {
            const sfx = new Audio(url);
            sfx.volume = Math.max(0, Math.min(1, volMult * this.masterVolume));
            this.safePlay(sfx);
        } catch {}
    }

    // --- Web Audio Procedural Chimes ---

    getAudioContext() {
        if (!this.audioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.audioCtx = new AudioCtx();
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    playHeartbeat(intensity = 1) {
        if (!this.sfxEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            [0, 0.12].forEach(offset => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const startTime = ctx.currentTime + offset;
                osc.frequency.setValueAtTime(62, startTime);
                osc.frequency.exponentialRampToValueAtTime(26, startTime + 0.14);

                gain.gain.setValueAtTime(0.35 * intensity * this.masterVolume, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.16);
            });
        } catch {}
    }

    playLevelUp() {
        if (!this.sfxEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                const t = ctx.currentTime + i * 0.08;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.28 * this.masterVolume, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.42);
            });
        } catch {}
    }

    playRefuel() {
        if (!this.sfxEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t = ctx.currentTime;
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(640, t + 0.2);
            gain.gain.setValueAtTime(0.24 * this.masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.24);
        } catch {}
    }

    playDeflect() {
        if (!this.sfxEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const t = ctx.currentTime;
            osc.frequency.setValueAtTime(860, t);
            osc.frequency.exponentialRampToValueAtTime(130, t + 0.35);
            gain.gain.setValueAtTime(0.5 * this.masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.4);
        } catch {}
    }

    stopAll() {
        Object.keys(this.loops).forEach(key => this.stopLoop(key));
    }
}

export const soundManager = new SoundManager();
