import React, { useEffect, useRef, useState } from 'react';
import type { Hotel } from '../data/travelDatabase';
import type { DayItinerary } from '../utils/planningEngine';
import logger from '../utils/logger';
import { AlertTriangle, MapPin, Compass } from 'lucide-react';

interface GoogleMapsViewProps {
  activeDay: DayItinerary;
  hotel: Hotel;
  cityName: string;
  destinationId: string;
  apiKey?: string;
}

// Center coordinates for our database destinations
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  tokyo: { lat: 35.6762, lng: 139.6503 },
  paris: { lat: 48.8566, lng: 2.3522 },
  rome: { lat: 41.8960, lng: 12.4820 },
  newyork: { lat: 40.7128, lng: -74.0060 },
  cairo: { lat: 30.0444, lng: 31.2357 }
};

/**
 * Maps relative grid coordinates [0-100] to actual geographical Lat/Lng
 * based on the destination's coordinate anchor.
 */
export function getGeoCoordinates(
  x: number,
  y: number,
  destId: string
): { lat: number; lng: number } {
  const center = CITY_CENTERS[destId] || { lat: 0, lng: 0 };
  // Scale factor: spread points by roughly 10-15km around the center
  const latOffset = (50 - y) * 0.0018; // y-axis inverted in standard cartesian vs lat
  const lngOffset = (x - 50) * 0.0024;
  return {
    lat: center.lat + latOffset,
    lng: center.lng + lngOffset
  };
}

export const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({
  activeDay,
  hotel,
  cityName,
  destinationId,
  apiKey = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  // 1. Compute geographical coordinates for the sequence of points
  const points = React.useMemo(() => {
    const pts = [
      {
        id: hotel.id,
        name: hotel.name,
        type: 'Hotel',
        description: hotel.description,
        cost: hotel.costApprox,
        ...getGeoCoordinates(hotel.coordinates.x, hotel.coordinates.y, destinationId)
      },
      {
        id: activeDay.breakfast.restaurant.id,
        name: activeDay.breakfast.restaurant.name,
        type: 'Breakfast (Dining)',
        description: activeDay.breakfast.restaurant.description,
        cost: activeDay.breakfast.restaurant.costApprox,
        ...getGeoCoordinates(
          activeDay.breakfast.restaurant.coordinates.x,
          activeDay.breakfast.restaurant.coordinates.y,
          destinationId
        )
      },
      {
        id: activeDay.morning.activity.id,
        name: activeDay.morning.activity.name,
        type: 'Morning Attraction',
        description: activeDay.morning.activity.description,
        cost: activeDay.morning.activity.costApprox,
        ...getGeoCoordinates(
          activeDay.morning.activity.coordinates.x,
          activeDay.morning.activity.coordinates.y,
          destinationId
        )
      },
      {
        id: activeDay.lunch.restaurant.id,
        name: activeDay.lunch.restaurant.name,
        type: 'Lunch (Dining)',
        description: activeDay.lunch.restaurant.description,
        cost: activeDay.lunch.restaurant.costApprox,
        ...getGeoCoordinates(
          activeDay.lunch.restaurant.coordinates.x,
          activeDay.lunch.restaurant.coordinates.y,
          destinationId
        )
      },
      {
        id: activeDay.afternoon.activity.id,
        name: activeDay.afternoon.activity.name,
        type: 'Afternoon Attraction',
        description: activeDay.afternoon.activity.description,
        cost: activeDay.afternoon.activity.costApprox,
        ...getGeoCoordinates(
          activeDay.afternoon.activity.coordinates.x,
          activeDay.afternoon.activity.coordinates.y,
          destinationId
        )
      },
      {
        id: activeDay.dinner.restaurant.id,
        name: activeDay.dinner.restaurant.name,
        type: 'Dinner (Dining)',
        description: activeDay.dinner.restaurant.description,
        cost: activeDay.dinner.restaurant.costApprox,
        ...getGeoCoordinates(
          activeDay.dinner.restaurant.coordinates.x,
          activeDay.dinner.restaurant.coordinates.y,
          destinationId
        )
      },
      {
        id: activeDay.evening.activity.id,
        name: activeDay.evening.activity.name,
        type: 'Evening Attraction',
        description: activeDay.evening.activity.description,
        cost: activeDay.evening.activity.costApprox,
        ...getGeoCoordinates(
          activeDay.evening.activity.coordinates.x,
          activeDay.evening.activity.coordinates.y,
          destinationId
        )
      },
      {
        id: `${hotel.id}_end`,
        name: hotel.name,
        type: 'Hotel Return',
        description: 'Return to basecamp for overnight rest.',
        cost: 0,
        ...getGeoCoordinates(hotel.coordinates.x, hotel.coordinates.y, destinationId)
      }
    ];
    return pts;
  }, [activeDay, hotel, destinationId]);

  // 2. Dynamic loader for Google Maps JavaScript API script
  useEffect(() => {
    if (!apiKey) {
      setMapError('Google Maps API key is missing. Please provide a VITE_GOOGLE_MAPS_API_KEY in environment variables.');
      logger.warn('Google Maps Component: API Key is missing.');
      return;
    }

    // Check if script is already present
    if ((window as any).google && (window as any).google.maps) {
      setMapLoaded(true);
      return;
    }

    const callbackName = 'initGoogleMapsCallback';
    (window as any)[callbackName] = () => {
      setMapLoaded(true);
      delete (window as any)[callbackName];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setMapError('Failed to load Google Maps JavaScript API script.');
      logger.error('Google Maps Loader: Network script load error.');
    };

    document.head.appendChild(script);

    // Safety timeout for loading state
    const timeout = setTimeout(() => {
      if (!(window as any).google || !(window as any).google.maps) {
        setMapError('Google Maps script loading timed out. Check network connection.');
        logger.error('Google Maps Loader: Loading timeout.');
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      // Clean up callback in case component unmounts during load
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
      }
    };
  }, [apiKey]);

  // 3. Initialize/Update Map & Markers
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !(window as any).google) return;

    try {
      const google = (window as any).google;
      const center = CITY_CENTERS[destinationId] || { lat: 0, lng: 0 };

      // Initialize map instance if not already done
      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: 13,
          styles: darkMapStyles, // Premium slate-dark layout styling
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true
        });

        infoWindowRef.current = new google.maps.InfoWindow();
      } else {
        mapRef.current.setCenter(center);
      }

      const map = mapRef.current;
      const infoWindow = infoWindowRef.current;

      // Clear existing markers
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      // Bounds tracker to auto-fit all route coordinates
      const bounds = new google.maps.LatLngBounds();

      // Add markers for unique points (omit the duplicated hotel return point for markers)
      const uniquePoints = points.slice(0, -1);
      uniquePoints.forEach((p, idx) => {
        const markerLatLng = { lat: p.lat, lng: p.lng };
        bounds.extend(markerLatLng);

        // Marker color codes: Hotel=Blue, Dining=Orange, Sights=Purple
        let markerColor = '#8a4bf1'; // Purple
        if (p.type.includes('Hotel')) markerColor = '#06b6d4'; // Cyan
        if (p.type.includes('Dining') || p.type.includes('Breakfast') || p.type.includes('Lunch') || p.type.includes('Dinner')) {
          markerColor = '#ec4899'; // Pink/Rose
        }

        // Custom label index representing chronological visit order
        const labelText = (idx + 1).toString();

        const marker = new google.maps.Marker({
          position: markerLatLng,
          map,
          title: p.name,
          label: {
            text: labelText,
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '12px'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: markerColor,
            fillOpacity: 1.0,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 14
          }
        });

        // Add click listener
        marker.addListener('click', () => {
          setActiveMarkerId(p.id);
          const contentString = `
            <div style="color: #1a1a24; font-family: sans-serif; padding: 6px; max-width: 220px;">
              <h4 style="margin: 0 0 4px 0; color: #8a4bf1; font-weight: 700;">${p.name}</h4>
              <p style="font-size: 0.72rem; text-transform: uppercase; font-weight: 600; color: #64748b; margin: 0 0 6px 0;">${p.type}</p>
              <p style="font-size: 0.8rem; margin: 0 0 8px 0; line-height: 1.3;">${p.description}</p>
              ${p.cost > 0 ? `<div style="font-weight: bold; font-size: 0.8rem;">Cost: $${p.cost}</div>` : '<div style="color: #16a34a; font-weight: bold; font-size: 0.8rem;">Free Entry</div>'}
            </div>
          `;
          infoWindow.setContent(contentString);
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // Fit map view bounds
      map.fitBounds(bounds);

      // Draw Polyline route tracks
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }

      const pathCoordinates = points.map(p => ({ lat: p.lat, lng: p.lng }));
      polylineRef.current = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#8a4bf1',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map
      });

      logger.info('Google Maps initialized successfully.', { destinationId, cityName });
    } catch (err: any) {
      setMapError(`Map configuration error: ${err.message || err}`);
      logger.error('Google Maps Init Error:', err);
    }
  }, [mapLoaded, points, destinationId]);

  // Accessibility helper: trigger click handler programmatically for screen reader users
  const handleKeyboardFocusMarker = (id: string, index: number) => {
    setActiveMarkerId(id);
    if (markersRef.current[index] && infoWindowRef.current && mapRef.current) {
      const marker = markersRef.current[index];
      const p = points[index];
      const google = (window as any).google;
      
      mapRef.current.panTo(marker.getPosition());
      
      const contentString = `
        <div style="color: #1a1a24; font-family: sans-serif; padding: 6px; max-width: 220px;">
          <h4 style="margin: 0 0 4px 0; color: #8a4bf1; font-weight: 700;">${p.name}</h4>
          <p style="font-size: 0.72rem; text-transform: uppercase; font-weight: 600; color: #64748b; margin: 0 0 6px 0;">${p.type}</p>
          <p style="font-size: 0.8rem; margin: 0 0 8px 0; line-height: 1.3;">${p.description}</p>
          ${p.cost > 0 ? `<div style="font-weight: bold; font-size: 0.8rem;">Cost: $${p.cost}</div>` : '<div style="color: #16a34a; font-weight: bold; font-size: 0.8rem;">Free Entry</div>'}
        </div>
      `;
      infoWindowRef.current.setContent(contentString);
      infoWindowRef.current.open(mapRef.current, marker);
    }
  };

  if (mapError) {
    return (
      <div 
        style={{
          border: '2px dashed #f43f5e',
          backgroundColor: '#1c1917',
          padding: '24px',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#f43f5e',
          margin: '12px 0'
        }}
        role="alert"
        aria-live="assertive"
      >
        <AlertTriangle style={{ margin: '0 auto 12px auto', width: '48px', height: '48px' }} />
        <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Google Maps Component Error</h4>
        <p style={{ fontSize: '0.88rem', color: '#a8a29e', margin: '0 0 16px 0' }}>{mapError}</p>
        <p style={{ fontSize: '0.8rem', color: '#78716c' }}>
          *The application will automatically fall back to the Custom vector grid layout when Google Maps cannot load.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Keyboard navigation helper list for WCAG 2.1 AA screen readers */}
      <div 
        aria-label="Route landmarks index" 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px', 
          padding: '8px', 
          backgroundColor: '#12121a', 
          borderRadius: '8px',
          border: '1px solid #232330'
        }}
      >
        <span style={{ fontSize: '0.78rem', color: '#85859e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Compass style={{ width: '14px', height: '14px' }} /> Keyboard Index:
        </span>
        {points.slice(0, -1).map((p, idx) => (
          <button
            key={`a11y-marker-${p.id}`}
            onClick={() => handleKeyboardFocusMarker(p.id, idx)}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              backgroundColor: activeMarkerId === p.id ? '#8a4bf1' : '#1e1e2f',
              border: `1px solid ${activeMarkerId === p.id ? '#a855f7' : '#3c3c54'}`,
              color: '#ffffff',
              borderRadius: '4px',
              cursor: 'pointer',
              outline: 'none'
            }}
            aria-label={`Highlight position ${idx + 1}: ${p.name} (${p.type})`}
          >
            {idx + 1}. {p.name}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', width: '100%', height: '420px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #232330' }}>
        {!mapLoaded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#0f0f16',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
            color: '#a855f7'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #3c3c54',
              borderTop: '4px solid #a855f7',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '12px'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loading Google Maps Platform...</span>
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
      </div>
    </div>
  );
};

// Premium dark-mode slate map theme styling styles
const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1d2027" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2027" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b939e" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c18bf2" }]
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c18bf2" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#13271f" }]
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#548c71" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d333f" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#222731" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#85939e" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a4454" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#29313d" }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a8b5c2" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0c1524" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#334f77" }]
  }
];
