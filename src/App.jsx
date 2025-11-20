import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

// --- Game Data ---
const GRID_SIZE = 10;
const landmarks = {
  "old oak tree": [2, 3],
  "shimmering pond": [7, 1],
  "stone bridge": [5, 5],
  "hidden cave": [1, 8],
  "ancient statue": [8, 7], // Treasure
  "flower garden": [3, 6],
  "tall tower": [6, 9],
  "secret library": [9, 4],
};

const checkpoints = [
  "old oak tree",
  "shimmering pond",
  "stone bridge",
  "hidden cave",
  "ancient statue",
];

// Clues for each checkpoint (not direct names)
const checkpointClues = {
  "old oak tree": "Where the mighty branches stretch wide",
  "shimmering pond": "A mirror of water that glistens in the sun",
  "stone bridge": "Crossing over with stones beneath your feet",
  "hidden cave": "A secret hollow in the rocky hill",
  "ancient statue": "The guardian of treasures old and grand",
};

// Images for each checkpoint (replace with your own if you like)
const checkpointImages = {
  "old oak tree": "https://img.icons8.com/color/48/deciduous-tree.png",
  "shimmering pond": "https://img.icons8.com/color/48/lake.png",
  "stone bridge": "https://img.icons8.com/color/48/bridge.png",
  "hidden cave": "https://img.icons8.com/color/48/cave.png",
  "ancient statue": "https://img.icons8.com/color/48/statue.png"
};






const riddlesPool = [
  { riddle: "I speak without a mouth and hear without ears. I have nobody, but I come alive with wind. What am I?", answer: "echo" },
  { riddle: "I come from a mine and get surrounded by wood always. Everyone uses me. What am I?", answer: "pencil" },
  { riddle: "The more of me you take, the more you leave behind. What am I?", answer: "footsteps" },
  { riddle: "I have keys but no locks. I have space but no room. You can enter but can’t go outside. What am I?", answer: "keyboard" },
  { riddle: "What has to be broken before you can use it?", answer: "egg" },
  { riddle: "I’m tall when I’m young, and I’m short when I’m old. What am I?", answer: "candle" },
  { riddle: "What has hands but can’t clap?", answer: "clock" },
  { riddle: "What has a head and a tail but no body?", answer: "coin" },
];

// Utility function to shuffle array
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function App() {
  // Randomize checkpoint order and riddles
  const [randomCheckpoints] = useState(() => shuffle(checkpoints));
  const [playerRiddles] = useState(() => shuffle(riddlesPool).slice(0, randomCheckpoints.length));
  const [position, setPosition] = useState([0, 0]);
  const [progress, setProgress] = useState(0);
  const [winner, setWinner] = useState(false);
  const [showRiddle, setShowRiddle] = useState(false);
  const [riddleInput, setRiddleInput] = useState("");
  const [riddleError, setRiddleError] = useState(false);

  const currentCheckpoint = randomCheckpoints[progress];

  // Move player
  const movePlayer = useCallback((dx, dy) => {
    if (winner || showRiddle) return;
    const [x, y] = position;
    const nx = Math.max(0, Math.min(GRID_SIZE - 1, x + dx));
    const ny = Math.max(0, Math.min(GRID_SIZE - 1, y + dy));
    if (nx === x && ny === y) return;
    setPosition([nx, ny]);

    // Check if reached any checkpoint in the order
    for (let i = 0; i < randomCheckpoints.length; i++) {
      const cpLoc = landmarks[randomCheckpoints[i]];
      if (nx === cpLoc[0] && ny === cpLoc[1] && i === progress) {
        setShowRiddle(true);
        setRiddleError(false);
        setRiddleInput("");
        return;
      }
    }
  }, [winner, showRiddle, position, progress, randomCheckpoints]);

  // Keyboard movement (fixed directions)
  const handleKeyDown = useCallback(
    (e) => {
      if (winner || showRiddle) return;
      switch (e.key) {
        case "ArrowUp":
          movePlayer(0, -1); // y-1 (up)
          break;
        case "ArrowDown":
          movePlayer(0, 1);  // y+1 (down)
          break;
        case "ArrowLeft":
          movePlayer(-1, 0); // x-1 (left)
          break;
        case "ArrowRight":
          movePlayer(1, 0);  // x+1 (right)
          break;
        default:
          break;
      }
    },
    [winner, showRiddle, movePlayer]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Submit riddle answer
  function handleRiddleSubmit() {
    if (riddleInput.trim().toLowerCase() === playerRiddles[progress].answer) {
      const newProgress = progress + 1;
      setProgress(newProgress);
      setShowRiddle(false);
      setRiddleError(false);
      setRiddleInput("");
      if (newProgress === randomCheckpoints.length) {
        setWinner(true);
      }
    } else {
      setRiddleError(true);
    }
  }

  // Render grid cell
  function renderCell(x, y) {
    let style = {
      width: 40,
      height: 40,
      border: "1.5px solid #222",
      background: "rgba(255,255,255,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      transition: "background 0.2s, box-shadow 0.2s",
      boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    };
    let cellContent = [];

    // Checkpoint
    randomCheckpoints.forEach((cp, idx) => {
      const [cx, cy] = landmarks[cp];
      if (cx === x && cy === y) {
        cellContent.push(
          <img
            key="checkpoint"
            src={checkpointImages[cp]}
            alt="Checkpoint"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              //border: idx === progress ? "3px solid #f39c12" : "2px solid #bb8c2b",
              background: "#fff",
             // boxShadow: idx === progress ? "0 0 14px 4px #f9d423" : "none",
              transition: "border 0.2s, box-shadow 0.2s",
              zIndex: 1,
            }}
          />
        );
        if (idx === progress) {
          //style.background = "linear-gradient(135deg, #f9d423 0%, #ff4e50 100%)";
        }
      }
    });

    // Player
    if (position[0] === x && position[1] === y) {
      style.background = "linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%)";
      style.boxShadow = "0 0 12px 2px #6cf2d2";
      const playerStyle = {
        fontSize: 26,
        filter: "drop-shadow(0 1px 2px #333)",
        position: cellContent.length > 0 ? "absolute" : "static",
        zIndex: 2
      };
      cellContent.push(<span key="player" style={playerStyle}>🙂</span>);
    }

    return (
      <div key={`${x}-${y}`} style={style} title={x + "," + y}>
        {cellContent}
      </div>
    );
  }

  return (
    <div className="treasure-bg">
      <h1 className="game-title">🏴‍☠️ Riddle Treasure Hunt</h1>
      <div className="game-board">
        {Array.from({ length: GRID_SIZE }).map((_, y) => (
          <div key={y} style={{ display: "flex" }}>
            {Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))}
          </div>
        ))}
      </div>
      <div className="clue-panel">
        {winner ? (
          <h2 className="winner-msg">🎉 You found the treasure! Congratulations! 🎉</h2>
        ) : showRiddle ? (
          <>
            <h3 className="riddle-title">Checkpoint Riddle:</h3>
            <p className="riddle-text">{playerRiddles[progress].riddle}</p>
            <input
              type="text"
              value={riddleInput}
              onChange={e => setRiddleInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleRiddleSubmit(); }}
              placeholder="Enter your one-word answer"
              className={`riddle-input${riddleError ? " error" : ""}`}
              autoFocus
            />
            {riddleError && <p className="riddle-error">Incorrect answer, try again.</p>}
            <button className="riddle-btn" onClick={handleRiddleSubmit}>
              Submit
            </button>
          </>
        ) : (
          <p className="clue-text">
            <span className="clue-label">Clue:</span> {checkpointClues[currentCheckpoint]}
          </p>
        )}
      </div>
      {!winner && !showRiddle && (
        <div className="controls">
          <button className="move-btn" onClick={() => movePlayer(-1, 0)}>⬅️</button>
          <button className="move-btn" onClick={() => movePlayer(1, 0)}>➡️</button>
          <button className="move-btn" onClick={() => movePlayer(0, -1)}>⬆️</button>
          <button className="move-btn" onClick={() => movePlayer(0, 1)}>⬇️</button>
        </div>
      )}
    </div>
  );
}
