// Draftly brand mark. A flat aubergine pill with a single off-white diagonal
// stroke: the stroke that wrote the draft. Same geometry as the PWA icons
// (scripts/gen-icons.mjs). Renders inline SVG so it scales at any size.
export default function BrandMark({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#593f91" />
      <line
        x1="9.5" y1="23" x2="23" y2="9.5"
        stroke="#fcfaf5" strokeWidth="5.2"
        strokeLinecap="round"
      />
    </svg>
  );
}