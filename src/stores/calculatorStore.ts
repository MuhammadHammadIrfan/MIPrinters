import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CalculatorState {
    display: string;
    expression: string;
    history: { expression: string; result: string; timestamp: number }[];
    isOpen: boolean;

    // Actions
    setDisplay: (value: string) => void;
    appendDigit: (digit: string) => void;
    appendOperator: (operator: string) => void;
    calculate: () => void;
    clear: () => void;
    backspace: () => void;
    clearHistory: () => void;
    toggleOpen: () => void;
    setOpen: (open: boolean) => void;
}

export const useCalculatorStore = create<CalculatorState>()(
    persist(
        (set, get) => ({
            display: '0',
            expression: '',
            history: [],
            isOpen: false,

            setDisplay: (value: string) => set({ display: value }),

            appendDigit: (digit: string) => {
                const { display, expression } = get();
                if (display === '0' && digit !== '.') {
                    set({ display: digit, expression: expression + digit });
                } else if (digit === '.' && display.includes('.')) {
                    // Don't add another decimal point
                    return;
                } else {
                    set({ display: display + digit, expression: expression + digit });
                }
            },

            appendOperator: (operator: string) => {
                const { expression, display } = get();
                const ops = ['+', '-', '×', '÷', '%'];
                const lastChar = expression.slice(-1);

                // Replace operator if last char is already an operator
                if (ops.includes(lastChar)) {
                    set({
                        expression: expression.slice(0, -1) + operator,
                        display: '0',
                    });
                } else {
                    set({
                        expression: expression + operator,
                        display: '0',
                    });
                }
            },

            calculate: () => {
                const { expression, history } = get();
                if (!expression) return;

                try {
                    // Replace × and ÷ with * and /
                    const evalExpression = expression
                        .replace(/×/g, '*')
                        .replace(/÷/g, '/')
                        .replace(/%/g, '/100');

                    // Safely evaluate
                    const result = Function(`"use strict"; return (${evalExpression})`)();
                    const resultStr = String(Math.round(result * 100) / 100);

                    set({
                        display: resultStr,
                        expression: resultStr,
                        history: [
                            { expression, result: resultStr, timestamp: Date.now() },
                            ...history.slice(0, 49), // Keep last 50 calculations
                        ],
                    });
                } catch {
                    set({ display: 'Error', expression: '' });
                }
            },

            clear: () => set({ display: '0', expression: '' }),

            backspace: () => {
                const { display, expression } = get();
                if (display.length > 1) {
                    set({
                        display: display.slice(0, -1),
                        expression: expression.slice(0, -1),
                    });
                } else {
                    set({ display: '0', expression: expression.slice(0, -1) });
                }
            },

            clearHistory: () => set({ history: [] }),

            toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

            setOpen: (open: boolean) => set({ isOpen: open }),
        }),
        {
            name: 'calculator-storage',
            partialize: (state) => ({ history: state.history }),
        }
    )
);
