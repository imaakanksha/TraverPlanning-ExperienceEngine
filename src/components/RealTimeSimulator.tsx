import React, { useEffect, useRef } from 'react';
import { simulatorEvents } from '../data/travelDatabase';
import type { SimulatorEvent } from '../data/travelDatabase';
import { 
  Play, Pause, ChevronRight, AlertTriangle, 
  CloudRain, AlertOctagon, ShieldAlert, Terminal, Sparkles
} from 'lucide-react';
import styles from './RealTimeSimulator.module.css';

interface RealTimeSimulatorProps {
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
  activeDayNum: number;
  simulatedTimeSlot: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  onAdvanceSlot: () => void;
  triggeredEvents: Record<string, boolean>; // e.g. { WEATHER: false, TRAFFIC: true }
  onToggleEvent: (eventType: 'WEATHER' | 'TRAFFIC' | 'CROWD' | 'BUDGET') => void;
  recalcLogs: string[];
}

export const RealTimeSimulator: React.FC<RealTimeSimulatorProps> = ({
  isSimulating,
  setIsSimulating,
  activeDayNum,
  simulatedTimeSlot,
  onAdvanceSlot,
  triggeredEvents,
  onToggleEvent,
  recalcLogs
}) => {
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom whenever new logs are added
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [recalcLogs]);

  // Translate slots to readable labels
  const getSlotLabel = (slot: string) => {
    switch (slot) {
      case 'morning': return 'Morning Sight (10:00 AM - 12:30 PM)';
      case 'lunch': return 'Lunch Break (12:30 PM - 02:00 PM)';
      case 'afternoon': return 'Afternoon Sight (02:00 PM - 05:00 PM)';
      case 'dinner': return 'Dinner (05:30 PM - 07:30 PM)';
      case 'evening': return 'Evening Sight (07:30 PM - 09:30 PM)';
      default: return '';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'WEATHER': return <CloudRain size={16} />;
      case 'TRAFFIC': return <AlertOctagon size={16} />;
      case 'CROWD': return <AlertTriangle size={16} />;
      case 'BUDGET': return <ShieldAlert size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  return (
    <div className={styles.simulatorGrid}>
      {/* Simulator Control Panel */}
      <div className={`${styles.controlPanel} glass-panel`}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span className={`${styles.livePulse} ${isSimulating ? styles.pulseActive : ''}`} />
            <h3>Live Simulator</h3>
          </div>
          <span className={styles.timeTag}>Day {activeDayNum} Timebox</span>
        </div>

        <div className={styles.clockDisplay}>
          <div className={styles.activeSlotLabel}>Active Window</div>
          <div className={styles.activeSlotName}>{getSlotLabel(simulatedTimeSlot)}</div>
        </div>

        <div className={styles.simulationControls}>
          <button 
            className={isSimulating ? 'btn-secondary' : 'btn-primary'}
            onClick={() => setIsSimulating(!isSimulating)}
          >
            {isSimulating ? (
              <>
                <Pause size={16} /> Pause Tracking
              </>
            ) : (
              <>
                <Play size={16} /> Start Trip Tracking
              </>
            )}
          </button>
          
          <button 
            className="btn-secondary" 
            onClick={onAdvanceSlot}
            title="Advance to next activity block"
          >
            Advance Timebox <ChevronRight size={16} />
          </button>
        </div>

        <div className={styles.eventGrid}>
          <h4>Inject Disruptions / Directives</h4>
          <p className={styles.sectionSubtitle}>
            Trigger real-time events to see the routing engine compute and optimize alternatives instantly.
          </p>

          <div className={styles.eventButtons}>
            {simulatorEvents.map((ev: SimulatorEvent) => {
              const isActive = triggeredEvents[ev.type];
              return (
                <button
                  key={ev.id}
                  className={`${styles.eventBtn} ${isActive ? styles.eventBtnActive : ''} ${isActive ? styles[ev.type.toLowerCase() + 'Active'] : ''}`}
                  onClick={() => onToggleEvent(ev.type as any)}
                >
                  <div className={styles.btnIconArea}>
                    {getEventIcon(ev.type)}
                  </div>
                  <div className={styles.btnTextArea}>
                    <strong>{ev.title}</strong>
                    <span>{isActive ? 'Active (Tap to resolve)' : 'Trigger Alert'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Simulator Output Console */}
      <div className={`${styles.consolePanel} glass-panel`}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <Terminal size={18} className={styles.terminalIcon} />
            <h3>Engine Execution Log</h3>
          </div>
          <button 
            className={styles.clearLogs}
            onClick={() => {
              // Flush/clear logs in parent could be handled, but simple UI display is great
              recalcLogs.splice(0, recalcLogs.length);
              recalcLogs.push('⌨️ Terminal logs cleared. Standing by for calculations...');
            }}
          >
            Clear Output
          </button>
        </div>

        <div ref={logTerminalRef} className={styles.terminalBody}>
          {recalcLogs.map((log, idx) => (
            <div key={idx} className={styles.logRow}>
              {log.includes('⛈️') || log.includes('🚦') || log.includes('⚠️') || log.includes('📉') ? (
                <span className={styles.logAlert}>{log}</span>
              ) : log.includes('🔄') || log.includes('🎟️') || log.includes('🍽️') ? (
                <span className={styles.logAction}>{log}</span>
              ) : log.includes('🟢') || log.includes('☀️') ? (
                <span className={styles.logSuccess}>{log}</span>
              ) : (
                <span className={styles.logNeutral}>{log}</span>
              )}
            </div>
          ))}
          {recalcLogs.length === 0 && (
            <div className={styles.terminalPlaceholder}>
              <Sparkles size={24} className={styles.sparkleIcon} />
              <p>System idle. Start simulation or inject an event to begin tracing re-routing operations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
