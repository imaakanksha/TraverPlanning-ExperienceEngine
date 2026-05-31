import math
import copy
from travel_db import travel_database

def haversine_distance(coord1, coord2):
    """Calculate actual distance in km between two lat/lon coordinates."""
    lat1, lon1 = coord1['lat'], coord1['lon']
    lat2, lon2 = coord2['lat'], coord2['lon']
    R = 6371.0  # Earth's radius in km
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def get_transit(coord1, coord2, is_rainy=False, is_heavy_traffic=False):
    """Determine transit recommendation details based on geographical distance."""
    dist_km = haversine_distance(coord1, coord2)
    
    mode = 'Walking'
    duration_min = 0
    cost = 0.0
    
    if dist_km < 1.0 and not is_rainy:
        mode = 'Walking'
        duration_min = max(2, round(dist_km * 16))  # ~16 min/km walking pace
        cost = 0.0
    elif dist_km < 5.0:
        mode = 'Subway'
        duration_min = round(8 + dist_km * 3)
        cost = 2.50
    else:
        mode = 'Taxi'
        duration_min = round(6 + dist_km * 3.5)
        cost = round(5.0 + dist_km * 1.8, 1)
        
    if is_rainy and mode == 'Walking':
        mode = 'Subway'
        duration_min = round(8 + dist_km * 3)
        cost = 2.50
        
    if is_heavy_traffic:
        if mode == 'Taxi':
            duration_min = round(duration_min * 1.8)
            cost = round(cost * 1.35, 1)
        elif mode == 'Subway':
            duration_min = round(duration_min * 1.15)
        elif mode == 'Walking':
            duration_min = round(duration_min * 1.05)
            
    return {
        'mode': mode,
        'duration_min': duration_min,
        'cost_approx': cost
    }

def select_dining(dinings, meal_type, anchor, dietary_constraints, budget_pref):
    pool = [d for d in dinings if d['meal_type'] == meal_type]
    if not pool:
        return dinings[0]
        
    scored = []
    for item in pool:
        score = 100.0
        # Distance penalty
        dist = haversine_distance(anchor, item['coordinates'])
        score -= dist * 4.0  # penalize distance in km
        
        # Dietary match
        for diet in dietary_constraints:
            if diet in item['dietary_flags']:
                score += 50.0
            else:
                score -= 100.0
                
        # Budget affinity
        diff = abs(item['cost_level'] - budget_pref)
        score -= diff * 15.0
        
        scored.append((item, score))
        
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0]

def select_attraction(attractions, planned_ids, anchor, interests, budget_pref, mobility, pace, prefer_low_intensity=False):
    pool = [a for a in attractions if a['id'] not in planned_ids]
    if not pool:
        return None
        
    scored = []
    for item in pool:
        score = 100.0
        # Distance penalty
        dist = haversine_distance(anchor, item['coordinates'])
        score -= dist * 3.0
        
        # Interest category
        if item['category'] in interests:
            score += 40.0
            
        # Budget tier
        if item['cost_level'] <= budget_pref:
            score += 15.0
        else:
            score -= (item['cost_level'] - budget_pref) * 30.0
            
        # Exertion/Mobility constraints
        if mobility != 'None':
            if item['intensity'] == 'High':
                score -= 80.0
            if item['intensity'] == 'Medium':
                score -= 30.0
                
        if prefer_low_intensity:
            if item['intensity'] == 'Low':
                score += 30.0
            if item['intensity'] == 'High':
                score -= 60.0
        else:
            if pace == 'Relaxed' and item['intensity'] == 'High':
                score -= 20.0
            if pace == 'Fast-paced' and item['intensity'] == 'Low':
                score -= 10.0
                
        scored.append((item, score))
        
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0] if scored else None

def calculate_total_cost(days, hotel, days_count):
    cost = hotel['cost_approx'] * days_count
    for day in days:
        cost += day['breakfast']['restaurant']['cost_approx']
        cost += day['lunch']['restaurant']['cost_approx']
        cost += day['dinner']['restaurant']['cost_approx']
        cost += day['morning']['activity']['cost_approx']
        cost += day['afternoon']['activity']['cost_approx']
        cost += day['evening']['activity']['cost_approx']
        
        cost += day['breakfast'].get('transit_to_next', {}).get('cost_approx', 0.0)
        cost += day['morning'].get('transit_to_next', {}).get('cost_approx', 0.0)
        cost += day['lunch'].get('transit_to_next', {}).get('cost_approx', 0.0)
        cost += day['afternoon'].get('transit_to_next', {}).get('cost_approx', 0.0)
        cost += day['dinner'].get('transit_to_next', {}).get('cost_approx', 0.0)
        cost += day['evening'].get('transit_to_next', {}).get('cost_approx', 0.0)
        
    return round(cost)

def generate_itinerary(inputs):
    dest_id = inputs['destination_id']
    days_count = inputs['days_count']
    budget_preference = inputs['budget_preference']
    interests = inputs['interests']
    dietary = inputs['dietary']
    mobility = inputs['mobility']
    pace = inputs['pace']
    
    dest = travel_database.get(dest_id)
    if not dest:
        raise ValueError(f"Destination {dest_id} not found.")
        
    # Select hotel based on budget level
    matched_hotels = [h for h in dest['hotels'] if h['cost_level'] <= budget_preference]
    hotel = matched_hotels[-1] if matched_hotels else dest['hotels'][0]
    
    planned_attraction_ids = set()
    days = []
    
    for d in range(1, days_count + 1):
        current_anchor = hotel['coordinates']
        
        # 1. Breakfast
        breakfast = select_dining(dest['dining'], 'Breakfast', current_anchor, dietary, budget_preference)
        current_anchor = breakfast['coordinates']
        
        # 2. Morning Attraction
        morning = select_attraction(dest['attractions'], planned_attraction_ids, current_anchor, interests, budget_preference, mobility, pace)
        if morning:
            planned_attraction_ids.add(morning['id'])
        else:
            morning = dest['attractions'][0]
        current_anchor = morning['coordinates']
        
        # 3. Lunch
        lunch = select_dining(dest['dining'], 'Lunch', current_anchor, dietary, budget_preference)
        current_anchor = lunch['coordinates']
        
        # 4. Afternoon Attraction
        afternoon = select_attraction(dest['attractions'], planned_attraction_ids, current_anchor, interests, budget_preference, mobility, pace)
        if afternoon:
            planned_attraction_ids.add(afternoon['id'])
        else:
            afternoon = dest['attractions'][1]
        current_anchor = afternoon['coordinates']
        
        # 5. Dinner
        dinner = select_dining(dest['dining'], 'Dinner', current_anchor, dietary, budget_preference)
        current_anchor = dinner['coordinates']
        
        # 6. Evening Attraction
        evening = select_attraction(dest['attractions'], planned_attraction_ids, current_anchor, interests, budget_preference, mobility, pace, prefer_low_intensity=True)
        if evening:
            planned_attraction_ids.add(evening['id'])
        else:
            evening = dest['attractions'][2]
            
        # Transit sequences
        t_bf_m = get_transit(breakfast['coordinates'], morning['coordinates'])
        t_m_l = get_transit(morning['coordinates'], lunch['coordinates'])
        t_l_a = get_transit(lunch['coordinates'], afternoon['coordinates'])
        t_a_d = get_transit(afternoon['coordinates'], dinner['coordinates'])
        t_d_e = get_transit(dinner['coordinates'], evening['coordinates'])
        t_e_h = get_transit(evening['coordinates'], hotel['coordinates'])
        
        # Durations based on pace
        duration_mult = 1.3 if pace == 'Relaxed' else (0.8 if pace == 'Fast-paced' else 1.0)
        
        days.append({
            'day_number': d,
            'breakfast': {
                'type': 'dining',
                'restaurant': breakfast,
                'duration_min': 60 if pace == 'Relaxed' else 45,
                'transit_to_next': t_bf_m
            },
            'morning': {
                'type': 'attraction',
                'activity': morning,
                'duration_min': round(morning['duration'] * duration_mult),
                'transit_to_next': t_m_l
            },
            'lunch': {
                'type': 'dining',
                'restaurant': lunch,
                'duration_min': 90 if pace == 'Relaxed' else 60,
                'transit_to_next': t_l_a
            },
            'afternoon': {
                'type': 'attraction',
                'activity': afternoon,
                'duration_min': round(afternoon['duration'] * duration_mult),
                'transit_to_next': t_a_d
            },
            'dinner': {
                'type': 'dining',
                'restaurant': dinner,
                'duration_min': 120 if pace == 'Relaxed' else 75,
                'transit_to_next': t_d_e
            },
            'evening': {
                'type': 'attraction',
                'activity': evening,
                'duration_min': round(evening['duration'] * duration_mult),
                'transit_to_next': t_e_h
            }
        })
        
    total_cost = calculate_total_cost(days, hotel, days_count)
    
    return {
        'destination_id': dest_id,
        'days': days,
        'hotel': hotel,
        'budget_preference': budget_preference,
        'interests': interests,
        'dietary': dietary,
        'mobility': mobility,
        'pace': pace,
        'total_cost': total_cost
    }

def matches_dietary(restaurant_diets, user_diets):
    return all(diet in restaurant_diets for diet in user_diets)

def recalculate_day_transits(day, hotel, is_rainy, is_heavy_traffic):
    day['breakfast']['transit_to_next'] = get_transit(day['breakfast']['restaurant']['coordinates'], day['morning']['activity']['coordinates'], is_rainy, is_heavy_traffic)
    day['morning']['transit_to_next'] = get_transit(day['morning']['activity']['coordinates'], day['lunch']['restaurant']['coordinates'], is_rainy, is_heavy_traffic)
    day['lunch']['transit_to_next'] = get_transit(day['lunch']['restaurant']['coordinates'], day['afternoon']['activity']['coordinates'], is_rainy, is_heavy_traffic)
    day['afternoon']['transit_to_next'] = get_transit(day['afternoon']['activity']['coordinates'], day['dinner']['restaurant']['coordinates'], is_rainy, is_heavy_traffic)
    day['dinner']['transit_to_next'] = get_transit(day['dinner']['restaurant']['coordinates'], day['evening']['activity']['coordinates'], is_rainy, is_heavy_traffic)
    day['evening']['transit_to_next'] = get_transit(day['evening']['activity']['coordinates'], hotel['coordinates'], is_rainy, is_heavy_traffic)

def recalculate_itinerary(itinerary, event_type, active_day, is_triggered):
    logs = []
    updated = copy.deepcopy(itinerary)
    dest = travel_database.get(updated['destination_id'])
    if not dest:
        return itinerary, ["Error: destination not resolved."]
        
    if event_type == 'WEATHER':
        if is_triggered:
            logs.append(f"⛈️ Weather Event Active: Heavy rain in {dest['name']}!")
            day = next((d for d in updated['days'] if d['day_number'] == active_day), None)
            if day:
                planned_ids = set()
                for d in updated['days']:
                    planned_ids.add(d['morning']['activity']['id'])
                    planned_ids.add(d['afternoon']['activity']['id'])
                    planned_ids.add(d['evening']['activity']['id'])
                    
                slots = ['morning', 'afternoon', 'evening']
                for slot_key in slots:
                    slot = day[slot_key]
                    if not slot['activity']['is_indoor']:
                        replacement = next((a for a in dest['attractions'] if a['is_indoor'] and a['id'] not in planned_ids), None)
                        if replacement:
                            logs.append(f"🔄 Rain Swap: Swapped outdoor '{slot['activity']['name']}' with indoor '{replacement['name']}'.")
                            planned_ids.remove(slot['activity']['id'])
                            planned_ids.add(replacement['id'])
                            slot['activity'] = replacement
                            
                recalculate_day_transits(day, updated['hotel'], True, False)
                logs.append("🚗 Road Status: Heavy rain. Swapped walking transits to subway/cabs.")
        else:
            logs.append("☀️ Weather Cleared: Restoring original outdoor selections.")
            original = generate_itinerary(updated)
            return original, logs
            
    elif event_type == 'TRAFFIC':
        day = next((d for d in updated['days'] if d['day_number'] == active_day), None)
        if day:
            if is_triggered:
                logs.append("🚦 Traffic Alert: Major gridlocks reported on bypasses.")
                recalculate_day_transits(day, updated['hotel'], False, True)
                
                day['morning']['duration_min'] = max(45, round(day['morning']['duration_min'] * 0.75))
                day['afternoon']['duration_min'] = max(45, round(day['afternoon']['duration_min'] * 0.75))
                day['evening']['duration_min'] = max(45, round(day['evening']['duration_min'] * 0.75))
                
                logs.append("⏳ Delay applied (+40m travel time). Activity durations compressed to stay on-schedule.")
            else:
                logs.append("🟢 Traffic Cleared: Road conditions normal.")
                recalculate_day_transits(day, updated['hotel'], False, False)
                original = generate_itinerary(updated)
                orig_day = next((d for d in original['days'] if d['day_number'] == active_day), None)
                if orig_day:
                    day['morning']['duration_min'] = orig_day['morning']['duration_min']
                    day['afternoon']['duration_min'] = orig_day['afternoon']['duration_min']
                    day['evening']['duration_min'] = orig_day['evening']['duration_min']
                    
    elif event_type == 'CROWD':
        day = next((d for d in updated['days'] if d['day_number'] == active_day), None)
        if day:
            if is_triggered:
                crowded = day['afternoon']['activity']
                logs.append(f"⚠️ Crowd Warning: Ticket lines at '{crowded['name']}' exceed 2 hours.")
                
                planned_ids = set()
                for d in updated['days']:
                    planned_ids.add(d['morning']['activity']['id'])
                    planned_ids.add(d['afternoon']['activity']['id'])
                    planned_ids.add(d['evening']['activity']['id'])
                    
                replacement = next((a for a in dest['attractions'] if a['category'] in ['Nature', 'Relaxation'] and a['id'] not in planned_ids), None)
                if replacement:
                    logs.append(f"🔄 Queue Swap: Substituted crowded '{crowded['name']}' with serene '{replacement['name']}'.")
                    day['afternoon']['activity'] = replacement
                    recalculate_day_transits(day, updated['hotel'], False, False)
                else:
                    logs.append("⚠️ No alternative low-exertion attraction found in DB.")
            else:
                logs.append("🟢 Crowd alerts resolved. Queue times nominal.")
                original = generate_itinerary(updated)
                orig_day = next((d for d in original['days'] if d['day_number'] == active_day), None)
                if orig_day:
                    day['afternoon']['activity'] = orig_day['afternoon']['activity']
                    recalculate_day_transits(day, updated['hotel'], False, False)
                    
    elif event_type == 'BUDGET':
        if is_triggered:
            logs.append("📉 Budget Shield Activated: Trimming extra expenses.")
            for day in updated['days']:
                # Swap lunch
                if day['lunch']['restaurant']['cost_level'] > 1:
                    cheaper = next((d for d in dest['dining'] if d['meal_type'] == 'Lunch' and d['cost_level'] == 1 and matches_dietary(d['dietary_flags'], updated['dietary'])), None)
                    if cheaper and cheaper['id'] != day['lunch']['restaurant']['id']:
                        logs.append(f"🍽️ Dining Swap: Replaced fancy lunch '{day['lunch']['restaurant']['name']}' with street food '{cheaper['name']}' ($).")
                        day['lunch']['restaurant'] = cheaper
                        
                # Swap dinner
                if day['dinner']['restaurant']['cost_level'] > 1:
                    cheaper = next((d for d in dest['dining'] if d['meal_type'] == 'Dinner' and d['cost_level'] == 1 and matches_dietary(d['dietary_flags'], updated['dietary'])), None)
                    if cheaper and cheaper['id'] != day['dinner']['restaurant']['id']:
                        logs.append(f"🍽️ Dining Swap: Replaced premium dinner '{day['dinner']['restaurant']['name']}' with budget bistro '{cheaper['name']}' ($).")
                        day['dinner']['restaurant'] = cheaper
                        
                # Swap expensive activities
                for slot_key in ['morning', 'afternoon', 'evening']:
                    slot = day[slot_key]
                    if slot['activity']['cost_level'] == 3:
                        cheaper = next((a for a in dest['attractions'] if a['cost_level'] < 3 and a['id'] != slot['activity']['id']), None)
                        if cheaper:
                            logs.append(f"🎟️ Ticket Swap: Replaced premium sight '{slot['activity']['name']}' with budget-friendly '{cheaper['name']}'.")
                            slot['activity'] = cheaper
                            
                recalculate_day_transits(day, updated['hotel'], False, False)
        else:
            logs.append("📈 Budget Shield Deactivated: Restoring standard package configurations.")
            original = generate_itinerary(updated)
            return original, logs
            
    updated['total_cost'] = calculate_total_cost(updated['days'], updated['hotel'], len(updated['days']))
    return updated, logs
