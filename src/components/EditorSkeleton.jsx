import React from 'react';

/**
 * Realistic academic Word-style editor skeleton.
 * Matches the layout of Editor.jsx (WordRibbon, Document Canvas, Sheet with margins, and WordStatusBar).
 */
export default function EditorSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading document workspace"
      className="flex flex-col h-full w-full bg-[#ECEAE5] overflow-hidden select-none animate-in fade-in duration-150"
    >
      {/* Ribbon Skeleton */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="skeleton h-7 w-18 rounded-md" />
          <div className="skeleton h-7 w-8 rounded-md" />
          <div className="skeleton h-7 w-8 rounded-md" />
          <div className="h-4 w-px bg-gray-200 mx-1" />
          <div className="skeleton h-7 w-8 rounded-md" />
          <div className="skeleton h-7 w-8 rounded-md" />
          <div className="skeleton h-7 w-8 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton h-7 w-16 rounded-md" />
          <div className="skeleton h-7 w-8 rounded-md" />
          <div className="skeleton h-7 w-8 rounded-md" />
        </div>
      </div>

      {/* Document Sheet Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 flex justify-center">
        <div className="w-full max-w-[820px] bg-white border border-[#D8D6D0] rounded-t-xs shadow-md p-8 sm:p-14 space-y-6 min-h-[850px]">
          {/* Header Title Skeleton */}
          <div className="space-y-2.5 pb-4 border-b border-gray-100">
            <div className="skeleton h-7 w-3/4 rounded-md" />
            <div className="skeleton h-4 w-1/3 rounded" />
          </div>

          {/* Paragraph Lines Skeleton */}
          <div className="space-y-3 pt-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-11/12 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
          </div>

          <div className="space-y-3 pt-4">
            <div className="skeleton h-5 w-1/4 rounded mb-2" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-10/12 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
          </div>

          <div className="space-y-3 pt-4">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        </div>
      </div>

      {/* Bottom Status Bar Skeleton */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="skeleton h-3.5 w-24 rounded" />
          <div className="skeleton h-3.5 w-20 rounded hidden sm:block" />
        </div>
        <div className="flex items-center gap-3">
          <div className="skeleton h-3.5 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}
