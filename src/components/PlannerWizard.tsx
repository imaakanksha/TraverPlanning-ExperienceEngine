import React, { useState } from 'react';
import { travelDatabase } from '../data/travelDatabase';
import { 
  MapPin, Calendar, DollarSign, Activity, 
  ChevronRight, ChevronLeft, Check, Sparkles, AlertCircle 
} from 'lucide-react';
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
  const [step, setStep] = useState(1);
  const [destId, setDestId] = useState('tokyo');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState<1 | 2 | 3>(2);
  const [pace, setPace] = useState<'Relaxed' | 'Balanced' | 'Fast-paced'>('Balanced');
  const [interests, setInterests] = useState<string[]>(['Culture', 'Nature']);
  const [dietary, setDietary] = useState<string[]>([]);
  const [mobility, setMobility] = useState<'None' | 'Stroller' | 'Wheelchair'>('None');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      destinationId: destId,
      daysCount: days,
      budgetPreference: budget,
      interests,
      dietary,
      mobility,
      pace
    });
  };

  return (
    <div className={`${styles.wizardContainer} glass-panel animate-slideup`}>
      <div className={styles.wizardHeader}>
        <div className={styles.progressTracker}>
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

      <form onSubmit={handleSubmit} className={styles.wizardBody}>
        {step === 1 && (
          <div className={styles.destGrid}>
            {destinationOptions.map(dest => (
              <div 
                key={dest.id}
                className={`${styles.destCard} ${destId === dest.id ? styles.selectedCard : ''}`}
                onClick={() => setDestId(dest.id)}
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
              <label>
                <Calendar size={18} />
                Trip Duration (Days)
              </label>
              <div className={styles.rangeSelector}>
                <input 
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
              <label>
                <DollarSign size={18} />
                Budget Class
              </label>
              <div className={styles.toggleGroup}>
                {[
                  { value: 1, label: 'Budget ($)', desc: 'Hostels & street food' },
                  { value: 2, label: 'Mid-range ($$)', desc: 'Comfort hotels & local bistros' },
                  { value: 3, label: 'Luxury ($$$)', desc: 'Boutique stays & fine dining' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
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
              <label>
                <Activity size={18} />
                Travel Pace
              </label>
              <div className={styles.toggleGroup}>
                {[
                  { value: 'Relaxed', label: 'Relaxed', desc: '1-2 activities per day' },
                  { value: 'Balanced', label: 'Balanced', desc: 'Comfortable balance' },
                  { value: 'Fast-paced', label: 'Fast-paced', desc: 'Pack in every moment' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
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
          <div className={styles.pillsGrid}>
            {interestOptions.map(interest => {
              const isSelected = interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
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
              <label>Dietary Restrictions</label>
              <div className={styles.pillsGridRow}>
                {dietaryOptions.map(diet => {
                  const isSelected = dietary.includes(diet);
                  return (
                    <button
                      key={diet}
                      type="button"
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
              <label>Mobility Accommodations</label>
              <select 
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
              <div className={styles.wizardAlert}>
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
  );
};
