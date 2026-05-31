import streamlit as st
import pandas as pd
import altair as alt
import pydeck as pdk
from travel_db import travel_database, simulator_events
from scheduler import generate_itinerary, recalculate_itinerary, haversine_distance, get_transit

# Page configuration
st.set_page_config(
    page_title="Traverse Engine - Dynamic Trip Architect",
    page_icon="🗺️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom premium styling rules
st.markdown("""
<style>
    /* Premium visual overrides */
    .stApp {
        background-color: #0d0d12 !important;
        color: #f4f4f7 !important;
    }
    .stSidebar {
        background-color: #12121a !important;
        border-right: 1px solid #232330 !important;
    }
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Outfit', sans-serif !important;
    }
    /* Polaroid image frame */
    .polaroid {
        background: #ffffff;
        padding: 8px 8px 16px 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        border-radius: 4px;
        text-align: center;
        color: #18181b;
        margin-bottom: 12px;
        transform: rotate(-1.5deg);
    }
    .polaroid-label {
        font-size: 0.75rem;
        font-weight: 700;
        margin-top: 4px;
    }
    .badge-label {
        background-color: #232330;
        border: 1px solid #3c3c54;
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 0.72rem;
        font-weight: 600;
        display: inline-block;
        margin-right: 4px;
    }
</style>
""", unsafe_allowed_code_html=True)

# Initialize Session State
if 'itinerary' not in st.session_state:
    st.session_state.itinerary = None
if 'active_day' not in st.session_state:
    st.session_state.active_day = 1
if 'sim_time_slot' not in st.session_state:
    st.session_state.sim_time_slot = 'morning'
if 'is_simulating' not in st.session_state:
    st.session_state.is_simulating = False
if 'triggered_events' not in st.session_state:
    st.session_state.triggered_events = {'WEATHER': False, 'TRAFFIC': False, 'CROWD': False, 'BUDGET': False}
if 'recalc_logs' not in st.session_state:
    st.session_state.recalc_logs = []
if 'journal_entries' not in st.session_state:
    st.session_state.journal_entries = {}

# Sidebar Wizard Inputs
with st.sidebar:
    st.image("https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&auto=format&fit=crop&q=80", use_container_width=True)
    st.title("🗺️ Traverse Engine")
    st.caption("Dynamic Preference Scheduler & Experience Simulator")
    st.markdown("---")
    
    with st.form("wizard_form"):
        dest_options = {travel_database[k]['name']: k for k in travel_database}
        selected_dest_name = st.selectbox("Where to go?", list(dest_options.keys()))
        destination_id = dest_options[selected_dest_name]
        
        days_count = st.slider("Duration (Days)", min_value=1, max_value=5, value=3)
        
        budget_pref = st.radio(
            "Budget Level",
            options=[1, 2, 3],
            format_func=lambda x: "Budget ($)" if x == 1 else ("Mid-range ($$)" if x == 2 else "Luxury ($$$)")
        )
        
        pace = st.selectbox("Travel Tempo", ["Relaxed", "Balanced", "Fast-paced"], index=1)
        
        interests = st.multiselect(
            "Interests",
            ["Culture", "Nature", "Adventure", "Relaxation", "Shopping", "Food", "Historic"],
            default=["Culture", "Nature"]
        )
        
        dietary = st.multiselect("Dietary Requirements", ["Vegan", "Halal", "Gluten-Free"])
        
        mobility = st.selectbox("Mobility Access", ["None", "Stroller", "Wheelchair"])
        
        generate_btn = st.form_submit_button("Compile Route Package 🚀")
        
    if generate_btn:
        inputs = {
            'destination_id': destination_id,
            'days_count': days_count,
            'budget_preference': budget_pref,
            'interests': interests,
            'dietary': dietary,
            'mobility': mobility,
            'pace': pace
        }
        try:
            itinerary = generate_itinerary(inputs)
            st.session_state.itinerary = itinerary
            st.session_state.active_day = 1
            st.session_state.sim_time_slot = 'morning'
            st.session_state.is_simulating = False
            st.session_state.triggered_events = {'WEATHER': False, 'TRAFFIC': False, 'CROWD': False, 'BUDGET': False}
            st.session_state.journal_entries = {}
            st.session_state.recalc_logs = [
                f"✨ Compiled route package for {itinerary['destination_id'].upper()}!",
                f"🏨 Hotel check-in: {itinerary['hotel']['name']}",
                f"💰 Total cost estimated: ${itinerary['total_cost']}",
                "🚦 Engine status: Proximity mapping generated. Ready for tracking."
            ]
            st.toast("Itinerary compiled successfully!", icon="🌍")
        except Exception as e:
            st.error(f"Error compiling itinerary: {e}")
            
    if st.session_state.itinerary:
        st.markdown("---")
        if st.button("🗑️ Discard & Plan New"):
            st.session_state.itinerary = None
            st.session_state.is_simulating = False
            st.rerun()

# Main Screen Panel Layout
if not st.session_state.itinerary:
    st.markdown("""
    # ✈️ Dynamic Trip Architect
    Welcome to the **Traverse Experience Engine**. Define your preferences in the sidebar wizard and click **Compile Route Package** to construct a customized multi-day itinerary.
    
    ### ⚙️ Engine Core Capabilities:
    *   **Proximity Routing:** Arranges hotels, sights, and dinings geographically to minimize transit delays.
    *   **Alert Re-Optimization:** Dynamically adjusts upcoming activities and transits under rain, traffic gridlocks, or queue crowds in the simulator panel.
    *   **Constraint Safeguard:** Avoids high exertion sights for mobility options and maps dietary flags to restaurants.
    """)
else:
    itinerary = st.session_state.itinerary
    dest_data = travel_database[itinerary['destination_id']]
    
    st.title(f"📍 Explorer Workspace: {dest_data['name']}")
    st.markdown(f"*{dest_data['description']}*")
    st.markdown("---")
    
    # Navigation tabs
    tab_timeline, tab_map, tab_simulator, tab_analytics, tab_journal = st.tabs([
        "📅 Timeline Itinerary",
        "🗺️ Route Map",
        "⚡ Event Simulator",
        "📊 Cost Analytics",
        "📓 stamps Journal"
    ])
    
    # Active day schedule
    day = next((d for d in itinerary['days'] if d['day_number'] == st.session_state.active_day), itinerary['days'][0])
    
    with tab_timeline:
        col_summary, col_days = st.columns([3, 1])
        
        with col_summary:
            st.subheader(f"Schedule: Day {st.session_state.active_day} of {len(itinerary['days'])}")
            
            # Days selectors row
            day_btns = st.columns(len(itinerary['days']))
            for idx, d_btn in enumerate(day_btns):
                d_num = idx + 1
                if d_btn.button(f"Day {d_num}", key=f"d_tab_{d_num}", use_container_width=True):
                    st.session_state.active_day = d_num
                    st.rerun()
                    
        with col_days:
            # Budget display card
            st.metric("Estimated Cost", f"${itinerary['total_cost']}", help="Includes lodging, meals, entry tickets, and transit fares.")
            
        st.markdown("---")
        
        # Display chronological timeline slots
        slots_list = [
            ('Breakfast', day['breakfast'], 'breakfast'),
            ('Morning Sight', day['morning'], 'morning'),
            ('Lunch Break', day['lunch'], 'lunch'),
            ('Afternoon Sight', day['afternoon'], 'afternoon'),
            ('Dinner Time', day['dinner'], 'dinner'),
            ('Evening Sight', day['evening'], 'evening')
        ]
        
        for slot_title, slot_data, slot_key in slots_list:
            is_active_sim = st.session_state.is_simulating and st.session_state.sim_time_slot == slot_key
            border_css = "border: 2px solid hsl(322, 80%, 55%); background-color: #1a121e;" if is_active_sim else "border: 1px solid #232330; background-color: #12121a;"
            
            with st.container():
                st.markdown(f"""
                <div style="padding: 16px; border-radius: 8px; margin-bottom: 12px; {border_css}">
                    <span style="color: #8a4bf1; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">{slot_title}</span>
                """, unsafe_allowed_code_html=True)
                
                col_c1, col_c2 = st.columns([4, 1])
                
                if slot_data['type'] == 'dining':
                    rest = slot_data['restaurant']
                    with col_c1:
                        st.markdown(f"#### 🍴 {rest['name']}")
                        st.write(rest['description'])
                        diets_str = " ".join([f"<span class='badge-label'>{f}</span>" for f in rest['dietary_flags']])
                        st.markdown(diets_str, unsafe_allowed_code_html=True)
                    with col_c2:
                        st.write(f"**Est. Price:** ${rest['cost_approx']}")
                else:
                    act = slot_data['activity']
                    with col_c1:
                        st.markdown(f"#### 🎭 {act['name']}")
                        st.write(act['description'])
                        st.markdown(f"""
                        <span class="badge-label" style="color: #c084fc;">{act['category']}</span>
                        <span class="badge-label">{act['intensity']} Intensity</span>
                        <span class="badge-label">{'Indoor' if act['is_indoor'] else 'Outdoor'}</span>
                        """, unsafe_allowed_code_html=True)
                        if act['tips']:
                            st.info(f"💡 Tip: {act['tips']}")
                    with col_c2:
                        st.write(f"**Duration:** {slot_data['duration_min']} mins")
                        st.write(f"**Ticket Fee:** ${act['cost_approx']}" if act['cost_approx'] > 0 else "**Free Entrance**")
                        
                        # Swap activity option
                        alternatives = [a for a in dest_data['attractions'] if a['id'] not in [
                            day['morning']['activity']['id'], day['afternoon']['activity']['id'], day['evening']['activity']['id']
                        ]]
                        if alternatives:
                            with st.popover("🔄 Swap Slot"):
                                st.write("Choose an alternative attraction:")
                                alt_options = {a['name']: a for a in alternatives}
                                select_alt = st.selectbox("Sights available:", list(alt_options.keys()), key=f"sel_alt_{slot_key}")
                                if st.button("Confirm Swap", key=f"conf_alt_{slot_key}"):
                                    rep = alt_options[select_alt]
                                    slot_data['activity'] = rep
                                    
                                    # Recalculate transits
                                    recalculate_day_transits(day, itinerary['hotel'], st.session_state.triggered_events['WEATHER'], st.session_state.triggered_events['TRAFFIC'])
                                    itinerary['total_cost'] = calculate_total_cost(itinerary['days'], itinerary['hotel'], len(itinerary['days']))
                                    st.session_state.recalc_logs.append(f"🔄 User Swap: Swapped slot '{slot_title}' with '{rep['name']}'.")
                                    st.toast("Itinerary updated!", icon="🔄")
                                    st.rerun()
                                    
                # Transit block
                st.markdown("</div>", unsafe_allowed_code_html=True)
                transit = slot_data.get('transit_to_next')
                if transit:
                    st.markdown(f"""
                    <div style="padding-left: 20px; border-left: 2px dashed #3c3c54; color: #85859e; font-size: 0.85rem; margin-top: -6px; margin-bottom: 6px;">
                        🚘 Travel: <strong>{transit['duration_min']} mins</strong> via <strong>{transit['mode']}</strong> 
                        {f' (Est. ${transit["cost_approx"]})' if transit['cost_approx'] > 0 else ' (Free)'}
                    </div>
                    """, unsafe_allowed_code_html=True)

    with tab_map:
        st.subheader("📍 Dynamic Route Map Overlay")
        st.caption("Interactive geo map of active sights and lodging.")
        
        # Build coordinates dataframe
        map_points = [
            {'name': itinerary['hotel']['name'], 'lat': itinerary['hotel']['coordinates']['lat'], 'lon': itinerary['hotel']['coordinates']['lon'], 'type': 'Hotel'},
            {'name': day['breakfast']['restaurant']['name'], 'lat': day['breakfast']['restaurant']['coordinates']['lat'], 'lon': day['breakfast']['restaurant']['coordinates']['lon'], 'type': 'Dining'},
            {'name': day['morning']['activity']['name'], 'lat': day['morning']['activity']['coordinates']['lat'], 'lon': day['morning']['activity']['coordinates']['lon'], 'type': 'Attraction'},
            {'name': day['lunch']['restaurant']['name'], 'lat': day['lunch']['restaurant']['coordinates']['lat'], 'lon': day['lunch']['restaurant']['coordinates']['lon'], 'type': 'Dining'},
            {'name': day['afternoon']['activity']['name'], 'lat': day['afternoon']['activity']['coordinates']['lat'], 'lon': day['afternoon']['activity']['coordinates']['lon'], 'type': 'Attraction'},
            {'name': day['dinner']['restaurant']['name'], 'lat': day['dinner']['restaurant']['coordinates']['lat'], 'lon': day['dinner']['restaurant']['coordinates']['lon'], 'type': 'Dining'},
            {'name': day['evening']['activity']['name'], 'lat': day['evening']['activity']['coordinates']['lat'], 'lon': day['evening']['activity']['coordinates']['lon'], 'type': 'Attraction'}
        ]
        df = pd.DataFrame(map_points)
        
        # Plotly/pydeck render
        view_state = pdk.ViewState(
            latitude=df['lat'].mean(),
            longitude=df['lon'].mean(),
            zoom=12,
            pitch=30
        )
        
        # Color codes: Hotel=Blue, Dining=Red, Attraction=Cyan
        df['color_r'] = df['type'].apply(lambda t: 138 if t == 'Hotel' else (236 if t == 'Dining' else 6))
        df['color_g'] = df['type'].apply(lambda t: 75 if t == 'Hotel' else (72 if t == 'Dining' else 182))
        df['color_b'] = df['type'].apply(lambda t: 241 if t == 'Hotel' else (153 if t == 'Dining' else 212))
        
        layer = pdk.Layer(
            "ScatterplotLayer",
            df,
            pickable=True,
            opacity=0.8,
            stroked=True,
            filled=True,
            radius_scale=6,
            radius_min_pixels=8,
            radius_max_pixels=15,
            line_width_min_pixels=1,
            get_position="[lon, lat]",
            get_color="[color_r, color_g, color_b]",
            get_line_color=[255, 255, 255]
        )
        
        # Path connections
        path_data = [{'path': [[p['lon'], p['lat']] for p in map_points] + [[map_points[0]['lon'], map_points[0]['lat']]]}]
        path_layer = pdk.Layer(
            "PathLayer",
            path_data,
            pickable=False,
            width_min_pixels=3,
            get_path="path",
            get_color=[138, 75, 241, 150]
        )
        
        st.pydeck_chart(pdk.Deck(
            map_style="mapbox://styles/mapbox/dark-v9",
            initial_view_state=view_state,
            layers=[path_layer, layer],
            tooltip={"text": "{name} ({type})"}
        ))
        
        # Legend
        leg_cols = st.columns(3)
        leg_cols[0].markdown("🟦 **Hotel Basecamp**")
        leg_cols[1].markdown("🟩 **Attraction Sight**")
        leg_cols[2].markdown("🟥 **Dining Option**")

    with tab_simulator:
        col_s1, col_s2 = st.columns([1, 1])
        
        with col_s1:
            st.subheader("⚡ Live Trip Simulator")
            st.caption("Simulate real-world routing updates by injecting disruptions.")
            
            # Clockbox
            st.markdown(f"""
            <div style="background-color: #12121a; border: 1px solid #232330; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                <span style="font-size: 0.75rem; text-transform: uppercase; color: #85859e; font-weight: 700; letter-spacing: 0.05em;">Current Window Status</span>
                <h3 style="color: #ec4899; margin: 8px 0;">Day {st.session_state.active_day} — {st.session_state.sim_time_slot.capitalize()}</h3>
            </div>
            """, unsafe_allowed_code_html=True)
            
            col_ctrl1, col_ctrl2 = st.columns(2)
            if col_ctrl1.button("▶️ Start Simulation" if not st.session_state.is_simulating else "⏸️ Pause Simulation", use_container_width=True):
                st.session_state.is_simulating = not st.session_state.is_simulating
                st.rerun()
                
            if col_ctrl2.button("➡️ Advance Timebox", use_container_width=True):
                # Manual slot progress
                slots = ['morning', 'lunch', 'afternoon', 'dinner', 'evening']
                curr = slots.index(st.session_state.sim_time_slot)
                if curr < len(slots) - 1:
                    st.session_state.sim_time_slot = slots[curr + 1]
                    st.session_state.recalc_logs.append(f"⏱️ Time progressed: Advanced to Day {st.session_state.active_day} {slots[curr + 1].upper()} block.")
                else:
                    st.session_state.sim_time_slot = 'morning'
                    if st.session_state.active_day < len(itinerary['days']):
                        st.session_state.active_day += 1
                        st.session_state.recalc_logs.append(f"🌅 Sunrise: Advanced to Day {st.session_state.active_day} Morning block.")
                    else:
                        st.session_state.is_simulating = False
                        st.session_state.recalc_logs.append("🏆 Journey complete: Finished all timeline blocks.")
                st.rerun()
                
            st.markdown("#### Inject Disruptions")
            for ev in simulator_events:
                ev_type = ev['type']
                is_active = st.session_state.triggered_events[ev_type]
                btn_lbl = f"🔴 Resolve {ev['title']}" if is_active else f"⚡ Inject {ev['title']}"
                
                if st.button(btn_lbl, key=f"btn_ev_{ev_type}"):
                    # Toggle triggered event
                    new_state = not is_active
                    updated_itinerary, logs = recalculate_itinerary(
                        itinerary,
                        ev_type,
                        st.session_state.active_day,
                        new_state
                    )
                    st.session_state.itinerary = updated_itinerary
                    st.session_state.triggered_events[ev_type] = new_state
                    st.session_state.recalc_logs.extend(logs)
                    st.toast(f"Simulator updated: {ev['title']}", icon="🚦")
                    st.rerun()

        with col_s2:
            st.subheader("📟 Engine Execution Console")
            st.caption("Scrollable terminal logging re-optimization operations.")
            
            # Monospace log panel
            logs_content = "\n".join(st.session_state.recalc_logs) if st.session_state.recalc_logs else "System idle. Directives queue empty..."
            st.text_area(
                label="Execution Logs Feed",
                value=logs_content,
                height=300,
                disabled=True,
                label_visibility="collapsed"
            )
            if st.button("Clear Console Logs"):
                st.session_state.recalc_logs = ["⌨️ Terminal logs cleared. Standing by for calculation events..."]
                st.rerun()

    with tab_analytics:
        st.subheader("📊 Expense Allocation Audit")
        
        # Calculate summary values
        lodging_cost = itinerary['hotel']['cost_approx'] * len(itinerary['days'])
        food_cost = 0
        sights_cost = 0
        transit_cost = 0
        
        for d in itinerary['days']:
            food_cost += d['breakfast']['restaurant']['cost_approx'] + d['lunch']['restaurant']['cost_approx'] + d['dinner']['restaurant']['cost_approx']
            sights_cost += d['morning']['activity']['cost_approx'] + d['afternoon']['activity']['cost_approx'] + d['evening']['activity']['cost_approx']
            transit_cost += d['breakfast'].get('transit_to_next', {}).get('cost_approx', 0.0)
            transit_cost += d['morning'].get('transit_to_next', {}).get('cost_approx', 0.0)
            transit_cost += d['lunch'].get('transit_to_next', {}).get('cost_approx', 0.0)
            transit_cost += d['afternoon'].get('transit_to_next', {}).get('cost_approx', 0.0)
            transit_cost += d['dinner'].get('transit_to_next', {}).get('cost_approx', 0.0)
            transit_cost += d['evening'].get('transit_to_next', {}).get('cost_approx', 0.0)
            
        chart_data = pd.DataFrame({
            'Category': ['Lodging Basecamp', 'Dining/Meals', 'Activities/Sights', 'Transit/Fares'],
            'Amount': [lodging_cost, food_cost, sights_cost, transit_cost]
        })
        
        col_a1, col_a2 = st.columns([1, 1])
        
        with col_a1:
            # Altair Donut Chart
            donut = alt.Chart(chart_data).mark_arc(innerRadius=50).encode(
                theta=alt.Theta(field="Amount", type="quantitative"),
                color=alt.Color(field="Category", type="nominal", scale=alt.Scale(
                    domain=['Lodging Basecamp', 'Dining/Meals', 'Activities/Sights', 'Transit/Fares'],
                    range=['#8a4bf1', '#ec4899', '#06b6d4', '#f59e0b']
                )),
                tooltip=['Category', 'Amount']
            ).properties(width=300, height=300)
            
            st.altair_chart(donut, use_container_width=True)
            
        with col_a2:
            st.markdown("#### Cost Categories")
            for _, row in chart_data.iterrows():
                st.markdown(f"**{row['Category']}:** ${row['Amount']}")
                
            st.markdown("---")
            budget_limit = 350 if itinerary['budget_preference'] == 1 else (800 if itinerary['budget_preference'] == 2 else 2500)
            ratio = itinerary['total_cost'] / budget_limit
            
            st.markdown(f"**Target Threshold Limit:** ${budget_limit}")
            st.markdown(f"**Active Actual Spending:** ${itinerary['total_cost']}")
            
            if ratio > 1.0:
                st.warning("⚠️ Budget Limit Exhausted! Activate the 'Budget Shield' in the Simulator to run cost reductions.")
            else:
                st.success("✅ Financial state is healthy. Within selected boundaries.")

    with tab_journal:
        col_j1, col_j2 = st.columns([1, 1])
        
        with col_j1:
            st.subheader("📓 Explorer Diary")
            st.caption("Write down memories or log notes for each day.")
            
            journal_day = st.selectbox("Select day to edit:", range(1, len(itinerary['days']) + 1))
            current_note = st.text_area("Memory log entry:", value=st.session_state.journal_entries.get(journal_day, ""), height=150)
            
            if st.button("Save Daily Entry"):
                st.session_state.journal_entries[journal_day] = current_note
                st.toast("Diary saved!", icon="💾")
                
            # Polaroid snapshots grid
            st.markdown("#### Polaroid Snapshots Book")
            col_snap1, col_snap2 = st.columns(2)
            
            with col_snap1:
                st.markdown(f"""
                <div class="polaroid">
                    <img src="{day['morning']['activity']['image_url']}" style="width:100%; height:120px; object-fit:cover; border-radius:2px;"/>
                    <div class="polaroid-label">🎭 {day['morning']['activity']['name'][:16]}...</div>
                </div>
                """, unsafe_allowed_code_html=True)
                
            with col_snap2:
                st.markdown(f"""
                <div class="polaroid">
                    <img src="{day['afternoon']['activity']['image_url']}" style="width:100%; height:120px; object-fit:cover; border-radius:2px;"/>
                    <div class="polaroid-label">🎭 {day['afternoon']['activity']['name'][:16]}...</div>
                </div>
                """, unsafe_allowed_code_html=True)

        with col_j2:
            st.subheader("🏆 Simulation Achievements Stamps")
            st.caption("Unlock stamps by tracking your trip and adapting to alerts.")
            
            stamps = [
                {'name': 'First Frontier', 'desc': 'Generated a dynamic itinerary.', 'emoji': '🗺️', 'unlocked': True},
                {'name': 'Storm Navigator', 'desc': 'Adapted to weather changes.', 'emoji': '⛈️', 'unlocked': st.session_state.triggered_events['WEATHER']},
                {'name': 'Thrift Commander', 'desc': 'Maintained budget under $400 or used Shield.', 'emoji': '🛡️', 'unlocked': itinerary['total_cost'] < 400 or st.session_state.triggered_events['BUDGET']},
                {'name': 'Tempo Runner', 'desc': 'Generated a Fast-paced schedule.', 'emoji': '⚡', 'unlocked': itinerary['pace'] == 'Fast-paced'},
                {'name': 'Green Connoisseur', 'desc': 'Applied dietary restrictions.', 'emoji': '🌱', 'unlocked': len(itinerary['dietary']) > 0},
                {'name': 'Nomadic Tracker', 'desc': 'Simulated tracking trip status.', 'emoji': '⏱️', 'unlocked': st.session_state.is_simulating}
            ]
            
            for s in stamps:
                bg_col = "#1e2e1e" if s['unlocked'] else "#1b1b22"
                border_col = "#38b2ac" if s['unlocked'] else "#232330"
                opacity = "1.0" if s['unlocked'] else "0.4"
                text_col = "#ffffff" if s['unlocked'] else "#85859e"
                
                st.markdown(f"""
                <div style="display:flex; align-items:center; gap:16px; padding:12px; border-radius:8px; border:1px solid {border_col}; background-color:{bg_col}; opacity:{opacity}; margin-bottom:10px;">
                    <div style="font-size:2rem; width:44px; height:44px; display:flex; align-items:center; justify-content:center; background-color:#12121a; border-radius:50%; border:2px solid {border_col};">{s['emoji']}</div>
                    <div>
                        <h5 style="margin:0; color:{text_col}; font-weight:700;">{s['name']}</h5>
                        <p style="margin:0; font-size:0.75rem; color:#85859e;">{s['desc']}</p>
                    </div>
                </div>
                """, unsafe_allowed_code_html=True)
