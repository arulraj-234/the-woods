import React, { useState, useEffect, useRef } from 'react';

export default function RiddleModal({ riddle, onAnswer, error }) {
    const [input, setInput] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleSubmit = () => {
        onAnswer(input);
        setInput('');
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 style={{ color: '#e94560', marginBottom: '1rem' }}>Riddle Me This!</h3>
                <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    {riddle.riddle}
                </p>

                <input
                    ref={inputRef}
                    type="text"
                    className={`riddle-input ${error ? 'error' : ''}`}
                    placeholder="Answer..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />

                {error && <p style={{ color: '#ff4757', marginBottom: '10px' }}>Incorrect, try again!</p>}

                <button onClick={handleSubmit}>Unlock Checkpoint</button>
            </div>
        </div>
    );
}
