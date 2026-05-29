'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Globe, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useActiveStoreTourQuery } from '../queries';
import SceneNavControls from './SceneNavControls';
import type { TourScene } from '../api';

const PanoramaViewer = dynamic(() => import('./PanoramaViewer'), { ssr: false });

export interface TourViewerModalProps {
  storeId: string;
  storeName: string;
  open: boolean;
  onClose: () => void;
  mockScenes?: TourScene[];
}

export default function TourViewerModal({
  storeId,
  storeName,
  open,
  onClose,
  mockScenes,
}: TourViewerModalProps) {
  const [sceneIndex, setSceneIndex] = useState(0);

  const { data, isLoading, isError, refetch } = useActiveStoreTourQuery(storeId, { enabled: open && !mockScenes });
  const tour = data?.data ?? null;
  const scenes: TourScene[] = mockScenes ?? tour?.scenes ?? [];
  const currentScene: TourScene | null = scenes[sceneIndex] ?? null;

  useEffect(() => {
    if (open) setSceneIndex(0);
  }, [open, storeId]);

  function renderBody() {
    if (isLoading && !mockScenes) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      );
    }
    if (isError && !mockScenes) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <p className="text-sm text-white/60">Failed to load tour.</p>
          <button
            onClick={() => refetch()}
            className="rounded-md bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Retry
          </button>
        </div>
      );
    }
    if (!tour && scenes.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-white/50">No tour available for this store yet.</p>
        </div>
      );
    }
    if (scenes.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-white/50">This tour has no scenes.</p>
        </div>
      );
    }
    if (!currentScene) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-white/50">Loading scene...</p>
        </div>
      );
    }

    return (
      <div className="relative h-full w-full">
        <PanoramaViewer panoramaUrl={currentScene.panoramaUrl} shelves={currentScene.shelves} />
        <SceneNavControls
          sceneIndex={sceneIndex}
          total={scenes.length}
          label={currentScene.label}
          onPrev={() => setSceneIndex((i) => Math.max(0, i - 1))}
          onNext={() => setSceneIndex((i) => Math.min(scenes.length - 1, i + 1))}
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="flex h-screen w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-gray-950 p-0"
      >
        <DialogTitle className="sr-only">{storeName} — 360° Tour</DialogTitle>
        {/* Top bar */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <Globe className="h-4 w-4" />
              {storeName} — Tour
            </span>
          <button
            onClick={onClose}
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white"
            aria-label="Close tour viewer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Panorama body */}
        <div className="relative flex-1">
          {renderBody()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
