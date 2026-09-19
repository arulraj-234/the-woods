import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import GameCanvas from "./components/GameCanvas";
import { assets, CHARACTER_ROSTER } from "./engine/Assets";

// --- Ambient Forest Audio Synthesizer ---
class ForestAmbience {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.gainNode = null;
    this.nodes = null;
  }

  start(volume = 0.5) {
    if (this.isPlaying) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      if (this.ctx.state === "suspended") this.ctx.resume();

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(volume * 0.28, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      // Wind noise generator (filtered pink/brownian noise)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.96 * b1 + white * 0.11;
        b2 = 0.86 * b2 + white * 0.25;
        output[i] = (b0 + b1 + b2) * 0.35;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Bandpass filter for wind howl sweep
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(130, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      whiteNoise.connect(filter);
      filter.connect(this.gainNode);

      // Low bass wood drone (55 Hz)
      const sub = this.ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(55, this.ctx.currentTime);
      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      sub.connect(subGain);
      subGain.connect(this.gainNode);

      whiteNoise.start();
      lfo.start();
      sub.start();

      this.nodes = { whiteNoise, lfo, sub };
      this.isPlaying = true;
    } catch (e) {
      console.warn("Ambience audio failed to start", e);
    }
  }

  setVolume(vol) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(vol * 0.28, this.ctx.currentTime);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    try {
      if (this.nodes) {
        if (this.nodes.whiteNoise) this.nodes.whiteNoise.stop();
        if (this.nodes.lfo) this.nodes.lfo.stop();
        if (this.nodes.sub) this.nodes.sub.stop();
      }
      if (this.ctx && this.ctx.state !== "closed") this.ctx.close();
    } catch {}
    this.isPlaying = false;
  }
}

const ambiencePlayer = new ForestAmbience();

// --- Dark Forest Animated Background ---
function DarkForestBackground() {
  const bgCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Embers
    // Embers (using swatches from bonfire and fiery flame palettes)
    const emberPalette = ["#FCB42C", "#EC8B10", "#E74D02", "#EB4315", "#B62602"];
    const embers = Array.from({ length: 48 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.8,
      speedY: Math.random() * 0.8 + 0.3,
      speedX: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      color: emberPalette[Math.floor(Math.random() * emberPalette.length)],
    }));

    // Fog layers
    let fogOffset = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      fogOffset += 0.25;

      // Deep dark night gradient (charcoal black with warm ember undertone)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#050406");
      bgGrad.addColorStop(0.55, "#0f0a0d");
      bgGrad.addColorStop(1, "#070507");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant volcanic / bonfire atmospheric glow
      const bonfireGlow = ctx.createRadialGradient(w * 0.72, h * 0.2, 10, w * 0.72, h * 0.2, 320);
      bonfireGlow.addColorStop(0, "rgba(231, 77, 2, 0.12)");
      bonfireGlow.addColorStop(0.5, "rgba(182, 38, 2, 0.04)");
      bonfireGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bonfireGlow;
      ctx.fillRect(0, 0, w, h);

      // Back layer charred tree silhouettes
      ctx.fillStyle = "#0c0709";
      for (let i = 0; i < 22; i++) {
        const tx = (i * (w / 18)) - 40;
        const th = h * 0.58 + (Math.sin(i * 3) * 60);
        ctx.beginPath();
        ctx.moveTo(tx, h);
        ctx.lineTo(tx + 22, h - th);
        ctx.lineTo(tx + 44, h);
        ctx.fill();
      }

      // Mid layer charred pine silhouettes
      ctx.fillStyle = "#070406";
      for (let i = 0; i < 16; i++) {
        const tx = (i * (w / 13)) - 30;
        const th = h * 0.42 + (Math.cos(i * 2.5) * 45);
        ctx.beginPath();
        ctx.moveTo(tx, h);
        ctx.lineTo(tx + 28, h - th);
        ctx.lineTo(tx + 56, h);
        ctx.fill();
      }

      // Drifting warm ash mist
      ctx.save();
      ctx.fillStyle = "rgba(45, 25, 30, 0.04)";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const yBase = h * (0.65 + i * 0.12);
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 40) {
          const my = yBase + Math.sin((x + fogOffset * (i + 1) * 0.8) * 0.008) * 25;
          ctx.lineTo(x, my);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Rising embers
      embers.forEach((em) => {
        em.y -= em.speedY;
        em.x += em.speedX + Math.sin(em.y * 0.01) * 0.3;
        if (em.y < -10) {
          em.y = h + 10;
          em.x = Math.random() * w;
        }

        ctx.save();
        ctx.globalAlpha = em.alpha * 0.85;
        ctx.fillStyle = em.color;
        ctx.shadowColor = em.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={bgCanvasRef} className="forest-bg-canvas" />;
}

export default function App() {
  // Navigation Screens: 'landing' | 'base_camp' | 'char_select' | 'game'
  const [screen, setScreen] = useState("landing");
  const [selectOrigin, setSelectOrigin] = useState("landing"); // 'landing' | 'base_camp'

  // First-timer onboarding state
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    return localStorage.getItem("th_onboarded") === "true";
  });
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [tempUsername, setTempUsername] = useState(() => {
    return localStorage.getItem("th_playername") || "Survivor";
  });

  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameKey, setGameKey] = useState(0);

  // Persistence
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem("th_highscore") || "0")
  );
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("th_playername") || "Survivor"
  );
  const [selectedCharacter, setSelectedCharacter] = useState(
    localStorage.getItem("th_selected_char") || "char_survivor"
  );

  // Character selection carousel index
  const initialIndex = CHARACTER_ROSTER.findIndex((c) => c.id === selectedCharacter);
  const [charSelectIndex, setCharSelectIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  // Settings
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("th_settings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { volume: 0.8, screenShake: true, sfxEnabled: true, ambience: true };
  });

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("settings"); // 'settings' | 'guide'
  const [, setAssetsLoaded] = useState(false);

  // Pre-load assets on mount
  useEffect(() => {
    assets.loadAll().then(() => {
      setAssetsLoaded(true);
    });
  }, []);

  // Sync settings changes to localStorage and audio
  useEffect(() => {
    localStorage.setItem("th_settings", JSON.stringify(settings));
    if (settings.ambience && screen !== "game") {
      ambiencePlayer.setVolume(settings.volume);
    } else {
      ambiencePlayer.stop();
    }
  }, [settings, screen]);

  // Title ambience autoplay on first user interaction
  useEffect(() => {
    if (screen !== "game" && settings.ambience) {
      const handleFirstInteraction = () => {
        ambiencePlayer.start(settings.volume);
        window.removeEventListener("click", handleFirstInteraction);
        window.removeEventListener("keydown", handleFirstInteraction);
      };
      window.addEventListener("click", handleFirstInteraction);
      window.addEventListener("keydown", handleFirstInteraction);

      return () => {
        window.removeEventListener("click", handleFirstInteraction);
        window.removeEventListener("keydown", handleFirstInteraction);
      };
    }
  }, [screen, settings.ambience, settings.volume]);

  const handleNameChange = (e) => {
    const val = e.target.value.slice(0, 16);
    setPlayerName(val);
    localStorage.setItem("th_playername", val);
  };

  const updateSetting = (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  // Navigation handlers
  const handleLandingPlay = () => {
    if (!hasOnboarded) {
      setShowUsernameModal(true);
    } else {
      setScreen("base_camp");
    }
  };

  const handleOnboardingSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = tempUsername.trim().slice(0, 16) || "Survivor";
    setPlayerName(trimmed);
    localStorage.setItem("th_playername", trimmed);
    localStorage.setItem("th_onboarded", "true");
    setHasOnboarded(true);
    setShowUsernameModal(false);
    // First timer proceeds directly to character selection
    setSelectOrigin("landing");
    setScreen("char_select");
  };

  const prevCharacter = () => {
    setCharSelectIndex((prev) =>
      prev > 0 ? prev - 1 : CHARACTER_ROSTER.length - 1
    );
  };

  const nextCharacter = () => {
    setCharSelectIndex((prev) =>
      prev < CHARACTER_ROSTER.length - 1 ? prev + 1 : 0
    );
  };

  const confirmCharacterSelection = (enterGameImmediately = false) => {
    const chosen = CHARACTER_ROSTER[charSelectIndex];
    setSelectedCharacter(chosen.id);
    localStorage.setItem("th_selected_char", chosen.id);
    if (enterGameImmediately) {
      startGame();
    } else {
      setScreen(selectOrigin === "landing" ? "base_camp" : selectOrigin);
    }
  };

  const goToCharacterSelect = (origin = "base_camp") => {
    setSelectOrigin(origin);
    const idx = CHARACTER_ROSTER.findIndex((c) => c.id === selectedCharacter);
    setCharSelectIndex(idx >= 0 ? idx : 0);
    setScreen("char_select");
  };

  const startGame = () => {
    ambiencePlayer.stop();
    setScreen("game");
    setGameOver(false);
    setScore(0);
    setLevel(1);
    setGameKey((k) => k + 1);
  };

  const handleScoreUpdate = (points) => {
    setScore((s) => s + points);
  };

  const handleLevelComplete = (newLevel) => {
    setLevel(newLevel);
  };

  const handleGameOver = () => {
    setGameOver(true);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("th_highscore", score.toString());
    }
  };

  const currentCharacter =
    CHARACTER_ROSTER.find((c) => c.id === selectedCharacter) || CHARACTER_ROSTER[0];
  const previewChar =
    CHARACTER_ROSTER[charSelectIndex] || CHARACTER_ROSTER[0];
  const previewThumb = assets.getCharacterThumb(previewChar.id);
  const currentThumb = assets.getCharacterThumb(currentCharacter.id);

  return (
    <div
      className={`app-container ${
        gameOver && settings.screenShake ? "shake-screen" : ""
      }`}
    >
      {screen !== "game" ? (
        <div className="home-screen-wrapper">
          <DarkForestBackground />

          {/* Top Header Bar */}
          <header className="home-topbar">
            <div className="topbar-left">
              <span className="highscore-badge">
                BEST RECORD: <strong>{highScore}</strong>
              </span>
            </div>
            <div className="topbar-right">
              <button
                className={`topbar-btn ${settings.ambience ? "active" : ""}`}
                onClick={() => {
                  const nextAmbience = !settings.ambience;
                  updateSetting("ambience", nextAmbience);
                  if (nextAmbience) ambiencePlayer.start(settings.volume);
                  else ambiencePlayer.stop();
                }}
                title="Toggle Forest Ambience"
              >
                {settings.ambience ? "AMBIENCE: ON" : "AMBIENCE: OFF"}
              </button>
              <button
                className="topbar-btn"
                onClick={() => setShowSettings(true)}
                title="Open Settings"
              >
                SETTINGS
              </button>
            </div>
          </header>

          {/* SCREEN 1: LANDING PAGE */}
          {screen === "landing" && (
            <main className="landing-main-card">
              <div className="landing-hero-title-wrap">
                <h1 className="landing-hero-title">THE WOODS</h1>
                <p className="landing-hero-subtitle">SURVIVE THE NIGHT</p>
              </div>

              <div className="landing-action-wrap">
                <button
                  className="landing-play-btn"
                  onClick={handleLandingPlay}
                >
                  PLAY
                </button>
              </div>

              <div className="landing-footer-hint">
                PC EDITION &bull; HEADPHONES RECOMMENDED
              </div>
            </main>
          )}

          {/* SCREEN 2: GAME-STYLE CHARACTER SELECTION */}
          {screen === "char_select" && (
            <main className="char-select-main-card">
              <div className="char-select-header-bar">
                <h2 className="char-select-screen-title">SURVIVOR SELECTION</h2>
                <div className="char-select-counter">
                  SURVIVOR <strong>{charSelectIndex + 1}</strong> / {CHARACTER_ROSTER.length}
                </div>
              </div>

              <div className="char-select-layout">
                {/* Left Column: Freestanding Survivor Stage (Zero Boxes) */}
                <div className="char-stage-column">
                  <div className="char-stage-frame">
                    <button
                      className="stage-arrow-btn stage-arrow-left"
                      onClick={prevCharacter}
                      aria-label="Previous Survivor"
                      title="Previous Survivor"
                    >
                      &lt;
                    </button>

                    {previewThumb ? (
                      <img
                        src={previewThumb}
                        alt={previewChar.name}
                        className="char-stage-sprite"
                      />
                    ) : (
                      <div className="char-portrait-placeholder">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    )}

                    <div className="char-stage-pedestal" />

                    <button
                      className="stage-arrow-btn stage-arrow-right"
                      onClick={nextCharacter}
                      aria-label="Next Survivor"
                      title="Next Survivor"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Right Column: Clean Character Dossier (Zero Boxes) */}
                <div className="char-dossier-column">
                  <div className="char-dossier-header">
                    <h3 className="char-dossier-name">{previewChar.name}</h3>
                    <div className="char-dossier-title">{previewChar.title}</div>
                    <p className="char-dossier-tagline">"{previewChar.tagline}"</p>
                  </div>

                  <div className="char-dossier-perk-block">
                    <div className="dossier-perk-title">{previewChar.perkTitle}</div>
                    <p className="dossier-perk-desc">{previewChar.perkDesc}</p>
                  </div>

                  <div className="char-dossier-stats">
                    <div className="stat-row">
                      <span className="stat-label">Movement Speed</span>
                      <span className="stat-dots" />
                      <span className="stat-val">
                        {Math.round(previewChar.perk.speedMult * 100)}%
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Sprint Burst</span>
                      <span className="stat-dots" />
                      <span className="stat-val">
                        +{Math.round((previewChar.perk.sprintMult - 1) * 100)}%
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Fuel Burn Rate</span>
                      <span className="stat-dots" />
                      <span className="stat-val">
                        {Math.round(previewChar.perk.fuelBurn * 100)}%
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Sanctuary Ward</span>
                      <span className="stat-dots" />
                      <span className="stat-val">
                        +{Math.round((previewChar.perk.wardRadius - 1) * 100)}%
                      </span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Threat Sense</span>
                      <span className="stat-dots" />
                      <span className="stat-val">{previewChar.perk.threatRange} px</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Torch Bonus</span>
                      <span className="stat-dots" />
                      <span className="stat-val">+{previewChar.perk.torchBonus} pts</span>
                    </div>
                  </div>

                  <div className="char-dossier-actions">
                    <button
                      className="dossier-action-btn dossier-btn-confirm"
                      onClick={() => confirmCharacterSelection(false)}
                    >
                      CONFIRM SURVIVOR
                    </button>
                    <button
                      className="dossier-action-btn dossier-btn-enter"
                      onClick={() => confirmCharacterSelection(true)}
                    >
                      ENTER THE WOODS
                    </button>
                  </div>

                  <div className="char-dossier-footer">
                    <button
                      className="dossier-back-btn"
                      onClick={() =>
                        setScreen(selectOrigin === "landing" ? "landing" : "base_camp")
                      }
                    >
                      CANCEL / BACK
                    </button>
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* SCREEN 3: BASE CAMP HUB */}
          {screen === "base_camp" && (
            <main className="base-camp-main-card">
              <div className="base-camp-layout">
                {/* Left Column: Freestanding Big Character Showcase (No bounding box or borders) */}
                <div
                  className="camp-showcase-column"
                  onClick={() => goToCharacterSelect("base_camp")}
                  title="Click character to change survivor"
                >
                  <div className="camp-hero-sprite-stage">
                    {currentThumb ? (
                      <img
                        src={currentThumb}
                        alt={currentCharacter.name}
                        className="camp-hero-big-sprite"
                      />
                    ) : (
                      <div className="char-portrait-placeholder">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    )}
                    <div className="camp-hero-pedestal" />
                  </div>

                  <div className="camp-showcase-info">
                    <div className="camp-showcase-player">{playerName}</div>
                    <h2 className="camp-showcase-name">{currentCharacter.name}</h2>
                    <div className="camp-showcase-title">{currentCharacter.title}</div>
                  </div>
                </div>

                {/* Right Column: Seamless Floating Base Camp Menu (Integrated into background, zero boxes) */}
                <div className="camp-seamless-menu">
                  <nav className="camp-seamless-nav">
                    <button
                      className="camp-nav-item camp-nav-primary pulse-text"
                      onClick={startGame}
                    >
                      ENTER THE WOODS
                    </button>
                    <button
                      className="camp-nav-item"
                      onClick={() => {
                        setSettingsTab("settings");
                        setShowSettings(true);
                      }}
                    >
                      SETTINGS
                    </button>
                    <button
                      className="camp-nav-item camp-nav-ghost"
                      onClick={() => setScreen("landing")}
                    >
                      RETURN TO TITLE
                    </button>
                  </nav>
                </div>
              </div>
            </main>
          )}

          {/* First-Timer Username Onboarding Modal */}
          {showUsernameModal && (
            <div
              className="modal-overlay"
              onClick={() => setShowUsernameModal(false)}
            >
              <div
                className="onboarding-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="onboarding-header">
                  <h2 className="onboarding-title">SURVIVOR REGISTRATION</h2>
                  <p className="onboarding-subtitle">
                    Enter your name before venturing into the cursed woods.
                  </p>
                </div>

                <form onSubmit={handleOnboardingSubmit} className="onboarding-form">
                  <div className="onboarding-input-wrap">
                    <label className="onboarding-label" htmlFor="playername-input">
                      Survivor Name
                    </label>
                    <input
                      id="playername-input"
                      type="text"
                      className="styled-name-input onboarding-input"
                      value={tempUsername}
                      onChange={(e) => setTempUsername(e.target.value.slice(0, 16))}
                      maxLength={16}
                      placeholder="Survivor"
                      autoFocus
                    />
                  </div>

                  <button type="submit" className="start-btn onboarding-submit-btn">
                    PROCEED TO SURVIVOR SELECTION
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Settings & Guide Modal */}
          {showSettings && (
            <div
              className="modal-overlay"
              onClick={() => setShowSettings(false)}
            >
              <div
                className="settings-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div className="modal-tabs">
                    <button
                      className={`modal-tab ${
                        settingsTab === "settings" ? "active" : ""
                      }`}
                      onClick={() => setSettingsTab("settings")}
                    >
                      SETTINGS
                    </button>
                    <button
                      className={`modal-tab ${
                        settingsTab === "guide" ? "active" : ""
                      }`}
                      onClick={() => setSettingsTab("guide")}
                    >
                      SURVIVAL FIELD GUIDE
                    </button>
                  </div>
                  <button
                    className="modal-close-btn"
                    onClick={() => setShowSettings(false)}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>

                <div className="modal-body">
                  {settingsTab === "settings" ? (
                    <div className="settings-panel">
                      <div className="setting-row">
                        <div className="setting-label-block">
                          <span className="setting-title">Survivor Identity</span>
                          <span className="setting-desc">
                            Your callsign in the woods and upon the ledger of the fallen.
                          </span>
                        </div>
                        <div className="setting-control">
                          <input
                            type="text"
                            value={playerName}
                            onChange={handleNameChange}
                            maxLength={16}
                            placeholder="Survivor"
                            className="styled-name-input"
                            style={{ maxWidth: 170, padding: "8px 12px", fontSize: "0.95rem" }}
                          />
                        </div>
                      </div>

                      <div className="setting-row">
                        <div className="setting-label-block">
                          <span className="setting-title">Master Audio Volume</span>
                          <span className="setting-desc">
                            Controls all sound effects, footfalls, and ambience.
                          </span>
                        </div>
                        <div className="setting-control">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.volume}
                            onChange={(e) =>
                              updateSetting(
                                "volume",
                                parseFloat(e.target.value)
                              )
                            }
                            className="volume-slider"
                          />
                          <span className="volume-val">
                            {Math.round(settings.volume * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="setting-row">
                        <div className="setting-label-block">
                          <span className="setting-title">Sound Effects (SFX)</span>
                          <span className="setting-desc">
                            Heartbeats, level chimes, torch refuels.
                          </span>
                        </div>
                        <button
                          className={`toggle-btn ${
                            settings.sfxEnabled ? "on" : "off"
                          }`}
                          onClick={() =>
                            updateSetting("sfxEnabled", !settings.sfxEnabled)
                          }
                        >
                          {settings.sfxEnabled ? "ENABLED" : "MUTED"}
                        </button>
                      </div>

                      <div className="setting-row">
                        <div className="setting-label-block">
                          <span className="setting-title">Screen Shake</span>
                          <span className="setting-desc">
                            Camera impact tremors upon fatal strikes.
                          </span>
                        </div>
                        <button
                          className={`toggle-btn ${
                            settings.screenShake ? "on" : "off"
                          }`}
                          onClick={() =>
                            updateSetting("screenShake", !settings.screenShake)
                          }
                        >
                          {settings.screenShake ? "ENABLED" : "DISABLED"}
                        </button>
                      </div>

                      <div className="setting-row">
                        <div className="setting-label-block">
                          <span className="setting-title">Forest Wind Ambience</span>
                          <span className="setting-desc">
                            Procedural cold wind howling on the menu screens.
                          </span>
                        </div>
                        <button
                          className={`toggle-btn ${
                            settings.ambience ? "on" : "off"
                          }`}
                          onClick={() => {
                            const next = !settings.ambience;
                            updateSetting("ambience", next);
                            if (next) ambiencePlayer.start(settings.volume);
                            else ambiencePlayer.stop();
                          }}
                        >
                          {settings.ambience ? "PLAYING" : "MUTED"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="guide-panel">
                      <div className="guide-card">
                        <h4>TORCH FUEL & SPRINT</h4>
                        <p>
                          Your torch continuously burns out. Collect lit wall/tree
                          torches to recover +500 fuel. Hold <strong>SHIFT</strong> or{" "}
                          <strong>SPACE</strong> to Sprint away from pursuers, but
                          beware: sprinting burns fuel 1.8x faster!
                        </p>
                      </div>

                      <div className="guide-card">
                        <h4>RING OF PROTECTION (ANCIENT SHRINES)</h4>
                        <p>
                          Ancient Shrines and Gazebos scattered through the woods can
                          be consecrated upon approach. When activated, a glowing{" "}
                          <strong>Ring of Protection</strong> appears. Standing
                          inside makes you completely impervious to enemies, and
                          shoves hunters and phantoms backwards!
                        </p>
                      </div>

                      <div className="guide-card">
                        <h4>HUNTERS VS. PHANTOMS</h4>
                        <p>
                          <strong>Hunters (Red Chevrons):</strong> Physical stalkers.
                          They cannot walk through trees or rocks. Duck into groves to
                          shake them off.
                        </p>
                        <p>
                          <strong>Phantoms (Cyan Chevrons):</strong> Ethereal spirits
                          that glide through trees and obstacles. Use your Sprint burst
                          or reach a Ring of Protection to survive!
                        </p>
                      </div>

                      <div className="guide-card">
                        <h4>LEVEL PROGRESSION</h4>
                        <p>
                          Surviving and picking up torches earns Score. Reaching 35,
                          80, 140, and 220 points advances your Level, unlocking new
                          zones, fuel bonuses, and escalating night stalkers.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    className="start-btn modal-done-btn"
                    onClick={() => setShowSettings(false)}
                  >
                    SAVE & CLOSE
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <GameCanvas
            key={gameKey}
            level={level}
            score={score}
            characterId={selectedCharacter}
            playerName={playerName}
            settings={settings}
            onScoreUpdate={handleScoreUpdate}
            onLevelComplete={handleLevelComplete}
            onGameOver={handleGameOver}
          />

          {/* In-Game HUD */}
          <div className="hud-score">
            <div className="hud-player-identity">
              <span className="hud-player-name">{playerName}</span>
              <span className="hud-char-badge">{currentCharacter.title}</span>
            </div>
            <div className="hud-stats-row">
              <span className="hud-score-val">SCORE: {score}</span>
              <span className="hud-level-val">LEVEL: {level}</span>
            </div>
          </div>

          {/* Death Screen Modal */}
          {gameOver && (
            <div className="modal-overlay death-screen">
              <img
                src="/assets/phantom_portrait.jpg"
                alt="The Phantom"
                className="death-portrait"
              />
              <h1 className="death-title">YOU DIED</h1>
              <div className="death-subtitle">
                {playerName.toUpperCase()} WAS CLAIMED BY THE WOODS
              </div>
              <div className="death-details">
                <span className="death-character-info">
                  Character: {currentCharacter.name} ({currentCharacter.title})
                </span>
                <span className="death-score-info">Final Score: {score}</span>
                <span className="death-high-info">Best Record: {highScore}</span>
              </div>
              <div className="death-btn-group">
                <button
                  className="start-btn restart-btn"
                  onClick={startGame}
                >
                  TRY AGAIN
                </button>
                <button
                  className="start-btn return-home-btn"
                  onClick={() => {
                    setScreen("base_camp");
                    setGameOver(false);
                  }}
                >
                  RETURN TO CAMP
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
