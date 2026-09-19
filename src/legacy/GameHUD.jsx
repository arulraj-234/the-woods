import React from 'react';
import { checkpointClues } from './gameData';

export default function GameHUD({ currentCheckpoint, progress, totalLevels }) {
    return (
        <div className="hud-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#888' }}>
                <span>Level {progress + 1} / {totalLevels}</span>
                <span>Treasure Hunt</span>
            </div>
            <div>
                <span className="clue-label">Current Clue</span>
                <p className="clue-text">
                    {checkpointClues[currentCheckpoint] || "Find the final treasure!"}
                </p>
            </div>
        </div>
    );
}
