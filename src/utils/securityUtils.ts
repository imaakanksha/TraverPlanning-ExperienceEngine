/**
 * Custom security validation and sanitization module.
 * Protects against XSS injection vectors and malformed state models.
 */

/**
 * Sanitizes input text by removing potentially malicious HTML tags, script blocks,
 * javascript: URIs, and event handlers (e.g. onload, onerror, onclick).
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  let cleaned = input;
  
  // 1. Remove script tags and their contents
  cleaned = cleaned.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  
  // 2. Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // 3. Remove style tags and their contents
  cleaned = cleaned.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
  
  // 4. Remove onload, onerror, onclick, onmouseover, etc. handlers
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*["']?[^"'>\s]*["']?/gi, '');
  
  // 5. Remove javascript: and data: URIs
  cleaned = cleaned.replace(/href\s*=\s*["']?\s*(javascript|data)\s*:[^"'>\s]*["']?/gi, '');
  
  // 6. Escape remaining high-risk HTML entities (optional, but keep safe)
  cleaned = cleaned
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return cleaned.trim();
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates travel inputs against strict state schema boundaries.
 */
export function validatePlannerInputs(inputs: {
  destinationId: string;
  daysCount: number;
  budgetPreference: number;
  interests: string[];
  dietary: string[];
  mobility: string;
  pace: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!inputs.destinationId || typeof inputs.destinationId !== 'string') {
    errors.push('Destination ID must be a valid non-empty string.');
  }

  if (typeof inputs.daysCount !== 'number' || isNaN(inputs.daysCount) || inputs.daysCount < 1 || inputs.daysCount > 5) {
    errors.push('Duration (Days) must be a number between 1 and 5.');
  }

  if (typeof inputs.budgetPreference !== 'number' || ![1, 2, 3].includes(inputs.budgetPreference)) {
    errors.push('Budget preference must be 1 (Budget), 2 (Mid-range), or 3 (Luxury).');
  }

  if (!Array.isArray(inputs.interests)) {
    errors.push('Interests must be a valid array of strings.');
  }

  if (!Array.isArray(inputs.dietary)) {
    errors.push('Dietary requirements must be a valid array of strings.');
  }

  const validMobility = ['None', 'Stroller', 'Wheelchair'];
  if (typeof inputs.mobility !== 'string' || !validMobility.includes(inputs.mobility)) {
    errors.push(`Mobility must be one of: ${validMobility.join(', ')}.`);
  }

  const validPace = ['Relaxed', 'Balanced', 'Fast-paced'];
  if (typeof inputs.pace !== 'string' || !validPace.includes(inputs.pace)) {
    errors.push(`Pace must be one of: ${validPace.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
