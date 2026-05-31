import React, { useState } from 'react';
import { travelDatabase } from '../data/travelDatabase';
import { 
  MapPin, Calendar, DollarSign, Activity, 
  ChevronRight, ChevronLeft, Check, Sparkles, AlertCircle, FileText, Lock
} from 'lucide-react';
import { sanitizeInput, validatePlannerInputs } from '../utils/securityUtils';
import { parseUnstructuredInput } from '../utils/unstructuredProcessor';
import logger from '../utils/logger';
import styles from './PlannerWizard.module.css';

interface PlannerWizardProps {
  onGenerate: (inputs: {
    destinationId: string;
    daysCount: number;
    budgetPreference: 1 | 2 | 3;
    interests: string[];
    dietary: string[];
    mobility: 'None' | 'Stroller' | 'Wheelchair';
    pace: 'Relaxed' | 'Balanced' | 'Fast-paced';
  }) => void;
}

export const PlannerWizard: React.FC<PlannerWizardProps> = ({ onGenerate }) => {
  const [inputMode, setInputMode] = useState<'structured' | 'unstructured'>('structured');
  
  // Structured Wizard States
  const [step, setStep] = useState(1);
  const [destId, setDestId] = useState('tokyo');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState<1 | 2 | 3>(2);
  const [pace, setPace] = useState<'Relaxed' | 'Balanced' | 'Fast-paced'>('Balanced');
  const [interests, setInterests] = useState<string[]>(['Culture', 'Nature']);
  const [dietary, setDietary] = useState<string[]>([]);
  const [mobility, setMobility] = useState<'None' | 'Stroller' | 'Wheelchair'>('None');

  // Unstructured / Ingestion States
  const [unstructuredText, setUnstructuredText] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  const destinationOptions = Object.values(travelDatabase);
  const interestOptions = ['Culture', 'Nature', 'Adventure', 'Relaxation', 'Shopping', 'Food', 'Historic'];
  const dietaryOptions = ['Vegan', 'Halal', 'Gluten-Free'];

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleDietary = (diet: string) => {
    setDietary(prev => 
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  // Standard Wizard Form Submission
  const handleSubmitStructured = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validatedInputs = {
      destinationId: sanitizeInput(destId),
      daysCount: days,
      budgetPreference: budget,
      interests: interests.map(sanitizeInput),
      dietary: dietary.map(sanitizeInput),
      mobility: mobility,
      pace: pace
    };

    const validation = validatePlannerInputs(validatedInputs);
    if (!validation.isValid) {
      alert(`Validation error: ${validation.errors.join('\n')}`);
      logger.warn('Wizard Submit: Validation failed.', { errors: validation.errors });
      return;
    }

    onGenerate(validatedInputs);
  };

  // Asynchronous Unstructured Ingestion Submission
  const handleSubmitUnstructured = async (e: React.FormEvent) => {
    e.preventDefault();
    setParsingError(null);
    setIsParsing(true);

    const safeText = sanitizeInput(unstructuredText);
    const safeKey = sanitizeInput(geminiApiKey);

    if (!safeText || safeText.trim().length < 10) {
      setParsingError('Please describe your trip preferences in detail (at least 10 characters).');
      setIsParsing(false);
      return;
    }

    logger.info('Starting unstructured travel preference parsing.', { hasApiKey: !!safeKey });

    try {
      // Parse unstructured description block
      const result = await parseUnstructuredInput(safeText, safeKey || undefined);

      // Validate parsed schema
      const validation = validatePlannerInputs(result);
      if (!validation.isValid) {
        throw new Error(`Parsed outputs failed validation: ${validation.errors.join(', ')}`);
      }

      logger.info('Unstructured travel preferences parsed successfully.', result);
      onGenerate(result);
    } catch (err: any) {
      setParsingError(err.message || 'Error processing your text. Please try again.');
      logger.error('Failed parsing unstructured text input:', err);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className={`${styles.wizardContainer} glass-panel animate-slideup`}>
      {/* Mode Selector Tabs (WCAG 2.1 AA Compliant) */}
      <div 
        role="tablist" 
        aria-label="Input preferences mode" 
        style={{
          display: 'flex',
          borderBottom: '1px solid #232330',
          paddingBottom: '12px',
          gap: '16px'
        }}
      >
        <button
          role="tab"
          aria-selected={inputMode === 'structured'}
          aria-controls="panel-structured"
          id="tab-structured"
          onClick={() => setInputMode('structured')}
          style={{
            background: 'none',
            border: 'none',
            color: inputMode === 'structured' ? '#a855f7' : '#85859e',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            padding: '8px 12px',
            borderBottom: inputMode === 'structured' ? '2px solid #a855f7' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sparkles size={16} /> Step-by-Step Wizard
        </button>
        <button
          role="tab"
          aria-selected={inputMode === 'unstructured'}
          aria-controls="panel-unstructured"
          id="tab-unstructured"
          onClick={() => setInputMode('unstructured')}
          style={{
            background: 'none',
            border: 'none',
            color: inputMode === 'unstructured' ? '#a855f7' : '#85859e',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            padding: '8px 12px',
            borderBottom: inputMode === 'unstructured' ? '2px solid #a855f7' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileText size={16} /> Describe Trip (AI Parser)
        </button>
      </div>

      {inputMode === 'structured' ? (
        <div id="panel-structured" role="tabpanel" aria-labelledby="tab-structured">
          <div className={styles.wizardHeader}>
            <div className={styles.progressTracker} aria-label="Step progress">
              {[1, 2, 3, 4].map(idx => (
                <div 
                  key={idx} 
                  className={`${styles.stepIndicator} ${step >= idx ? styles.activeStep : ''} ${step === idx ? styles.currentStep : ''}`}
                >
                  {step > idx ? <Check size={14} /> : idx}
                </div>
              ))}
            </div>
            <h2 className={styles.wizardTitle}>
              {step === 1 && 'Where do you want to explore?'}
              {step === 2 && 'Set your trip pace & budget'}
              {step === 3 && 'What are your primary interests?'}
              {step === 4 && 'Any travel constraints?'}
            </h2>
            <p className={styles.wizardSubtitle}>
              {step === 1 && 'Select a dream destination to begin crafting your customized itinerary.'}
              {step === 2 && 'Tune the timing, expense limits, and travel tempo to your style.'}
              {step === 3 && 'We will weigh these topics higher when selecting sights and landmarks.'}
              {step === 4 && 'Configure dietary preferences or physical mobility levels to safeguard plans.'}
            </p>
          </div>

          <form onSubmit={handleSubmitStructured} className={styles.wizardBody}>
            {step === 1 && (
              <div className={styles.destGrid}>
                {destinationOptions.map(dest => (
                  <div 
                    key={dest.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${dest.name}, ${dest.country}`}
                    className={`${styles.destCard} ${destId === dest.id ? styles.selectedCard : ''}`}
                    onClick={() => setDestId(dest.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setDestId(dest.id);
                      }
                    }}
                  >
                    <div className={styles.imageWrapper}>
                      <img src={dest.coverImage} alt={dest.name} className={styles.destImage} />
                      <div className={styles.destTag}>
                        <MapPin size={12} /> {dest.country}
                      </div>
                    </div>
                    <div className={styles.destContent}>
                      <h3>{dest.name}</h3>
                      <p>{dest.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className={styles.formGroupGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="duration-slider">
                    <Calendar size={18} />
                    Trip Duration (Days)
                  </label>
                  <div className={styles.rangeSelector}>
                    <input 
                      id="duration-slider"
                      type="range" 
                      min="1" 
                      max="5" 
                      value={days} 
                      onChange={(e) => setDays(parseInt(e.target.value))} 
                    />
                    <span className={styles.rangeValue}>{days} Days</span>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label id="budget-group-label">
                    <DollarSign size={18} />
                    Budget Class
                  </label>
                  <div className={styles.toggleGroup} role="radiogroup" aria-labelledby="budget-group-label">
                    {[
                      { value: 1, label: 'Budget ($)', desc: 'Hostels & street food' },
                      { value: 2, label: 'Mid-range ($$)', desc: 'Comfort hotels & local bistros' },
                      { value: 3, label: 'Luxury ($$$)', desc: 'Boutique stays & fine dining' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={budget === opt.value}
                        className={`${styles.toggleButton} ${budget === opt.value ? styles.activeToggle : ''}`}
                        onClick={() => setBudget(opt.value as 1 | 2 | 3)}
                      >
                        <span className={styles.btnLabel}>{opt.label}</span>
                        <span className={styles.btnDesc}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label id="pace-group-label">
                    <Activity size={18} />
                    Travel Pace
                  </label>
                  <div className={styles.toggleGroup} role="radiogroup" aria-labelledby="pace-group-label">
                    {[
                      { value: 'Relaxed', label: 'Relaxed', desc: '1-2 activities per day' },
                      { value: 'Balanced', label: 'Balanced', desc: 'Comfortable balance' },
                      { value: 'Fast-paced', label: 'Fast-paced', desc: 'Pack in every moment' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={pace === opt.value}
                        className={`${styles.toggleButton} ${pace === opt.value ? styles.activeToggle : ''}`}
                        onClick={() => setPace(opt.value as 'Relaxed' | 'Balanced' | 'Fast-paced')}
                      >
                        <span className={styles.btnLabel}>{opt.label}</span>
                        <span className={styles.btnDesc}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.pillsGrid} role="group" aria-label="Interests selection">
                {interestOptions.map(interest => {
                  const isSelected = interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      aria-pressed={isSelected}
                      className={`${styles.pillButton} ${isSelected ? styles.activePill : ''}`}
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                      {isSelected && <Check size={16} />}
                    </button>
                  );
                })}
              </div>
            )}

            {step === 4 && (
              <div className={styles.formGroupGrid}>
                <div className={styles.inputGroup}>
                  <label id="diet-group-label">Dietary Restrictions</label>
                  <div className={styles.pillsGridRow} role="group" aria-labelledby="diet-group-label">
                    {dietaryOptions.map(diet => {
                      const isSelected = dietary.includes(diet);
                      return (
                        <button
                          key={diet}
                          type="button"
                          aria-pressed={isSelected}
                          className={`${styles.pillButton} ${isSelected ? styles.activePill : ''}`}
                          onClick={() => toggleDietary(diet)}
                        >
                          {diet}
                          {isSelected && <Check size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="mobility-select">Mobility Accommodations</label>
                  <select 
                    id="mobility-select"
                    value={mobility} 
                    onChange={(e) => setMobility(e.target.value as 'None' | 'Stroller' | 'Wheelchair')}
                    className={styles.wizardSelect}
                  >
                    <option value="None">None (Standard walking intensity)</option>
                    <option value="Stroller">Stroller Accessible (Avoid heavy hills/exertion)</option>
                    <option value="Wheelchair">Wheelchair Accessible (Flat surfaces & elevators preferred)</option>
                  </select>
                </div>

                {interests.length === 0 && (
                  <div className={styles.wizardAlert} role="alert">
                    <AlertCircle size={18} />
                    <span>Tip: Selecting at least one interest improves your scheduling results.</span>
                  </div>
                )}
              </div>
            )}

            <div className={styles.wizardActions}>
              {step > 1 && (
                <button type="button" className="btn-secondary" onClick={handleBack}>
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              {step < 4 ? (
                <button type="button" className="btn-primary" style={{ marginLeft: 'auto' }} onClick={handleNext}>
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button type="submit" className="btn-primary" style={{ marginLeft: 'auto' }}>
                  Generate Engine Itinerary <Sparkles size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div id="panel-unstructured" role="tabpanel" aria-labelledby="tab-unstructured">
          <form onSubmit={handleSubmitUnstructured} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="unstructured-input" style={{ fontWeight: 700, color: '#f4f4f7' }}>
                Describe your dream itinerary in your own words:
              </label>
              <textarea
                id="unstructured-input"
                value={unstructuredText}
                onChange={(e) => setUnstructuredText(e.target.value)}
                placeholder="Example: I want to spend 4 days in Rome. I need wheelchair access and a relaxed schedule. I'm vegan, gluten-free, and love historical monuments and local cafes."
                style={{
                  width: '100%',
                  height: '150px',
                  backgroundColor: '#12121a',
                  border: '1px solid #232330',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '12px',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  resize: 'vertical',
                  outline: 'none'
                }}
                disabled={isParsing}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="api-key-input" style={{ fontWeight: 700, color: '#f4f4f7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> Gemini API Key (Optional):
              </label>
              <input
                id="api-key-input"
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Enter Gemini API key to trigger advanced structural parsing"
                style={{
                  width: '100%',
                  backgroundColor: '#12121a',
                  border: '1px solid #232330',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '10px',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                disabled={isParsing}
              />
              <span style={{ fontSize: '0.75rem', color: '#85859e' }}>
                *If no API key is provided, the engine automatically runs a rule-based heuristic extraction to identify coordinates and preferences.
              </span>
            </div>

            {parsingError && (
              <div 
                style={{ 
                  backgroundColor: 'rgba(244, 63, 94, 0.1)', 
                  border: '1px solid #f43f5e', 
                  borderRadius: '6px', 
                  padding: '12px', 
                  color: '#f43f5e',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                role="alert"
              >
                <AlertCircle size={18} />
                <span>{parsingError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 0' }}
              disabled={isParsing}
            >
              {isParsing ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid #a855f7',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Parsing Preferences...
                </>
              ) : (
                <>
                  Build High-Utility Plan <Sparkles size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
