import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import styles from './PomodoroWidget.module.css';

const MODES = {
  work:       { label: 'Focus',       minutes: 25, color: '#7c6af7' },
  short_break:{ label: 'Short Break', minutes: 5,  color: '#4dd9ac' },
  long_break: { label: 'Long Break',  minutes: 15, color: '#f7a26a' },
};

export default function PomodoroWidget({ roomId, onComplete }) {
  const { user } = useAuth();
  const [mode, setMode] = useState('work');
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const intervalRef = useRef(null);

  const total = MODES[mode].minutes * 60;
  const progress = ((total - seconds) / total) * 100;
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  const handleComplete = useCallback(async () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    if (mode === 'work') {
      const newCycles = cycles + 1;
      setCycles(newCycles);
      if (sessionId) {
        try { await api.patch(`/sessions/${sessionId}/end`); } catch {}
        setSessionId(null);
      }
      onComplete?.({ cycles: newCycles });
      setMode(newCycles % 4 === 0 ? 'long_break' : 'short_break');
    } else {
      setMode('work');
    }
    setSeconds(MODES[mode === 'work' ? (cycles + 1) % 4 === 0 ? 'long_break' : 'short_break' : 'work'].minutes * 60);
  }, [mode, cycles, sessionId, onComplete]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) { handleComplete(); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, handleComplete]);

  const switchMode = (m) => {
    if (running) return;
    setMode(m);
    setSeconds(MODES[m].minutes * 60);
  };

  const toggle = async () => {
    if (!running && mode === 'work' && !sessionId) {
      try {
        const { data } = await api.post('/sessions/start', {
          roomId, type: 'pomodoro', pomodoroSettings: { workDuration: 25, breakDuration: 5 }
        });
        setSessionId(data.session?._id);
      } catch {}
    }
    setRunning(r => !r);
  };

  const reset = () => {
    setRunning(false);
    setSeconds(MODES[mode].minutes * 60);
  };

  const color = MODES[mode].color;

  // SVG circle
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <div className={styles.widget}>
      {/* Mode Tabs */}
      <div className={styles.modes}>
        {Object.entries(MODES).map(([key, val]) => (
          <button
            key={key}
            className={`${styles.modeBtn} ${mode === key ? styles.activeMode : ''}`}
            style={mode === key ? { '--m-color': val.color } : {}}
            onClick={() => switchMode(key)}
            disabled={running}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className={styles.ring}>
        <svg viewBox="0 0 120 120" className={styles.svg}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <div className={styles.timeDisplay}>
          <div className={styles.time} style={{ color }}>{mins}:{secs}</div>
          <div className={styles.modeLabel}>{MODES[mode].label}</div>
          {cycles > 0 && <div className={styles.cycles}>🍅 ×{cycles}</div>}
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button className={styles.resetBtn} onClick={reset} title="Reset">
          <RotateCcw size={16} />
        </button>
        <button
          className={styles.playBtn}
          style={{ '--btn-color': color }}
          onClick={toggle}
        >
          {running ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <button
          className={styles.breakBtn}
          title="Take a break"
          onClick={() => switchMode('short_break')}
          disabled={running}
        >
          <Coffee size={16} />
        </button>
      </div>
    </div>
  );
}
