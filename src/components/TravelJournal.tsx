import React, { useState } from 'react';
import type { Itinerary } from '../utils/planningEngine';
import { BookOpen, Award, Image as ImageIcon, Save, Check } from 'lucide-react';
import styles from './TravelJournal.module.css';

interface TravelJournalProps {
  itinerary: Itinerary;
  triggeredEvents: Record<string, boolean>;
  isSimulating: boolean;
  journalEntries: Record<number, string>;
  onSaveJournalEntry: (day: number, entry: string) => void;
}

interface Stamp {
  id: string;
  name: string;
  description: string;
  illustration: string; // Emoji
  isUnlocked: boolean;
}

export const TravelJournal: React.FC<TravelJournalProps> = ({
  itinerary,
  triggeredEvents,
  isSimulating,
  journalEntries,
  onSaveJournalEntry
}) => {
  const [activeDayTab, setActiveDayTab] = useState(1);
  const [noteText, setNoteText] = useState(journalEntries[activeDayTab] || '');
  const [isSavedNotify, setIsSavedNotify] = useState(false);

  // Sync state note text when day changes
  React.useEffect(() => {
    setNoteText(journalEntries[activeDayTab] || '');
  }, [activeDayTab, journalEntries]);

  // Determine stamps unlocking criteria dynamically
  const stampsList = React.useMemo<Stamp[]>(() => {
    const list: Stamp[] = [
      {
        id: 'stamp_create',
        name: 'First Frontier',
        description: 'Generated a customized dynamic itinerary.',
        illustration: '🗺️',
        isUnlocked: true // always unlocked once itinerary is generated
      },
      {
        id: 'stamp_rain',
        name: 'Storm Navigator',
        description: 'Encountered and adapted to heavy rain alerts.',
        illustration: '⛈️',
        isUnlocked: !!triggeredEvents['WEATHER']
      },
      {
        id: 'stamp_budget',
        name: 'Thrift Commander',
        description: 'Maintained spending under $400 or activated Budget Shield.',
        illustration: '🛡️',
        isUnlocked: itinerary.totalCost < 400 || !!triggeredEvents['BUDGET']
      },
      {
        id: 'stamp_fast',
        name: 'Tempo Runner',
        description: 'Generated an itinerary with a Fast-paced schedule.',
        illustration: '⚡',
        isUnlocked: itinerary.pace === 'Fast-paced'
      },
      {
        id: 'stamp_dietary',
        name: 'Green Connoisseur',
        description: 'Generated a trip containing Halal or Vegan dining filters.',
        illustration: '🌱',
        isUnlocked: itinerary.dietary.length > 0
      },
      {
        id: 'stamp_simulation',
        name: 'Nomadic Tracker',
        description: 'Toggled live tracking simulator mode on.',
        illustration: '⏱️',
        isUnlocked: isSimulating
      }
    ];
    return list;
  }, [itinerary, triggeredEvents, isSimulating]);

  const activeDayItinerary = itinerary.days.find(d => d.dayNumber === activeDayTab) || itinerary.days[0];

  // Pictures from the active day's activities
  const snaps = React.useMemo(() => {
    return [
      { name: activeDayItinerary.morning.activity.name, url: activeDayItinerary.morning.activity.imageUrl, slot: 'Morning' },
      { name: activeDayItinerary.afternoon.activity.name, url: activeDayItinerary.afternoon.activity.imageUrl, slot: 'Afternoon' },
      { name: activeDayItinerary.evening.activity.name, url: activeDayItinerary.evening.activity.imageUrl, slot: 'Evening' }
    ];
  }, [activeDayItinerary]);

  const handleSave = () => {
    onSaveJournalEntry(activeDayTab, noteText);
    setIsSavedNotify(true);
    setTimeout(() => setIsSavedNotify(false), 2000);
  };

  return (
    <div className={styles.journalLayout}>
      {/* Diary Notepad Card */}
      <div className={`${styles.notepadCard} glass-panel animate-fade`}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <BookOpen size={18} className={styles.bookIcon} />
            <h3>Traveler\'s Log</h3>
          </div>
          <span className={styles.logTag}>Day {activeDayTab} Diary</span>
        </div>

        <div className={styles.daySelector}>
          {itinerary.days.map(d => (
            <button
              key={d.dayNumber}
              className={`${styles.dayBtn} ${activeDayTab === d.dayNumber ? styles.activeDayBtn : ''}`}
              onClick={() => setActiveDayTab(d.dayNumber)}
            >
              Day {d.dayNumber}
            </button>
          ))}
        </div>

        <div className={styles.noteAreaWrapper}>
          <textarea
            placeholder={`How was Day ${activeDayTab} of your trip? Capture notes, restaurant reviews, or memories...`}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className={styles.journalTextarea}
          />
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleSave}
            disabled={isSavedNotify}
          >
            {isSavedNotify ? (
              <>
                <Check size={16} /> Saved Log
              </>
            ) : (
              <>
                <Save size={16} /> Save Daily Entry
              </>
            )}
          </button>
        </div>
      </div>

      {/* stamps board and snaps card */}
      <div className={styles.sideColumn}>
        {/* Stamps Card */}
        <div className={`${styles.stampsCard} glass-panel animate-fade`}>
          <h3 className={styles.sideTitle}>
            <Award size={18} className={styles.awardIcon} />
            Simulated Experience Stamps
          </h3>
          <p className={styles.sectionSubtitle}>
            Unlock travel stamps by configuring constraints, triggering alerts, and tracking simulations.
          </p>

          <div className={styles.stampsGrid}>
            {stampsList.map(stamp => (
              <div 
                key={stamp.id} 
                className={`${styles.stampBadge} ${stamp.isUnlocked ? styles.unlockedStamp : styles.lockedStamp}`}
                title={stamp.isUnlocked ? `Unlocked: ${stamp.name}` : `Locked: ${stamp.name}`}
              >
                <div className={styles.stampCircle}>
                  <span className={styles.stampEmoji}>{stamp.illustration}</span>
                </div>
                <div className={styles.stampDetails}>
                  <h5>{stamp.name}</h5>
                  <p>{stamp.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Snapshots Polaroid book */}
        <div className={`${styles.snapsCard} glass-panel animate-fade`}>
          <h3 className={styles.sideTitle}>
            <ImageIcon size={18} className={styles.snapIcon} />
            Virtual Sightings Book
          </h3>

          <div className={styles.snapsFlex}>
            {snaps.map((snap, i) => (
              <div key={i} className={styles.polaroid}>
                <div className={styles.polaroidImageWrapper}>
                  <img src={snap.url} alt={snap.name} className={styles.polaroidImage} />
                </div>
                <div className={styles.polaroidLabel}>
                  <div className={styles.polaroidSlot}>{snap.slot}</div>
                  <div className={styles.polaroidCaption}>
                    {snap.name.length > 22 ? snap.name.substring(0, 20) + '...' : snap.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
