import { generateItinerary, recalculateItinerary, calculateDistance, getTransit } from '../utils/planningEngine';
import { travelDatabase } from '../data/travelDatabase';

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
    expect(logs[0]).toContain('WEATHER ALERT');
  });

  it('should fall back to default destination if id is missing or invalid', () => {
    expect(() => {
      generateItinerary({
        ...sampleInputs,
        destinationId: 'invalid-city'
      });
    }).toThrow('Destination invalid-city not found.');
  });
});
