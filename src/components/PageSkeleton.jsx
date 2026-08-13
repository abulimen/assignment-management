// Minimal, dependency-free route-loading skeleton. Used as the Suspense
// fallback for the code-split lazy routes so navigation shows stable chrome
// instead of a jarring flash. Kept intentionally ASCII/tailwind-only so it
// never pulls the heavy vendor chunks it is replacing.
export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" role="status" aria-live="polite" aria-label="Loading page">
      <div className="mx-auto max-w-4xl px-4 py-8 animate-pulse">
        <div className="h-8 w-2/3 rounded bg-gray-200" />
        <div className="mt-4 h-4 w-1/3 rounded bg-gray-200" />
        <div className="mt-8 h-4 w-full rounded bg-gray-200" />
        <div className="mt-2 h-4 w-5/6 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
        <div className="mt-8 h-4 w-full rounded bg-gray-200" />
        <div className="mt-2 h-4 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );
}