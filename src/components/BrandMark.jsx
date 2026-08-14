// Draftly brand mark. A flat pill with a single diagonal stroke: the stroke
// that wrote the draft. Same geometry as the PWA icons
// (scripts/gen-icons.mjs). Renders inline SVG so it scales at any size.
//
// tone="plum" (default) is the Plum Ink app interior mark; tone="dark" is the
// Flight Recorder mark for the dark landing/auth surfaces.
const TONES = {
  plum: { fill: '#593f91', stroke: '#fcfaf5' },
  dark: { fill: '#2d52c6', stroke: '#f1f7f9' },
};

export default function BrandMark({ className = 'h-6 w-6', tone = 'plum' }) {
  const { fill, stroke } = TONES[tone] || TONES.plum;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="30" height="30" rx="7" fill={fill} />
      <line
        x1="9.5" y1="23" x2="23" y2="9.5"
        stroke={stroke} strokeWidth="5.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
