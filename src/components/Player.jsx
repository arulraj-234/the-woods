import React from "react";

 function Player({ name, clues, progress, onAdvance, finished }) {
  return (
    <div style={{ border: "1px solid #aaa", padding: "1rem", margin: "1rem", width: 320 }}>
      <h2>{name}</h2>
      <p>
        {finished
          ? "🎉 You found the treasure!"
          : `Clue ${progress + 1}: ${clues[progress]}`}
      </p>
      {!finished && (
        <button onClick={onAdvance} style={{ marginTop: 8 }}>
          Solve Clue & Advance
        </button>
      )}
    </div>
  );
}
export default Player