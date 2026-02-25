import React from 'react';
import Group6Light from '../../imports/Group10';
import Group6Dark from '../../imports/Group19';
import { useDarkMode } from '../lib/useDarkMode';

interface SponsorLogosProps {
  width?: number;
  className?: string;
}

// Native dimensions derived from the Figma absolute positions:
// Sicredi (rightmost) at left=80.73%, SVG width 27.8 → total ≈144px
// Dividers at left: 45.76px and 106.29px → confirms ~144px
// Height from Group4 inset top=0 bottom=4.42%, SVG height 20.03 → ≈21px
const NATIVE_W = 144;
const NATIVE_H = 21;

export default function SponsorLogos({ width = 200, className = '' }: SponsorLogosProps) {
  const isDark = useDarkMode();
  const scale = width / NATIVE_W;
  const displayH = NATIVE_H * scale;

  return (
    <div
      className={className}
      style={{ width, height: displayH, overflow: 'hidden' }}
    >
      <div
        style={{
          width: NATIVE_W,
          height: NATIVE_H,
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          // Reset fills so each SVG path uses its own default color.
          // Light: brand colors from Group10. Dark: white from Group19.
          '--fill-0': 'initial',
          '--stroke-0': 'initial',
        } as React.CSSProperties}
      >
        {isDark ? <Group6Dark /> : <Group6Light />}
      </div>
    </div>
  );
}
