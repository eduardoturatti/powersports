import React from 'react';
import Frame from '../../imports/Frame16';
import { useDarkMode } from '../lib/useDarkMode';

interface PowerLogoProps {
  width?: number;
  className?: string;
}

// Native dimensions from Frame16:
// Group1 (icon) = 141.288 x 40.509, gaps + divider + text group (103px)
// Total: 141.288 + 16 + 0.25 + 16 + 103 ≈ 277
const NATIVE_W = 277;
const NATIVE_H = 41;

export default function PowerLogo({ width = 200, className = '' }: PowerLogoProps) {
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
          // In dark mode: override fills/strokes to white for visibility.
          // In light mode: reset to initial so brand colors show (black text + green accents).
          '--fill-0': isDark ? 'white' : 'initial',
          '--stroke-0': isDark ? 'white' : 'initial',
        } as React.CSSProperties}
      >
        <Frame />
      </div>
    </div>
  );
}