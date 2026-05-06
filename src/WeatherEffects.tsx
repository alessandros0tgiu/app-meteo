import React from 'react';

interface Props {
  isSunny: boolean;
  isCloudy: boolean;
  isRaining: boolean;
  isStorm: boolean;
}

// Utilizziamo React.memo per evitare il reset delle animazioni al variare dell'input in App.tsx
export const WeatherEffects: React.FC<Props> = React.memo(({ isSunny, isCloudy, isRaining, isStorm }) => {
  const Rain = () => (
    <div className="rain-container">
      {Array.from({ length: 80 }).map((_, i) => (
        <span key={i} className="raindrop" style={{ 
          left: `${Math.random() * 100}%`, 
          animationDuration: `${0.4 + Math.random()}s`, 
          opacity: Math.random() 
        }} />
      ))}
    </div>
  );

  const Clouds = () => (
    <div className="clouds-container">
      <div className="cloud c1"></div>
      <div className="cloud c2"></div>
      <div className="cloud c3"></div>
    </div>
  );

  return (
    <>
      {isSunny && <div className="sun-glow" />}
      {isCloudy && !isRaining && <Clouds />}
      {(isRaining || isStorm) && <Rain />}
      {isStorm && <div className="lightning" />}
    </>
  );
});