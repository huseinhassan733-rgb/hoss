import React, { useState, useRef, useEffect } from 'react';
import { Calculator as CalcIcon, X, Minus, Move, Delete } from 'lucide-react';

interface FloatingCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FloatingCalculator: React.FC<FloatingCalculatorProps> = ({ isOpen, onClose }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [prevOperand, setPrevOperand] = useState<number | null>(null);

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 280, dragRef.current.initX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 380, dragRef.current.initY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Calculator logic
  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setEquation('');
    setPrevOperand(null);
    setPendingOperator(null);
    setWaitingForOperand(false);
  };

  const backspace = () => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevOperand === null) {
      setPrevOperand(inputValue);
    } else if (pendingOperator) {
      const currentValue = prevOperand;
      let result = currentValue;

      switch (pendingOperator) {
        case '+':
          result = currentValue + inputValue;
          break;
        case '-':
          result = currentValue - inputValue;
          break;
        case '×':
          result = currentValue * inputValue;
          break;
        case '÷':
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
      }

      setPrevOperand(result);
      setDisplay(String(result));
    }

    setWaitingForOperand(true);
    setPendingOperator(nextOperator);
    setEquation(`${prevOperand !== null ? prevOperand : inputValue} ${nextOperator}`);
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (pendingOperator && prevOperand !== null) {
      let result = prevOperand;
      switch (pendingOperator) {
        case '+':
          result = prevOperand + inputValue;
          break;
        case '-':
          result = prevOperand - inputValue;
          break;
        case '×':
          result = prevOperand * inputValue;
          break;
        case '÷':
          result = inputValue !== 0 ? prevOperand / inputValue : 0;
          break;
      }

      setDisplay(String(result));
      setPrevOperand(null);
      setPendingOperator(null);
      setEquation('');
      setWaitingForOperand(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-50 w-72 bg-white rounded-lg shadow-2xl border-2 border-[#1B3A5C] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleMouseDown}
        className="bg-[#1B3A5C] text-white px-3 py-2 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <Move className="w-3.5 h-3.5 text-[#dfb758]" />
          <CalcIcon className="w-3.5 h-3.5 text-[#dfb758]" />
          <span>آلة حاسبة سريعة (H2pro)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Screen / Display */}
      <div className="bg-slate-900 p-3 text-right">
        <div className="text-[10px] text-slate-400 font-mono h-4 overflow-x-auto">{equation}</div>
        <div className="text-xl font-bold font-mono text-white tracking-widest overflow-x-auto py-1">
          {display}
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-slate-100">
        <button
          onClick={clearAll}
          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 rounded text-xs transition-colors cursor-pointer border border-red-200"
        >
          C
        </button>
        <button
          onClick={backspace}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded text-xs flex items-center justify-center transition-colors cursor-pointer border border-slate-300"
          title="مسح خانة"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          onClick={() => performOperation('÷')}
          className="bg-[#1B3A5C]/10 hover:bg-[#1B3A5C]/20 text-[#1B3A5C] font-bold py-2 rounded text-xs transition-colors cursor-pointer border border-slate-300"
        >
          ÷
        </button>
        <button
          onClick={() => performOperation('×')}
          className="bg-[#1B3A5C]/10 hover:bg-[#1B3A5C]/20 text-[#1B3A5C] font-bold py-2 rounded text-xs transition-colors cursor-pointer border border-slate-300"
        >
          ×
        </button>

        <button
          onClick={() => inputDigit('7')}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          7
        </button>
        <button
          onClick={() => inputDigit('8')}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          8
        </button>
        <button
          onClick={() => inputDigit('9')}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          9
        </button>
        <button
          onClick={() => performOperation('-')}
          className="bg-[#1B3A5C]/10 hover:bg-[#1B3A5C]/20 text-[#1B3A5C] font-bold py-2 rounded text-xs transition-colors cursor-pointer border border-slate-300"
        >
          -
        </button>

        <button
          onClick={() => inputDigit('4')}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          4
        </button>
        <button
          onClick={() => inputDigit('5')}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          5
        </button>
        <button
          onClick={() => inputDigit('6')}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          6
        </button>
        <button
          onClick={() => performOperation('+')}
          className="bg-[#1B3A5C]/10 hover:bg-[#1B3A5C]/20 text-[#1B3A5C] font-bold py-2 rounded text-xs transition-colors cursor-pointer border border-slate-300"
        >
          +
        </button>

        <button
          onClick={() => inputDigit('1')}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          1
        </button>
        <button
          onClick={() => inputDigit('2')}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          2
        </button>
        <button
          onClick={() => inputDigit('3')}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          3
        </button>
        <button
          onClick={handleEquals}
          className="row-span-2 bg-[#1B3A5C] hover:bg-[#122840] text-white font-bold py-2 rounded text-sm transition-colors cursor-pointer flex items-center justify-center shadow-sm"
        >
          =
        </button>

        <button
          onClick={() => inputDigit('0')}
          className="col-span-2 bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          0
        </button>
        <button
          onClick={inputDecimal}
          className="bg-white hover:bg-slate-50 text-slate-800 font-bold font-mono py-2 rounded text-sm transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          .
        </button>
      </div>
    </div>
  );
};
