import { useState } from 'react';
import { getTransit, calculateTotalCost } from '../utils/planningEngine';
import type { Itinerary, ActivitySlot, DiningSlot, TransitInfo } from '../utils/planningEngine';
import { travelDatabase } from '../data/travelDatabase';
import type { Attraction } from '../data/travelDatabase';
import { VectorMap } from './VectorMap';
import { GoogleMapsView } from './GoogleMapsView';
import { 
  Coffee, Utensils, Navigation, 
  RefreshCw, DollarSign, Brain, Map, Layers
} from 'lucide-react';
import styles from './ItineraryDashboard.module.css';

interface ItineraryDashboardProps {
  itinerary: Itinerary;
  onChangeItinerary: (newItinerary: Itinerary) => void;
  activeDayNum: number;
  setActiveDayNum: (num: number) => void;
  simulatedTimeSlot?: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  isSimulating?: boolean;
  triggeredEvents?: Record<string, boolean>;
  onAvoidIncident?: (title: string) => void;
  onInsertHotspot?: (title: string) => void;
  onChangeTransitMode?: (
    dayNum: number,
    slotKey: 'breakfast' | 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'discovery',
    newMode: 'Walking' | 'Subway' | 'Taxi' | 'Train'
  ) => void;
  onToggleEvent?: (eventType: 'WEATHER' | 'TRAFFIC' | 'CROWD' | 'BUDGET') => void;
}

export const ItineraryDashboard: React.FC<ItineraryDashboardProps> = ({
  itinerary,
  onChangeItinerary,
  activeDayNum,
  setActiveDayNum,
  simulatedTimeSlot,
  isSimulating = false,
  triggeredEvents = {},
  onAvoidIncident,
  onInsertHotspot,
  onChangeTransitMode,
  onToggleEvent
}) => {
  const [swappingSlot, setSwappingSlot] = useState<{ dayNum: number; slotKey: 'morning' | 'afternoon' | 'evening' } | null>(null);
  const [mapMode, setMapMode] = useState<'vector' | 'google'>('vector');

  const activeDay = itinerary.days.find(d => d.dayNumber === activeDayNum) || itinerary.days[0];
  const dest = travelDatabase[itinerary.destinationId];
  
  // Safe environment lookup for Google Maps API Key
  const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '') as string;

  // Get list of alternative attractions not currently scheduled
  const getAlternatives = () => {
    if (!dest) return [];
    const scheduledIds = new Set<string>();
    itinerary.days.forEach(day => {
      scheduledIds.add(day.morning.activity.id);
      scheduledIds.add(day.afternoon.activity.id);
      scheduledIds.add(day.evening.activity.id);
    });
    return dest.attractions.filter(attr => !scheduledIds.has(attr.id));
  };

  const handleSwap = (replacement: Attraction) => {
    if (!swappingSlot) return;
    const { dayNum, slotKey } = swappingSlot;
    
    // Deep clone the itinerary
    const updated: Itinerary = JSON.parse(JSON.stringify(itinerary));
    const day = updated.days.find(d => d.dayNumber === dayNum);
    if (day) {
      // Swapping attraction
      const slot = day[slotKey] as ActivitySlot;
      slot.activity = replacement;

      // Recalculate transit sequences for this day
      day.breakfast.transitToNext = getTransit(day.breakfast.restaurant.coordinates, day.morning.activity.coordinates);
      day.morning.transitToNext = getTransit(day.morning.activity.coordinates, day.lunch.restaurant.coordinates);
      day.lunch.transitToNext = getTransit(day.lunch.restaurant.coordinates, day.afternoon.activity.coordinates);
      day.afternoon.transitToNext = getTransit(day.afternoon.activity.coordinates, day.dinner.restaurant.coordinates);
      day.dinner.transitToNext = getTransit(day.dinner.restaurant.coordinates, day.evening.activity.coordinates);
      day.evening.transitToNext = getTransit(day.evening.activity.coordinates, updated.hotel.coordinates);

      // Recompute total itinerary cost
      updated.totalCost = calculateTotalCost(updated.days, updated.hotel, updated.days.length);
      onChangeItinerary(updated);
    }
    setSwappingSlot(null);
  };

  const renderTransit = (
    transit: TransitInfo | undefined,
    slotKey: 'breakfast' | 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'discovery'
  ) => {
    if (!transit) return null;
    const isTrafficImpacted = triggeredEvents?.TRAFFIC && transit.mode !== 'Walking';
    const transitGlowClass = isTrafficImpacted ? styles.trafficGlow : '';
    return (
      <div className={`${styles.transitConnector} ${transitGlowClass}`} role="note" aria-label="Transit recommendation">
        <Navigation size={12} style={{ transform: 'rotate(45deg)', color: 'var(--accent-cyan)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
          <span>
            Travel: {transit.durationMin} mins via <strong>{transit.mode}</strong> 
            {transit.costApprox > 0 ? ` (Est. $${transit.costApprox})` : ' (Free)'}
            {isTrafficImpacted && ' 🚦 (Traffic Jam Alert)'}
          </span>
          {onChangeTransitMode && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['Walking', 'Subway', 'Taxi'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => onChangeTransitMode(activeDayNum, slotKey, mode)}
                  style={{
                    background: transit.mode === mode ? 'hsl(var(--accent-primary))' : '#1e1e2f',
                    border: `1px solid ${transit.mode === mode ? 'hsl(var(--accent-primary))' : '#3c3c54'}`,
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.15s ease'
                  }}
                  title={`Switch transit leg to ${mode}`}
                  aria-label={`Switch transit leg to ${mode}`}
                >
                  {mode === 'Walking' && '🚶'}
                  {mode === 'Subway' && '🚇'}
                  {mode === 'Taxi' && '🚕'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAttractionCard = (slot: ActivitySlot, slotKey: 'morning' | 'afternoon' | 'evening' | 'discovery') => {
    const isCurrent = isSimulating && simulatedTimeSlot === slotKey;
    const item = slot.activity;

    let glowClass = '';
    let statusText = '';
    if (triggeredEvents?.WEATHER && !item.isIndoor) {
      glowClass = styles.weatherGlow;
      statusText = ' 🌧️ (Rain Warning)';
    } else if (triggeredEvents?.CROWD && item.intensity === 'High') {
      glowClass = styles.crowdGlow;
      statusText = ' 👥 (Crowded)';
    } else if (triggeredEvents?.BUDGET && item.costLevel === 3) {
      glowClass = styles.budgetGlow;
      statusText = ' 💰 (Expensive)';
    }

    return (
      <div className={`timeline-item ${styles.slotItem}`} role="article" aria-label={`${slotKey} activity`}>
        <div className="timeline-dot" />
        <div className={`${styles.slotCard} glass-card ${isCurrent ? styles.activeCard : ''} ${glowClass}`}>
          <div className={styles.slotTime}>
            {slotKey === 'morning' && '10:00 AM - Morning Sight'}
            {slotKey === 'afternoon' && '02:00 PM - Afternoon Sight'}
            {slotKey === 'evening' && '07:30 PM - Evening Sight'}
            {slotKey === 'discovery' && '09:00 PM - Nightcap Discovery'}
            {statusText}
          </div>
          
          <div className={styles.cardHeader}>
            <div className={styles.titleArea}>
              <h4>{item.name}</h4>
              <div className={styles.badgeRow}>
                <span className={`badge badge-${item.category.toLowerCase()}`}>{item.category}</span>
                <span className={`badge ${styles.intensityBadge}`}>{item.intensity} Intensity</span>
                <span className={`badge ${item.isIndoor ? styles.indoorBadge : styles.outdoorBadge}`}>
                  {item.isIndoor ? 'Indoor' : 'Outdoor'}
                </span>
              </div>
            </div>
            <button 
              className={`btn-icon ${styles.swapBtn}`} 
              onClick={() => setSwappingSlot({ dayNum: activeDayNum, slotKey })}
              title="Swap Activity"
              aria-label={`Swap activity ${item.name}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <p className={styles.slotDescription}>{item.description}</p>

          <div className={styles.cardFooter}>
            <div className={styles.footerDetail}>
              <strong>Duration:</strong> {slot.durationMin} mins
            </div>
            <div className={styles.footerDetail}>
              <strong>Cost:</strong> {item.costApprox > 0 ? `$${item.costApprox}` : 'Free'}
            </div>
            {item.tips && (
              <div className={styles.tipsBox}>
                <Brain size={12} className={styles.tipsIcon} />
                <span><em>Tip: {item.tips}</em></span>
              </div>
            )}
          </div>
        </div>
        {renderTransit(slot.transitToNext, slotKey)}
      </div>
    );
  };

  const renderDiningCard = (slot: DiningSlot, mealType: 'Breakfast' | 'Lunch' | 'Dinner') => {
    const isCurrent = isSimulating && simulatedTimeSlot === mealType.toLowerCase();
    const item = slot.restaurant;

    let glowClass = '';
    let statusText = '';
    if (triggeredEvents?.BUDGET && item.costLevel === 3) {
      glowClass = styles.budgetGlow;
      statusText = ' 💰 (Expensive Venue)';
    }

    return (
      <div className={`timeline-item ${styles.slotItem}`} role="article" aria-label={`${mealType} dining`}>
        <div className="timeline-dot" />
        <div className={`${styles.slotCard} ${styles.diningCard} glass-card ${isCurrent ? styles.activeCard : ''} ${glowClass}`}>
          <div className={styles.slotTime}>
            {mealType === 'Breakfast' && '09:00 AM - Breakfast'}
            {mealType === 'Lunch' && '12:30 PM - Lunch Break'}
            {mealType === 'Dinner' && '05:30 PM - Dinner Time'}
            {statusText}
          </div>

          <div className={styles.cardHeader}>
            <div className={styles.titleArea}>
              <h4 className={styles.diningTitle}>
                {mealType === 'Breakfast' ? <Coffee size={14} /> : <Utensils size={14} />}
                {item.name}
              </h4>
              <div className={styles.badgeRow}>
                {item.dietaryFlags.map(flag => (
                  <span key={flag} className="badge badge-diet">{flag}</span>
                ))}
                <span className={styles.priceScale} aria-label={`Cost level: ${item.costLevel} out of 3`}>
                  {Array.from({ length: item.costLevel }).map((_, i) => (
                    <DollarSign key={i} size={10} className={styles.activeDollar} />
                  ))}
                </span>
              </div>
            </div>
          </div>

          <p className={styles.slotDescription}>{item.description}</p>
          <div className={styles.cardFooter}>
            <div className={styles.footerDetail}>
              <strong>Est. Cost:</strong> ${item.costApprox} / person
            </div>
          </div>
        </div>
        {renderTransit(slot.transitToNext, mealType.toLowerCase() as any)}
      </div>
    );
  };

  const alternatives = getAlternatives();

  return (
    <div className="dashboard-grid animate-fade">
      {/* Timeline Column */}
      <div className={styles.timelineColumn}>
        <div className={`${styles.summaryBanner} glass-panel ${triggeredEvents?.BUDGET ? styles.budgetGlow : ''}`} role="banner">
          <div className={styles.bannerInfo}>
            <h2>{dest.name} Itinerary</h2>
            <div className={styles.summaryBadges}>
              <span>{itinerary.days.length} Days</span>
              <span>•</span>
              <span>{itinerary.pace} Pace</span>
              <span>•</span>
              <span>Hotel: {itinerary.hotel.name}</span>
              {(activeDay as any).incidentBypassed && (
                <>
                  <span>•</span>
                  <span style={{ color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🛡️ Incident Bypassed
                  </span>
                </>
              )}
            </div>
          </div>
          <div className={styles.bannerCost} aria-label="Total estimated budget">
            <span className={styles.costLabel}>Total Estimated Budget</span>
            <span className={styles.costVal}>${itinerary.totalCost}</span>
            {triggeredEvents?.BUDGET && (
              <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 'bold', marginTop: '4px', display: 'block' }}>
                ⚠️ Budget Limit Exhausted
              </span>
            )}
          </div>
        </div>

        {/* Day Selectors */}
        <div className={styles.dayTabs} role="tablist" aria-label="Schedule days">
          {itinerary.days.map(d => (
            <button
              key={d.dayNumber}
              role="tab"
              aria-selected={activeDayNum === d.dayNumber}
              className={`${styles.dayTabBtn} ${activeDayNum === d.dayNumber ? styles.activeDayTab : ''}`}
              onClick={() => setActiveDayNum(d.dayNumber)}
            >
              Day {d.dayNumber}
            </button>
          ))}
        </div>

        {/* Live Weather Forecast widget */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#12121a',
          border: '1px solid #232330',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap'
        }} aria-label="Day weather prediction control">
          <span style={{ fontSize: '0.78rem', color: '#85859e', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🌦️ Forecast & Storm Shield:
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => {
                if (triggeredEvents.WEATHER) onToggleEvent?.('WEATHER');
              }}
              style={{
                backgroundColor: !triggeredEvents.WEATHER ? '#15803d' : '#1e1e2f',
                border: `1px solid ${!triggeredEvents.WEATHER ? '#22c55e' : '#3c3c54'}`,
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
              title="Sunny: Restores standard outdoor activities"
            >
              ☀️ Sunny
            </button>
            <button 
              onClick={() => {
                if (!triggeredEvents.WEATHER) onToggleEvent?.('WEATHER');
              }}
              style={{
                backgroundColor: triggeredEvents.WEATHER ? '#b91c1c' : '#1e1e2f',
                border: `1px solid ${triggeredEvents.WEATHER ? '#ef4444' : '#3c3c54'}`,
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
              title="Rainy: Triggers re-routing to indoor sights"
            >
              🌧️ Rainy Storm
            </button>
          </div>
          {triggeredEvents.WEATHER && (
            <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
              ⚠️ Weather rerouting active (outdoor sights swapped to indoor).
            </span>
          )}
        </div>

        {/* Timeline Sequence */}
        <div className="timeline" role="region" aria-label={`Day ${activeDayNum} schedule timeline`}>
          {renderDiningCard(activeDay.breakfast, 'Breakfast')}
          {renderAttractionCard(activeDay.morning, 'morning')}
          {renderDiningCard(activeDay.lunch, 'Lunch')}
          {renderAttractionCard(activeDay.afternoon, 'afternoon')}
          {renderDiningCard(activeDay.dinner, 'Dinner')}
          {renderAttractionCard(activeDay.evening, 'evening')}
          {activeDay.discovery && renderAttractionCard(activeDay.discovery, 'discovery')}
        </div>
      </div>

      {/* Map Column */}
      <div className={styles.mapColumn}>
        {/* Toggle Mode for Maps */}
        <div 
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '8px',
            gap: '8px'
          }}
        >
          <button
            onClick={() => setMapMode('vector')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              backgroundColor: mapMode === 'vector' ? '#8a4bf1' : '#1e1e2f',
              border: `1px solid ${mapMode === 'vector' ? '#a855f7' : '#3c3c54'}`,
              color: '#ffffff',
              fontWeight: 600
            }}
            aria-label="Switch to vector grid map view"
          >
            <Layers style={{ width: '13px', height: '13px' }} /> Custom Vector Map
          </button>
          <button
            onClick={() => setMapMode('google')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              backgroundColor: mapMode === 'google' ? '#8a4bf1' : '#1e1e2f',
              border: `1px solid ${mapMode === 'google' ? '#a855f7' : '#3c3c54'}`,
              color: '#ffffff',
              fontWeight: 600
            }}
            aria-label="Switch to interactive Google Maps view"
          >
            <Map style={{ width: '13px', height: '13px' }} /> Interactive Google Maps
          </button>
        </div>

        {mapMode === 'vector' ? (
          <VectorMap
            activeDay={activeDay}
            hotel={itinerary.hotel}
            cityName={dest.name}
            simulatedTimeSlot={simulatedTimeSlot}
            isSimulating={isSimulating}
          />
        ) : (
          <GoogleMapsView
            activeDay={activeDay}
            hotel={itinerary.hotel}
            cityName={dest.name}
            destinationId={itinerary.destinationId}
            apiKey={googleMapsApiKey}
            onAvoidIncident={onAvoidIncident}
            onInsertHotspot={onInsertHotspot}
          />
        )}
        
        {/* Accommodation info panel */}
        <div className={`${styles.hotelPanel} glass-panel`} role="complementary" aria-label="Lodging details">
          <h4 className={styles.panelTitle}>Lodging Basecamp</h4>
          <div className={styles.hotelInfo}>
            <div>
              <strong>{itinerary.hotel.name}</strong>
              <div className={styles.ratingStars} aria-label={`Rating: ${itinerary.hotel.rating} stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.floor(itinerary.hotel.rating) ? styles.starFilled : styles.starEmpty}>★</span>
                ))}
                <span className={styles.ratingVal}>({itinerary.hotel.rating})</span>
              </div>
            </div>
            <div className={styles.hotelPrice}>
              ${itinerary.hotel.costApprox}<span>/ night</span>
            </div>
          </div>
          <p className={styles.hotelDesc}>{itinerary.hotel.description}</p>
        </div>

        {/* Semantic structural table detailing daily expenses */}
        <div style={{ marginTop: '16px', border: '1px solid #232330', borderRadius: '8px', padding: '12px', backgroundColor: '#12121a' }}>
          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#85859e', marginBottom: '8px', fontWeight: 700 }}>
            📊 Financial Breakdown & Audit
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: '#f4f4f7' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #232330', color: '#85859e', textAlign: 'left' }}>
                <th style={{ padding: '6px 4px' }}>Expense Sector</th>
                <th style={{ padding: '6px 4px' }}>Actual Cost</th>
                <th style={{ padding: '6px 4px' }}>Limit Buffer</th>
                <th style={{ padding: '6px 4px' }}>Status Indicator</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1c1c28' }}>
                <td style={{ padding: '6px 4px', fontWeight: 600 }}>🏨 Lodging Base</td>
                <td style={{ padding: '6px 4px' }}>${itinerary.hotel.costApprox * itinerary.days.length}</td>
                <td style={{ padding: '6px 4px' }}>Fixed</td>
                <td style={{ padding: '6px 4px', color: '#34d399' }}>✅ Secured</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1c1c28' }}>
                <td style={{ padding: '6px 4px', fontWeight: 600 }}>🍴 Dining (3 Meals)</td>
                <td style={{ padding: '6px 4px' }}>
                  ${itinerary.days.reduce((acc, d) => acc + d.breakfast.restaurant.costApprox + d.lunch.restaurant.costApprox + d.dinner.restaurant.costApprox, 0)}
                </td>
                <td style={{ padding: '6px 4px' }}>$35 / meal</td>
                <td style={{ padding: '6px 4px', color: '#34d399' }}>✅ Optimal</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1c1c28' }}>
                <td style={{ padding: '6px 4px', fontWeight: 600 }}>🎭 Attraction Tickets</td>
                <td style={{ padding: '6px 4px' }}>
                  ${itinerary.days.reduce((acc, d) => acc + d.morning.activity.costApprox + d.afternoon.activity.costApprox + d.evening.activity.costApprox, 0)}
                </td>
                <td style={{ padding: '6px 4px' }}>Cap limit</td>
                <td style={{ padding: '6px 4px', color: '#34d399' }}>✅ Optimal</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 4px', fontWeight: 600 }}>🚘 Transit & Fares</td>
                <td style={{ padding: '6px 4px' }}>
                  ${(itinerary.totalCost - (itinerary.hotel.costApprox * itinerary.days.length) - itinerary.days.reduce((acc, d) => acc + d.breakfast.restaurant.costApprox + d.lunch.restaurant.costApprox + d.dinner.restaurant.costApprox, 0) - itinerary.days.reduce((acc, d) => acc + d.morning.activity.costApprox + d.afternoon.activity.costApprox + d.evening.activity.costApprox, 0))}
                </td>
                <td style={{ padding: '6px 4px' }}>$50</td>
                <td style={{ padding: '6px 4px', color: triggeredEvents?.TRAFFIC ? '#f59e0b' : '#34d399' }}>
                  {triggeredEvents?.TRAFFIC ? '⚠️ Delayed Fares' : '✅ Optimal'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Swap Modal Overlay */}
      {swappingSlot && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className={`${styles.modalContent} glass-panel animate-slideup`}>
            <div className={styles.modalHeader}>
              <h3 id="modal-title">Swap Attraction</h3>
              <button 
                className={styles.closeModal} 
                onClick={() => setSwappingSlot(null)}
                aria-label="Close modal dialog"
              >
                ×
              </button>
            </div>
            
            <p className={styles.modalSubtitle}>
              Select an alternative attraction to slot in. We will recalculate routes and travel times.
            </p>

            <div className={styles.alternativesList} role="group" aria-label="Attraction options">
              {alternatives.length === 0 ? (
                <div className={styles.emptyState}>No alternative attractions available in database.</div>
              ) : (
                alternatives.map(item => (
                  <div 
                    key={item.id} 
                    role="button"
                    tabIndex={0}
                    aria-label={`Swap to ${item.name}, price: ${item.costApprox} dollars`}
                    className={`${styles.altCard} glass-card`} 
                    onClick={() => handleSwap(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSwap(item);
                      }
                    }}
                  >
                    <div className={styles.altImageWrapper}>
                      <img src={item.imageUrl} alt={item.name} className={styles.altImage} />
                    </div>
                    <div className={styles.altInfo}>
                      <div className={styles.altHeaderRow}>
                        <h5>{item.name}</h5>
                        <span className={`badge badge-${item.category.toLowerCase()}`}>{item.category}</span>
                      </div>
                      <p className={styles.altDesc}>{item.description}</p>
                      <div className={styles.altMeta}>
                        <span>Exertion: {item.intensity}</span>
                        <span>•</span>
                        <span>Price: {item.costApprox > 0 ? `$${item.costApprox}` : 'Free'}</span>
                        <span>•</span>
                        <span>{item.isIndoor ? 'Indoor' : 'Outdoor'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
