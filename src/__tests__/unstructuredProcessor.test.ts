import { parseWithHeuristics, parseUnstructuredInput } from '../utils/unstructuredProcessor';

describe('Unstructured Text Preference Parser Tests', () => {
  
  it('should parse basic destination, duration, and budget level using rule-based heuristics', () => {
    const input = 'I want a luxury 4-day trip to Paris';
    const result = parseWithHeuristics(input);

    expect(result.destinationId).toBe('paris');
    expect(result.daysCount).toBe(4);
    expect(result.budgetPreference).toBe(3); // Luxury
  });

  it('should identify dietary constraints like vegan and gluten-free', () => {
    const input = 'Planning a trip to Rome, we eat vegan and gluten-free food.';
    const result = parseWithHeuristics(input);

    expect(result.destinationId).toBe('rome');
    expect(result.dietary).toContain('Vegan');
    expect(result.dietary).toContain('Gluten-Free');
  });

  it('should correctly capture stroller/wheelchair mobility accommodations', () => {
    const input = 'Traveling to Tokyo for 5 days. We need wheelchair access.';
    const result = parseWithHeuristics(input);

    expect(result.destinationId).toBe('tokyo');
    expect(result.daysCount).toBe(5);
    expect(result.mobility).toBe('Wheelchair');
  });

  it('should extract interest classifications like adventure, relaxation, and culture', () => {
    const input = 'I want to go hiking and kayak in New York, and maybe visit some museums.';
    const result = parseWithHeuristics(input);

    expect(result.destinationId).toBe('newyork');
    expect(result.interests).toContain('Adventure'); // hiking/kayak
    expect(result.interests).toContain('Culture'); // museums
  });

  it('should fall back to defaults for ambiguous parameters', () => {
    const input = 'Hello, plan a trip for me please.';
    const result = parseWithHeuristics(input);

    expect(result.destinationId).toBe('tokyo'); // Default
    expect(result.daysCount).toBe(3); // Default
    expect(result.budgetPreference).toBe(2); // Default Mid-range
    expect(result.pace).toBe('Balanced'); // Default
  });

  it('should throw an error if unstructured input is completely empty', async () => {
    await expect(parseUnstructuredInput('')).rejects.toThrow(
      'Ingestion error: Preferences block cannot be empty.'
    );
    await expect(parseUnstructuredInput('   ')).rejects.toThrow(
      'Ingestion error: Preferences block cannot be empty.'
    );
  });

  it('should automatically fall back to local heuristics if Gemini API key fails or is invalid', async () => {
    // Calling with a fake key should throw error or log warning and fall back
    const result = await parseUnstructuredInput(
      'Paris 5 days budget vegan',
      'INVALID_API_KEY'
    );

    // Should still parse successfully using the fallback heuristics
    expect(result.destinationId).toBe('paris');
    expect(result.daysCount).toBe(5);
    expect(result.budgetPreference).toBe(1); // Budget
    expect(result.dietary).toContain('Vegan');
  });
});
