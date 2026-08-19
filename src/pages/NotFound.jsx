import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Sliders,
  Compass,
  FileQuestion,
  Home,
  Layers,
  ChevronRight,
  Zap,
} from 'lucide-react';

// Pseudo-random seeded generator
function createSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function NotFound() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Generative Art Parameters (Algorithmic Philosophy: Telemetry Harmonics)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 89999) + 10000);
  const [particleCount, setParticleCount] = useState(65);
  const [connectDistance, setConnectDistance] = useState(110);
  const [driftSpeed, setDriftSpeed] = useState(1.2);
  const [showControls, setShowControls] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000, active: false });

  // Handle seed randomization
  const randomizeSeed = useCallback(() => {
    setSeed(Math.floor(Math.random() * 89999) + 10000);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 380);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio || 380;
    };
    window.addEventListener('resize', handleResize);

    const rng = createSeededRandom(seed);

    // Initialize Telemetry Nodes
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = rng() * Math.PI * 2;
      const speed = (0.4 + rng() * 0.8) * driftSpeed;
      particles.push({
        x: rng() * width,
        y: rng() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.8 + rng() * 2.4,
        baseHue: rng() > 0.35 ? '#0047FF' : '#94A3B8',
        pulse: rng() * Math.PI * 2,
        pulseSpeed: 0.02 + rng() * 0.03,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Draw subtle background telemetry coordinate grid
      ctx.strokeStyle = 'rgba(0, 71, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40 * window.devicePixelRatio;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.pulse += p.pulseSpeed;

        // Mouse gravity attraction / gentle repulsion
        if (mousePos.active) {
          const mDx = mousePos.x * window.devicePixelRatio - p.x;
          const mDy = mousePos.y * window.devicePixelRatio - p.y;
          const mDist = Math.hypot(mDx, mDy);
          if (mDist < 160 * window.devicePixelRatio && mDist > 5) {
            const force = (160 * window.devicePixelRatio - mDist) / 1200;
            p.vx += (mDx / mDist) * force * 0.35;
            p.vy += (mDy / mDist) * force * 0.35;
          }
        }

        // Harmonic orbital drift
        p.vx += Math.sin(time + p.y * 0.005) * 0.02;
        p.vy += Math.cos(time + p.x * 0.005) * 0.02;

        // Damping
        p.vx *= 0.985;
        p.vy *= 0.985;

        p.x += p.vx;
        p.y += p.vy;

        // Screen wrap
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw connections / filaments
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = connectDistance * window.devicePixelRatio;

          if (dist < maxDist) {
            const alpha = Math.pow(1 - dist / maxDist, 1.4) * 0.45;
            ctx.strokeStyle = p.baseHue === '#0047FF' || p2.baseHue === '#0047FF'
              ? `rgba(0, 71, 255, ${alpha})`
              : `rgba(148, 163, 184, ${alpha * 0.6})`;
            ctx.lineWidth = (1 - dist / maxDist) * 1.5 * window.devicePixelRatio;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw node
        const currentR = p.radius + Math.sin(p.pulse) * 0.8;
        ctx.fillStyle = p.baseHue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentR * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();

        // Glow halo on blue nodes
        if (p.baseHue === '#0047FF') {
          ctx.fillStyle = 'rgba(0, 71, 255, 0.15)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentR * 2.5 * window.devicePixelRatio, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [seed, particleCount, connectDistance, driftSpeed, mousePos]);

  return (
    <main className="min-h-screen w-screen bg-[#ECEAE5] flex flex-col justify-between font-sans antialiased text-[#1A1A1B] p-4 sm:p-8 select-none">
      
      {/* 1. Header with Brand & Status */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 shrink-0">
        <div className="flex items-center gap-3">
          <BrandMark variant="wordmark" className="h-5" />
          <span className="text-gray-300">/</span>
          <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider font-bold">
            Telemetry Fault
          </span>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5 text-[#0047FF]" />
          <span>Dashboard</span>
        </Link>
      </header>

      {/* 2. Central 404 Canvas & Message Card */}
      <div className="max-w-3xl w-full mx-auto my-auto bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden flex flex-col">
        
        {/* Generative Interactive Canvas Area */}
        <div
          className="relative h-64 sm:h-72 w-full bg-[#F9F8F6] border-b border-gray-200 overflow-hidden cursor-crosshair group"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              active: true,
            });
          }}
          onMouseLeave={() => setMousePos((p) => ({ ...p, active: false }))}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Floating 404 Typography Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
            <span className="text-7xl sm:text-8xl font-black font-mono tracking-tighter text-[#1A1A1B]/90 drop-shadow-sm select-none">
              404
            </span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-xs rounded-full border border-gray-200 shadow-xs text-[11px] font-mono font-bold text-gray-700 mt-1">
              <Compass className="w-3.5 h-3.5 text-[#0047FF]" />
              <span>Uncharted Document Coordinates</span>
            </div>
          </div>

          {/* Top Right: Seed Indicator & Regenerate button */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <span className="text-[10px] font-mono text-gray-500 bg-white/80 backdrop-blur-xs px-2 py-1 rounded-lg border border-gray-200/80 shadow-2xs">
              Seed #{seed}
            </span>
            <button
              type="button"
              onClick={randomizeSeed}
              className="p-1.5 bg-white/90 hover:bg-white text-gray-700 hover:text-[#0047FF] rounded-lg border border-gray-200 shadow-xs transition-colors cursor-pointer"
              title="Regenerate Algorithmic Field"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowControls(!showControls)}
              className={`p-1.5 rounded-lg border shadow-xs transition-colors cursor-pointer ${
                showControls
                  ? 'bg-[#0047FF] text-white border-[#0047FF]'
                  : 'bg-white/90 hover:bg-white text-gray-700 border-gray-200'
              }`}
              title="Toggle Algorithmic Field Controls"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Floating Param Controls Drawer */}
          {showControls && (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 p-3.5 shadow-lg space-y-2.5 z-20 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-800 pb-1 border-b border-gray-100">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0047FF]" />
                  Field Dynamics
                </span>
                <span className="text-gray-400 text-[10px]">Telemetry Harmonics</span>
              </div>

              <div className="space-y-2 text-[10px] font-mono">
                <div>
                  <div className="flex justify-between text-gray-600 mb-0.5">
                    <span>Node Density</span>
                    <span>{particleCount}</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="110"
                    value={particleCount}
                    onChange={(e) => setParticleCount(Number(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0047FF]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-gray-600 mb-0.5">
                    <span>Filament Reach</span>
                    <span>{connectDistance}px</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="170"
                    value={connectDistance}
                    onChange={(e) => setConnectDistance(Number(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0047FF]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-gray-600 mb-0.5">
                    <span>Drift Velocity</span>
                    <span>{driftSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={driftSpeed}
                    onChange={(e) => setDriftSpeed(Number(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0047FF]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content & Actions */}
        <div className="p-6 sm:p-8 space-y-5 text-center">
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A1B]">
              Document or Workspace Not Found
            </h2>
            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              The requested address does not correspond to an active assignment, submission snapshot, or verified draft route.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-[#F9F8F6] hover:bg-gray-100 border border-gray-200 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-xl shadow-md shadow-blue-200 transition-all cursor-pointer active:scale-95"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Subtle Footer Note */}
      <footer className="text-center text-[10px] font-mono text-gray-400 py-2">
        Draftly Educational Technology Platform · Verified Cryptographic Proof of Work
      </footer>

    </main>
  );
}
