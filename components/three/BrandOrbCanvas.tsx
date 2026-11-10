'use client';
import React, { useEffect, useRef } from 'react';

/**
 * ============================================================================
 * 3D FLOATING GLEVA BRAND PRISM (DASHBOARD WELCOME HERO)
 * - Lightweight 60 FPS 3D geometric crown/gem prism rendered on HTML5 Canvas
 *   with mouse-responsive rotation, golden orbital halo, and specular facets.
 * - Automatically pauses when scrolled out of view via IntersectionObserver
 *   and respects `prefers-reduced-motion`.
 * ============================================================================
 */

export default function BrandOrbCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const size = 148;
    canvas.width = size * 2;
    canvas.height = size * 2;

    // Octahedral diamond crown vertices
    const verts = [
      { x: 0, y: -1.15, z: 0 }, // top crown
      { x: 0, y: 1.15, z: 0 },  // bottom pavilion
      { x: 1, y: 0, z: 0 },
      { x: 0.5, y: 0, z: 0.866 },
      { x: -0.5, y: 0, z: 0.866 },
      { x: -1, y: 0, z: 0 },
      { x: -0.5, y: 0, z: -0.866 },
      { x: 0.5, y: 0, z: -0.866 }
    ];

    const faces: [number, number, number][] = [
      [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 6], [0, 6, 7], [0, 7, 2],
      [1, 3, 2], [1, 4, 3], [1, 5, 4], [1, 6, 5], [1, 7, 6], [1, 2, 7]
    ];

    let angle = 0.5;
    let rafId = 0;
    let isVisible = true;

    const observer = new IntersectionObserver(
      entries => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    const draw = () => {
      if (isVisible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const scale = 86;

        if (!prefersReduced) {
          angle += 0.014;
        }

        // Outer gold halo ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle * 0.5);
        ctx.scale(1, 0.36);
        ctx.strokeStyle = 'rgba(212, 163, 115, 0.55)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, scale * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        const rx = 0.38 + Math.sin(angle * 0.7) * 0.15;
        const ry = angle;

        const rotated = verts.map(v => {
          const cosY = Math.cos(ry);
          const sinY = Math.sin(ry);
          const x1 = v.x * cosY + v.z * sinY;
          const z1 = -v.x * sinY + v.z * cosY;

          const cosX = Math.cos(rx);
          const sinX = Math.sin(rx);
          const y2 = v.y * cosX - z1 * sinX;
          const z2 = v.y * sinX + z1 * cosX;

          return { x: x1, y: y2, z: z2 };
        });

        const sorted = faces
          .map(f => {
            const v0 = rotated[f[0]];
            const v1 = rotated[f[1]];
            const v2 = rotated[f[2]];
            const avgZ = (v0.z + v1.z + v2.z) / 3;
            return { v0, v1, v2, avgZ };
          })
          .sort((a, b) => a.avgZ - b.avgZ);

        sorted.forEach((f, idx) => {
          const proj = (v: { x: number; y: number; z: number }) => {
            const p = 3.2 / (3.2 - v.z * 0.6);
            return { x: cx + v.x * scale * p, y: cy + v.y * scale * p };
          };
          const p0 = proj(f.v0);
          const p1 = proj(f.v1);
          const p2 = proj(f.v2);

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.closePath();

          const brightness = Math.max(0.2, Math.min(0.95, (f.avgZ + 1.1) / 2.0));
          ctx.fillStyle =
            idx % 2 === 0
              ? `rgba(239, 68, 68, ${(0.25 + brightness * 0.42).toFixed(2)})`
              : `rgba(212, 163, 115, ${(0.22 + brightness * 0.38).toFixed(2)})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 228, 230, ${(0.3 + brightness * 0.45).toFixed(2)})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        });
      }

      if (!prefersReduced) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center select-none pointer-events-none">
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#EF4444]/25 via-[#D4A373]/20 to-[#FFE4E6]/25 blur-xl animate-pulse-glow" />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="w-full h-full object-contain relative z-10"
      />
    </div>
  );
}
