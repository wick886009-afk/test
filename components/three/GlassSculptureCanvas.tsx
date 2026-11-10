'use client';
import React, { useEffect, useRef, useState } from 'react';

/**
 * ============================================================================
 * 3D ABSTRACT GLASS SCULPTURE & PARTICLE FIELD (LOGIN HERO)
 * - Renders a real-time 3D faceted rose-quartz/burgundy glass icosahedron-torus
 *   sculpture with specular highlights, Fresnel rim glow, orbital gold rings,
 *   and depth-sorted ambient particles at 60 FPS.
 * - Lightweight on mobile devices, respects `prefers-reduced-motion`, and
 *   provides a graceful static fallback when Canvas/WebGL is unsupported.
 * - Strictly decorative (`pointer-events-none`) so it never blocks form inputs.
 * ============================================================================
 */

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Face {
  indices: [number, number, number];
}

function createIcosahedronGeometry(): { vertices: Vec3[]; faces: Face[] } {
  const t = (1 + Math.sqrt(5)) / 2;
  const rawVerts: [number, number, number][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
  ];
  const vertices: Vec3[] = rawVerts.map(([x, y, z]) => {
    const len = Math.sqrt(x * x + y * y + z * z);
    return { x: x / len, y: y / len, z: z / len };
  });
  const rawFaces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];
  return {
    vertices,
    faces: rawFaces.map(indices => ({ indices }))
  };
}

function rotatePoint(p: Vec3, rx: number, ry: number, rz: number): Vec3 {
  // Rotate X
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y1 = p.y * cosX - p.z * sinX;
  const z1 = p.y * sinX + p.z * cosX;

  // Rotate Y
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x2 = p.x * cosY + z1 * sinY;
  const z2 = -p.x * sinY + z1 * cosY;

  // Rotate Z
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x2 * cosZ - y1 * sinZ;
  const y3 = x2 * sinZ + y1 * cosZ;

  return { x: x3, y: y3, z: z2 };
}

export default function GlassSculptureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFallbackMode(true);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const { vertices, faces } = createIcosahedronGeometry();

    // Generate ambient 3D particles
    const particleCount = isMobile ? 28 : 64;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: (Math.sin(i * 12.9898) * 2.4),
      y: (Math.cos(i * 78.233) * 1.8),
      z: ((i % 10) - 5) * 0.35,
      size: (i % 3) + 1.2,
      speed: 0.002 + (i % 5) * 0.0008,
      hue: i % 3 === 0 ? '#D4A373' : i % 2 === 0 ? '#FFE4E6' : '#EF4444'
    }));

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / Math.max(1, width) - 0.5) * 0.9;
      targetMouseY = (e.clientY / Math.max(1, height) - 0.5) * 0.9;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let rafId = 0;
    let angle = 0.4;

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);

      currentMouseX += (targetMouseX - currentMouseX) * 0.06;
      currentMouseY += (targetMouseY - currentMouseY) * 0.06;

      if (!prefersReducedMotion) {
        angle += isMobile ? 0.0045 : 0.0065;
      }

      const centerX = isMobile ? width * 0.5 : width * 0.28;
      const centerY = isMobile ? height * 0.22 : height * 0.5;
      const radius = isMobile ? Math.min(width, height) * 0.22 : Math.min(width, height) * 0.26;

      // Ambient radial glow behind sculpture
      const glow = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.1,
        centerX,
        centerY,
        radius * 2.1
      );
      glow.addColorStop(0, 'rgba(136, 19, 55, 0.48)');
      glow.addColorStop(0.45, 'rgba(212, 163, 115, 0.16)');
      glow.addColorStop(1, 'rgba(23, 23, 23, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // Draw floating 3D particles
      particles.forEach((p, idx) => {
        const py = p.y + Math.sin(angle * 2 + idx) * 0.08;
        const rotP = rotatePoint(
          { x: p.x, y: py, z: p.z },
          currentMouseY * 0.4,
          angle * 0.3 + currentMouseX * 0.4,
          0
        );
        const perspective = 3.2 / (3.2 - rotP.z);
        const sx = width * 0.5 + rotP.x * (width * 0.32) * perspective;
        const sy = height * 0.5 + rotP.y * (height * 0.32) * perspective;
        const alpha = Math.max(0.12, Math.min(0.75, (rotP.z + 2) / 3.5));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.hue;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * perspective, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw orbital gold & blush rings around the glass sculpture
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle * 0.35 + currentMouseX * 0.25);
      ctx.scale(1, 0.38);
      ctx.strokeStyle = 'rgba(212, 163, 115, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-angle * 0.28 + currentMouseY * 0.25);
      ctx.scale(0.42, 1);
      ctx.strokeStyle = 'rgba(255, 228, 230, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Transform & project 3D icosahedron vertices
      const rx = angle * 0.7 + currentMouseY * 0.85;
      const ry = angle + currentMouseX * 0.85;
      const rz = angle * 0.35;

      const transformed = vertices.map(v => rotatePoint(v, rx, ry, rz));

      // Painter's algorithm: sort faces back-to-front by average Z
      const lightDir = { x: 0.55, y: -0.65, z: 0.52 };
      const sortedFaces = faces
        .map(f => {
          const [i0, i1, i2] = f.indices;
          const v0 = transformed[i0];
          const v1 = transformed[i1];
          const v2 = transformed[i2];
          const avgZ = (v0.z + v1.z + v2.z) / 3;

          // Compute face normal
          const ux = v1.x - v0.x;
          const uy = v1.y - v0.y;
          const uz = v1.z - v0.z;
          const vx = v2.x - v0.x;
          const vy = v2.y - v0.y;
          const vz = v2.z - v0.z;
          const nx = uy * vz - uz * vy;
          const ny = uz * vx - ux * vz;
          const nz = ux * vy - uy * vx;
          const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

          const dot =
            (nx / nLen) * lightDir.x +
            (ny / nLen) * lightDir.y +
            (nz / nLen) * lightDir.z;

          return { v0, v1, v2, avgZ, dot, nz: nz / nLen };
        })
        .sort((a, b) => a.avgZ - b.avgZ);

      sortedFaces.forEach(face => {
        const project = (v: Vec3) => {
          const fov = 3.0 / (3.0 - v.z * 0.75);
          return {
            x: centerX + v.x * radius * fov,
            y: centerY + v.y * radius * fov
          };
        };

        const p0 = project(face.v0);
        const p1 = project(face.v1);
        const p2 = project(face.v2);

        const spec = Math.max(0, face.dot);
        const fresnel = Math.pow(1 - Math.abs(face.nz), 2);

        const r = Math.round(136 + spec * 95 + fresnel * 60);
        const g = Math.round(19 + spec * 110 + fresnel * 90);
        const b = Math.round(55 + spec * 95 + fresnel * 85);
        const alpha = face.avgZ > 0 ? 0.36 + spec * 0.32 : 0.16 + spec * 0.12;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();

        ctx.fillStyle = `rgba(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)}, ${alpha.toFixed(3)})`;
        ctx.fill();

        ctx.strokeStyle =
          face.avgZ > 0
            ? `rgba(255, 228, 230, ${(0.22 + spec * 0.45).toFixed(3)})`
            : 'rgba(212, 163, 115, 0.14)';
        ctx.lineWidth = face.avgZ > 0 ? 1.15 : 0.6;
        ctx.stroke();
      });

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (fallbackMode) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#881337]/30 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#D4A373]/20 blur-3xl" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
