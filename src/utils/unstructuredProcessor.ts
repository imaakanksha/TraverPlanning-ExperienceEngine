/**
 * Asynchronous unstructured text processor for Travel Planning preferences.
 * Uses Vertex AI / Gemini API when configured, falling back to a robust
 * heuristic parser rule-set for client-side autonomy.
 */

export interface ParsedTravelPreferences {
  destinationId: string;
  daysCount: number;
  budgetPreference: 1 | 2 | 3;
  interests: string[];
  dietary: string[];
  mobility: 'None' | 'Stroller' | 'Wheelchair';
  pace: 'Relaxed' | 'Balanced' | 'Fast-paced';
}

/**
 * Fallback local heuristic parser using structural keyword matching.
 */
export function parseWithHeuristics(text: string): ParsedTravelPreferences {
  const normalized = text.toLowerCase();
  
  // 1. Destination Matcher
  let destinationId = 'tokyo'; // Default
  if (normalized.includes('paris') || normalized.includes('france')) {
    destinationId = 'paris';
  } else if (normalized.includes('rome') || normalized.includes('italy')) {
    destinationId = 'rome';
  } else if (normalized.includes('new york') || normalized.includes('nyc') || normalized.includes('usa') || normalized.includes('manhattan')) {
    destinationId = 'newyork';
  } else if (normalized.includes('cairo') || normalized.includes('egypt') || normalized.includes('pyramids')) {
    destinationId = 'cairo';
  }

  // 2. Days Count Matcher (1 to 5)
  let daysCount = 3; // Default
  const daysMatch = normalized.match(/(\b[1-5]\b)\s*(day|days|night|nights)/);
  if (daysMatch && daysMatch[1]) {
    daysCount = parseInt(daysMatch[1], 10);
  } else {
    // Word-based numbers
    if (normalized.includes('one day')) daysCount = 1;
    else if (normalized.includes('two day')) daysCount = 2;
    else if (normalized.includes('three day')) daysCount = 3;
    else if (normalized.includes('four day')) daysCount = 4;
    else if (normalized.includes('five day')) daysCount = 5;
  }

  // 3. Budget Level Matcher
  let budgetPreference: 1 | 2 | 3 = 2; // Default (Mid-range)
  if (
    normalized.includes('budget') || 
    normalized.includes('cheap') || 
    normalized.includes('affordable') || 
    normalized.includes('low-cost') ||
    normalized.includes('frugal') ||
    normalized.includes('$') && !normalized.includes('$$')
  ) {
    budgetPreference = 1;
  } else if (
    normalized.includes('luxury') || 
    normalized.includes('expensive') || 
    normalized.includes('premium') || 
    normalized.includes('high-end') || 
    normalized.includes('fancy') ||
    normalized.includes('$$$')
  ) {
    budgetPreference = 3;
  }

  // 4. Travel Pace Matcher
  let pace: 'Relaxed' | 'Balanced' | 'Fast-paced' = 'Balanced';
  if (normalized.includes('relaxed') || normalized.includes('slow') || normalized.includes('easy-going') || normalized.includes('leisure')) {
    pace = 'Relaxed';
  } else if (normalized.includes('fast') || normalized.includes('hustle') || normalized.includes('packed') || normalized.includes('hectic') || normalized.includes('busy')) {
    pace = 'Fast-paced';
  }

  // 5. Mobility Level Matcher
  let mobility: 'None' | 'Stroller' | 'Wheelchair' = 'None';
  if (normalized.includes('wheelchair') || normalized.includes('disabled') || normalized.includes('accessible')) {
    mobility = 'Wheelchair';
  } else if (normalized.includes('stroller') || normalized.includes('baby') || normalized.includes('infant') || normalized.includes('pram')) {
    mobility = 'Stroller';
  }

  // 6. Dietary Flags Matcher
  const dietary: string[] = [];
  if (normalized.includes('vegan') || normalized.includes('plant-based') || normalized.includes('vegetarian')) {
    dietary.push('Vegan');
  }
  if (normalized.includes('halal') || normalized.includes('muslim-friendly')) {
    dietary.push('Halal');
  }
  if (normalized.includes('gluten-free') || normalized.includes('celiac') || normalized.includes('no wheat') || normalized.includes('gluten free')) {
    dietary.push('Gluten-Free');
  }

  // 7. Interests Matcher
  const interests: string[] = [];
  const interestMap: Record<string, string[]> = {
    'Culture': ['culture', 'museum', 'art', 'exhibition', 'gallery', 'theatre', 'broadway', 'show'],
    'Nature': ['nature', 'park', 'garden', 'outdoors', 'scenic', 'foliage', 'landscape'],
    'Adventure': ['adventure', 'hiking', 'kayak', 'climb', 'trail', 'active', 'sports'],
    'Relaxation': ['relaxation', 'spa', 'onsen', 'bath', 'thermal', 'chill', 'leisure'],
    'Shopping': ['shopping', 'store', 'market', 'mall', 'boutique', 'gear'],
    'Food': ['food', 'dining', 'eat', 'sushi', 'pizza', 'pasta', 'ramen', 'deli', 'cafe', 'restaurant'],
    'Historic': ['historic', 'temple', 'ruins', 'ancient', 'history', 'citadel', 'pyramid', 'palace']
  };

  for (const [category, keywords] of Object.entries(interestMap)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      interests.push(category);
    }
  }

  // Ensure interests is not empty, fallback to culture
  if (interests.length === 0) {
    interests.push('Culture');
  }

  return {
    destinationId,
    daysCount,
    budgetPreference,
    interests,
    dietary,
    mobility,
    pace
  };
}

/**
 * Main Asynchronous Ingestion function. Calls Gemini API when api_key is present,
 * or resolves using local structural matcher.
 */
export async function parseUnstructuredInput(
  text: string,
  apiKey?: string
): Promise<ParsedTravelPreferences> {
  // Enforce validation of basic string existence
  if (!text || text.trim().length === 0) {
    throw new Error('Ingestion error: Preferences block cannot be empty.');
  }

  if (!apiKey) {
    // No API key provided, default to local heuristics
    return parseWithHeuristics(text);
  }

  // Invoke Gemini API using REST endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `
You are a precise data extractor for the Travel Planning & Experience Engine. 
Read the following unstructured user text and extract the structured travel parameters.

User text: "${text}"

Extract the parameters based on these strict guidelines:
- destinationId: Must be one of: "tokyo", "paris", "rome", "newyork", "cairo". Default to "tokyo" if not specified.
- daysCount: Integer between 1 and 5. Default to 3.
- budgetPreference: Integer matching 1 (Budget), 2 (Mid-range / moderate), or 3 (Luxury / expensive). Default to 2.
- interests: Array of strings from the set: ["Culture", "Nature", "Adventure", "Relaxation", "Shopping", "Food", "Historic"]. Do not create new categories.
- dietary: Array of strings from the set: ["Vegan", "Halal", "Gluten-Free"].
- mobility: String, one of: "None", "Stroller", "Wheelchair".
- pace: String, one of: "Relaxed", "Balanced", "Fast-paced".

You must output a raw JSON object matching the JSON Schema. Do not wrap in markdown code blocks.
`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              destinationId: { type: 'STRING', enum: ['tokyo', 'paris', 'rome', 'newyork', 'cairo'] },
              daysCount: { type: 'INTEGER' },
              budgetPreference: { type: 'INTEGER', enum: [1, 2, 3] },
              interests: { 
                type: 'ARRAY', 
                items: { type: 'STRING', enum: ['Culture', 'Nature', 'Adventure', 'Relaxation', 'Shopping', 'Food', 'Historic'] } 
              },
              dietary: { 
                type: 'ARRAY', 
                items: { type: 'STRING', enum: ['Vegan', 'Halal', 'Gluten-Free'] } 
              },
              mobility: { type: 'STRING', enum: ['None', 'Stroller', 'Wheelchair'] },
              pace: { type: 'STRING', enum: ['Relaxed', 'Balanced', 'Fast-paced'] }
            },
            required: ['destinationId', 'daysCount', 'budgetPreference', 'interests', 'dietary', 'mobility', 'pace']
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status code ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(responseText) as ParsedTravelPreferences;
    
    // Safety check constraints
    parsed.daysCount = Math.max(1, Math.min(5, parsed.daysCount || 3));
    if (![1, 2, 3].includes(parsed.budgetPreference)) parsed.budgetPreference = 2;
    if (!['None', 'Stroller', 'Wheelchair'].includes(parsed.mobility)) parsed.mobility = 'None';
    if (!['Relaxed', 'Balanced', 'Fast-paced'].includes(parsed.pace)) parsed.pace = 'Balanced';
    if (!Array.isArray(parsed.interests) || parsed.interests.length === 0) parsed.interests = ['Culture'];

    return parsed;
  } catch (error) {
    // Fall back gracefully to heuristics
    console.warn('Gemini API call failed, falling back to local heuristics:', error);
    return parseWithHeuristics(text);
  }
}
