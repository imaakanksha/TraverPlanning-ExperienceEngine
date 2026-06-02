import { useState, useEffect } from 'react';
import { generateItinerary, recalculateItinerary, getTransitWithMode, calculateTotalCost } from './utils/planningEngine';
import type { Itinerary } from './utils/planningEngine';
import { PlannerWizard } from './components/PlannerWizard';
import { ItineraryDashboard } from './components/ItineraryDashboard';
import { RealTimeSimulator } from './components/RealTimeSimulator';
import { ExpenseAnalytics } from './components/ExpenseAnalytics';
import { TravelJournal } from './components/TravelJournal';
import { LiveCityDashboard } from './components/LiveCityDashboard';
import { travelDatabase } from './data/travelDatabase';
import type { Attraction } from './data/travelDatabase';
import cacheService from './utils/cacheService';
import logger from './utils/logger';
import { ExportModal } from './components/ExportModal';
import { 
  Compass, Calendar, BarChart3, BookOpen, Sun, Moon, 
  Sparkles, Home, Radio
} from 'lucide-react';

function App() {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [activeDayNum, setActiveDayNum] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'dashboard' | 'simulator' | 'analytics' | 'journal'>('itinerary');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  
  // Simulator State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simTimeSlot, setSimTimeSlot] = useState<'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening'>('morning');
  const [triggeredEvents, setTriggeredEvents] = useState<Record<string, boolean>>({
    WEATHER: false,
    TRAFFIC: false,
    CROWD: false,
    BUDGET: false
  });
  const [recalcLogs, setRecalcLogs] = useState<string[]>([]);
  
  // Journal entries state
  const [journalEntries, setJournalEntries] = useState<Record<number, string>>({});

  // Theme synchronization
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  // Simulation Clock Auto-Ticking Interval
  useEffect(() => {
    let timer: any;
    if (isSimulating) {
      timer = setInterval(() => {
        handleAdvanceSlot();
      }, 9000); // Advance slot every 9 seconds
    }
    return () => clearInterval(timer);
  }, [isSimulating, simTimeSlot, activeDayNum, itinerary]);

  const handleGenerate = (inputs: {
    destinationId: string;
    daysCount: number;
    budgetPreference: 1 | 2 | 3;
    interests: string[];
    dietary: string[];
    mobility: 'None' | 'Stroller' | 'Wheelchair';
    pace: 'Relaxed' | 'Balanced' | 'Fast-paced';
  }) => {
    try {
      // Create cache key based on inputs
      const cacheKey = `itinerary_${inputs.destinationId}_d${inputs.daysCount}_b${inputs.budgetPreference}_p_${inputs.pace}_m_${inputs.mobility}_i_${inputs.interests.join('-')}_f_${inputs.dietary.join('-')}`;
      
      logger.info('Compiling travel itinerary package.', { inputs });

      // 1. Check TTL cache
      const cachedItinerary = cacheService.get<Itinerary>(cacheKey);
      let result: Itinerary;

      if (cachedItinerary) {
        logger.info('Cache hit for itinerary compilation.', { cacheKey });
        result = cachedItinerary;
      } else {
        // 2. Heavy computation path (memoized/cached for future requests)
        result = generateItinerary(inputs);
        cacheService.set(cacheKey, result, 600); // cache for 10 minutes (600s)
        logger.info('Cache miss: Compiled itinerary successfully and cached payload.', { cacheKey });
      }

      setItinerary(result);
      setActiveDayNum(1);
      setActiveTab('itinerary');
      setRecalcLogs([
        `✨ Trip generated successfully for ${result.destinationId.toUpperCase()}!`,
        `🏨 Lodging assigned: ${result.hotel.name}`,
        `💰 Initial cost projection: $${result.totalCost}`,
        `🚦 Engine: Location routing optimized. Waiting for tracking commands.`
      ]);
      setTriggeredEvents({ WEATHER: false, TRAFFIC: false, CROWD: false, BUDGET: false });
      setSimTimeSlot('morning');
      setIsSimulating(false);
      setJournalEntries({});
    } catch (err: any) {
      logger.error('Itinerary generation error:', err);
      alert(err.message || 'Error generating itinerary.');
    }
  };

  // Move clockwise through slot segments
  const handleAdvanceSlot = () => {
    if (!itinerary) return;
    
    const slots: ('morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening')[] = [
      'morning', 'lunch', 'afternoon', 'dinner', 'evening'
    ];
    const currIdx = slots.indexOf(simTimeSlot);
    
    if (currIdx < slots.length - 1) {
      const nextSlot = slots[currIdx + 1];
      setSimTimeSlot(nextSlot);
      setRecalcLogs(prev => [
        ...prev,
        `⏱️ Timebox progressed: Entering ${nextSlot.toUpperCase()} block on Day ${activeDayNum}.`
      ]);
    } else {
      // Loop back to morning and advance day
      setSimTimeSlot('morning');
      if (activeDayNum < itinerary.days.length) {
        setActiveDayNum(prev => prev + 1);
        setRecalcLogs(prev => [
          ...prev,
          `🌅 Sunrise: Entering Day ${activeDayNum + 1} Morning slot.`
        ]);
      } else {
        // Complete simulation
        setIsSimulating(false);
        setRecalcLogs(prev => [
          ...prev,
          `🏆 Journey Complete! You completed the simulation sequence of your trip successfully.`
        ]);
      }
    }
  };

  // Toggle/inject disruptions
  const handleToggleEvent = (eventType: 'WEATHER' | 'TRAFFIC' | 'CROWD' | 'BUDGET') => {
    if (!itinerary) return;
    const isActivating = !triggeredEvents[eventType];

    logger.info('Simulator Event Triggered', { eventType, isActivating, activeDayNum });

    // Calculate recalculations
    const { updatedItinerary, logs } = recalculateItinerary(
      itinerary,
      eventType,
      activeDayNum,
      isActivating
    );

    setItinerary(updatedItinerary);
    setTriggeredEvents(prev => ({
      ...prev,
      [eventType]: isActivating
    }));
    setRecalcLogs(prev => [...prev, ...logs]);
  };

  const handleSaveJournalEntry = (dayNum: number, text: string) => {
    setJournalEntries(prev => ({
      ...prev,
      [dayNum]: text
    }));
    logger.info('Saved daily stamp journal entry.', { dayNumber: dayNum });
  };

  const handleChangeTransitMode = (
    dayNum: number,
    slotKey: 'breakfast' | 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'discovery',
    newMode: 'Walking' | 'Subway' | 'Taxi' | 'Train'
  ) => {
    if (!itinerary) return;

    const updated: Itinerary = JSON.parse(JSON.stringify(itinerary));
    const day = updated.days.find(d => d.dayNumber === dayNum);
    if (day) {
      const slot = day[slotKey];
      if (slot && slot.transitToNext) {
        const oldMode = slot.transitToNext.mode;
        const p1 = slot.type === 'dining' ? slot.restaurant.coordinates : slot.activity.coordinates;
        
        let p2 = updated.hotel.coordinates;
        if (slotKey === 'breakfast') p2 = day.morning.activity.coordinates;
        else if (slotKey === 'morning') p2 = day.lunch.restaurant.coordinates;
        else if (slotKey === 'lunch') p2 = day.afternoon.activity.coordinates;
        else if (slotKey === 'afternoon') p2 = day.dinner.restaurant.coordinates;
        else if (slotKey === 'dinner') p2 = day.evening.activity.coordinates;
        else if (slotKey === 'evening') p2 = day.discovery ? day.discovery.activity.coordinates : updated.hotel.coordinates;
        else if (slotKey === 'discovery' && day.discovery) p2 = updated.hotel.coordinates;

        const isTraffic = triggeredEvents.TRAFFIC;
        const newTransit = getTransitWithMode(p1, p2, newMode, isTraffic);
        slot.transitToNext = newTransit;

        updated.totalCost = calculateTotalCost(updated.days, updated.hotel, updated.days.length);
        setItinerary(updated);

        setRecalcLogs(prev => [
          ...prev,
          `🔄 TRANSIT OVERRIDE: Day ${dayNum} ${slotKey} transit switched to ${newMode} (was ${oldMode}). Time: ${newTransit.durationMin}m, Cost: $${newTransit.costApprox}.`,
          `💰 Recomputed itinerary budget: $${updated.totalCost}.`
        ]);
      }
    }
  };

  const handleAvoidIncident = (title: string) => {
    if (!itinerary) return;
    logger.info('Rerouting around map incident.', { title });
    
    const updated: Itinerary = JSON.parse(JSON.stringify(itinerary));
    const day = updated.days.find(d => d.dayNumber === activeDayNum);
    
    if (day) {
      let modeChanged = false;
      const slots: ('breakfast' | 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening')[] = [
        'breakfast', 'morning', 'lunch', 'afternoon', 'dinner', 'evening'
      ];
      
      for (const slotKey of slots) {
        const slot = day[slotKey];
        if (slot && slot.transitToNext) {
          if (slot.transitToNext.mode === 'Taxi') {
            slot.transitToNext.mode = 'Subway';
            const p1 = slot.type === 'dining' ? slot.restaurant.coordinates : slot.activity.coordinates;
            let p2 = updated.hotel.coordinates;
            if (slotKey === 'breakfast') p2 = day.morning.activity.coordinates;
            else if (slotKey === 'morning') p2 = day.lunch.restaurant.coordinates;
            else if (slotKey === 'lunch') p2 = day.afternoon.activity.coordinates;
            else if (slotKey === 'afternoon') p2 = day.dinner.restaurant.coordinates;
            else if (slotKey === 'dinner') p2 = day.evening.activity.coordinates;
            
            slot.transitToNext = getTransitWithMode(p1, p2, 'Subway', false);
            modeChanged = true;
          }
        }
      }

      (day as any).incidentBypassed = true;

      updated.totalCost = calculateTotalCost(updated.days, updated.hotel, updated.days.length);
      setItinerary(updated);

      setRecalcLogs(prev => [
        ...prev,
        `🚨 REROUTING RESOLUTION: Bypassed incident "${title}" on Day ${activeDayNum}.`,
        modeChanged 
          ? `🚦 Switch vehicle transits to Subway. Resolved gridlock delays (-20 mins).`
          : `🚦 Rerouted navigation lines around coordinates (48, 53) to secure walking safety pathways.`,
        `💰 Updated total budget estimate: $${updated.totalCost}.`
      ]);
    }
  };

  const handleInsertHotspot = (title: string, customCoords?: { x: number; y: number }, customDesc?: string, customCat?: string) => {
    if (!itinerary) return;
    logger.info('Inserting curated discovery pin into timeline.', { title });

    let coords = customCoords || { x: 68, y: 55 };
    let description = customDesc || 'A curated trending local occurrence.';
    let category = customCat || 'Culture';

    const normalizedTitle = title.toLowerCase();
    if (normalizedTitle.includes('teamlab')) {
      coords = { x: 72, y: 55 };
      description = 'Sensor tracking shows queue waits at teamLab Planets have dropped under 15 minutes.';
      category = 'Adventure';
    } else if (normalizedTitle.includes('senso-ji') || normalizedTitle.includes('sensō-ji')) {
      coords = { x: 75, y: 25 };
      description = 'The historic Kaminarimon lanterns are illuminated tonight.';
      category = 'Culture';
    } else if (normalizedTitle.includes('eiffel')) {
      coords = { x: 20, y: 50 };
      description = 'High pressure system offers crystal clear skies. Sunset visibilities are optimal.';
      category = 'Historic';
    } else if (normalizedTitle.includes('orsay')) {
      coords = { x: 40, y: 48 };
      description = 'Late-night gallery openings paired with live cello acoustics in the main clock plaza.';
      category = 'Culture';
    } else if (normalizedTitle.includes('trastevere')) {
      coords = { x: 30, y: 65 };
      description = 'Explore the culinary hotspots and dining alleyways in Piazza Santa Maria.';
      category = 'Food';
    } else if (normalizedTitle.includes('colosseum')) {
      coords = { x: 62, y: 55 };
      description = 'Exclusive night walk access inside the main arena ruins.';
      category = 'Historic';
    } else if (normalizedTitle.includes('broadway')) {
      coords = { x: 45, y: 48 };
      description = 'Actors Equity staging free 20-minute musical numbers in the center of Times Square.';
      category = 'Culture';
    } else if (normalizedTitle.includes('high line')) {
      coords = { x: 38, y: 60 };
      description = 'Scenic elevated park walking route ending near Chelsea Market.';
      category = 'Relaxation';
    } else if (normalizedTitle.includes('khan el-khalili') || normalizedTitle.includes('bazaar')) {
      coords = { x: 62, y: 44 };
      description = 'The ancient market central corridor is hosting sensory spice mixing demonstrations.';
      category = 'Culture';
    } else if (normalizedTitle.includes('pyramid') || normalizedTitle.includes('sphinx')) {
      coords = { x: 10, y: 70 };
      description = 'Laser mapping displays and historic narrations projected onto the Sphinx.';
      category = 'Historic';
    }

    const customAttr: Attraction = {
      id: `custom_hotspot_${Date.now()}`,
      name: title,
      category: category as any,
      costLevel: 1,
      costApprox: 0,
      intensity: 'Low',
      isIndoor: true,
      duration: 60,
      coordinates: coords,
      description: description,
      imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&auto=format&fit=crop&q=80',
      tips: 'Curated discovery addition.'
    };

    const updated: Itinerary = JSON.parse(JSON.stringify(itinerary));
    const day = updated.days.find(d => d.dayNumber === activeDayNum);
    if (day) {
      day.discovery = {
        type: 'attraction',
        activity: customAttr,
        durationMin: 60,
        transitToNext: getTransitWithMode(coords, updated.hotel.coordinates, 'Walking')
      };
      
      day.evening.transitToNext = getTransitWithMode(day.evening.activity.coordinates, coords, 'Walking');

      updated.totalCost = calculateTotalCost(updated.days, updated.hotel, updated.days.length);
      setItinerary(updated);

      setRecalcLogs(prev => [
        ...prev,
        `⭐ DISCOVERY ACTION: Added "${title}" to Day ${activeDayNum} schedule as a Nightcap Discovery!`,
        `💰 Route updated. New total budget estimate: $${updated.totalCost}.`
      ]);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to discard this trip plan and plan a new one?')) {
      setItinerary(null);
      setIsSimulating(false);
      logger.info('Trip architect reset. Discarded active itinerary.');
    }
  };

  // Custom targets limit computation (e.g. Budget gets $350, Mid gets $800, Luxury gets $2500)
  const budgetLimit = itinerary ? (itinerary.budgetPreference === 1 ? 350 : itinerary.budgetPreference === 2 ? 800 : 2500) : 1000;

  // Active warning alerts count (for tabs navigation badge glow)
  const alertCount = Object.values(triggeredEvents).filter(Boolean).length;

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="header" role="banner">
        <div className="logo">
          <Sparkles size={20} style={{ fill: 'currentColor' }} />
          <span>Traverse Engine</span>
        </div>

        {itinerary && (
          <div className="header-info" style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>
            Active: <span style={{ color: 'hsl(var(--accent-primary))' }}>Day {activeDayNum} tracker</span>
          </div>
        )}

        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {itinerary && (
            <>
              <button className="btn-primary" onClick={() => setIsExportOpen(true)} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} aria-label="Export Ticket">
                <Compass size={14} /> Export Ticket
              </button>
              <button className="btn-secondary" onClick={handleReset} style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }} aria-label="Create new plan">
                <Home size={14} /> New Plan
              </button>
            </>
          )}
          <button 
            className="btn-icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Theme"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content" role="main">
        {!itinerary ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', width: '100%' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '1rem auto' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
                Dynamic Trip Architect
              </h1>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1rem' }}>
                State-of-the-art routing scheduler that compiles routes matching interests and updates itineraries in real-time under delays or storms.
              </p>
            </div>
            <PlannerWizard onGenerate={handleGenerate} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {/* Tabs Bar */}
            <div className="tabs-nav" role="tablist" aria-label="Workspace views">
              <button 
                role="tab"
                aria-selected={activeTab === 'itinerary'}
                className={`tab-btn ${activeTab === 'itinerary' ? 'active' : ''}`}
                onClick={() => setActiveTab('itinerary')}
              >
                <Calendar size={16} /> Itinerary
              </button>
              <button 
                role="tab"
                aria-selected={activeTab === 'dashboard'}
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <Radio size={16} /> Live Feed
              </button>
              <button 
                role="tab"
                aria-selected={activeTab === 'simulator'}
                className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
                onClick={() => setActiveTab('simulator')}
                style={{ position: 'relative' }}
              >
                <Compass size={16} /> Live Tracker
                {alertCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: 'hsl(var(--danger))',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {alertCount}
                  </span>
                )}
              </button>
              <button 
                role="tab"
                aria-selected={activeTab === 'analytics'}
                className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart3 size={16} /> Expense Audit
              </button>
              <button 
                role="tab"
                aria-selected={activeTab === 'journal'}
                className={`tab-btn ${activeTab === 'journal' ? 'active' : ''}`}
                onClick={() => setActiveTab('journal')}
              >
                <BookOpen size={16} /> stamps Log
              </button>
            </div>

            {/* Active view component */}
            {activeTab === 'itinerary' && (
              <ItineraryDashboard 
                itinerary={itinerary} 
                onChangeItinerary={setItinerary}
                activeDayNum={activeDayNum}
                setActiveDayNum={setActiveDayNum}
                simulatedTimeSlot={isSimulating ? simTimeSlot : undefined}
                isSimulating={isSimulating}
                triggeredEvents={triggeredEvents}
                onAvoidIncident={handleAvoidIncident}
                onInsertHotspot={handleInsertHotspot}
                onChangeTransitMode={handleChangeTransitMode}
                onToggleEvent={handleToggleEvent}
              />
            )}

            {activeTab === 'dashboard' && (
              <LiveCityDashboard 
                destinationId={itinerary.destinationId}
                cityName={travelDatabase[itinerary.destinationId]?.name || 'City'}
                onFocusLocation={(coords, name) => {
                  setActiveTab('itinerary');
                  logger.info('Panning map focus on coordinate selection.', { coords, name });
                }}
                onAvoidIncident={handleAvoidIncident}
                onInsertHotspot={(title, coords, desc, cat) => {
                  handleInsertHotspot(title, coords, desc, cat);
                  setActiveTab('itinerary');
                }}
              />
            )}

            {activeTab === 'simulator' && (
              <RealTimeSimulator 
                isSimulating={isSimulating}
                setIsSimulating={setIsSimulating}
                activeDayNum={activeDayNum}
                simulatedTimeSlot={simTimeSlot}
                onAdvanceSlot={handleAdvanceSlot}
                triggeredEvents={triggeredEvents}
                onToggleEvent={handleToggleEvent}
                recalcLogs={recalcLogs}
              />
            )}

            {activeTab === 'analytics' && (
              <ExpenseAnalytics 
                itinerary={itinerary} 
                targetBudgetLimit={budgetLimit}
              />
            )}

            {activeTab === 'journal' && (
              <TravelJournal 
                itinerary={itinerary}
                triggeredEvents={triggeredEvents}
                isSimulating={isSimulating}
                journalEntries={journalEntries}
                onSaveJournalEntry={handleSaveJournalEntry}
              />
            )}
          </div>
        )}
      </main>
      {itinerary && (
        <ExportModal 
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          itinerary={itinerary}
        />
      )}
    </div>
  );
}

export default App;
