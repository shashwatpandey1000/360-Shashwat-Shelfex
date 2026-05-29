'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Globe } from 'lucide-react';
import { useActiveStoreTourQuery } from '../queries';
import { useStoreByIdQuery } from '@/features/stores';
import SceneNavControls from './SceneNavControls';
import type { TourScene } from '../api';

const PanoramaViewer = dynamic(() => import('./PanoramaViewer'), { ssr: false });


// Three distinct equirectangular panoramas from PSV's official virtual-tour demo CDN.
// Different images give a real visual transition when navigating between scenes.
const DEV_MOCK_SCENES: TourScene[] =
  process.env.NEXT_PUBLIC_DEV_MOCK_TOUR === 'true'
    ? [
        {
          id: 'mock-scene-1',
          externalSceneId: 'scene-001',
          panoramaUrl: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-1.jpg',
          thumbnailUrl: null,
          label: 'Store Entrance',
          displayOrder: 0,
          floor: 0,
          shelves: [
            { id: 'sh-1', label: 'Beverages',    yaw: '-55', pitch: '-8',  shelfImageUrl: null, displayOrder: 0 },
            { id: 'sh-2', label: 'Snacks',        yaw:  '60', pitch: '-6',  shelfImageUrl: null, displayOrder: 1 },
            { id: 'sh-3', label: 'Promotions',    yaw:  '-5', pitch:  '5',  shelfImageUrl: null, displayOrder: 2 },
          ],
          links: [
            { targetSceneId: 'mock-scene-2', yaw:   0, pitch: -22, label: 'Walk to Main Aisle' },
          ],
        },
        {
          id: 'mock-scene-2',
          externalSceneId: 'scene-002',
          panoramaUrl: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-2.jpg',
          thumbnailUrl: null,
          label: 'Main Aisle',
          displayOrder: 1,
          floor: 0,
          shelves: [
            { id: 'sh-4', label: 'Dairy',         yaw: '-90', pitch: '-7',  shelfImageUrl: null, displayOrder: 0 },
            { id: 'sh-5', label: 'Frozen Foods',   yaw:  '90', pitch: '-7',  shelfImageUrl: null, displayOrder: 1 },
            { id: 'sh-6', label: 'Bakery',         yaw: '155', pitch: '-10', shelfImageUrl: null, displayOrder: 2 },
            { id: 'sh-7', label: 'Deli Counter',   yaw: '-150',pitch: '-5',  shelfImageUrl: null, displayOrder: 3 },
          ],
          links: [
            { targetSceneId: 'mock-scene-1', yaw: 180, pitch: -22, label: 'Back to Entrance' },
            { targetSceneId: 'mock-scene-3', yaw:   0, pitch: -22, label: 'Walk to Checkout' },
          ],
        },
        {
          id: 'mock-scene-3',
          externalSceneId: 'scene-003',
          panoramaUrl: 'https://photo-sphere-viewer-data.netlify.app/assets/tour/key-biscayne-3.jpg',
          thumbnailUrl: null,
          label: 'Checkout Area',
          displayOrder: 2,
          floor: 0,
          shelves: [
            { id: 'sh-8', label: 'Checkout Counter', yaw:  '20', pitch: '-5',  shelfImageUrl: null, displayOrder: 0 },
            { id: 'sh-9', label: 'Impulse Buys',     yaw: '-30', pitch: '-8',  shelfImageUrl: null, displayOrder: 1 },
            { id: 'sh-10',label: 'Customer Service', yaw:  '170',pitch: '-4',  shelfImageUrl: null, displayOrder: 2 },
          ],
          links: [
            { targetSceneId: 'mock-scene-2', yaw: 180, pitch: -22, label: 'Back to Main Aisle' },
          ],
        },
      ]
    : [];

const useMock = DEV_MOCK_SCENES.length > 0;

interface TourViewerPageProps {
  storeId: string;
}

export default function TourViewerPage({ storeId }: TourViewerPageProps) {
  const router = useRouter();
  const [sceneIndex, setSceneIndex] = useState(0);

  const storeQuery = useStoreByIdQuery(storeId);
  const storeName = (storeQuery.data?.data as { name?: string } | undefined)?.name ?? 'Store';

  const { data, isLoading, isError, refetch } = useActiveStoreTourQuery(storeId, {
    enabled: !useMock,
  });
  const tour = data?.data ?? null;
  const scenes: TourScene[] = useMock ? DEV_MOCK_SCENES : (tour?.scenes ?? []);
  const currentScene: TourScene | null = scenes[sceneIndex] ?? null;

  useEffect(() => {
    setSceneIndex(0);
  }, [storeId]);

  const handleNavigate = useCallback(
    (targetSceneId: string) => {
      const idx = scenes.findIndex((s) => s.id === targetSceneId);
      if (idx !== -1) setSceneIndex(idx);
    },
    [scenes],
  );

  function renderBody() {
    if (isLoading && !useMock) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      );
    }
    if (isError && !useMock) {
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
    if (scenes.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-white/50">No tour available for this store yet.</p>
        </div>
      );
    }
    if (!currentScene) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-white/50">Loading scene…</p>
        </div>
      );
    }

    return (
      <div className="relative h-full w-full">
        <PanoramaViewer
          sceneId={currentScene.id}
          panoramaUrl={currentScene.panoramaUrl}
          shelves={currentScene.shelves}
          links={currentScene.links}
          onNavigate={handleNavigate}
        />
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
    <div className="relative flex h-full w-full flex-col bg-gray-950">
      {/* Top bar */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
        <button
          onClick={() => router.push(`/dashboard/stores/${storeId}`)}
          className="pointer-events-auto mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white"
          aria-label="Back to store"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Globe className="h-4 w-4" />
          {storeName} — 360° Tour
        </span>
      </div>

      {/* Panorama body */}
      <div className="relative flex-1 overflow-hidden">
        {renderBody()}
      </div>
    </div>
  );
}
