import { useMemo } from 'react';
import type { Hotel } from '../data/travelDatabase';
import type { DayItinerary } from '../utils/planningEngine';
import { Navigation, Home, Utensils } from 'lucide-react';
import styles from './VectorMap.module.css';

interface VectorMapProps {
  activeDay: DayItinerary;
  hotel: Hotel;
  cityName: string;
  simulatedTimeSlot?: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  isSimulating?: boolean;
}

export const VectorMap: React.FC<VectorMapProps> = ({
  activeDay,
  hotel,
  cityName,
  simulatedTimeSlot,
  isSimulating = false
}) => {
  // Extract coordinate points sequentially for the active day's route:
  // Hotel -> Breakfast -> Morning Attraction -> Lunch -> Afternoon Attraction -> Dinner -> Evening Attraction -> Hotel
  const points = useMemo(() => {
    const pts = [
      { id: hotel.id, name: hotel.name, type: 'hotel', x: hotel.coordinates.x, y: hotel.coordinates.y },
      { 
        id: activeDay.breakfast.restaurant.id, 
        name: activeDay.breakfast.restaurant.name, 
        type: 'dining', 
        meal: 'Breakfast',
        x: activeDay.breakfast.restaurant.coordinates.x, 
        y: activeDay.breakfast.restaurant.coordinates.y 
      },
      { 
        id: activeDay.morning.activity.id, 
        name: activeDay.morning.activity.name, 
        type: 'attraction', 
        slot: 'morning',
        x: activeDay.morning.activity.coordinates.x, 
        y: activeDay.morning.activity.coordinates.y 
      },
      { 
        id: activeDay.lunch.restaurant.id, 
        name: activeDay.lunch.restaurant.name, 
        type: 'dining', 
        meal: 'Lunch',
        x: activeDay.lunch.restaurant.coordinates.x, 
        y: activeDay.lunch.restaurant.coordinates.y 
      },
      { 
        id: activeDay.afternoon.activity.id, 
        name: activeDay.afternoon.activity.name, 
        type: 'attraction', 
        slot: 'afternoon',
        x: activeDay.afternoon.activity.coordinates.x, 
        y: activeDay.afternoon.activity.coordinates.y 
      },
      { 
        id: activeDay.dinner.restaurant.id, 
        name: activeDay.dinner.restaurant.name, 
        type: 'dining', 
        meal: 'Dinner',
        x: activeDay.dinner.restaurant.coordinates.x, 
        y: activeDay.dinner.restaurant.coordinates.y 
      },
      { 
        id: activeDay.evening.activity.id, 
        name: activeDay.evening.activity.name, 
        type: 'attraction', 
        slot: 'evening',
        x: activeDay.evening.activity.coordinates.x, 
        y: activeDay.evening.activity.coordinates.y 
      }
    ];

    if (activeDay.discovery) {
      pts.push({
        id: activeDay.discovery.activity.id,
        name: activeDay.discovery.activity.name,
        type: 'attraction',
        slot: 'discovery',
        x: activeDay.discovery.activity.coordinates.x,
        y: activeDay.discovery.activity.coordinates.y
      });
    }

    pts.push({ id: `${hotel.id}_end`, name: hotel.name, type: 'hotel', x: hotel.coordinates.x, y: hotel.coordinates.y });

    return pts;
  }, [activeDay, hotel]);

  // Construct SVG path coordinates
  const routePathD = useMemo(() => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 6} ${p.y * 4}`).join(' ');
  }, [points]);

  // Compute tracker dot coordinate based on active slot in simulation
  const trackerPosition = useMemo(() => {
    if (!isSimulating || !simulatedTimeSlot) return null;

    let targetIdx = 0;
    switch (simulatedTimeSlot) {
      case 'morning':
        targetIdx = 2; // Morning Attraction
        break;
      case 'lunch':
        targetIdx = 3; // Lunch
        break;
      case 'afternoon':
        targetIdx = 4; // Afternoon Attraction
        break;
      case 'dinner':
        targetIdx = 5; // Dinner
        break;
      case 'evening':
        targetIdx = 6; // Evening Attraction
        break;
      default:
        targetIdx = 0;
    }
    
    return points[targetIdx] ? { x: points[targetIdx].x * 6, y: points[targetIdx].y * 4 } : null;
  }, [simulatedTimeSlot, isSimulating, points]);

  // Render stylized river/park grid background for visual aesthetics
  const gridBackgroundElements = useMemo(() => {
    // Generate static abstract shapes based on hash of cityName
    const charSum = cityName.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const riverOffset = (charSum % 30) + 10;
    const parkX = (charSum * 7) % 300;
    const parkY = (charSum * 13) % 250;

    return (
      <>
        {/* Abstract River */}
        <path
          d={`M -50 ${riverOffset * 4} Q 150 ${(riverOffset + 40) * 4} 350 ${(riverOffset - 20) * 4} Q 500 ${(riverOffset + 30) * 4} 650 ${(riverOffset + 10) * 4}`}
          fill="none"
          stroke="var(--accent-cyan)"
          strokeWidth="32"
          opacity="0.12"
          strokeLinecap="round"
        />
        {/* Abstract Park */}
        <circle
          cx={parkX + 100}
          cy={parkY + 60}
          r="80"
          fill="var(--accent-green)"
          opacity="0.08"
          filter="blur(10px)"
        />
        <circle
          cx={parkX + 350}
          cy={parkY + 180}
          r="60"
          fill="var(--accent-green)"
          opacity="0.07"
        />
        {/* City Grid Lines */}
        <line x1="0" y1="100" x2="600" y2="100" stroke="hsl(var(--border-primary))" strokeWidth="0.5" strokeDasharray="5,15" />
        <line x1="0" y1="250" x2="600" y2="250" stroke="hsl(var(--border-primary))" strokeWidth="0.5" strokeDasharray="5,15" />
        <line x1="150" y1="0" x2="150" y2="400" stroke="hsl(var(--border-primary))" strokeWidth="0.5" strokeDasharray="5,15" />
        <line x1="450" y1="0" x2="450" y2="400" stroke="hsl(var(--border-primary))" strokeWidth="0.5" strokeDasharray="5,15" />
      </>
    );
  }, [cityName]);

  return (
    <div className={`${styles.mapContainer} glass-panel`}>
      <div className={styles.mapHeader}>
        <div className={styles.mapTitleBlock}>
          <Navigation size={18} className={styles.navIcon} />
          <h3>Dynamic Routing Map</h3>
        </div>
        <span className={styles.cityBadge}>{cityName} Route Engine</span>
      </div>

      <div className={styles.svgWrapper}>
        <svg viewBox="0 0 600 400" width="100%" height="100%" className={styles.mapSvg}>
          {/* Background Grid */}
          {gridBackgroundElements}

          {/* Connected Route Polyline */}
          <path
            d={routePathD}
            fill="none"
            className={styles.routeLine}
          />
          <path
            d={routePathD}
            fill="none"
            className={styles.routeLineFlow}
          />

          {/* Render Location Pins */}
          {points.map((p, idx) => {
            // Deduplicate end-hotel marker
            if (idx === points.length - 1) return null;
            const x = p.x * 6;
            const y = p.y * 4;

            const isCurrent = isSimulating && 
              ((p.type === 'attraction' && p.slot === simulatedTimeSlot) ||
               (p.type === 'dining' && p.meal?.toLowerCase() === simulatedTimeSlot));

            return (
              <g 
                key={`${p.id}-${idx}`} 
                transform={`translate(${x}, ${y})`}
                className={`${styles.pinGroup} ${isCurrent ? styles.currentPin : ''}`}
              >
                {/* Glow ring */}
                <circle cx="0" cy="0" r="14" className={styles.pinGlow} />

                {/* Marker body */}
                {p.type === 'hotel' ? (
                  <circle cx="0" cy="0" r="10" fill="hsl(var(--accent-primary))" stroke="#ffffff" strokeWidth="1.5" />
                ) : p.type === 'dining' ? (
                  <circle cx="0" cy="0" r="8" fill="hsl(var(--accent-secondary))" stroke="#ffffff" strokeWidth="1.5" />
                ) : (
                  <circle cx="0" cy="0" r="9" fill="hsl(var(--accent-cyan))" stroke="#ffffff" strokeWidth="1.5" />
                )}

                {/* Number / Label Inside pin */}
                {p.type === 'hotel' ? (
                  <g transform="translate(-5, -5) scale(0.6)">
                    <Home size={16} color="#ffffff" strokeWidth={3} />
                  </g>
                ) : p.type === 'dining' ? (
                  <g transform="translate(-4.5, -4.5) scale(0.55)">
                    <Utensils size={16} color="#ffffff" strokeWidth={3} />
                  </g>
                ) : (
                  <text x="0" y="3" className={styles.pinText}>
                    {idx === 2 ? '1' : idx === 4 ? '2' : '3'}
                  </text>
                )}

                {/* Floating tooltips */}
                <g className={styles.tooltip}>
                  <rect x="-60" y="-35" width="120" height="22" rx="4" fill="rgba(0, 0, 0, 0.85)" stroke="hsl(var(--border-primary))" strokeWidth="1" />
                  <text x="0" y="-20" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="600">
                    {p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Tracker Pulse Circle for Active Trip Simulation */}
          {trackerPosition && (
            <g transform={`translate(${trackerPosition.x}, ${trackerPosition.y})`}>
              <circle cx="0" cy="0" r="18" className={styles.trackerRadar} />
              <circle cx="0" cy="0" r="6" fill="#ffffff" className={styles.trackerCore} />
            </g>
          )}
        </svg>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotHotel}`} />
          <span>Base Hotel</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotAttraction}`} />
          <span>Attraction</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotDining}`} />
          <span>Dining Spot</span>
        </div>
        {isSimulating && (
          <div className={styles.legendItem}>
            <span className={styles.pulseIndicator} />
            <span className={styles.liveLabel}>Live Location Tracking</span>
          </div>
        )}
      </div>
    </div>
  );
};
