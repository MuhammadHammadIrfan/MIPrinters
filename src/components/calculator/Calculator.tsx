'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useCalculatorStore } from '@/stores/calculatorStore';

export function CalculatorButton() {
    const { toggleOpen } = useCalculatorStore();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dragStart = useRef({ x: 0, y: 0 });
    const hasMoved = useRef(false);

    // Set initial position on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPosition({
                x: window.innerWidth - 70,
                y: window.innerHeight - 180, // Above bottom nav
            });
        }
    }, []);

    const handleDragStart = useCallback((clientX: number, clientY: number) => {
        setIsDragging(true);
        hasMoved.current = false;
        dragStart.current = {
            x: clientX - position.x,
            y: clientY - position.y,
        };
    }, [position]);

    const handleDragMove = useCallback((clientX: number, clientY: number) => {
        if (!isDragging) return;
        hasMoved.current = true;

        const newX = Math.max(10, Math.min(clientX - dragStart.current.x, window.innerWidth - 60));
        const newY = Math.max(80, Math.min(clientY - dragStart.current.y, window.innerHeight - 140));

        setPosition({ x: newX, y: newY });
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        // Only toggle if we didn't drag
        if (!hasMoved.current) {
            toggleOpen();
        }
    }, [toggleOpen]);

    // Mouse events
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        handleDragStart(e.clientX, e.clientY);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
        const handleMouseUp = () => handleDragEnd();

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Touch events
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        handleDragStart(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
        handleDragEnd();
    };

    return (
        <button
            ref={buttonRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 active:scale-95 transition-transform touch-none select-none"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? 'grabbing' : 'grab',
            }}
            title="Calculator (drag to move)"
        >
            <span className="text-2xl">🧮</span>
        </button>
    );
}

export function Calculator() {
    const { isOpen, display, history, setOpen, appendDigit, appendOperator, calculate, clear, backspace } = useCalculatorStore();
    const [showHistory, setShowHistory] = useState(false);

    if (!isOpen) return null;

    const buttons = [
        { label: 'C', action: clear, className: 'bg-gray-200 text-gray-700' },
        { label: '⌫', action: backspace, className: 'bg-gray-200 text-gray-700' },
        { label: '%', action: () => appendOperator('%'), className: 'bg-gray-200 text-gray-700' },
        { label: '÷', action: () => appendOperator('÷'), className: 'bg-green-500 text-white' },
        { label: '7', action: () => appendDigit('7'), className: 'bg-white' },
        { label: '8', action: () => appendDigit('8'), className: 'bg-white' },
        { label: '9', action: () => appendDigit('9'), className: 'bg-white' },
        { label: '×', action: () => appendOperator('×'), className: 'bg-green-500 text-white' },
        { label: '4', action: () => appendDigit('4'), className: 'bg-white' },
        { label: '5', action: () => appendDigit('5'), className: 'bg-white' },
        { label: '6', action: () => appendDigit('6'), className: 'bg-white' },
        { label: '−', action: () => appendOperator('-'), className: 'bg-green-500 text-white' },
        { label: '1', action: () => appendDigit('1'), className: 'bg-white' },
        { label: '2', action: () => appendDigit('2'), className: 'bg-white' },
        { label: '3', action: () => appendDigit('3'), className: 'bg-white' },
        { label: '+', action: () => appendOperator('+'), className: 'bg-green-500 text-white' },
        { label: '±', action: () => { }, className: 'bg-white' },
        { label: '0', action: () => appendDigit('0'), className: 'bg-white' },
        { label: '.', action: () => appendDigit('.'), className: 'bg-white' },
        { label: '=', action: calculate, className: 'bg-green-600 text-white' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between bg-green-600 text-white px-4 py-3">
                    <button onClick={() => setShowHistory(!showHistory)} className="text-sm opacity-80 hover:opacity-100">
                        {showHistory ? '🧮 Calc' : '📜 History'}
                    </button>
                    <span className="font-semibold">Calculator</span>
                    <button onClick={() => setOpen(false)} className="text-lg opacity-80 hover:opacity-100">✕</button>
                </div>

                {showHistory ? (
                    /* History View */
                    <div className="h-80 overflow-y-auto p-4 bg-gray-50">
                        {history.length === 0 ? (
                            <p className="text-center text-gray-400 mt-8">No history yet</p>
                        ) : (
                            <ul className="space-y-2">
                                {history.slice().reverse().map((item, index) => (
                                    <li key={index} className="bg-white rounded-lg p-3 shadow-sm">
                                        <p className="text-sm text-gray-500">{item.expression}</p>
                                        <p className="text-lg font-bold text-gray-900">{item.result}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Display */}
                        <div className="p-4 bg-gray-900 text-right">
                            <div className="text-3xl font-mono text-white truncate">{display}</div>
                        </div>

                        {/* Buttons */}
                        <div className="grid grid-cols-4 gap-1 p-2 bg-gray-100">
                            {buttons.map((btn, index) => (
                                <button
                                    key={index}
                                    onClick={btn.action}
                                    className={`h-14 rounded-lg text-lg font-medium active:scale-95 transition-transform ${btn.className}`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
