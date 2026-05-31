import React, { useMemo } from 'react';
import type { Itinerary } from '../utils/planningEngine';
import { DollarSign, ShieldAlert, Sparkles, TrendingDown } from 'lucide-react';
import styles from './ExpenseAnalytics.module.css';

interface ExpenseAnalyticsProps {
  itinerary: Itinerary;
  targetBudgetLimit: number;
}

export const ExpenseAnalytics: React.FC<ExpenseAnalyticsProps> = ({
  itinerary,
  targetBudgetLimit
}) => {
  // Aggregate expenses by category
  const expenseSummary = useMemo(() => {
    let accommodation = itinerary.hotel.costApprox * itinerary.days.length;
    let dining = 0;
    let sights = 0;
    let transport = 0;

    itinerary.days.forEach(day => {
      // dining
      dining += day.breakfast.restaurant.costApprox;
      dining += day.lunch.restaurant.costApprox;
      dining += day.dinner.restaurant.costApprox;

      // sights
      sights += day.morning.activity.costApprox;
      sights += day.afternoon.activity.costApprox;
      sights += day.evening.activity.costApprox;

      // transit
      transport += day.breakfast.transitToNext?.costApprox || 0;
      transport += day.morning.transitToNext?.costApprox || 0;
      transport += day.lunch.transitToNext?.costApprox || 0;
      transport += day.afternoon.transitToNext?.costApprox || 0;
      transport += day.dinner.transitToNext?.costApprox || 0;
      transport += day.evening.transitToNext?.costApprox || 0;
    });

    const total = accommodation + dining + sights + transport;

    return {
      accommodation,
      dining,
      sights,
      transport,
      total
    };
  }, [itinerary]);

  const { accommodation, dining, sights, transport, total } = expenseSummary;

  // Compute donut percentages
  const percentages = useMemo(() => {
    if (total === 0) return { lodging: 25, food: 25, activities: 25, transit: 25 };
    return {
      lodging: Math.round((accommodation / total) * 100),
      food: Math.round((dining / total) * 100),
      activities: Math.round((sights / total) * 100),
      transit: Math.round((transport / total) * 100)
    };
  }, [accommodation, dining, sights, transport, total]);

  // SVG Donut Calculations
  // Radius R = 50, Circumference C = 2 * pi * R = 314.16
  const donutData = useMemo(() => {
    const C = 314.16;
    const slices = [
      { name: 'Lodging', value: accommodation, percentage: percentages.lodging, color: 'var(--accent-primary)' },
      { name: 'Dining', value: dining, percentage: percentages.food, color: 'var(--accent-secondary)' },
      { name: 'Activities', value: sights, percentage: percentages.activities, color: 'var(--accent-cyan)' },
      { name: 'Transport', value: transport, percentage: percentages.transit, color: 'var(--warning)' }
    ];

    let accumulatedPercentage = 0;
    return slices.map(slice => {
      const strokeDasharray = `${(slice.percentage * C) / 100} ${C}`;
      const strokeDashoffset = `${C - (accumulatedPercentage * C) / 100}`;
      accumulatedPercentage += slice.percentage;

      return {
        ...slice,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [accommodation, dining, sights, transport, percentages, total]);

  const budgetRatio = total / targetBudgetLimit;
  const budgetPercentageText = Math.round(budgetRatio * 100);

  const budgetStatus = () => {
    if (budgetRatio <= 0.85) return { label: 'Budget Healthy', colorClass: styles.statusGreen };
    if (budgetRatio <= 1.0) return { label: 'Nearing Target Limit', colorClass: styles.statusYellow };
    return { label: 'Limit Exceeded! Optimize Recommended', colorClass: styles.statusRed };
  };

  const status = budgetStatus();

  return (
    <div className={styles.analyticsLayout}>
      {/* Visual Charts Card */}
      <div className={`${styles.chartCard} glass-panel animate-fade`}>
        <h3 className={styles.panelTitle}>Expense Allocation Breakdown</h3>
        
        <div className={styles.chartFlex}>
          {/* SVG Donut */}
          <div className={styles.donutWrapper}>
            <svg viewBox="0 0 140 140" width="100%" height="100%" className={styles.donutSvg}>
              {/* Stacking circles representing slices */}
              {donutData.map((slice, i) => (
                <circle
                  key={i}
                  cx="70"
                  cy="70"
                  r="50"
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="16"
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  transform="rotate(-90 70 70)"
                  className={styles.donutSegment}
                />
              ))}
              {/* Inner hole */}
              <circle cx="70" cy="70" r="40" fill="hsl(var(--bg-card))" />
              
              {/* Text center */}
              <text x="70" y="66" textAnchor="middle" className={styles.centerTextVal}>
                ${total}
              </text>
              <text x="70" y="82" textAnchor="middle" className={styles.centerTextLabel}>
                Total Spent
              </text>
            </svg>
          </div>

          {/* Donut Legend */}
          <div className={styles.chartLegend}>
            {donutData.map((slice, i) => (
              <div key={i} className={styles.legendRow}>
                <span className={styles.legendColorBox} style={{ backgroundColor: slice.color }} />
                <div className={styles.legendText}>
                  <div className={styles.legendName}>{slice.name}</div>
                  <div className={styles.legendValues}>
                    <span>${slice.value}</span>
                    <span>({slice.percentage}%)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Budget Meter Card */}
      <div className={`${styles.meterCard} glass-panel animate-fade`}>
        <h3 className={styles.panelTitle}>Budget Safety Threshold</h3>
        
        <div className={styles.meterProgressArea}>
          <div className={styles.labelRow}>
            <span>Target Boundary: ${targetBudgetLimit}</span>
            <span className={`${styles.statusText} ${status.colorClass}`}>{status.label}</span>
          </div>

          <div className={styles.meterContainer}>
            <div 
              className={`${styles.meterFill} ${budgetRatio > 1.0 ? styles.fillDanger : budgetRatio > 0.85 ? styles.fillWarning : styles.fillSuccess}`}
              style={{ width: `${Math.min(100, budgetPercentageText)}%` }}
            />
          </div>

          <div className={styles.percentTextRow}>
            <span>0%</span>
            <span className={styles.currentRatioLabel}>{budgetPercentageText}% Consumed</span>
            <span>100% Limit</span>
          </div>
        </div>

        {/* Dynamic Optimization Assistant advice box */}
        <div className={styles.advisorBox}>
          {budgetRatio > 1.0 ? (
            <div className={styles.advisorAlert}>
              <ShieldAlert size={20} className={styles.alertIconRed} />
              <div className={styles.advisorText}>
                <h5>Budget Limit Exhausted!</h5>
                <p>
                  Your current schedule surpasses the preferred limit. Trigger the <strong>"Budget Shield"</strong> event in the simulator to auto-optimize dinners to street foods and activities to free cultural parks, saving cash.
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.advisorTip}>
              <TrendingDown size={20} className={styles.alertIconGreen} />
              <div className={styles.advisorText}>
                <h5>Financial Healthy</h5>
                <p>
                  Great planning! You are within your limit. Swapping standard dining slots to Michelin-rated dinners or adding premium helicopter tours will elevate the budget but provide premium milestones.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Savings Tracker Card */}
        <div className={`${styles.statsGrid} glass-card`}>
          <div className={styles.statItem}>
            <span className={styles.statIcon}><DollarSign size={16} /></span>
            <div className={styles.statValue}>
              <span>Average Daily:</span>
              <strong>${Math.round(total / itinerary.days.length)} / day</strong>
            </div>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}><Sparkles size={16} /></span>
            <div className={styles.statValue}>
              <span>Pace Rating:</span>
              <strong>{itinerary.pace} Activity Index</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
