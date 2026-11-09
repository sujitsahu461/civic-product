import React from 'react';
import logoMark from '../../assets/logo-mark.png';
import s from './CivicWatermarkBackground.module.css';

export const CivicWatermarkBackground: React.FC = () => {
  return (
    <div className={s.watermarkContainer} aria-hidden="true" role="presentation">
      {/* Layer 1: Ambient Brand Aura */}
      <div className={s.chromaticAura} />

      {/* Layer 2: Primary Central Blurred CivicSetu Emblem */}
      <img
        src={logoMark}
        alt=""
        className={s.logoEmblem}
        loading="eager"
        decoding="async"
      />

      {/* Layer 3: Secondary Corner Brand Depth Emblem */}
      <img
        src={logoMark}
        alt=""
        className={s.secondaryEmblem}
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

export default CivicWatermarkBackground;
