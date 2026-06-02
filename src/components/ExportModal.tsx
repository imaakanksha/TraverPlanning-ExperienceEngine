import React from 'react';
import type { Itinerary } from '../utils/planningEngine';
import { travelDatabase } from '../data/travelDatabase';
import { X, Printer, Download, Compass, Award, Calendar, Sparkles } from 'lucide-react';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  itinerary
}) => {
  if (!isOpen) return null;

  const dest = travelDatabase[itinerary.destinationId];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itinerary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `traverse_itinerary_${itinerary.destinationId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className={`${styles.modalContainer} glass-panel animate-slideup`}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass className={styles.navIcon} size={20} />
            <h2 id="export-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Travel Ticket & Boarding Pass</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close export details">
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className={styles.modalBody}>
          <p className={styles.subtitle}>
            Take your Traverse optimized route circuit with you. Printable passport receipt and data export.
          </p>

          {/* Ticket Card Container */}
          <div className={styles.ticketCard} id="printable-ticket">
            {/* Ticket Top Border / Header */}
            <div className={styles.ticketHeader}>
              <div className={styles.ticketLogo}>
                <Sparkles size={16} />
                <span>TRAVERSE BOARDING PASS</span>
              </div>
              <div className={styles.ticketSerial}>
                NO. TRV-{Math.floor(100000 + Math.random() * 900000)}
              </div>
            </div>

            {/* Main Ticket Sections */}
            <div className={styles.ticketMain}>
              <div className={styles.ticketRow}>
                <div className={styles.ticketCol}>
                  <span className={styles.ticketLabel}>DESTINATION</span>
                  <strong className={styles.ticketValue}>{dest?.name.toUpperCase()}</strong>
                  <span className={styles.ticketSubValue}>{dest?.country}</span>
                </div>
                <div className={styles.ticketCol}>
                  <span className={styles.ticketLabel}>BASE CAMP HOTEL</span>
                  <strong className={styles.ticketValue}>{itinerary.hotel.name}</strong>
                  <span className={styles.ticketSubValue}>Rating: ★ {itinerary.hotel.rating}</span>
                </div>
              </div>

              <div className={styles.ticketRow}>
                <div className={styles.ticketCol}>
                  <span className={styles.ticketLabel}>PACING CLASS</span>
                  <strong className={styles.ticketValue}>{itinerary.pace.toUpperCase()}</strong>
                </div>
                <div className={styles.ticketCol}>
                  <span className={styles.ticketLabel}>DURATION</span>
                  <strong className={styles.ticketValue}>{itinerary.days.length} DAYS COMPILATION</strong>
                </div>
              </div>

              <div className={styles.ticketRow}>
                <div className={styles.ticketCol}>
                  <span className={styles.ticketLabel}>INTEREST ALIGNMENTS</span>
                  <div className={styles.ticketBadges}>
                    {itinerary.interests.map(interest => (
                      <span key={interest} className={styles.ticketBadge}>{interest}</span>
                    ))}
                  </div>
                </div>
                <div className={styles.ticketCol}>
                  <span className={styles.ticketLabel}>ESTIMATED EXPENDITURE</span>
                  <strong className={`${styles.ticketValue} ${styles.highlight}`}>${itinerary.totalCost} USD</strong>
                </div>
              </div>
            </div>

            {/* Boarding Pass Stub / Summary of Sights */}
            <div className={styles.ticketStub}>
              <div className={styles.stubHeader}>
                <Calendar size={12} />
                <span>CHRONOLOGICAL SIGHT CIRCUIT</span>
              </div>
              <div className={styles.stubRoute}>
                {itinerary.days.map(day => (
                  <div key={day.dayNumber} className={styles.stubDayRow}>
                    <span className={styles.stubDayLabel}>Day {day.dayNumber} Sights:</span>
                    <p className={styles.stubDaySights}>
                      {day.morning.activity.name} $\rightarrow$ {day.afternoon.activity.name} $\rightarrow$ {day.evening.activity.name}
                      {day.discovery && ` $\rightarrow$ ${day.discovery.activity.name}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Passport Stamps Section */}
            <div className={styles.stampsGridSection}>
              <div className={styles.stubHeader}>
                <Award size={12} />
                <span>UNLOCKED STAMPS ALBUM</span>
              </div>
              <div className={styles.stampsRow}>
                <div className={styles.stampCircle}>🗺️ <span className={styles.stampTinyLabel}>First</span></div>
                {itinerary.pace === 'Fast-paced' && <div className={styles.stampCircle}>⚡ <span className={styles.stampTinyLabel}>Tempo</span></div>}
                {itinerary.dietary.length > 0 && <div className={styles.stampCircle}>🌱 <span className={styles.stampTinyLabel}>Green</span></div>}
                {itinerary.totalCost < 400 && <div className={styles.stampCircle}>🛡️ <span className={styles.stampTinyLabel}>Thrift</span></div>}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className={styles.modalFooter}>
          <button onClick={handlePrint} className="btn-primary" style={{ gap: '8px' }}>
            <Printer size={16} /> Print Boarding Pass
          </button>
          <button onClick={handleDownloadJSON} className="btn-secondary" style={{ gap: '8px' }}>
            <Download size={16} /> Download JSON Data
          </button>
        </div>
      </div>
    </div>
  );
};
