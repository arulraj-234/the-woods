import React from 'react';

export default function PlayerCursor({ x, y, cellSize }) {
    const style = {
        position: 'absolute',
        left: x * cellSize,
        top: y * cellSize,
        width: cellSize,
        height: cellSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'top 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), left 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        pointerEvents: 'none', // click through
    };

    return (
        <div style={style}>
            <div className="player-token">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#e74c3c" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="12" cy="12" r="4" fill="#ffffff" />
                </svg>
            </div>
        </div>
    );
}
