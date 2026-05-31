import React, { useState, useEffect } from 'react';
import { AlertOctagon, MapPin, Sparkles, RefreshCw } from 'lucide-react';
import cacheService from '../utils/cacheService';
import logger from '../utils/logger';
import styles from './LiveCityDashboard.module.css';

interface LiveAnnouncement {
  id: string;
  category: 'incident' | 'hotspot' | 'cultural';
  title: string;
  description: string;
  timeLabel: string;
  coords: { x: number; y: number }; // Relative coordinates matching the database
}

interface LiveCityDashboardProps {
  destinationId: string;
  cityName: string;
  onFocusLocation?: (coords: { x: number; y: number }, name: string) => void;
}

// Pre-seeded dynamic live city announcements database
const ANNOUNCEMENTS_DB: Record<string, LiveAnnouncement[]> = {
  tokyo: [
    {
      id: 'tok_ann_1',
      category: 'incident',
      title: 'Metro Ginza Line Signal Delay',
      description: 'Ginza Line experiencing 12-minute transit delays near Shimbashi due to signaling updates. Recommending JR Yamanote Line replacements.',
      timeLabel: '4 mins ago',
      coords: { x: 62, y: 42 }
    },
    {
      id: 'tok_ann_2',
      category: 'hotspot',
      title: 'teamLab Planets Low Queue Time',
      description: 'Sensor tracking shows queue waits at teamLab Planets have dropped under 15 minutes. Excellent immediate window for photography.',
      timeLabel: '10 mins ago',
      coords: { x: 72, y: 55 }
    },
    {
      id: 'tok_ann_3',
      category: 'cultural',
      title: 'Sensō-ji Temple Lantern Lighting',
      description: 'The historic Kaminarimon lanterns are illuminated tonight. The street market has active seasonal sweet vendors open until 10:00 PM.',
      timeLabel: '25 mins ago',
      coords: { x: 75, y: 25 }
    }
  ],
  paris: [
    {
      id: 'par_ann_1',
      category: 'incident',
      title: 'RER C Track Crowding Delays',
      description: 'High commuter density causing boarding delays between Champ de Mars and Saint-Michel. Expect minor route tracking adjustments.',
      timeLabel: '2 mins ago',
      coords: { x: 20, y: 50 }
    },
    {
      id: 'par_ann_2',
      category: 'hotspot',
      title: 'Eiffel Tower Sunset Visibilities',
      description: 'High pressure system offers crystal clear skies. Sunset visibilities from the second-floor deck are projected to be optimal at 8:42 PM.',
      timeLabel: '12 mins ago',
      coords: { x: 20, y: 50 }
    },
    {
      id: 'par_ann_3',
      category: 'cultural',
      title: 'Musée d\'Orsay Acoustic Night',
      description: 'Late-night gallery openings paired with live cello acoustics in the main clock plaza. Entry included with standard pre-booked slots.',
      timeLabel: '30 mins ago',
      coords: { x: 40, y: 48 }
    }
  ],
  rome: [
    {
      id: 'rom_ann_1',
      category: 'incident',
      title: 'Metro Line A Station Maintenance',
      description: 'Barberini station closed temporarily for escalator updates. Access the Trevi coordinates via Repubblica walking bypasses.',
      timeLabel: '5 mins ago',
      coords: { x: 50, y: 38 }
    },
    {
      id: 'rom_ann_2',
      category: 'hotspot',
      title: 'Trastevere Dinner Congestion',
      description: 'Dinner table queue times in Piazza Santa Maria are spiking. Visitors are recommended to reserve tables or explore east alleyways.',
      timeLabel: '15 mins ago',
      coords: { x: 30, y: 65 }
    },
    {
      id: 'rom_ann_3',
      category: 'cultural',
      title: 'Colosseum Night Illumination',
      description: 'Exclusive night walk access inside the main arena ruins. The illuminated arches are visible from the north walkway for free.',
      timeLabel: '40 mins ago',
      coords: { x: 62, y: 55 }
    }
  ],
  newyork: [
    {
      id: 'nyc_ann_1',
      category: 'incident',
      title: 'F-Subway Line Uptown Maintenance',
      description: 'Uptown F trains running on E tracks between West 4th and 47th-50th. Add 10-15 minutes to planned transit calculations.',
      timeLabel: '1 min ago',
      coords: { x: 52, y: 55 }
    },
    {
      id: 'nyc_ann_2',
      category: 'hotspot',
      title: 'High Line Pedestrian Congestion',
      description: 'Chelsea Market exit stairs on the High Line are heavily crowded. Recommending the 16th Street elevator bypass for strollers.',
      timeLabel: '8 mins ago',
      coords: { x: 38, y: 60 }
    },
    {
      id: 'nyc_ann_3',
      category: 'cultural',
      title: 'Broadway Outdoor Performance',
      description: 'Actors Equity staging free 20-minute musical numbers in the center of Times Square. Excellent quick cultural stop before dinner.',
      timeLabel: '18 mins ago',
      coords: { x: 45, y: 48 }
    }
  ],
  cairo: [
    {
      id: 'cai_ann_1',
      category: 'incident',
      title: 'Nile Corniche Road Work delays',
      description: 'Road closures causing gridlocks near Garden City. Recommending water-taxi crossing options to bypass bridge congestion.',
      timeLabel: '6 mins ago',
      coords: { x: 40, y: 56 }
    },
    {
      id: 'cai_ann_2',
      category: 'hotspot',
      title: 'Khan el-Khalili Spice Showcases',
      description: 'The ancient market central corridor is hosting sensory spice mixing demonstrations. Highly recommended photo stop.',
      timeLabel: '14 mins ago',
      coords: { x: 62, y: 44 }
    },
    {
      id: 'cai_ann_3',
      category: 'cultural',
      title: 'Pyramids Sound & Light Show',
      description: 'Laser mapping displays and historic narrations projected onto the Sphinx start at 7:30 PM. Tickets available at the gate.',
      timeLabel: '35 mins ago',
      coords: { x: 10, y: 70 }
    }
  ]
};

export const LiveCityDashboard: React.FC<LiveCityDashboardProps> = ({
  destinationId,
  cityName,
  onFocusLocation
}) => {
  const [announcements, setAnnouncements] = useState<LiveAnnouncement[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const cacheKey = `announcements_${destinationId}`;

  // Ingestion with Local TTL Cache logic (Announcements cached for 2 minutes / 120s)
  const loadAnnouncements = (forceRefresh = false) => {
    setIsRefreshing(true);
    logger.info('Fetching live city dashboard announcements.', { destinationId, forceRefresh });

    if (!forceRefresh) {
      const cached = cacheService.get<LiveAnnouncement[]>(cacheKey);
      if (cached) {
        logger.info('Cache hit for live announcements.', { destinationId });
        setAnnouncements(cached);
        setIsRefreshing(false);
        return;
      }
    }

    // Simulate async network latency
    setTimeout(() => {
      const freshData = ANNOUNCEMENTS_DB[destinationId] || [];
      cacheService.set(cacheKey, freshData, 120); // 2 minute cache
      setAnnouncements(freshData);
      setIsRefreshing(false);
      logger.info('Cache miss: Ingested live announcements and refreshed cache.', { destinationId });
    }, 800);
  };

  useEffect(() => {
    loadAnnouncements();
  }, [destinationId]);

  return (
    <section 
      className={`${styles.dashboardContainer} glass-panel animate-fade`}
      aria-label={`${cityName} Live Operations Console`}
    >
      <div className={styles.dashboardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={styles.livePulse} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Live Operations: {cityName}</h2>
        </div>
        <button
          onClick={() => loadAnnouncements(true)}
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px' }}
          disabled={isRefreshing}
          aria-label="Refresh live city data feed"
        >
          <RefreshCw size={12} className={isRefreshing ? styles.refreshingIcon : ''} />
          {isRefreshing ? 'Syncing...' : 'Sync Feed'}
        </button>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#85859e', margin: '-8px 0 12px 0' }}>
        Low-latency streaming announcements parsed from localized dynamic sensors and city transits.
      </p>

      <div className={styles.columnsGrid} role="region" aria-label="Announcements feed categories">
        {/* Column 1: Transit & Safety Incidents */}
        <div className={styles.categoryColumn} role="feed" aria-busy={isRefreshing}>
          <div className={`${styles.columnHeader} ${styles.incidentHeader}`}>
            <AlertOctagon size={16} />
            <h3>Delays & Incidents</h3>
          </div>
          <div className={styles.announcementsList}>
            {announcements
              .filter(a => a.category === 'incident')
              .map(ann => (
                <article key={ann.id} className={styles.announcementCard}>
                  <div className={styles.cardHeader}>
                    <h4>{ann.title}</h4>
                    <span className={styles.timeTag}>{ann.timeLabel}</span>
                  </div>
                  <p>{ann.description}</p>
                  {onFocusLocation && (
                    <button
                      onClick={() => onFocusLocation(ann.coords, ann.title)}
                      className={styles.mapPinLink}
                      aria-label={`Show ${ann.title} location on map`}
                    >
                      <MapPin size={12} /> View on Map
                    </button>
                  )}
                </article>
              ))}
          </div>
        </div>

        {/* Column 2: Dynamic Local Hotspots */}
        <div className={styles.categoryColumn} role="feed" aria-busy={isRefreshing}>
          <div className={`${styles.columnHeader} ${styles.hotspotHeader}`}>
            <MapPin size={16} />
            <h3>Trending Hotspots</h3>
          </div>
          <div className={styles.announcementsList}>
            {announcements
              .filter(a => a.category === 'hotspot')
              .map(ann => (
                <article key={ann.id} className={styles.announcementCard}>
                  <div className={styles.cardHeader}>
                    <h4>{ann.title}</h4>
                    <span className={styles.timeTag}>{ann.timeLabel}</span>
                  </div>
                  <p>{ann.description}</p>
                  {onFocusLocation && (
                    <button
                      onClick={() => onFocusLocation(ann.coords, ann.title)}
                      className={styles.mapPinLink}
                      aria-label={`Show ${ann.title} location on map`}
                    >
                      <MapPin size={12} /> View on Map
                    </button>
                  )}
                </article>
              ))}
          </div>
        </div>

        {/* Column 3: Local Cultural Experiences */}
        <div className={styles.categoryColumn} role="feed" aria-busy={isRefreshing}>
          <div className={`${styles.columnHeader} ${styles.culturalHeader}`}>
            <Sparkles size={16} />
            <h3>Cultural Occurrences</h3>
          </div>
          <div className={styles.announcementsList}>
            {announcements
              .filter(a => a.category === 'cultural')
              .map(ann => (
                <article key={ann.id} className={styles.announcementCard}>
                  <div className={styles.cardHeader}>
                    <h4>{ann.title}</h4>
                    <span className={styles.timeTag}>{ann.timeLabel}</span>
                  </div>
                  <p>{ann.description}</p>
                  {onFocusLocation && (
                    <button
                      onClick={() => onFocusLocation(ann.coords, ann.title)}
                      className={styles.mapPinLink}
                      aria-label={`Show ${ann.title} location on map`}
                    >
                      <MapPin size={12} /> View on Map
                    </button>
                  )}
                </article>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};
