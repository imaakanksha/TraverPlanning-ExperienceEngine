import React, { useEffect, useRef, useState } from 'react';
import type { Hotel } from '../data/travelDatabase';
import type { DayItinerary } from '../utils/planningEngine';
import { AlertTriangle, Compass, AlertCircle } from 'lucide-react';

interface GoogleMapsViewProps {
  activeDay: DayItinerary;
  hotel: Hotel;
  cityName: string;
  destinationId: string;
  apiKey?: string;
  onAvoidIncident?: (title: string) => void;
  onInsertHotspot?: (title: string) => void;
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
  const latOffset = (50 - y) * 0.0018; 
  const lngOffset = (x - 50) * 0.0024;
  return {
    lat: center.lat + latOffset,
    lng: center.lng + lngOffset
  };
}

export const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({
  activeDay,
  hotel,
  cityName: _cityName,
  destinationId,
  apiKey = '',
  onAvoidIncident,
  onInsertHotspot
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlayMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  // 1. Compute geographical coordinates for itinerary markers
  const itineraryPoints = React.useMemo(() => {
    return [
      { id: hotel.id, name: hotel.name, type: 'Hotel', desc: hotel.description, ...getGeoCoordinates(hotel.coordinates.x, hotel.coordinates.y, destinationId) },
      { id: activeDay.breakfast.restaurant.id, name: activeDay.breakfast.restaurant.name, type: 'Breakfast', desc: activeDay.breakfast.restaurant.description, ...getGeoCoordinates(activeDay.breakfast.restaurant.coordinates.x, activeDay.breakfast.restaurant.coordinates.y, destinationId) },
      { id: activeDay.morning.activity.id, name: activeDay.morning.activity.name, type: 'Morning Activity', desc: activeDay.morning.activity.description, ...getGeoCoordinates(activeDay.morning.activity.coordinates.x, activeDay.morning.activity.coordinates.y, destinationId) },
      { id: activeDay.lunch.restaurant.id, name: activeDay.lunch.restaurant.name, type: 'Lunch', desc: activeDay.lunch.restaurant.description, ...getGeoCoordinates(activeDay.lunch.restaurant.coordinates.x, activeDay.lunch.restaurant.coordinates.y, destinationId) },
      { id: activeDay.afternoon.activity.id, name: activeDay.afternoon.activity.name, type: 'Afternoon Activity', desc: activeDay.afternoon.activity.description, ...getGeoCoordinates(activeDay.afternoon.activity.coordinates.x, activeDay.afternoon.activity.coordinates.y, destinationId) },
      { id: activeDay.dinner.restaurant.id, name: activeDay.dinner.restaurant.name, type: 'Dinner', desc: activeDay.dinner.restaurant.description, ...getGeoCoordinates(activeDay.dinner.restaurant.coordinates.x, activeDay.dinner.restaurant.coordinates.y, destinationId) },
      { id: activeDay.evening.activity.id, name: activeDay.evening.activity.name, type: 'Evening Activity', desc: activeDay.evening.activity.description, ...getGeoCoordinates(activeDay.evening.activity.coordinates.x, activeDay.evening.activity.coordinates.y, destinationId) },
      { id: `${hotel.id}_end`, name: hotel.name, type: 'Hotel Return', desc: 'Overnight lodging.', ...getGeoCoordinates(hotel.coordinates.x, hotel.coordinates.y, destinationId) }
    ];
  }, [activeDay, hotel, destinationId]);

  // 2. Generate active city overlays (Incidents & Discovery Hotspots)
  const cityOverlays = React.useMemo(() => {
    const alertsConfig = [
      { id: 'ol_inc_1', category: 'incident', title: 'Local Transport Blockage', desc: 'Active signaling block. Re-routing recommended.', x: 48, y: 53 },
      { id: 'ol_hot_1', category: 'hotspot', title: 'Trending Curated Hotspot', desc: 'Highly rated local recommendation with under 15 min wait.', x: 68, y: 55 },
      { id: 'ol_cul_1', category: 'cultural', title: 'Cultural Occurrence Area', desc: 'Pop-up lantern lighting and street festival active tonight.', x: 74, y: 32 }
    ];
    return alertsConfig.map(c => ({
      ...c,
      ...getGeoCoordinates(c.x, c.y, destinationId)
    }));
  }, [destinationId]);

  // 3. Dynamic loading script hook
  useEffect(() => {
    if (!apiKey) {
      setMapError('Google Maps API key is missing. Please configure VITE_GOOGLE_MAPS_API_KEY.');
      return;
    }

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
    script.onerror = () => setMapError('Error downloading Google Maps JavaScript SDK.');

    document.head.appendChild(script);

    return () => {
      if ((window as any)[callbackName]) delete (window as any)[callbackName];
    };
  }, [apiKey]);

  // 4. Initializing and updating markers
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !(window as any).google) return;

    try {
      const google = (window as any).google;
      const center = CITY_CENTERS[destinationId] || { lat: 0, lng: 0 };

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: 13,
          styles: darkMapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true
        });

        infoWindowRef.current = new google.maps.InfoWindow();

        // Expose global callback hooks for info-window interactive buttons
        (window as any).handleAvoidMapIncident = (title: string) => {
          if (onAvoidIncident) onAvoidIncident(title);
          infoWindowRef.current.close();
        };
        (window as any).handleInsertMapHotspot = (title: string) => {
          if (onInsertHotspot) onInsertHotspot(title);
          infoWindowRef.current.close();
        };
      }

      const map = mapRef.current;
      const infoWindow = infoWindowRef.current;

      // Clear itinerary markers
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      // Clear overlay markers
      overlayMarkersRef.current.forEach(m => m.setMap(null));
      overlayMarkersRef.current = [];

      const bounds = new google.maps.LatLngBounds();

      // Render Itinerary Sequence Markers
      itineraryPoints.slice(0, -1).forEach((p, idx) => {
        const latLng = { lat: p.lat, lng: p.lng };
        bounds.extend(latLng);

        let markerColor = '#8a4bf1';
        if (p.type.includes('Hotel')) markerColor = '#06b6d4';
        if (p.type.includes('Lunch') || p.type.includes('Dinner') || p.type.includes('Breakfast')) markerColor = '#ec4899';

        const marker = new google.maps.Marker({
          position: latLng,
          map,
          title: p.name,
          label: {
            text: (idx + 1).toString(),
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

        marker.addListener('click', () => {
          setActiveMarkerId(p.id);
          const infoContent = `
            <div style="color: #1a1a24; font-family: sans-serif; padding: 6px; max-width: 220px;">
              <h4 style="margin: 0 0 4px 0; color: #8a4bf1; font-weight: 700;">${p.name}</h4>
              <p style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: #64748b; margin: 0 0 6px 0;">${p.type}</p>
              <p style="font-size: 0.8rem; margin: 0 0 8px 0; line-height: 1.3;">${p.desc}</p>
            </div>
          `;
          infoWindow.setContent(infoContent);
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // Render Incident & Hotspot Overlays Markers
      cityOverlays.forEach(ol => {
        const latLng = { lat: ol.lat, lng: ol.lng };
        bounds.extend(latLng);

        let iconSymbol = google.maps.SymbolPath.BACKWARD_CLOSED_ARROW;
        let color = '#f59e0b'; // Hotspot gold

        if (ol.category === 'incident') {
          color = '#ef4444'; // Red
          iconSymbol = google.maps.SymbolPath.FORWARD_CLOSED_ARROW;
        } else if (ol.category === 'cultural') {
          color = '#06b6d4'; // Cyan
        }

        const marker = new google.maps.Marker({
          position: latLng,
          map,
          title: ol.title,
          icon: {
            path: iconSymbol,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 1,
            scale: 7
          }
        });

        marker.addListener('click', () => {
          setActiveMarkerId(ol.id);
          
          // Action button in InfoWindow
          const actionBtn = ol.category === 'incident'
            ? `<button onclick="window.handleAvoidMapIncident('${ol.title}')" style="background-color:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; cursor:pointer; width:100%; margin-top:8px;">⚠️ Reroute Around Incident</button>`
            : `<button onclick="window.handleInsertMapHotspot('${ol.title}')" style="background-color:#8a4bf1; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; cursor:pointer; width:100%; margin-top:8px;">⭐ Add to Itinerary</button>`;

          const infoContent = `
            <div style="color: #1a1a24; font-family: sans-serif; padding: 6px; max-width: 220px;">
              <h4 style="margin: 0 0 4px 0; color: ${color}; font-weight: 700;">${ol.title}</h4>
              <p style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: #64748b; margin: 0 0 6px 0;">Live operations overlay</p>
              <p style="font-size: 0.8rem; margin: 0 0 4px 0; line-height: 1.3;">${ol.desc}</p>
              ${actionBtn}
            </div>
          `;
          infoWindow.setContent(infoContent);
          infoWindow.open(map, marker);
        });

        overlayMarkersRef.current.push(marker);
      });

      // Fit map bounds
      map.fitBounds(bounds);

      // Render polyline route path
      if (polylineRef.current) polylineRef.current.setMap(null);
      
      const pathCoordinates = itineraryPoints.map(p => ({ lat: p.lat, lng: p.lng }));
      polylineRef.current = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#8a4bf1',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map
      });

    } catch (err: any) {
      setMapError(`Map error: ${err.message || err}`);
    }
  }, [mapLoaded, itineraryPoints, cityOverlays, destinationId]);

  const handleKeyboardFocusMarker = (id: string, index: number, isOverlay = false) => {
    setActiveMarkerId(id);
    const marker = isOverlay ? overlayMarkersRef.current[index] : markersRef.current[index];
    if (marker && infoWindowRef.current && mapRef.current) {
      mapRef.current.panTo(marker.getPosition());

      if (isOverlay) {
        const ol = cityOverlays[index];
        const color = ol.category === 'incident' ? '#ef4444' : '#f59e0b';
        const actionBtn = ol.category === 'incident'
          ? `<button onclick="window.handleAvoidMapIncident('${ol.title}')" style="background-color:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; cursor:pointer; width:100%; margin-top:8px;">⚠️ Reroute Around Incident</button>`
          : `<button onclick="window.handleInsertMapHotspot('${ol.title}')" style="background-color:#8a4bf1; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; cursor:pointer; width:100%; margin-top:8px;">⭐ Add to Itinerary</button>`;
        const contentString = `
          <div style="color: #1a1a24; font-family: sans-serif; padding: 6px; max-width: 220px;">
            <h4 style="margin: 0 0 4px 0; color: ${color}; font-weight: 700;">${ol.title}</h4>
            <p style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: #64748b; margin: 0 0 6px 0;">Overlay Node</p>
            <p style="font-size: 0.8rem; margin: 0 0 4px 0; line-height: 1.3;">${ol.desc}</p>
            ${actionBtn}
          </div>
        `;
        infoWindowRef.current.setContent(contentString);
        infoWindowRef.current.open(mapRef.current, marker);
      } else {
        const p = itineraryPoints[index];
        const contentString = `
          <div style="color: #1a1a24; font-family: sans-serif; padding: 6px; max-width: 220px;">
            <h4 style="margin: 0 0 4px 0; color: #8a4bf1; font-weight: 700;">${p.name}</h4>
            <p style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: #64748b; margin: 0 0 6px 0;">${p.type}</p>
            <p style="font-size: 0.8rem; margin: 0 0 4px 0; line-height: 1.3;">${p.desc}</p>
          </div>
        `;
        infoWindowRef.current.setContent(contentString);
        infoWindowRef.current.open(mapRef.current, marker);
      }
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
      {/* Keyboard accessibility index listing planned route and city alerts */}
      <div 
        aria-label="Route landmarks index" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px', 
          padding: '12px', 
          backgroundColor: '#12121a', 
          borderRadius: '8px',
          border: '1px solid #232330'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#85859e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Compass style={{ width: '14px', height: '14px' }} /> Route Nodes:
          </span>
          {itineraryPoints.slice(0, -1).map((p, idx) => (
            <button
              key={`a11y-marker-${p.id}`}
              onClick={() => handleKeyboardFocusMarker(p.id, idx, false)}
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', borderTop: '1px solid #232330', paddingTop: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: '#85859e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle style={{ width: '14px', height: '14px' }} /> City Alerts & Discoveries:
          </span>
          {cityOverlays.map((ol, idx) => (
            <button
              key={`a11y-overlay-${ol.id}`}
              onClick={() => handleKeyboardFocusMarker(ol.id, idx, true)}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                backgroundColor: activeMarkerId === ol.id ? (ol.category === 'incident' ? '#ef4444' : '#f59e0b') : '#1e1e2f',
                border: `1px solid ${activeMarkerId === ol.id ? '#ffffff' : (ol.category === 'incident' ? '#ef4444' : '#f59e0b')}`,
                color: '#ffffff',
                borderRadius: '4px',
                cursor: 'pointer',
                outline: 'none'
              }}
              aria-label={`Inspect ${ol.title} (${ol.category})`}
            >
              {ol.category === 'incident' ? '🚨' : '📍'} {ol.title}
            </button>
          ))}
        </div>
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
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loading Google Maps...</span>
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
      </div>
    </div>
  );
};

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1d2027" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2027" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b939e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#c18bf2" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#c18bf2" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#13271f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#548c71" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d333f" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#222731" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#85939e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a4454" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#29313d" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#a8b5c2" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1524" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#334f77" }] }
];
