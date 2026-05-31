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
}

export const ItineraryDashboard: React.FC<ItineraryDashboardProps> = ({
  itinerary,
  onChangeItinerary,
  activeDayNum,
  setActiveDayNum,
  simulatedTimeSlot,
  isSimulating = false
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

  const renderTransit = (transit?: TransitInfo) => {
    if (!transit) return null;
    return (
      <div className={styles.transitConnector} role="note" aria-label="Transit recommendation">
        <Navigation size={12} style={{ transform: 'rotate(45deg)' }} />
        <span>
          Travel: {transit.durationMin} mins via <strong>{transit.mode}</strong> 
          {transit.costApprox > 0 ? ` (Est. $${transit.costApprox})` : ' (Free)'}
        </span>
      </div>
    );
  };

  const renderAttractionCard = (slot: ActivitySlot, slotKey: 'morning' | 'afternoon' | 'evening') => {
    const isCurrent = isSimulating && simulatedTimeSlot === slotKey;
    const item = slot.activity;

    return (
      <div className={`timeline-item ${styles.slotItem}`} role="article" aria-label={`${slotKey} activity`}>
        <div className="timeline-dot" />
        <div className={`${styles.slotCard} glass-card ${isCurrent ? styles.activeCard : ''}`}>
          <div className={styles.slotTime}>
            {slotKey === 'morning' && '10:00 AM - Morning Sight'}
            {slotKey === 'afternoon' && '02:00 PM - Afternoon Sight'}
            {slotKey === 'evening' && '07:30 PM - Evening Sight'}
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
        {renderTransit(slot.transitToNext)}
      </div>
    );
  };

  const renderDiningCard = (slot: DiningSlot, mealType: 'Breakfast' | 'Lunch' | 'Dinner') => {
    const isCurrent = isSimulating && simulatedTimeSlot === mealType.toLowerCase();
    const item = slot.restaurant;

    return (
      <div className={`timeline-item ${styles.slotItem}`} role="article" aria-label={`${mealType} dining`}>
        <div className="timeline-dot" />
        <div className={`${styles.slotCard} ${styles.diningCard} glass-card ${isCurrent ? styles.activeCard : ''}`}>
          <div className={styles.slotTime}>
            {mealType === 'Breakfast' && '09:00 AM - Breakfast'}
            {mealType === 'Lunch' && '12:30 PM - Lunch Break'}
            {mealType === 'Dinner' && '05:30 PM - Dinner Time'}
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
        {renderTransit(slot.transitToNext)}
      </div>
    );
  };

  const alternatives = getAlternatives();

  return (
    <div className="dashboard-grid animate-fade">
      {/* Timeline Column */}
      <div className={styles.timelineColumn}>
        <div className={`${styles.summaryBanner} glass-panel`} role="banner">
          <div className={styles.bannerInfo}>
            <h2>{dest.name} Itinerary</h2>
            <div className={styles.summaryBadges}>
              <span>{itinerary.days.length} Days</span>
              <span>•</span>
              <span>{itinerary.pace} Pace</span>
              <span>•</span>
              <span>Hotel: {itinerary.hotel.name}</span>
            </div>
          </div>
          <div className={styles.bannerCost} aria-label="Total estimated budget">
            <span className={styles.costLabel}>Total Estimated Budget</span>
            <span className={styles.costVal}>${itinerary.totalCost}</span>
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

        {/* Timeline Sequence */}
        <div className="timeline" role="region" aria-label={`Day ${activeDayNum} schedule timeline`}>
          {renderDiningCard(activeDay.breakfast, 'Breakfast')}
          {renderAttractionCard(activeDay.morning, 'morning')}
          {renderDiningCard(activeDay.lunch, 'Lunch')}
          {renderAttractionCard(activeDay.afternoon, 'afternoon')}
          {renderDiningCard(activeDay.dinner, 'Dinner')}
          {renderAttractionCard(activeDay.evening, 'evening')}
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
