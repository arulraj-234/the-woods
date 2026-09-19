import React from 'react';
import PlayerCursor from './PlayerCursor';
import { GRID_SIZE, landmarks, checkpointImages } from './gameData';

export default function GameBoard({
    position,
    checkpoints,
    currentProgress,
    visitedPath // Array of strings "x,y"
}) {
    const cellSize = 45; // Match CSS var --cell-size roughly or allow dynamic

    // Helper to check if a cell has a landmark
    const getLandmarkAt = (x, y) => {
        // Return the checkpoint name if it's AT this location
        // We iterate checkpoints array to find if any landmark matches x,y
        // But we also need to know if it's the CURRENT target
        for (let i = 0; i < checkpoints.length; i++) {
            const cpName = checkpoints[i];
            const [lx, ly] = landmarks[cpName];
            if (lx === x && ly === y) {
                return { name: cpName, index: i };
            }
        }
        return null;
    };

    const renderCells = () => {
        const cells = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const isVisited = visitedPath.has(`${x},${y}`);
                const landmarkData = getLandmarkAt(x, y);
                let content = null;

                if (landmarkData) {
                    const { name, index } = landmarkData;
                    // Only show if it's the current one or a previous one (if we want to keep them visible)
                    // Or maybe show all? Let's show all but highlight current.
                    const isCurrent = index === currentProgress;
                    const isCompleted = index < currentProgress;

                    // If it's a future checkpoint (hidden), maybe don't show it? 
                    // The original game showed them. Let's keep showing them but maybe dim them?
                    // Actually, "Treasure Hunt" usually implies finding them. 
                    // The original logic showed ALL icons.

                    content = (
                        <img
                            src={checkpointImages[name]}
                            alt="landmark"
                            className={`checkpoint-img ${isCurrent ? 'active-target' : ''}`}
                            style={{ opacity: isCurrent || isCompleted ? 1 : 0.5, filter: isCompleted ? 'grayscale(80%)' : '' }}
                        />
                    );
                }

                cells.push(
                    <div
                        key={`${x}-${y}`}
                        className={`cell ${isVisited ? 'path-trace' : ''}`}
                    >
                        {content}
                    </div>
                );
            }
        }
        return cells;
    };

    return (
        <div className="game-board">
            {renderCells()}
            <PlayerCursor x={position[0]} y={position[1]} cellSize={cellSize} />
        </div>
    );
}
