'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import type { TourShelf } from '../api';

interface PanoramaViewerProps {
  panoramaUrl: string;
  shelves: TourShelf[];
}

export default function PanoramaViewer({ panoramaUrl, shelves }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [psvError, setPsvError] = useState<string | null>(null);

  const markerConfigs = useMemo(
    () =>
      shelves.map((shelf) => ({
        id: shelf.id,
        position: {
          yaw: `${shelf.yaw}deg`,
          pitch: `${shelf.pitch}deg`,
        },
        html: '<div style="width:16px;height:16px;background:#f59e0b;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(245,158,11,0.6);cursor:pointer;"></div>',
        anchor: 'center center',
        tooltip: {
          content: `<strong>${shelf.label}</strong><br/>Position ${shelf.displayOrder}`,
          trigger: 'click',
        },
      })),
    [shelves],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    setPsvError(null);

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: panoramaUrl,
      navbar: ['zoom', 'fullscreen'],
      plugins: [
        [
          MarkersPlugin,
          {
            markers: markerConfigs,
          },
        ],
      ],
    });

    viewer.addEventListener('panorama-error', (e) => {
      setPsvError('Failed to load panorama.');
      console.error('[PanoramaViewer]', e);
    });

    return () => {
      viewer.destroy();
    };
  }, [panoramaUrl, markerConfigs]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {psvError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <p className="text-sm text-white/70">{psvError}</p>
        </div>
      )}
    </div>
  );
}
