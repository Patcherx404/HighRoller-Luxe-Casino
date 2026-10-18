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

const Ruleta = ({ winningNumber, mustSpin, onSpinComplete }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const screenW = window.innerWidth;
      if (screenW < 360) {
        setScale(0.72);
      } else if (screenW < 420) {
        setScale(0.82);
      } else if (screenW < 520) {
        setScale(0.92);
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const prizeIndex = wheelData.findIndex((item) => item.numberVal === winningNumber);
  const targetIndex = prizeIndex >= 0 ? prizeIndex : 0;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4px',
        maxWidth: '100%',
        overflow: 'hidden',
        height: scale < 1 ? `${380 * scale}px` : 'auto',
      }}
    >
      <div
        style={{
          transform: scale < 1 ? `scale(${scale})` : 'none',
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease',
        }}
      >
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={targetIndex}
          data={wheelData}
          outerBorderColor="#eab308"
          outerBorderWidth={8}
          innerRadius={28}
          innerBorderColor="#ca8a04"
          innerBorderWidth={4}
          radiusLineColor="#ca8a04"
          radiusLineWidth={2}
          fontSize={14}
          perpendicularText={true}
          textDistance={82}
          spinDuration={0.8}
          onStopSpinning={() => {
            if (onSpinComplete) {
              onSpinComplete();
            }
          }}
        />
      </div>
    </div>
  );
};

export default Ruleta;
