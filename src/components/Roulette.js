import React, { useState, useEffect } from "react";
import 'react-roulette-pro/dist/index.css';
import { Wheel } from 'react-custom-roulette';

// Authentic European Roulette wheel sequence (37 pockets)
export const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

export const getNumberColor = (num) => {
  if (num === 0) return 'green';
  return RED_NUMBERS.has(num) ? 'red' : 'black';
};

const wheelData = ROULETTE_NUMBERS.map((num) => {
  const color = getNumberColor(num);
  let bg = '#111827';
  if (color === 'red') bg = '#dc2626';
  else if (color === 'green') bg = '#16a34a';

  return {
    option: String(num),
    numberVal: num,
    style: {
      backgroundColor: bg,
      textColor: '#ffffff',
    },
  };
});

const Ruleta = ({
  winningNumber,
  mustSpin,
  onSpinComplete,
  onSpinClick,
  totalBet = 0,
  lastWin = null,
  chips = 0,
}) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      // Tailor scale for Playtech layout on mobile and PC screens (Big but fits table)
      if (screenW < 360 || screenH < 620) {
        setScale(0.55);
      } else if (screenW < 420 || screenH < 700) {
        setScale(0.62);
      } else if (screenW < 768) {
        setScale(0.70);
      } else if (screenH < 750) {
        setScale(0.78);
      } else {
        setScale(0.85);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const prizeIndex = wheelData.findIndex((item) => item.numberVal === winningNumber);
  const targetIndex = prizeIndex >= 0 ? prizeIndex : 0;
  const winColor = getNumberColor(winningNumber);

  const canSpin = !mustSpin && totalBet > 0 && chips >= totalBet;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0',
        width: '100%',
        maxWidth: '100%',
        overflow: 'visible',
        height: `${340 * scale}px`,
        position: 'relative',
        zIndex: 10,
        margin: '1px auto',
      }}
    >
      <style>{`
        .full-circle-wheel-wrapper > div {
          width: 340px !important;
          max-width: 340px !important;
          height: 340px !important;
          max-height: 340px !important;
          border-radius: 50% !important;
          margin: 0 auto !important;
          position: relative !important;
          overflow: visible !important;
        }
        .full-circle-wheel-wrapper canvas {
          border-radius: 50% !important;
          box-shadow: 0 0 25px rgba(0, 0, 0, 0.95), 0 0 15px rgba(245, 158, 11, 0.3) !important;
        }
      `}</style>
      <div
        className="full-circle-wheel-wrapper"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease',
          position: 'relative',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 12px 30px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.85), 0 0 20px rgba(202, 138, 4, 0.4)',
          background: 'radial-gradient(circle, #5c2710 0%, #3d1708 65%, #200a02 100%)',
          border: '7px solid #a16207',
        }}
      >
        {/* 37-Pocket European Wheel (Playtech Luxury Style with authentic pointer) */}
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={targetIndex}
          data={wheelData}
          outerBorderColor="#ca8a04"
          outerBorderWidth={7}
          innerRadius={36}
          innerBorderColor="#854d0e"
          innerBorderWidth={4}
          radiusLineColor="#ca8a04"
          radiusLineWidth={2}
          fontSize={12}
          perpendicularText={true}
          textDistance={82}
          spinDuration={0.8}
          onStopSpinning={() => {
            if (onSpinComplete) {
              onSpinComplete();
            }
          }}
        />

        {/* 🌟 USER REQUEST: SPIN BUTTON INSIDE OF ROULETTE WHEEL 🌟 */}
        <button
          type="button"
          onClick={onSpinClick}
          disabled={mustSpin}
          aria-label={mustSpin ? "Spinning..." : totalBet > 0 ? "Spin Roulette Wheel" : "Place Bet to Spin"}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '102px',
            height: '102px',
            borderRadius: '50%',
            zIndex: 30,
            cursor: mustSpin ? 'not-allowed' : 'pointer',
            border: lastWin && lastWin > 0
              ? '3.5px solid #34d399'
              : totalBet > 0
              ? '3.5px solid #fef08a'
              : '3px solid #64748b',
            background: mustSpin
              ? 'radial-gradient(circle at 35% 35%, #854d0e 0%, #451a03 70%, #1c1917 100%)'
              : lastWin && lastWin > 0
              ? 'radial-gradient(circle at 35% 35%, #10b981 0%, #047857 60%, #064e3b 100%)'
              : totalBet > 0
              ? 'radial-gradient(circle at 35% 35%, #fde047 0%, #f59e0b 45%, #b45309 85%, #78350f 100%)'
              : 'radial-gradient(circle at 35% 35%, #334155 0%, #1e293b 70%, #0f172a 100%)',
            boxShadow: mustSpin
              ? '0 0 25px rgba(234, 179, 8, 0.4), inset 0 2px 4px rgba(255,255,255,0.4)'
              : lastWin && lastWin > 0
              ? '0 0 30px rgba(16, 185, 129, 0.9), inset 0 2px 5px rgba(255,255,255,0.8), inset 0 -3px 6px rgba(0,0,0,0.6)'
              : totalBet > 0
              ? '0 0 28px rgba(245, 158, 11, 0.8), 0 4px 14px rgba(0,0,0,0.6), inset 0 2px 5px rgba(255,255,255,0.8), inset 0 -3px 6px rgba(0,0,0,0.6)'
              : '0 2px 10px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 0,
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            userSelect: 'none',
            outline: 'none',
          }}
          onMouseDown={(e) => {
            if (!mustSpin) e.currentTarget.style.transform = 'translate(-50%, -50%) scale(0.94)';
          }}
          onMouseUp={(e) => {
            if (!mustSpin) e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
          }}
          onTouchStart={(e) => {
            if (!mustSpin) e.currentTarget.style.transform = 'translate(-50%, -50%) scale(0.94)';
          }}
          onTouchEnd={(e) => {
            if (!mustSpin) e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
          }}
        >
          {mustSpin ? (
            /* Spinning state */
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '3px solid rgba(254, 240, 138, 0.3)',
                  borderTopColor: '#fef08a',
                  animation: 'spin 0.6s linear infinite',
                  margin: '0 auto 4px',
                }}
              />
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  color: '#fef08a',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  display: 'block',
                  textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                }}
              >
                SPINNING
              </span>
            </div>
          ) : lastWin !== null && lastWin > 0 ? (
            /* Winner celebration inside wheel hub */
            <div style={{ textAlign: 'center', lineHeight: 1 }}>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  color: '#d1fae5',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                🎉 WINNER!
              </span>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: winColor === 'red' ? '#dc2626' : winColor === 'green' ? '#16a34a' : '#0f172a',
                  border: '1.5px solid #fbbf24',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  margin: '2px 0',
                }}
              >
                {winningNumber}
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  color: '#fef08a',
                  fontFamily: 'monospace',
                  display: 'block',
                  marginTop: '1px',
                }}
              >
                +₱{lastWin}
              </span>
            </div>
          ) : totalBet > 0 ? (
            /* Ready to spin with active bet */
            <div style={{ textAlign: 'center', lineHeight: 1 }}>
              <span
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  color: '#78350f',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '1px',
                }}
              >
                TAP TO
              </span>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 950,
                  color: '#000',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  display: 'block',
                  textShadow: '0 1px 0 rgba(255,255,255,0.7)',
                }}
              >
                SPIN
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  color: '#451a03',
                  fontFamily: 'monospace',
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.5)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginTop: '2px',
                }}
              >
                ₱{totalBet}
              </span>
            </div>
          ) : (
            /* Idle state: prompts player to place bet */
            <div style={{ textAlign: 'center', lineHeight: 1.15 }}>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  color: '#cbd5e1',
                  letterSpacing: '0.5px',
                  display: 'block',
                }}
              >
                TAP BETS
              </span>
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: '#fbbf24',
                  letterSpacing: '1px',
                  display: 'block',
                  margin: '2px 0',
                }}
              >
                SPIN
              </span>
              <span
                style={{
                  fontSize: '0.55rem',
                  fontWeight: 800,
                  color: '#94a3b8',
                  display: 'block',
                }}
              >
                CENTER
              </span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Ruleta;
