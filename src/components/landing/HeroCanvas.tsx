import { useEffect, useRef, useCallback } from 'react';

/**
 * "Accumulated Traces" — Algorithmic art for the Draftly hero.
 *
 * Philosophy: Writing leaves traces. Every draft, every revision, every
 * keystroke accumulates into a visible history. This algorithm visualises
 * that idea: hundreds of fine ink lines follow a flow field, each one a
 * "draft" that contributes to a layered, organic texture. The field is
 * driven by layered simplex noise so the paths curve naturally, like
 * handwriting that finds its own rhythm. The palette is Draftly's own:
 * cobalt blue at very low opacity, building up density where paths
 * converge — the way real contribution builds in a shared document.
 *
 * The result is a living background that breathes without demanding
 * attention. It is quiet evidence of accumulated work.
 */

// Simplex noise implementation (compact, no dependencies)
function createNoise(seed: number) {
  // Permutation table seeded deterministically
  const perm = new Uint8Array(512);
  const grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
  ];

  // Seed the permutation
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function dot(g: number[], x: number, y: number) {
    return g[0] * x + g[1] * y;
  }

  return function noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = perm[ii + perm[jj]] % 12;
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 12;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot(grad3[gi0], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot(grad3[gi1], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot(grad3[gi2], x2, y2); }
    return 70 * (n0 + n1 + n2);
  };
}

interface HeroCanvasProps {
  className?: string;
}

export function HeroCanvas({ className = '' }: HeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const drawnRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || drawnRef.current) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (w === 0 || h === 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    drawnRef.current = true;

    const noise = createNoise(42);
    const PARTICLE_COUNT = Math.min(Math.floor(w * h / 800), 900);
    const STEPS = 80;
    const NOISE_SCALE = 0.0015;
    const STEP_LENGTH = 2.5;

    // Draw flow field traces
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Seed positions biased toward center-top for visual weight
      const sx = Math.random() * w;
      const sy = Math.random() * h * 0.85;

      let x = sx;
      let y = sy;

      ctx.beginPath();
      ctx.moveTo(x, y);

      for (let s = 0; s < STEPS; s++) {
        // Layer two noise octaves for organic movement
        const n1 = noise(x * NOISE_SCALE, y * NOISE_SCALE);
        const n2 = noise(x * NOISE_SCALE * 2.5 + 100, y * NOISE_SCALE * 2.5 + 100);
        const angle = (n1 + n2 * 0.4) * Math.PI * 2.8;

        x += Math.cos(angle) * STEP_LENGTH;
        y += Math.sin(angle) * STEP_LENGTH;

        // Keep within bounds
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) break;

        ctx.lineTo(x, y);
      }

      // Cobalt blue at very low opacity — traces accumulate
      const alpha = 0.012 + Math.random() * 0.018;
      ctx.strokeStyle = `rgba(0, 71, 255, ${alpha})`;
      ctx.lineWidth = 0.6 + Math.random() * 0.8;
      ctx.stroke();
    }

    // Add a few slightly more visible accent traces
    for (let i = 0; i < Math.floor(PARTICLE_COUNT * 0.06); i++) {
      const sx = w * 0.15 + Math.random() * w * 0.7;
      const sy = Math.random() * h * 0.6;

      let x = sx;
      let y = sy;

      ctx.beginPath();
      ctx.moveTo(x, y);

      for (let s = 0; s < STEPS * 1.2; s++) {
        const n1 = noise(x * NOISE_SCALE * 0.8, y * NOISE_SCALE * 0.8 + 500);
        const angle = n1 * Math.PI * 3;

        x += Math.cos(angle) * STEP_LENGTH * 1.1;
        y += Math.sin(angle) * STEP_LENGTH * 1.1;

        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) break;

        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `rgba(0, 71, 255, 0.04)`;
      ctx.lineWidth = 1 + Math.random() * 0.5;
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    // Defer drawing to next frame so layout has settled
    animRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      drawnRef.current = false;
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.55 }}
    />
  );
}
