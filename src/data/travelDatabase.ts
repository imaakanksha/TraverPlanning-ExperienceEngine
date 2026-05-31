export interface Attraction {
  id: string;
  name: string;
  category: 'Culture' | 'Nature' | 'Adventure' | 'Relaxation' | 'Shopping' | 'Food' | 'Historic';
  costLevel: 1 | 2 | 3; // 1: $, 2: $$, 3: $$$
  costApprox: number; // in USD
  intensity: 'Low' | 'Medium' | 'High';
  isIndoor: boolean;
  duration: number; // in minutes
  coordinates: { x: number; y: number }; // Relative grid coordinates [0-100] for SVG mapping
  description: string;
  imageUrl: string;
  tips: string;
}

export interface Dining {
  id: string;
  name: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  costLevel: 1 | 2 | 3;
  costApprox: number;
  dietaryFlags: string[]; // 'Vegan', 'Halal', 'Gluten-Free'
  coordinates: { x: number; y: number };
  description: string;
}

export interface Hotel {
  id: string;
  name: string;
  costLevel: 1 | 2 | 3;
  costApprox: number; // per night in USD
  rating: number; // out of 5
  coordinates: { x: number; y: number };
  description: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  coordinates: { x: number; y: number }; // Global coordinates
  description: string;
  coverImage: string;
  attractions: Attraction[];
  dining: Dining[];
  hotels: Hotel[];
}

export interface SimulatorEvent {
  id: string;
  type: 'WEATHER' | 'TRAFFIC' | 'CROWD' | 'BUDGET';
  title: string;
  description: string;
  triggerCondition: string;
  impactDescription: string;
}

export const travelDatabase: Record<string, Destination> = {
  tokyo: {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    coordinates: { x: 80, y: 40 },
    description: 'A dazzling neon metropolis blending ultra-modern technology with historic temples and world-class dining.',
    coverImage: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=800&auto=format&fit=crop&q=80',
    hotels: [
      { id: 'tok_h1', name: 'Shinjuku Capsule Hostel', costLevel: 1, costApprox: 35, rating: 4.2, coordinates: { x: 45, y: 50 }, description: 'Affordable, compact capsule sleeping in the heart of bustling Shinjuku. Modern amenities.' },
      { id: 'tok_h2', name: 'Hotel Gracery Shinjuku', costLevel: 2, costApprox: 160, rating: 4.5, coordinates: { x: 48, y: 52 }, description: 'Famous Hotel with a giant Godzilla head on the terrace. Clean, comfortable, and central.' },
      { id: 'tok_h3', name: 'Park Hyatt Tokyo', costLevel: 3, costApprox: 650, rating: 4.9, coordinates: { x: 40, y: 48 }, description: 'Iconic luxury hotel featured in "Lost in Translation" offering majestic views of Mount Fuji.' }
    ],
    dining: [
      { id: 'tok_d1', name: 'Tsukiji Sushi Stall', mealType: 'Breakfast', costLevel: 2, costApprox: 20, dietaryFlags: ['Gluten-Free'], coordinates: { x: 62, y: 42 }, description: 'Super fresh morning sashimi and sushi directly from vendors.' },
      { id: 'tok_d2', name: 'Ichiran Ramen Shibuya', mealType: 'Lunch', costLevel: 1, costApprox: 12, dietaryFlags: [], coordinates: { x: 30, y: 65 }, description: 'Famous individual booth style dining serving rich tonkotsu pork ramen.' },
      { id: 'tok_d3', name: 'Vegan Gyoza Uzu', mealType: 'Lunch', costLevel: 2, costApprox: 18, dietaryFlags: ['Vegan', 'Gluten-Free'], coordinates: { x: 55, y: 30 }, description: 'Spectacular digital art dining space serving gourmet vegan dumplings.' },
      { id: 'tok_d4', name: 'Tempura Tsunahachi', mealType: 'Dinner', costLevel: 2, costApprox: 35, dietaryFlags: [], coordinates: { x: 46, y: 51 }, description: 'Classic tempura dining since 1924, frying vegetables and seafood to order.' },
      { id: 'tok_d5', name: 'Halal Ramen Ouka', mealType: 'Dinner', costLevel: 2, costApprox: 25, dietaryFlags: ['Halal'], coordinates: { x: 38, y: 55 }, description: 'Highly rated halal-certified ramen served with rice and custom toppings.' },
      { id: 'tok_d6', name: 'New York Grill', mealType: 'Dinner', costLevel: 3, costApprox: 150, dietaryFlags: ['Gluten-Free'], coordinates: { x: 40, y: 48 }, description: 'Stunning 52nd-floor luxury dining featuring premium Wagyu steaks and jazz music.' },
      { id: 'tok_d7', name: 'FamilyMart Quick-Bites', mealType: 'Breakfast', costLevel: 1, costApprox: 5, dietaryFlags: [], coordinates: { x: 50, y: 50 }, description: 'Famous Japanese convenience store snacks like Onigiri (rice balls) and egg sandwiches.' }
    ],
    attractions: [
      {
        id: 'tok_a1',
        name: 'Sensō-ji Temple',
        category: 'Culture',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Low',
        isIndoor: false,
        duration: 90,
        coordinates: { x: 75, y: 25 },
        description: 'Tokyos oldest and most iconic Buddhist temple, entered through the imposing Kaminarimon gate.',
        imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500&auto=format&fit=crop&q=80',
        tips: 'Visit early in the morning or at night when the lanterns are lit and crowds are thin.'
      },
      {
        id: 'tok_a2',
        name: 'Shinjuku Gyoen National Garden',
        category: 'Nature',
        costLevel: 1,
        costApprox: 4,
        intensity: 'Medium',
        isIndoor: false,
        duration: 120,
        coordinates: { x: 44, y: 54 },
        description: 'A massive scenic park blending traditional Japanese, English landscape, and French formal gardens.',
        imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=500&auto=format&fit=crop&q=80',
        tips: 'Perfect for cherry blossoms in spring or golden foliage in autumn. Alcohol is prohibited.'
      },
      {
        id: 'tok_a3',
        name: 'Shibuya Crossing & Shibuya Sky',
        category: 'Shopping',
        costLevel: 2,
        costApprox: 15,
        intensity: 'Low',
        isIndoor: false,
        duration: 75,
        coordinates: { x: 30, y: 68 },
        description: 'The world\'s busiest pedestrian intersection, paired with an open-air rooftop observation deck.',
        imageUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=500&auto=format&fit=crop&q=80',
        tips: 'Book Shibuya Sky tickets online weeks in advance for the sunset slot.'
      },
      {
        id: 'tok_a4',
        name: 'Mori Art Museum & Roppongi Hills',
        category: 'Culture',
        costLevel: 2,
        costApprox: 16,
        intensity: 'Low',
        isIndoor: true,
        duration: 100,
        coordinates: { x: 42, y: 70 },
        description: 'Contemporary museum located at the top of Mori Tower focusing on global modern art installations.',
        imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&auto=format&fit=crop&q=80',
        tips: 'Ticket includes access to the indoor Tokyo City View observation deck.'
      },
      {
        id: 'tok_a5',
        name: 'Tsukiji Outer Market Tour',
        category: 'Food',
        costLevel: 2,
        costApprox: 25,
        intensity: 'Medium',
        isIndoor: false,
        duration: 110,
        coordinates: { x: 64, y: 44 },
        description: 'A vibrant market packed with narrow alleys of fresh street food vendors, knives, and kitchenwares.',
        imageUrl: 'https://images.unsplash.com/photo-1558961309-dbdf660084dd?w=500&auto=format&fit=crop&q=80',
        tips: 'Bring cash. Try the tamagoyaki (sweet omelet) and fresh oysters.'
      },
      {
        id: 'tok_a6',
        name: 'Akihabara Electric Town',
        category: 'Shopping',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Medium',
        isIndoor: false,
        duration: 120,
        coordinates: { x: 68, y: 35 },
        description: 'The epicenter of anime merchandise, retro video games, electronics shops, and themed cafes.',
        imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=500&auto=format&fit=crop&q=80',
        tips: 'Visit Radio Kaikan for multiple floors of collectible anime figures.'
      },
      {
        id: 'tok_a7',
        name: 'Mt. Takao Hiking Trail',
        category: 'Adventure',
        costLevel: 1,
        costApprox: 8,
        intensity: 'High',
        isIndoor: false,
        duration: 240,
        coordinates: { x: 10, y: 85 },
        description: 'A beautiful forested mountain offering beginner-to-advanced hiking trails and a mountaintop shrine.',
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop&q=80',
        tips: 'Take a cable car halfway up if you want to save energy. Trail 1 is fully paved.'
      },
      {
        id: 'tok_a8',
        name: 'teamLab Planets Digital Art',
        category: 'Adventure',
        costLevel: 3,
        costApprox: 28,
        intensity: 'Medium',
        isIndoor: true,
        duration: 120,
        coordinates: { x: 72, y: 55 },
        description: 'A museum where you walk through water and interact with projected digital floral and light displays.',
        imageUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=80',
        tips: 'You will walk barefoot through water up to knee-height, so dress appropriately.'
      },
      {
        id: 'tok_a9',
        name: 'Spa LaQua Onsen',
        category: 'Relaxation',
        costLevel: 3,
        costApprox: 30,
        intensity: 'Low',
        isIndoor: true,
        duration: 180,
        coordinates: { x: 58, y: 32 },
        description: 'A massive hot-spring complex utilizing mineral-rich thermal water pumped from 1,700 meters underground.',
        imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=80',
        tips: 'Note: Traditional rules apply (no swimwear in baths, and guests with tattoos may be restricted).'
      },
      {
        id: 'tok_a10',
        name: 'Imperial Palace East Gardens',
        category: 'Historic',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Medium',
        isIndoor: false,
        duration: 90,
        coordinates: { x: 55, y: 44 },
        description: 'The historic grounds of the former Edo Castle, complete with beautiful moats, walls, and gates.',
        imageUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=500&auto=format&fit=crop&q=80',
        tips: 'Closed on Mondays and Fridays. Check the calendar before heading out.'
      }
    ]
  },
  paris: {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    coordinates: { x: 45, y: 30 },
    description: 'The City of Light, famous for world-leading art galleries, majestic monuments, and romantic café culture.',
    coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80',
    hotels: [
      { id: 'par_h1', name: 'Generator Hostel Paris', costLevel: 1, costApprox: 40, rating: 4.1, coordinates: { x: 70, y: 20 }, description: 'Stylishly designed hostel in the 10th Arrondissement. Features a cool rooftop bar.' },
      { id: 'par_h2', name: 'Hotel Les Deux Gares', costLevel: 2, costApprox: 180, rating: 4.6, coordinates: { x: 60, y: 25 }, description: 'Charming hotel boasting colourful and eccentric retro French interiors by Luke Edward Hall.' },
      { id: 'par_h3', name: 'The Ritz Paris', costLevel: 3, costApprox: 950, rating: 4.9, coordinates: { x: 45, y: 42 }, description: 'One of the world\'s most legendary luxury hotels, overlooking the elegant Place Vendôme.' }
    ],
    dining: [
      { id: 'par_d1', name: 'Boulangerie Utopie', mealType: 'Breakfast', costLevel: 1, costApprox: 6, dietaryFlags: [], coordinates: { x: 65, y: 40 }, description: 'Artisanal croissants, sourdough, and modern black-crust baguettes.' },
      { id: 'par_d2', name: 'L\'As du Fallafel', mealType: 'Lunch', costLevel: 1, costApprox: 10, dietaryFlags: ['Vegan', 'Halal'], coordinates: { x: 58, y: 45 }, description: 'Renowned counter-serve spot in the Jewish Quarter serving legendary falafel pitas.' },
      { id: 'par_d3', name: 'Café de Flore', mealType: 'Breakfast', costLevel: 2, costApprox: 22, dietaryFlags: [], coordinates: { x: 40, y: 55 }, description: 'Famous historic cafe in St. Germain, once the meeting spot of philosophers.' },
      { id: 'par_d4', name: 'Relais de l\'Entrecôte', mealType: 'Lunch', costLevel: 2, costApprox: 30, dietaryFlags: [], coordinates: { x: 30, y: 52 }, description: 'Bustling bistro famous for a single dish: steak frites served with secret herb sauce.' },
      { id: 'par_d5', name: 'Potager du Marais', mealType: 'Dinner', costLevel: 2, costApprox: 35, dietaryFlags: ['Vegan', 'Gluten-Free'], coordinates: { x: 56, y: 43 }, description: 'Cosy restaurant cooking traditional French cuisine (like beef bourguignon) in vegan form.' },
      { id: 'par_d6', name: 'Le Jules Verne', mealType: 'Dinner', costLevel: 3, costApprox: 220, dietaryFlags: ['Gluten-Free'], coordinates: { x: 20, y: 50 }, description: 'Michelin-starred restaurant situated inside the Eiffel Tower, with breathtaking views.' },
      { id: 'par_d7', name: 'L\'Alchimiste Café', mealType: 'Breakfast', costLevel: 1, costApprox: 8, dietaryFlags: ['Vegan'], coordinates: { x: 50, y: 35 }, description: 'Modern specialty coffee roastery with plant-based milk selections.' }
    ],
    attractions: [
      {
        id: 'par_a1',
        name: 'Eiffel Tower Tour',
        category: 'Historic',
        costLevel: 2,
        costApprox: 26,
        intensity: 'Medium',
        isIndoor: false,
        duration: 120,
        coordinates: { x: 20, y: 50 },
        description: 'The monumental iron lattice tower on the Champ de Mars, symbol of Paris and France.',
        imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&auto=format&fit=crop&q=80',
        tips: 'Book summit elevator tickets online months in advance. Take stairs to second floor for a discount.'
      },
      {
        id: 'par_a2',
        name: 'Louvre Museum',
        category: 'Culture',
        costLevel: 2,
        costApprox: 20,
        intensity: 'High',
        isIndoor: true,
        duration: 180,
        coordinates: { x: 46, y: 44 },
        description: 'The world\'s largest art museum, home to the Mona Lisa, Venus de Milo, and thousands of masterpieces.',
        imageUrl: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=500&auto=format&fit=crop&q=80',
        tips: 'Enter through the Richelieu passage or Carrousel du Louvre shopping mall to bypass main lines.'
      },
      {
        id: 'par_a3',
        name: 'Seine River Cruise',
        category: 'Relaxation',
        costLevel: 2,
        costApprox: 18,
        intensity: 'Low',
        isIndoor: false,
        duration: 60,
        coordinates: { x: 38, y: 48 },
        description: 'A relaxing glass-canopied boat cruise along the Seine, viewing Notre Dame, Orsay, and bridges.',
        imageUrl: 'https://images.unsplash.com/photo-1503917988258-f87a78e3c995?w=500&auto=format&fit=crop&q=80',
        tips: 'Board the cruise at sunset to watch the monuments light up and the Eiffel Tower sparkle.'
      },
      {
        id: 'par_a4',
        name: 'Palace of Versailles',
        category: 'Historic',
        costLevel: 3,
        costApprox: 30,
        intensity: 'High',
        isIndoor: false,
        duration: 240,
        coordinates: { x: 5, y: 90 },
        description: 'The opulent principal royal residence of France from 1682 until the French Revolution.',
        imageUrl: 'https://images.unsplash.com/photo-1585672841967-df507df05e26?w=500&auto=format&fit=crop&q=80',
        tips: 'Located in the suburbs. Take RER C train from central Paris. Don\'t miss the Hall of Mirrors.'
      },
      {
        id: 'par_a5',
        name: 'Musée d\'Orsay',
        category: 'Culture',
        costLevel: 2,
        costApprox: 16,
        intensity: 'Medium',
        isIndoor: true,
        duration: 120,
        coordinates: { x: 40, y: 48 },
        description: 'Museum located in a magnificent former railway station housing Impressionist and Post-Impressionist art.',
        imageUrl: 'https://images.unsplash.com/photo-1601887389937-0b02c26b6c3c?w=500&auto=format&fit=crop&q=80',
        tips: 'Head to the top floor first to see iconic paintings by Monet, Van Gogh, and Renoir.'
      },
      {
        id: 'par_a6',
        name: 'Montmartre & Sacré-Cœur Walk',
        category: 'Culture',
        costLevel: 1,
        costApprox: 0,
        intensity: 'High',
        isIndoor: false,
        duration: 100,
        coordinates: { x: 55, y: 15 },
        description: 'An artistic hilltop district with winding cobblestone streets, vineyard, and the white basilica.',
        imageUrl: 'https://images.unsplash.com/photo-1509840144521-88894172c72b?w=500&auto=format&fit=crop&q=80',
        tips: 'Use the funicular train if the steep stairs are too tiring. Keep alert for street scammers.'
      },
      {
        id: 'par_a7',
        name: 'Luxembourg Gardens Park',
        category: 'Nature',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Low',
        isIndoor: false,
        duration: 90,
        coordinates: { x: 45, y: 62 },
        description: 'A 25-hectare tranquil oasis of lawns, tree-lined promenades, and model sailboat ponds.',
        imageUrl: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=500&auto=format&fit=crop&q=80',
        tips: 'Grab one of the famous sage-green metal chairs and read a book near the Medici Fountain.'
      },
      {
        id: 'par_a8',
        name: 'Catacombs of Paris',
        category: 'Adventure',
        costLevel: 2,
        costApprox: 29,
        intensity: 'Medium',
        isIndoor: true,
        duration: 90,
        coordinates: { x: 48, y: 80 },
        description: 'Underground ossuaries holding the skeletal remains of more than six million people in tunnels.',
        imageUrl: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=500&auto=format&fit=crop&q=80',
        tips: 'Temperatures remain a cool 14°C (57°F) year-round. Dress in layers. Not for the claustrophobic.'
      },
      {
        id: 'par_a9',
        name: 'Kayaking on the Marne River',
        category: 'Adventure',
        costLevel: 3,
        costApprox: 45,
        intensity: 'High',
        isIndoor: false,
        duration: 150,
        coordinates: { x: 95, y: 50 },
        description: 'An active, scenic kayaking trip through the peaceful waterways just outside Paris.',
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&auto=format&fit=crop&q=80',
        tips: 'Easily accessible via RER A train. Wet-bags are provided for cameras.'
      },
      {
        id: 'par_a10',
        name: 'Galeries Lafayette Shopping',
        category: 'Shopping',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Low',
        isIndoor: true,
        duration: 90,
        coordinates: { x: 45, y: 35 },
        description: 'High-end department store famous for its stunning Neo-Byzantine stained-glass dome and rooftop view.',
        imageUrl: 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=500&auto=format&fit=crop&q=80',
        tips: 'The rooftop terrace is completely free and offers panoramic views of Paris and Opera Garnier.'
      }
    ]
  },
  rome: {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    coordinates: { x: 50, y: 35 },
    description: 'An open-air museum filled with classical ruins, vibrant piazzas, baroque fountains, and delicious pasta.',
    coverImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80',
    hotels: [
      { id: 'rom_h1', name: 'The Beehive Cozy Hostel', costLevel: 1, costApprox: 38, rating: 4.3, coordinates: { x: 80, y: 40 }, description: 'Relaxed, organic cafe and hostel gardens near Termini station. Friendly, community vibe.' },
      { id: 'rom_h2', name: 'Hotel Santa Maria', costLevel: 2, costApprox: 175, rating: 4.7, coordinates: { x: 30, y: 65 }, description: 'Converted historic convent in Trastevere, built around an orange tree courtyard.' },
      { id: 'rom_h3', name: 'J.K. Place Roma', costLevel: 3, costApprox: 680, rating: 4.9, coordinates: { x: 45, y: 35 }, description: 'Ultra-chic boutique hotel featuring elegant retro style and personalized concierge service.' }
    ],
    dining: [
      { id: 'rom_d1', name: 'Roscioli Caffè', mealType: 'Breakfast', costLevel: 1, costApprox: 8, dietaryFlags: [], coordinates: { x: 44, y: 48 }, description: 'Legendary espresso and Maritozzo (sweet brioche bun filled with whipped cream).' },
      { id: 'rom_d2', name: 'Pizzarium Bonci', mealType: 'Lunch', costLevel: 1, costApprox: 12, dietaryFlags: ['Vegan'], coordinates: { x: 18, y: 25 }, description: 'Acclaimed gourmet Roman pizza-by-the-slice (pizza al taglio) with creative toppings.' },
      { id: 'rom_d3', name: 'Buddy Veggy Restaurant', mealType: 'Lunch', costLevel: 2, costApprox: 20, dietaryFlags: ['Vegan', 'Gluten-Free'], coordinates: { x: 46, y: 40 }, description: 'Plant-based twists on carbonara, cacio e pepe, and classic Italian bruschettas.' },
      { id: 'rom_d4', name: 'Da Enzo al 29', mealType: 'Dinner', costLevel: 2, costApprox: 28, dietaryFlags: [], coordinates: { x: 34, y: 70 }, description: 'Tiny, wildly popular Trastevere trattoria serving Roman classics like Rigatoni alla Carbonara.' },
      { id: 'rom_d5', name: 'Rifugio Romano', mealType: 'Dinner', costLevel: 2, costApprox: 32, dietaryFlags: ['Vegan', 'Gluten-Free'], coordinates: { x: 78, y: 38 }, description: 'Cosy family-run eatery serving fully veganized versions of traditional Roman meat dishes.' },
      { id: 'rom_d6', name: 'La Pergola', mealType: 'Dinner', costLevel: 3, costApprox: 290, dietaryFlags: ['Gluten-Free', 'Halal'], coordinates: { x: 10, y: 15 }, description: 'Romes only 3-Michelin-star restaurant, offering panoramic city vistas and exquisite cuisine.' },
      { id: 'rom_d7', name: 'Giolitti Gelato', mealType: 'Breakfast', costLevel: 1, costApprox: 5, dietaryFlags: ['Gluten-Free'], coordinates: { x: 46, y: 38 }, description: 'Romes oldest and most famous gelateria, open from early morning serving pastries and cream.' }
    ],
    attractions: [
      {
        id: 'rom_a1',
        name: 'Colosseum & Forum',
        category: 'Historic',
        costLevel: 2,
        costApprox: 22,
        intensity: 'High',
        isIndoor: false,
        duration: 150,
        coordinates: { x: 62, y: 55 },
        description: 'The monumental stone amphitheater of antiquity, alongside the ruins of the Roman marketplace.',
        imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500&auto=format&fit=crop&q=80',
        tips: 'Book the "Arena" or "Underground" tour path to walk where the gladiators walked.'
      },
      {
        id: 'rom_a2',
        name: 'Vatican Museums & Chapel',
        category: 'Culture',
        costLevel: 2,
        costApprox: 25,
        intensity: 'High',
        isIndoor: true,
        duration: 180,
        coordinates: { x: 15, y: 30 },
        description: 'The vast collection of classical sculptures, galleries, and Michaelangelos Sistine Chapel ceiling.',
        imageUrl: 'https://images.unsplash.com/photo-1542820229-081e0c12af0b?w=500&auto=format&fit=crop&q=80',
        tips: 'Strict dress code required: shoulders and knees must be fully covered to enter.'
      },
      {
        id: 'rom_a3',
        name: 'Trevi Fountain & Steps',
        category: 'Historic',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Medium',
        isIndoor: false,
        duration: 75,
        coordinates: { x: 50, y: 38 },
        description: 'The colossal baroque fountain of Neptune, paired with the iconic Spanish Steps nearby.',
        imageUrl: 'https://images.unsplash.com/photo-1529154036614-a3ad9727ab78?w=500&auto=format&fit=crop&q=80',
        tips: 'Throw a coin over your left shoulder with your right hand to guarantee a return to Rome.'
      },
      {
        id: 'rom_a4',
        name: 'Borghese Gallery & Villa Gardens',
        category: 'Nature',
        costLevel: 2,
        costApprox: 18,
        intensity: 'Medium',
        isIndoor: false,
        duration: 120,
        coordinates: { x: 56, y: 20 },
        description: 'A grand English-style landscaped park hosting a museum with sculptures by Bernini and paintings by Caravaggio.',
        imageUrl: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=500&auto=format&fit=crop&q=80',
        tips: 'Renting a golf cart or bike is a fun, energy-saving way to explore the massive gardens.'
      },
      {
        id: 'rom_a5',
        name: 'Pantheon',
        category: 'Historic',
        costLevel: 1,
        costApprox: 5,
        intensity: 'Low',
        isIndoor: true,
        duration: 45,
        coordinates: { x: 44, y: 41 },
        description: 'A former Roman temple, now a church, featuring the world\'s largest unreinforced concrete dome.',
        imageUrl: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=500&auto=format&fit=crop&q=80',
        tips: 'Look up at the oculus (central opening). On rainy days, water drains out through holes in the floor.'
      },
      {
        id: 'rom_a6',
        name: 'Trastevere Walking Tour',
        category: 'Food',
        costLevel: 2,
        costApprox: 20,
        intensity: 'Medium',
        isIndoor: false,
        duration: 120,
        coordinates: { x: 32, y: 68 },
        description: 'An atmospheric neighborhood characterized by bohemian charm, ivy-draped alleys, and street food.',
        imageUrl: 'https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=500&auto=format&fit=crop&q=80',
        tips: 'Visit after dark when the squares come alive with buskers and outdoor dining tables.'
      },
      {
        id: 'rom_a7',
        name: 'Catacombs of St. Callixtus',
        category: 'Adventure',
        costLevel: 2,
        costApprox: 10,
        intensity: 'Medium',
        isIndoor: true,
        duration: 90,
        coordinates: { x: 85, y: 90 },
        description: 'The ancient underground cemetery tunnels of the early Christians, stretching 20 kilometers.',
        imageUrl: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=500&auto=format&fit=crop&q=80',
        tips: 'Located along the ancient Appian Way. Rent a bicycle to ride down the historic cobblestones.'
      },
      {
        id: 'rom_a8',
        name: 'Pasta & Tiramisu Masterclass',
        category: 'Food',
        costLevel: 3,
        costApprox: 55,
        intensity: 'Low',
        isIndoor: true,
        duration: 150,
        coordinates: { x: 45, y: 46 },
        description: 'An interactive cooking class where you hand-roll fettuccine and assemble classic tiramisu with local chefs.',
        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&auto=format&fit=crop&q=80',
        tips: 'Come hungry! Includes multiple courses and unlimited local wine pairings.'
      },
      {
        id: 'rom_a9',
        name: 'Ostia Antica Ancient Ruins',
        category: 'Adventure',
        costLevel: 2,
        costApprox: 14,
        intensity: 'High',
        isIndoor: false,
        duration: 210,
        coordinates: { x: 10, y: 95 },
        description: 'A massive archaeological site that was the harbor city of ancient Rome, featuring preserved frescoes and mosaics.',
        imageUrl: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=500&auto=format&fit=crop&q=80',
        tips: 'Take the Roma-Lido suburban train (25 minutes). Much less crowded than Pompeii.'
      },
      {
        id: 'rom_a10',
        name: 'QC Termeroma Roman Spa',
        category: 'Relaxation',
        costLevel: 3,
        costApprox: 60,
        intensity: 'Low',
        isIndoor: true,
        duration: 180,
        coordinates: { x: 90, y: 70 },
        description: 'A historic-style spa offering therapeutic baths, saunas, and sensory wellness experiences.',
        imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=80',
        tips: 'Reservations are required. Try the sensory thermal rain showers.'
      }
    ]
  },
  newyork: {
    id: 'newyork',
    name: 'New York',
    country: 'USA',
    coordinates: { x: 30, y: 35 },
    description: 'The city that never sleeps, packed with iconic skyscrapers, Broadway theatres, and green urban high-lines.',
    coverImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop&q=80',
    hotels: [
      { id: 'nyc_h1', name: 'Freehand New York', costLevel: 1, costApprox: 120, rating: 4.2, coordinates: { x: 52, y: 55 }, description: 'Trendy, artistic hostel/hotel in Flatiron. Features custom murals and popular cocktail bars.' },
      { id: 'nyc_h2', name: 'The Ludlow Hotel', costLevel: 2, costApprox: 290, rating: 4.6, coordinates: { x: 60, y: 72 }, description: 'Loft-style boutique hotel in the Lower East Side, complete with brick walls and deep soaking tubs.' },
      { id: 'nyc_h3', name: 'The Plaza Hotel', costLevel: 3, costApprox: 850, rating: 4.8, coordinates: { x: 48, y: 40 }, description: 'Historic landmark luxury hotel at the corner of Central Park South and Fifth Avenue.' }
    ],
    dining: [
      { id: 'nyc_d1', name: 'Ess-a-Bagel', mealType: 'Breakfast', costLevel: 1, costApprox: 12, dietaryFlags: ['Vegan'], coordinates: { x: 55, y: 42 }, description: 'Famous hand-rolled bagels topped with classic lox spread or plant-based tofu cream cheese.' },
      { id: 'nyc_d2', name: 'Katz\'s Delicatessen', mealType: 'Lunch', costLevel: 2, costApprox: 28, dietaryFlags: ['Halal'], coordinates: { x: 58, y: 73 }, description: 'Legendary Jewish deli serving towering pastrami on rye sandwhiches since 1888.' },
      { id: 'nyc_d3', name: 'Beatnic (Vegan Burger)', mealType: 'Lunch', costLevel: 1, costApprox: 15, dietaryFlags: ['Vegan', 'Gluten-Free'], coordinates: { x: 42, y: 64 }, description: 'Casual spot cooking delicious plant-based burgers, sweet potato fries, and salads.' },
      { id: 'nyc_d4', name: 'Carbone', mealType: 'Dinner', costLevel: 3, costApprox: 130, dietaryFlags: [], coordinates: { x: 44, y: 68 }, description: 'High-end, retro-themed Italian-American joint famous for spicy rigatoni vodka.' },
      { id: 'nyc_d5', name: 'Nomad Vegetarian Diner', mealType: 'Dinner', costLevel: 2, costApprox: 35, dietaryFlags: ['Vegan', 'Gluten-Free'], coordinates: { x: 50, y: 52 }, description: 'Art-deco styled diner cooking modern gluten-free and plant-based international comfort dishes.' },
      { id: 'nyc_d6', name: 'Clinton St. Baking Co.', mealType: 'Breakfast', costLevel: 2, costApprox: 24, dietaryFlags: [], coordinates: { x: 62, y: 70 }, description: 'Acclaimed diner famous for the city\'s fluffiest wild blueberry pancakes with warm maple butter.' }
    ],
    attractions: [
      {
        id: 'nyc_a1',
        name: 'Statue of Liberty & Ellis Island',
        category: 'Historic',
        costLevel: 2,
        costApprox: 24,
        intensity: 'Medium',
        isIndoor: false,
        duration: 180,
        coordinates: { x: 38, y: 92 },
        description: 'America\'s monumental copper beacon of liberty, paired with the historic immigration registry museum.',
        imageUrl: 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?w=500&auto=format&fit=crop&q=80',
        tips: 'Take the earliest morning ferry to avoid long airport-style security wait times.'
      },
      {
        id: 'nyc_a2',
        name: 'Metropolitan Museum of Art',
        category: 'Culture',
        costLevel: 2,
        costApprox: 25,
        intensity: 'High',
        isIndoor: true,
        duration: 180,
        coordinates: { x: 50, y: 32 },
        description: 'One of the world\'s largest art museums, displaying over two million works spanning 5,000 years.',
        imageUrl: 'https://images.unsplash.com/photo-1601887389937-0b02c26b6c3c?w=500&auto=format&fit=crop&q=80',
        tips: 'Visit the rooftop garden during summer for beautiful views of the Central Park canopy.'
      },
      {
        id: 'nyc_a3',
        name: 'Central Park Bicycle Loop',
        category: 'Nature',
        costLevel: 2,
        costApprox: 15,
        intensity: 'High',
        isIndoor: false,
        duration: 120,
        coordinates: { x: 47, y: 35 },
        description: 'An active cycle ride through the scenic lanes, lakes, and bridges of NYC\'s historic public park.',
        imageUrl: 'https://images.unsplash.com/photo-1513826308400-30c72d579499?w=500&auto=format&fit=crop&q=80',
        tips: 'Bikes are restricted to the main circular drive. Yield to pedestrians at crossings.'
      },
      {
        id: 'nyc_a4',
        name: 'Empire State Building Skydeck',
        category: 'Historic',
        costLevel: 3,
        costApprox: 44,
        intensity: 'Low',
        isIndoor: false,
        duration: 90,
        coordinates: { x: 50, y: 52 },
        description: 'The world-famous Art Deco skyscraper offering indoor/outdoor 86th-floor views.',
        imageUrl: 'https://images.unsplash.com/photo-1522083165195-342750297f05?w=500&auto=format&fit=crop&q=80',
        tips: 'Open until late at night. Reserve late hours to see the city lights sparkle without crowds.'
      },
      {
        id: 'nyc_a5',
        name: 'Broadway Theatre Show',
        category: 'Culture',
        costLevel: 3,
        costApprox: 95,
        intensity: 'Low',
        isIndoor: true,
        duration: 150,
        coordinates: { x: 45, y: 48 },
        description: 'World-renowned live theatrical performances in Times Square\'s historic theater district.',
        imageUrl: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=500&auto=format&fit=crop&q=80',
        tips: 'Visit the TKTS booth in Times Square on the day of the show for up to 50% off tickets.'
      },
      {
        id: 'nyc_a6',
        name: 'High Line & Chelsea Market',
        category: 'Relaxation',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Medium',
        isIndoor: false,
        duration: 110,
        coordinates: { x: 38, y: 60 },
        description: 'A 1.4-mile elevated linear park built on a historic freight rail line, ending in a massive food market.',
        imageUrl: 'https://images.unsplash.com/photo-1507038772120-7bef2c384c5e?w=500&auto=format&fit=crop&q=80',
        tips: 'Start at Hudson Yards and walk south to Chelsea Market, where you can grab tacos for lunch.'
      },
      {
        id: 'nyc_a7',
        name: 'Summit One Vanderbilt',
        category: 'Adventure',
        costLevel: 3,
        costApprox: 42,
        intensity: 'Medium',
        isIndoor: true,
        duration: 90,
        coordinates: { x: 52, y: 49 },
        description: 'An immersive multi-sensory observation deck combining mirrored rooms, glass ledges, and digital art.',
        imageUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=80',
        tips: 'Sunglasses are highly recommended due to high light reflections. Skirts are discouraged.'
      },
      {
        id: 'nyc_a8',
        name: 'Manhattan Helicopter Charter',
        category: 'Adventure',
        costLevel: 3,
        costApprox: 210,
        intensity: 'Low',
        isIndoor: false,
        duration: 45,
        coordinates: { x: 55, y: 95 },
        description: 'A thrilling aerial helicopter flight providing sweeping views of the Hudson and skyline landmarks.',
        imageUrl: 'https://images.unsplash.com/photo-1522083165195-342750297f05?w=500&auto=format&fit=crop&q=80',
        tips: 'Flights depart from Downtown Heliport. Booking in the afternoon offers the best lighting.'
      },
      {
        id: 'nyc_a9',
        name: 'Brooklyn Bridge Crossing',
        category: 'Historic',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Medium',
        isIndoor: false,
        duration: 75,
        coordinates: { x: 58, y: 82 },
        description: 'The historic neo-Gothic suspension bridge spanning the East River, linking Manhattan to Brooklyn.',
        imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=500&auto=format&fit=crop&q=80',
        tips: 'Walk from the Brooklyn side toward Manhattan to see the skyline right in front of you.'
      },
      {
        id: 'nyc_a10',
        name: 'SoHo Gallery Shopping Walk',
        category: 'Shopping',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Medium',
        isIndoor: false,
        duration: 100,
        coordinates: { x: 48, y: 74 },
        description: 'Strolling through cast-iron architecture streets lined with boutique shops and art galleries.',
        imageUrl: 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=500&auto=format&fit=crop&q=80',
        tips: 'Stop by local bakeries on Lafayette St for custom pastries during your walk.'
      }
    ]
  },
  cairo: {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    coordinates: { x: 52, y: 40 },
    description: 'The cradle of civilization, hosting colossal ancient monuments, old Islamic forts, and the grand Nile river.',
    coverImage: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&auto=format&fit=crop&q=80',
    hotels: [
      { id: 'cai_h1', name: 'Dahab Downtown Hostel', costLevel: 1, costApprox: 18, rating: 4.4, coordinates: { x: 45, y: 48 }, description: 'A cozy backpacker haven styled like a Bedouin camp on a downtown rooftop garden.' },
      { id: 'cai_h2', name: 'Steigenberger Hotel Tahrir', costLevel: 2, costApprox: 110, rating: 4.6, coordinates: { x: 43, y: 50 }, description: 'Sleek, modern business hotel steps away from Tahrir Square and the Egyptian Museum.' },
      { id: 'cai_h3', name: 'Four Seasons Nile Plaza', costLevel: 3, costApprox: 450, rating: 4.9, coordinates: { x: 40, y: 56 }, description: 'High-end luxury resort in Garden City boasting stellar panoramic views of the Nile.' }
    ],
    dining: [
      { id: 'cai_d1', name: 'El Felfela Café', mealType: 'Breakfast', costLevel: 1, costApprox: 6, dietaryFlags: ['Vegan', 'Halal'], coordinates: { x: 45, y: 49 }, description: 'Traditional Egyptian breakfast of hot fava bean stew (ful mudammas), falafel, and pita.' },
      { id: 'cai_d2', name: 'Abou Tarek Koshary', mealType: 'Lunch', costLevel: 1, costApprox: 5, dietaryFlags: ['Vegan', 'Halal'], coordinates: { x: 48, y: 45 }, description: 'Cairo\'s most famous 5-story restaurant dedicated entirely to the national carb-rich dish Koshary.' },
      { id: 'cai_d3', name: 'Zooba Restaurant', mealType: 'Lunch', costLevel: 2, costApprox: 12, dietaryFlags: ['Vegan', 'Halal', 'Gluten-Free'], coordinates: { x: 30, y: 35 }, description: 'Gourmet organic twists on Egyptian street food classics in a colorful hip setting.' },
      { id: 'cai_d4', name: 'Abou El Sid', mealType: 'Dinner', costLevel: 2, costApprox: 24, dietaryFlags: ['Halal'], coordinates: { x: 32, y: 38 }, description: 'Intricately decorated restaurant cooking authentic recipes like pigeon stuffed with freekeh.' },
      { id: 'cai_d5', name: 'Andrea El Mariouteya', mealType: 'Dinner', costLevel: 2, costApprox: 20, dietaryFlags: ['Halal'], coordinates: { x: 12, y: 68 }, description: 'Famous garden dining serving spiced rotisserie chicken and freshly baked flatbread.' },
      { id: 'cai_d6', name: 'The Revolving Restaurant', mealType: 'Dinner', costLevel: 3, costApprox: 90, dietaryFlags: ['Halal', 'Gluten-Free'], coordinates: { x: 38, y: 58 }, description: '360-degree rotating dining room atop the Grand Nile Tower, serving luxury French-Egyptian food.' }
    ],
    attractions: [
      {
        id: 'cai_a1',
        name: 'Giza Pyramids & Sphinx',
        category: 'Historic',
        costLevel: 2,
        costApprox: 15,
        intensity: 'High',
        isIndoor: false,
        duration: 180,
        coordinates: { x: 10, y: 70 },
        description: 'The monumental ancient tombs of Cheops, Khafre, Menkaure, and the limestone Sphinx guarding them.',
        imageUrl: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=500&auto=format&fit=crop&q=80',
        tips: 'Hire a licensed Camel rider inside. Make sure to agree on the price before mounting.'
      },
      {
        id: 'cai_a2',
        name: 'Grand Egyptian Museum',
        category: 'Culture',
        costLevel: 2,
        costApprox: 20,
        intensity: 'Medium',
        isIndoor: true,
        duration: 180,
        coordinates: { x: 18, y: 62 },
        description: 'The colossal modern museum housing the world\'s largest collection of pharaonic antiquities and Tutankhamun.',
        imageUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b31d468?w=500&auto=format&fit=crop&q=80',
        tips: 'Book guided tours of the grand atrium and commercial areas online.'
      },
      {
        id: 'cai_a3',
        name: 'Khan el-Khalili Bazaar Walk',
        category: 'Culture',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Medium',
        isIndoor: false,
        duration: 120,
        coordinates: { x: 62, y: 44 },
        description: 'A labyrinth of narrow historic souk alleyways smelling of spices, perfumes, and shining brass wares.',
        imageUrl: 'https://images.unsplash.com/photo-1568322422390-eeec11075678?w=500&auto=format&fit=crop&q=80',
        tips: 'Bargaining is expected. Start by offering 40% of the initial quoted price and work up.'
      },
      {
        id: 'cai_a4',
        name: 'Mosque of Muhammad Ali & Citadel',
        category: 'Historic',
        costLevel: 1,
        costApprox: 6,
        intensity: 'Medium',
        isIndoor: false,
        duration: 90,
        coordinates: { x: 64, y: 55 },
        description: 'The medieval fortification of Salah ad-Din, topped by the soaring alabaster Turkish mosque.',
        imageUrl: 'https://images.unsplash.com/photo-1569429593410-b498b3fb3387?w=500&auto=format&fit=crop&q=80',
        tips: 'Go at sunset to view the entire city, including the distant Giza pyramids on clear days.'
      },
      {
        id: 'cai_a5',
        name: 'Nile River Felucca Ride',
        category: 'Relaxation',
        costLevel: 1,
        costApprox: 10,
        intensity: 'Low',
        isIndoor: false,
        duration: 75,
        coordinates: { x: 40, y: 55 },
        description: 'A peaceful, wind-powered sail on a traditional wooden felucca boat along the Nile river.',
        imageUrl: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=500&auto=format&fit=crop&q=80',
        tips: 'Rent the entire boat rather than tickets. Sunset or night sailing is highly recommended.'
      },
      {
        id: 'cai_a6',
        name: 'Al-Azhar Park Oasis',
        category: 'Nature',
        costLevel: 1,
        costApprox: 2,
        intensity: 'Low',
        isIndoor: false,
        duration: 90,
        coordinates: { x: 60, y: 50 },
        description: 'A 30-hectare lush green sanctuary offering manicured gardens and fountains high above the city.',
        imageUrl: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=500&auto=format&fit=crop&q=80',
        tips: 'Great spots for lunch inside with panoramic views overlooking Islamic Cairo.'
      },
      {
        id: 'cai_a7',
        name: 'Desert Quad Biking at Pyramids',
        category: 'Adventure',
        costLevel: 2,
        costApprox: 30,
        intensity: 'High',
        isIndoor: false,
        duration: 120,
        coordinates: { x: 5, y: 75 },
        description: 'Riding all-terrain quad bikes across the desert dunes flanking the outer Pyramids perimeter.',
        imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&auto=format&fit=crop&q=80',
        tips: 'Wear sunglasses and a scarf wrapping your face to protect against blowing sand.'
      },
      {
        id: 'cai_a8',
        name: 'Coptic Cairo Churches Tour',
        category: 'Historic',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Medium',
        isIndoor: false,
        duration: 100,
        coordinates: { x: 48, y: 80 },
        description: 'The historic old sector featuring the Hanging Church, Ben Ezra Synagogue, and ancient Roman towers.',
        imageUrl: 'https://images.unsplash.com/photo-1529154036614-a3ad9727ab78?w=500&auto=format&fit=crop&q=80',
        tips: 'Very quiet and peaceful. Easily reached by taking the Cairo Metro to Mar Girgis station.'
      },
      {
        id: 'cai_a9',
        name: 'Cave Church of St. Simon',
        category: 'Adventure',
        costLevel: 1,
        costApprox: 0,
        intensity: 'Medium',
        isIndoor: true,
        duration: 90,
        coordinates: { x: 80, y: 68 },
        description: 'A massive church carved directly into the Mokattam Mountain, seating up to 20,000 worshippers.',
        imageUrl: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=500&auto=format&fit=crop&q=80',
        tips: 'Requires driving through Manshiyat Naser (Garbage City). Use a reliable taxi service.'
      },
      {
        id: 'cai_a10',
        name: 'Egyptian Cooking Class',
        category: 'Food',
        costLevel: 2,
        costApprox: 35,
        intensity: 'Low',
        isIndoor: true,
        duration: 120,
        coordinates: { x: 35, y: 42 },
        description: 'Learn to prepare classic Egyptian dishes like Mahshi (stuffed vine leaves) and Hawawshi pies.',
        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&auto=format&fit=crop&q=80',
        tips: 'Includes a guided walk through local vegetable markets to purchase ingredients.'
      }
    ]
  }
};

export const simulatorEvents: SimulatorEvent[] = [
  {
    id: 'ev_weather_rain',
    type: 'WEATHER',
    title: 'Sudden Rain Shower',
    description: 'Heavy precipitation sweeps across the city, making outdoor sights muddy and uncomfortable.',
    triggerCondition: 'Weather changes to rainy',
    impactDescription: 'Swaps scheduled outdoor sights with nearby indoor cultural/shopping experiences, and switches transit from Walking to Subway/Taxi.'
  },
  {
    id: 'ev_traffic_delay',
    type: 'TRAFFIC',
    title: 'Major Traffic Gridlock',
    description: 'A vehicle breakdown on the main road increases transit times between activities by 40 minutes.',
    triggerCondition: 'Traffic level rises to high',
    impactDescription: 'Reduces the duration of the current activity, pushes back dining slots by 30 mins, and upgrades travel recommendation to Rail.'
  },
  {
    id: 'ev_crowd_spike',
    type: 'CROWD',
    title: 'Extreme Attraction Crowd Spike',
    description: 'A tour group arrivals causes ticket lines at the primary attraction to skyrocket to 2+ hours.',
    triggerCondition: 'Crowd alert occurs',
    impactDescription: 'Reschedules the crowded attraction to a later off-peak slot (or another day) and fills the current slot with a relaxed park visit.'
  },
  {
    id: 'ev_budget_alert',
    type: 'BUDGET',
    title: 'Budget Threshold Exceeded',
    description: 'Calculated trip expenses are exceeding your planned limit by 15% due to dining or premium activities.',
    triggerCondition: 'Expenses > Budget limit',
    impactDescription: 'Triggers the engine optimizer to replace high-cost lunch/dinners with local budget street food, and switches premium sights to free sights.'
  }
];
