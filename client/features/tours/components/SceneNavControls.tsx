'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SceneNavControlsProps {
  sceneIndex: number;
  total: number;
  label: string | null;
  onPrev: () => void;
  onNext: () => void;
}

export default function SceneNavControls({
  sceneIndex,
  total,
  label,
  onPrev,
  onNext,
}: SceneNavControlsProps) {
  return (
    <>
      <button
        onClick={onPrev}
        disabled={sceneIndex === 0}
        className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-30"
        aria-label="Previous scene"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={onNext}
        disabled={sceneIndex === total - 1}
        className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-30"
        aria-label="Next scene"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs text-white/85 backdrop-blur-sm">
        Scene {sceneIndex + 1} of {total}
        {label ? ` — ${label}` : ''}
      </div>
    </>
  );
}
