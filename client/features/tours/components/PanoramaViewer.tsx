'use client';

import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: panoramaUrl,
      navbar: ['zoom', 'fullscreen'],
      plugins: [
        [
          MarkersPlugin,
          {
            markers: shelves.map((shelf) => ({
              id: shelf.id,
              position: {
                yaw: `${shelf.yaw}deg`,
                pitch: `${shelf.pitch}deg`,
              },
              html: '<div style="width:16px;height:16px;background:#f59e0b;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(245,158,11,0.6);cursor:pointer;"></div>',
              anchor: 'center center',
              tooltip: {
                content: `<strong>${shelf.label ?? 'Shelf'}</strong><br/>Position ${shelf.displayOrder}`,
                trigger: 'click',
              },
            })),
          },
        ],
      ],
    });

    return () => {
      viewer.destroy();
    };
  }, [panoramaUrl, shelves]);

  return <div ref={containerRef} className="h-full w-full" />;
}
