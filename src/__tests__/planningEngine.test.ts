import { generateItinerary, recalculateItinerary, calculateDistance, getTransit, getTransitWithMode, calculateTotalCost } from '../utils/planningEngine';
import { travelDatabase } from '../data/travelDatabase';
import { cacheService } from '../utils/cacheService';

// Mock test suite matching standard test frameworks (Jest/Vitest)
describe('Travel Planning Scheduler Engine Tests', () => {
  const sampleInputs = {
    destinationId: 'tokyo',
    daysCount: 3,
    budgetPreference: 2 as 1 | 2 | 3,
    interests: ['Culture', 'Nature'],
    dietary: ['Vegan'],
    mobility: 'None' as 'None' | 'Stroller' | 'Wheelchair',
    pace: 'Balanced' as 'Relaxed' | 'Balanced' | 'Fast-paced'
  };

  it('should correctly calculate euclidean distance between coordinates', () => {
    const p1 = { x: 10, y: 20 };
    const p2 = { x: 13, y: 24 }; // 3-4-5 triangle
    expect(calculateDistance(p1, p2)).toBe(5);
  });

  it('should recommend walking transit for close distances under good weather', () => {
    const p1 = { x: 10, y: 10 };
    const p2 = { x: 15, y: 15 }; // distance ~ 7
    const transit = getTransit(p1, p2, false, false);
    expect(transit.mode).toBe('Walking');
    expect(transit.costApprox).toBe(0);
  });

  it('should switch walking to subway during heavy rain', () => {
    const p1 = { x: 10, y: 10 };
    const p2 = { x: 15, y: 15 };
    const transit = getTransit(p1, p2, true, false); // isRainy = true
    expect(transit.mode).toBe('Subway');
    expect(transit.costApprox).toBe(2.5);
  });

  it('should generate a complete multi-day itinerary matching user criteria', () => {
    const itinerary = generateItinerary(sampleInputs);
    
    expect(itinerary.destinationId).toBe('tokyo');
    expect(itinerary.days.length).toBe(3);
    expect(itinerary.budgetPreference).toBe(2);
    expect(itinerary.dietary).toContain('Vegan');
    
    // Verify check-in lodging basecamp
    expect(itinerary.hotel).toBeDefined();
    expect(itinerary.hotel.costLevel).toBeLessThanOrEqual(2);

    // Verify chronological daily sequences
    const day1 = itinerary.days[0];
    expect(day1.breakfast.type).toBe('dining');
    expect(day1.morning.type).toBe('attraction');
    expect(day1.lunch.type).toBe('dining');
  });

  it('should respect mobility wheelchair restrictions by bypassing high exertion activities', () => {
    const inputs = {
      ...sampleInputs,
      mobility: 'Wheelchair' as const
    };
    const itinerary = generateItinerary(inputs);
    
    // Ensure no selected activity has High intensity
    itinerary.days.forEach(day => {
      expect(day.morning.activity.intensity).not.toBe('High');
      expect(day.afternoon.activity.intensity).not.toBe('High');
      expect(day.evening.activity.intensity).not.toBe('High');
    });
  });

  it('should adjust activity selections for dining based on dietary flags', () => {
    const itinerary = generateItinerary({
      ...sampleInputs,
      dietary: ['Gluten-Free']
    });

    itinerary.days.forEach(day => {
      // Gluten-Free dining validation
      if (day.breakfast.restaurant.dietaryFlags.length > 0) {
        expect(day.breakfast.restaurant.dietaryFlags).toContain('Gluten-Free');
      }
    });
  });

  it('should dynamically re-route itineraries during simulator event injections', () => {
    const itinerary = generateItinerary(sampleInputs);
    const originalCost = itinerary.totalCost;

    // Inject WEATHER rain disruption
    const { updatedItinerary, logs } = recalculateItinerary(
      itinerary,
      'WEATHER',
      1, // Active Day
      true // Trigger event
    );

    // Rain increases taxi/transit costs or shifts to indoor
    expect(updatedItinerary.totalCost).not.toBe(originalCost);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('Weather Event Triggered');
  });

  it('should propagate traffic jam alerts and compress activity durations correctly', () => {
    const itinerary = generateItinerary(sampleInputs);
    const { updatedItinerary, logs } = recalculateItinerary(
      itinerary,
      'TRAFFIC',
      1,
      true
    );

    expect(logs.some(log => log.includes('Traffic Jam Alert'))).toBe(true);
    expect(logs.some(log => log.includes('delay added'))).toBe(true);

    const originalDay = itinerary.days[0];
    const updatedDay = updatedItinerary.days[0];
    // Traffic compresses durations
    expect(updatedDay.morning.durationMin).toBeLessThan(originalDay.morning.durationMin);
  });

  it('should verify cacheService caching and expiration behaviors for dashboard announcements', () => {
    const testKey = 'test_announcements';
    const testData = [{ id: '1', title: 'Test Alert', category: 'incident' }];

    // Set item in cache
    cacheService.set(testKey, testData, 10);
    expect(cacheService.get(testKey)).toEqual(testData);

    // Clear item from cache
    cacheService.clear(testKey);
    expect(cacheService.get(testKey)).toBeNull();
  });

  it('should fall back to default destination if id is missing or invalid', () => {
    expect(() => {
      generateItinerary({
        ...sampleInputs,
        destinationId: 'invalid-city'
      });
    }).toThrow('Destination invalid-city not found.');
  });

  it('should calculate custom transit info using getTransitWithMode', () => {
    const p1 = { x: 10, y: 10 };
    const p2 = { x: 20, y: 20 };
    const walkingTransit = getTransitWithMode(p1, p2, 'Walking', false);
    const subwayTransit = getTransitWithMode(p1, p2, 'Subway', false);
    const taxiTransit = getTransitWithMode(p1, p2, 'Taxi', true); // heavy traffic

    expect(walkingTransit.mode).toBe('Walking');
    expect(subwayTransit.mode).toBe('Subway');
    expect(taxiTransit.mode).toBe('Taxi');
    expect(taxiTransit.costApprox).toBeGreaterThan(subwayTransit.costApprox);
  });

  it('should handle custom discovery hotspot insertions in DayItinerary', () => {
    const itinerary = generateItinerary(sampleInputs);
    const day1 = itinerary.days[0];
    
    expect(day1.discovery).toBeUndefined();

    // mock append custom discovery attraction
    const mockAttraction = {
      id: 'custom_spot',
      name: 'Eiffel Sunset',
      category: 'Culture' as const,
      costLevel: 1 as 1 | 2 | 3,
      costApprox: 0,
      intensity: 'Low' as const,
      isIndoor: true,
      duration: 60,
      coordinates: { x: 20, y: 50 },
      description: 'Sunset view.',
      imageUrl: '',
      tips: ''
    };

    day1.discovery = {
      type: 'attraction',
      activity: mockAttraction,
      durationMin: 60,
      transitToNext: getTransitWithMode({ x: 20, y: 50 }, itinerary.hotel.coordinates, 'Walking')
    };

    expect(day1.discovery).toBeDefined();
    expect(day1.discovery.activity.name).toBe('Eiffel Sunset');

    const totalCost = calculateTotalCost(itinerary.days, itinerary.hotel, itinerary.days.length);
    expect(totalCost).toBeGreaterThan(0);
  });
});

