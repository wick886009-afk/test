'use client';
import React, { useRef, useState } from 'react';

/**
 * ============================================================================
 * 3D PERSPECTIVE TILT CARD WITH INTERACTIVE SPECULAR LIGHTING
 * - Provides subtle mouse-responsive 3D perspective tilt (`rotateX`, `rotateY`)
 *   and cursor-tracking radial glare.
 * - Automatically disables tilt on small touch screens or when
 *   `prefers-reduced-motion` is enabled.
 * ============================================================================
 */

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTiltDeg?: number;
  onClick?: () => void;
}

export default function TiltCard({
  children,
  className = '',
  maxTiltDeg = 6,
  onClick
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [transformStyle, setTransformStyle] = useState<string>(
    'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
  );
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
    const relY = (e.clientY - rect.top) / Math.max(1, rect.height);

    const rotY = (relX - 0.5) * maxTiltDeg * 2;
    const rotX = (0.5 - relY) * maxTiltDeg * 2;

    setTransformStyle(
      `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.012, 1.012, 1.012)`
    );
    setGlarePos({
      x: Math.round(relX * 100),
      y: Math.round(relY * 100),
      opacity: 0.14
    });
  };

  const handleMouseLeave = () => {
    setTransformStyle('perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
      }}
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 228, 230, ${glarePos.opacity}), transparent 65%)`,
          transition: 'opacity 220ms ease'
        }}
        className="pointer-events-none absolute inset-0 z-10"
      />
      <div className="relative z-20 h-full">{children}</div>
    </div>
  );
}
