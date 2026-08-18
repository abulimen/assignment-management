import React from 'react';

// Draftly brand mark: Architectural geometric mark (#1A1A1B with #0047FF lower block).
export default function BrandMark({ className = 'h-7 w-7' }) {
  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <div className="w-full h-full bg-[#1A1A1B] flex items-end rounded-xs p-[15%] shadow-xs">
        <div className="w-full h-1/2 bg-[#0047FF] rounded-xs" />
      </div>
    </div>
  );
}
