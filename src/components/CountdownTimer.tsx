import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, OctagonX, CheckCircle2, Sparkles, Timer } from 'lucide-react';

interface CountdownTimerProps {
  isRunning: boolean;
  totalItems: number;
  completedItems: number;
  startTime: number | null; // Timestamp in ms when process started
  secPerItem?: number; // Estimated seconds per item, default 2
  title?: string;
  onStop?: () => void;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  isRunning,
  totalItems,
  completedItems,
  startTime,
  secPerItem = 2,
  title = 'Processing Outreach Campaign',
  onStop,
  className = ''
}) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  if (!isRunning || !startTime) {
    return null;
  }

  const elapsedMs = Math.max(0, now - startTime);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  
  // Total estimated seconds based on total items or elapsed average
  const totalEstimatedSec = Math.max(1, totalItems * secPerItem);
  
  // Remaining seconds calculation: count down from estimated time, or adapt if items remain
  const itemsLeft = Math.max(0, totalItems - completedItems);
  const remainingSecByItems = itemsLeft * secPerItem;
  const rawRemainingSec = Math.max(0, totalEstimatedSec - elapsedSec);
  
  // Choose the best estimate for live ticking remaining time
  const remainingSec = Math.max(rawRemainingSec, remainingSecByItems);

  // Format MM:SS
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const formattedMMSS = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Formatted human readable string
  const formattedStr = mins > 0 
    ? `${mins}m ${secs}s`
    : `${secs}s`;

  // Elapsed string
  const elapsedMins = Math.floor(elapsedSec / 60);
  const elapsedSecs = elapsedSec % 60;
  const formattedElapsed = `${elapsedMins.toString().padStart(2, '0')}:${elapsedSecs.toString().padStart(2, '0')}`;

  // Progress percentage
  const percent = totalItems > 0 
    ? Math.min(100, Math.round((completedItems / totalItems) * 100))
    : 0;

  return (
    <div className={`bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-xl space-y-3 font-sans ${className}`}>
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <Timer className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs text-slate-100 truncate flex items-center gap-1.5">
              {title}
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Live Ticking
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 truncate">
              Processed {completedItems} of {totalItems} items ({percent}%)
            </p>
          </div>
        </div>

        {/* Real-time Ticking Timer Display */}
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1.5 justify-end">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono text-lg font-black text-amber-300 tracking-tight leading-none drop-shadow-xs">
              {formattedMMSS}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
            Time Left ({formattedStr})
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700">
          <div 
            className="bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-0.5">
          <span>Elapsed: {formattedElapsed}</span>
          <span>{itemsLeft} item{itemsLeft === 1 ? '' : 's'} remaining</span>
        </div>
      </div>

      {/* Emergency Stop Button if provided */}
      {onStop && (
        <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
            Active dispatch loop running...
          </span>
          <button
            type="button"
            onClick={onStop}
            className="px-2.5 py-1 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-[10px] rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <OctagonX className="w-3 h-3" />
            Cancel / Stop Process
          </button>
        </div>
      )}
    </div>
  );
};
