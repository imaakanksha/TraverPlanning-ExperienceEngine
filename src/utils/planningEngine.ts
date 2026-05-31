import { travelDatabase } from '../data/travelDatabase';
import type { Attraction, Dining, Hotel, Destination } from '../data/travelDatabase';

export interface TransitInfo {
  mode: 'Walking' | 'Subway' | 'Taxi' | 'Train';
  durationMin: number;
  costApprox: number;
}

export interface ActivitySlot {
  type: 'attraction';
  activity: Attraction;
  durationMin: number;
  transitToNext?: TransitInfo;
}

export interface DiningSlot {
  type: 'dining';
  restaurant: Dining;
  durationMin: number;
  transitToNext?: TransitInfo;
}

export interface DayItinerary {
  dayNumber: number;
  breakfast: DiningSlot;
  morning: ActivitySlot;
  lunch: DiningSlot;
  afternoon: ActivitySlot;
  dinner: DiningSlot;
  evening: ActivitySlot;
}

export interface Itinerary {
  destinationId: string;
  days: DayItinerary[];
  hotel: Hotel;
  budgetPreference: 1 | 2 | 3;
  interests: string[];
  dietary: string[];
  mobility: 'None' | 'Stroller' | 'Wheelchair';
  pace: 'Relaxed' | 'Balanced' | 'Fast-paced';
  totalCost: number;
}

// Distance helper
export function calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Determine transit recommendation
export function getTransit(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  isRainy: boolean = false,
  isHeavyTraffic: boolean = false
): TransitInfo {
  const dist = calculateDistance(p1, p2);
  
  let mode: 'Walking' | 'Subway' | 'Taxi' | 'Train' = 'Walking';
  let durationMin = 0;
  let costApprox = 0;

  if (dist < 12 && !isRainy) {
    mode = 'Walking';
    durationMin = Math.round(dist * 1.8);
    costApprox = 0;
  } else if (dist < 40) {
    mode = 'Subway';
    durationMin = Math.round(8 + dist * 0.6);
    costApprox = 2.5;
  } else {
    mode = 'Taxi';
    durationMin = Math.round(5 + dist * 0.9);
    costApprox = Math.round(5 + dist * 0.4);
  }

  // Adjust for weather
  if (isRainy && mode === 'Walking') {
    mode = 'Subway';
    durationMin = Math.round(8 + dist * 0.6);
    costApprox = 2.5;
  }

  // Adjust for traffic
  if (isHeavyTraffic) {
    if (mode === 'Taxi') {
      durationMin = Math.round(durationMin * 1.8);
      costApprox = Math.round(costApprox * 1.3); // higher meters
    } else if (mode === 'Subway') {
      durationMin = Math.round(durationMin * 1.15); // slight subway crowds
    } else if (mode === 'Walking') {
      durationMin = Math.round(durationMin * 1.05);
    }
  }

  return { mode, durationMin, costApprox };
}

// Generate the initial itinerary
export function generateItinerary(inputs: {
  destinationId: string;
  daysCount: number;
  budgetPreference: 1 | 2 | 3;
  interests: string[];
  dietary: string[];
  mobility: 'None' | 'Stroller' | 'Wheelchair';
  pace: 'Relaxed' | 'Balanced' | 'Fast-paced';
}): Itinerary {
  const dest = travelDatabase[inputs.destinationId];
  if (!dest) {
    throw new Error(`Destination ${inputs.destinationId} not found.`);
  }

  // Select Hotel based on budget level
  const matchedHotels = dest.hotels.filter(h => h.costLevel <= inputs.budgetPreference);
  const hotel = matchedHotels.length > 0 
    ? matchedHotels[matchedHotels.length - 1] 
    : dest.hotels[0];

  const plannedAttractionIds = new Set<string>();
  const days: DayItinerary[] = [];

  for (let d = 1; d <= inputs.daysCount; d++) {
    // Determine starting anchor (Hotel)
    let currentAnchor: { x: number; y: number } = hotel.coordinates;

    // 1. Breakfast (near hotel)
    const breakfast = selectDining(dest.dining, 'Breakfast', currentAnchor, inputs.dietary, inputs.budgetPreference);
    currentAnchor = breakfast.coordinates;

    // 2. Morning Attraction
    const morningAttraction = selectAttraction(
      dest.attractions,
      plannedAttractionIds,
      currentAnchor,
      inputs.interests,
      inputs.budgetPreference,
      inputs.mobility,
      inputs.pace
    );
    if (morningAttraction) plannedAttractionIds.add(morningAttraction.id);
    currentAnchor = morningAttraction ? morningAttraction.coordinates : currentAnchor;

    // 3. Lunch (near Morning Attraction)
    const lunch = selectDining(dest.dining, 'Lunch', currentAnchor, inputs.dietary, inputs.budgetPreference);
    currentAnchor = lunch.coordinates;

    // 4. Afternoon Attraction
    const afternoonAttraction = selectAttraction(
      dest.attractions,
      plannedAttractionIds,
      currentAnchor,
      inputs.interests,
      inputs.budgetPreference,
      inputs.mobility,
      inputs.pace
    );
    if (afternoonAttraction) plannedAttractionIds.add(afternoonAttraction.id);
    currentAnchor = afternoonAttraction ? afternoonAttraction.coordinates : currentAnchor;

    // 5. Dinner (near Afternoon Attraction)
    const dinner = selectDining(dest.dining, 'Dinner', currentAnchor, inputs.dietary, inputs.budgetPreference);
    currentAnchor = dinner.coordinates;

    // 6. Evening Attraction (low intensity or shopping/relaxation near Dinner)
    const eveningAttraction = selectAttraction(
      dest.attractions,
      plannedAttractionIds,
      currentAnchor,
      inputs.interests,
      inputs.budgetPreference,
      inputs.mobility,
      inputs.pace,
      true // low intensity preferred for evening
    );
    if (eveningAttraction) plannedAttractionIds.add(eveningAttraction.id);

    // Calculate transit sequences
    const transitBFtoM = morningAttraction ? getTransit(breakfast.coordinates, morningAttraction.coordinates) : undefined;
    const transitMtoL = morningAttraction ? getTransit(morningAttraction.coordinates, lunch.coordinates) : undefined;
    const transitLtoA = afternoonAttraction ? getTransit(lunch.coordinates, afternoonAttraction.coordinates) : undefined;
    const transitAtoD = afternoonAttraction ? getTransit(afternoonAttraction.coordinates, dinner.coordinates) : undefined;
    const transitDtoE = eveningAttraction ? getTransit(dinner.coordinates, eveningAttraction.coordinates) : undefined;
    const transitEtoH = eveningAttraction ? getTransit(eveningAttraction.coordinates, hotel.coordinates) : getTransit(dinner.coordinates, hotel.coordinates);

    // Define standard durations based on pace
    const isRelaxed = inputs.pace === 'Relaxed';
    const isFast = inputs.pace === 'Fast-paced';
    const actDurationMult = isRelaxed ? 1.3 : isFast ? 0.8 : 1.0;

    days.push({
      dayNumber: d,
      breakfast: {
        type: 'dining',
        restaurant: breakfast,
        durationMin: isRelaxed ? 60 : 45,
        transitToNext: transitBFtoM
      },
      morning: {
        type: 'attraction',
        activity: morningAttraction || dest.attractions[0],
        durationMin: Math.round((morningAttraction?.duration || 120) * actDurationMult),
        transitToNext: transitMtoL
      },
      lunch: {
        type: 'dining',
        restaurant: lunch,
        durationMin: isRelaxed ? 90 : 60,
        transitToNext: transitLtoA
      },
      afternoon: {
        type: 'attraction',
        activity: afternoonAttraction || dest.attractions[1],
        durationMin: Math.round((afternoonAttraction?.duration || 120) * actDurationMult),
        transitToNext: transitAtoD
      },
      dinner: {
        type: 'dining',
        restaurant: dinner,
        durationMin: isRelaxed ? 120 : 75,
        transitToNext: transitDtoE
      },
      evening: {
        type: 'attraction',
        activity: eveningAttraction || dest.attractions[2],
        durationMin: Math.round((eveningAttraction?.duration || 90) * actDurationMult),
        transitToNext: transitEtoH
      }
    });
  }

  // Calculate total initial cost
  const totalCost = calculateTotalCost(days, hotel, inputs.daysCount);

  return {
    destinationId: inputs.destinationId,
    days,
    hotel,
    budgetPreference: inputs.budgetPreference,
    interests: inputs.interests,
    dietary: inputs.dietary,
    mobility: inputs.mobility,
    pace: inputs.pace,
    totalCost
  };
}

// Total Cost calculator
export function calculateTotalCost(days: DayItinerary[], hotel: Hotel, daysCount: number): number {
  let cost = hotel.costApprox * daysCount;
  days.forEach(day => {
    // dining
    cost += day.breakfast.restaurant.costApprox;
    cost += day.lunch.restaurant.costApprox;
    cost += day.dinner.restaurant.costApprox;

    // activities
    cost += day.morning.activity.costApprox;
    cost += day.afternoon.activity.costApprox;
    cost += day.evening.activity.costApprox;

    // transits
    cost += day.breakfast.transitToNext?.costApprox || 0;
    cost += day.morning.transitToNext?.costApprox || 0;
    cost += day.lunch.transitToNext?.costApprox || 0;
    cost += day.afternoon.transitToNext?.costApprox || 0;
    cost += day.dinner.transitToNext?.costApprox || 0;
    cost += day.evening.transitToNext?.costApprox || 0;
  });
  return Math.round(cost);
}

// Select dining utility
function selectDining(
  dinings: Dining[],
  mealType: 'Breakfast' | 'Lunch' | 'Dinner',
  anchor: { x: number; y: number },
  dietaryConstraints: string[],
  budgetPref: 1 | 2 | 3
): Dining {
  const pool = dinings.filter(d => d.mealType === mealType);
  if (pool.length === 0) return dinings[0];

  // Scoring
  const scored = pool.map(item => {
    let score = 100;
    // Distance penalty
    const dist = calculateDistance(anchor, item.coordinates);
    score -= dist * 1.5;

    // Dietary match (crucial)
    dietaryConstraints.forEach(diet => {
      if (item.dietaryFlags.includes(diet)) {
        score += 50; // Boost
      } else {
        score -= 100; // Heavy penalty if it doesn't support requested constraint
      }
    });

    // Budget affinity
    const diff = Math.abs(item.costLevel - budgetPref);
    score -= diff * 15;

    return { item, score };
  });

  // Sort descending
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item;
}

// Select attraction utility
function selectAttraction(
  attractions: Attraction[],
  plannedIds: Set<string>,
  anchor: { x: number; y: number },
  interests: string[],
  budgetPref: 1 | 2 | 3,
  mobility: 'None' | 'Stroller' | 'Wheelchair',
  pace: 'Relaxed' | 'Balanced' | 'Fast-paced',
  preferLowIntensity: boolean = false
): Attraction | null {
  const pool = attractions.filter(a => !plannedIds.has(a.id));
  if (pool.length === 0) return null;

  const scored = pool.map(item => {
    let score = 100;
    // Distance penalty
    const dist = calculateDistance(anchor, item.coordinates);
    score -= dist * 1.0;

    // Interest category matches
    if (interests.includes(item.category)) {
      score += 40;
    }

    // Budget match
    if (item.costLevel <= budgetPref) {
      score += 15;
    } else {
      score -= (item.costLevel - budgetPref) * 25; // penalty for overbudget
    }

    // Exertion / intensity preferences
    if (mobility !== 'None') {
      if (item.intensity === 'High') score -= 80;
      if (item.intensity === 'Medium') score -= 25;
    }

    if (preferLowIntensity) {
      if (item.intensity === 'Low') score += 30;
      if (item.intensity === 'High') score -= 50;
    } else {
      // Pace adjustments
      if (pace === 'Relaxed' && item.intensity === 'High') {
        score -= 20;
      }
      if (pace === 'Fast-paced' && item.intensity === 'Low') {
        score -= 10;
      }
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.item || null;
}

// Recalculate/Re-optimize Itinerary on Event Trigger
export function recalculateItinerary(
  itinerary: Itinerary,
  eventType: 'WEATHER' | 'TRAFFIC' | 'CROWD' | 'BUDGET',
  activeDay: number,
  isTriggered: boolean
): { updatedItinerary: Itinerary; logs: string[] } {
  const logs: string[] = [];
  // Deep copy the itinerary
  const updated: Itinerary = JSON.parse(JSON.stringify(itinerary));
  const dest = travelDatabase[updated.destinationId];
  if (!dest) return { updatedItinerary: itinerary, logs: ['Destination error'] };

  if (eventType === 'WEATHER') {
    if (isTriggered) {
      logs.push(`⛈️ Weather Event Triggered: Rain storm in ${dest.name}!`);
      // For the active day, swap outdoor activities with indoor ones
      const day = updated.days.find(d => d.dayNumber === activeDay);
      if (day) {
        // Collect currently planned activities across all days to avoid repeats
        const plannedIds = new Set<string>();
        updated.days.forEach(d => {
          plannedIds.add(d.morning.activity.id);
          plannedIds.add(d.afternoon.activity.id);
          plannedIds.add(d.evening.activity.id);
        });

        const slots: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
        slots.forEach(slotKey => {
          const slot = day[slotKey];
          if (!slot.activity.isIndoor) {
            // Find an indoor replacement
            const replacement = dest.attractions.find(
              a => a.isIndoor && !plannedIds.has(a.id)
            );
            if (replacement) {
              logs.push(`🔄 Swapped outdoor attraction "${slot.activity.name}" with indoor attraction "${replacement.name}" due to rain.`);
              plannedIds.delete(slot.activity.id);
              plannedIds.add(replacement.id);
              slot.activity = replacement;
            }
          }
        });

        // Recalculate transits for this day because activities might have changed, and weather changes walking to transit/cabs
        recalculateDayTransits(day, updated.hotel, true, false);
        logs.push(`🚗 Heavy rain detected: Swapped all Walking transits to Subway/Cabs.`);
      }
    } else {
      logs.push(`☀️ Weather Cleared: Rain storm ended. Restoring standard itineraries.`);
      // Restore standard transit/attractions from base engine config
      const original = generateItinerary({
        destinationId: updated.destinationId,
        daysCount: updated.days.length,
        budgetPreference: updated.budgetPreference,
        interests: updated.interests,
        dietary: updated.dietary,
        mobility: updated.mobility,
        pace: updated.pace
      });
      return { updatedItinerary: original, logs };
    }
  }

  if (eventType === 'TRAFFIC') {
    const day = updated.days.find(d => d.dayNumber === activeDay);
    if (day) {
      if (isTriggered) {
        logs.push(`🚦 Traffic Jam Alert: Gridlock reported on main expressways.`);
        // Recalculate transits with heavy traffic flag
        recalculateDayTransits(day, updated.hotel, false, true);
        
        // Shrink activity durations so total schedule doesn't run too late
        day.morning.durationMin = Math.max(45, Math.round(day.morning.durationMin * 0.75));
        day.afternoon.durationMin = Math.max(45, Math.round(day.afternoon.durationMin * 0.75));
        day.evening.durationMin = Math.max(45, Math.round(day.evening.durationMin * 0.75));
        
        logs.push(`⏳ Traffic delay added (+40m travel time). Shortened activity durations to keep the day on-schedule.`);
      } else {
        logs.push(`🟢 Traffic Cleared: Road conditions returned to normal.`);
        recalculateDayTransits(day, updated.hotel, false, false);
        // Restore durations
        const original = generateItinerary({
          destinationId: updated.destinationId,
          daysCount: updated.days.length,
          budgetPreference: updated.budgetPreference,
          interests: updated.interests,
          dietary: updated.dietary,
          mobility: updated.mobility,
          pace: updated.pace
        });
        const origDay = original.days.find(d => d.dayNumber === activeDay);
        if (origDay) {
          day.morning.durationMin = origDay.morning.durationMin;
          day.afternoon.durationMin = origDay.afternoon.durationMin;
          day.evening.durationMin = origDay.evening.durationMin;
        }
      }
    }
  }

  if (eventType === 'CROWD') {
    const day = updated.days.find(d => d.dayNumber === activeDay);
    if (day && isTriggered) {
      // Crowd warning for afternoon activity
      const crowdedActivity = day.afternoon.activity;
      logs.push(`⚠️ Crowd Warning: Ticket queues at "${crowdedActivity.name}" exceed 2 hours.`);
      
      const plannedIds = new Set<string>();
      updated.days.forEach(d => {
        plannedIds.add(d.morning.activity.id);
        plannedIds.add(d.afternoon.activity.id);
        plannedIds.add(d.evening.activity.id);
      });

      // Swap the afternoon activity with a quiet nature/relaxation activity (park/gardens)
      const replacement = dest.attractions.find(
        a => (a.category === 'Nature' || a.category === 'Relaxation') && !plannedIds.has(a.id)
      );

      if (replacement) {
        logs.push(`🔄 Rescheduled crowded "${crowdedActivity.name}" to off-peak slot later and substituted with serene "${replacement.name}".`);
        day.afternoon.activity = replacement;
        recalculateDayTransits(day, updated.hotel, false, false);
      } else {
        logs.push(`⚠️ No alternative low-crowd attraction available in database.`);
      }
    } else if (day && !isTriggered) {
      logs.push(`🟢 Crowd Alerts Resolved: Normal queues restored.`);
      const original = generateItinerary({
        destinationId: updated.destinationId,
        daysCount: updated.days.length,
        budgetPreference: updated.budgetPreference,
        interests: updated.interests,
        dietary: updated.dietary,
        mobility: updated.mobility,
        pace: updated.pace
      });
      const origDay = original.days.find(d => d.dayNumber === activeDay);
      if (origDay) {
        day.afternoon.activity = origDay.afternoon.activity;
        recalculateDayTransits(day, updated.hotel, false, false);
      }
    }
  }

  if (eventType === 'BUDGET') {
    if (isTriggered) {
      logs.push(`📉 Budget Shield Activated: Running cost optimizer to trim expenses.`);
      
      // Let's sweep ALL days and swap high-cost elements
      updated.days.forEach(day => {
        // Swap high cost lunch/dinner with budget options (costLevel = 1)
        if (day.lunch.restaurant.costLevel > 1) {
          const cheaperLunch = dest.dining.find(
            d => d.mealType === 'Lunch' && d.costLevel === 1 && matchesDietary(d.dietaryFlags, updated.dietary)
          );
          if (cheaperLunch && cheaperLunch.id !== day.lunch.restaurant.id) {
            logs.push(`🍽️ Swapped premium lunch "${day.lunch.restaurant.name}" with local eats "${cheaperLunch.name}" ($).`);
            day.lunch.restaurant = cheaperLunch;
          }
        }
        if (day.dinner.restaurant.costLevel > 1) {
          const cheaperDinner = dest.dining.find(
            d => d.mealType === 'Dinner' && d.costLevel === 1 && matchesDietary(d.dietaryFlags, updated.dietary)
          );
          if (cheaperDinner && cheaperDinner.id !== day.dinner.restaurant.id) {
            logs.push(`🍽️ Swapped luxury dinner "${day.dinner.restaurant.name}" with budget diner "${cheaperDinner.name}" ($).`);
            day.dinner.restaurant = cheaperDinner;
          }
        }

        // Swap expensive activities (costLevel 3) with free/cheaper ones
        const slots: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
        slots.forEach(slotKey => {
          const slot = day[slotKey];
          if (slot.activity.costLevel === 3) {
            // Find cheaper attraction
            const cheaperAttraction = dest.attractions.find(
              a => a.costLevel < 3 && a.id !== slot.activity.id
            );
            if (cheaperAttraction) {
              logs.push(`🎟️ Substituted expensive "${slot.activity.name}" with budget-friendly "${cheaperAttraction.name}".`);
              slot.activity = cheaperAttraction;
            }
          }
        });

        recalculateDayTransits(day, updated.hotel, false, false);
      });
    } else {
      logs.push(`📈 Budget Shield Deactivated: Reverted itinerary to user preferred quality tier.`);
      const original = generateItinerary({
        destinationId: updated.destinationId,
        daysCount: updated.days.length,
        budgetPreference: updated.budgetPreference,
        interests: updated.interests,
        dietary: updated.dietary,
        mobility: updated.mobility,
        pace: updated.pace
      });
      return { updatedItinerary: original, logs };
    }
  }

  // Recalculate total cost at the end
  updated.totalCost = calculateTotalCost(updated.days, updated.hotel, updated.days.length);
  return { updatedItinerary: updated, logs };
}

// Local helper to check if dining options match dietary constraints
function matchesDietary(restaurantDiets: string[], userDiets: string[]): boolean {
  return userDiets.every(diet => restaurantDiets.includes(diet));
}

// Recalculate transits for a single day based on current activity assignments
function recalculateDayTransits(
  day: DayItinerary,
  hotel: Hotel,
  isRainy: boolean,
  isHeavyTraffic: boolean
) {
  day.breakfast.transitToNext = getTransit(day.breakfast.restaurant.coordinates, day.morning.activity.coordinates, isRainy, isHeavyTraffic);
  day.morning.transitToNext = getTransit(day.morning.activity.coordinates, day.lunch.restaurant.coordinates, isRainy, isHeavyTraffic);
  day.lunch.transitToNext = getTransit(day.lunch.restaurant.coordinates, day.afternoon.activity.coordinates, isRainy, isHeavyTraffic);
  day.afternoon.transitToNext = getTransit(day.afternoon.activity.coordinates, day.dinner.restaurant.coordinates, isRainy, isHeavyTraffic);
  day.dinner.transitToNext = getTransit(day.dinner.restaurant.coordinates, day.evening.activity.coordinates, isRainy, isHeavyTraffic);
  day.evening.transitToNext = getTransit(day.evening.activity.coordinates, hotel.coordinates, isRainy, isHeavyTraffic);
}
