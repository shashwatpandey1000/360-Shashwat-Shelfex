'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import type { TourShelf, SceneLink } from '../api';

export interface PanoramaViewerProps {
  sceneId: string;
  panoramaUrl: string;
  shelves: TourShelf[];
  links?: SceneLink[];
  onNavigate?: (targetSceneId: string) => void;
}

// Google Street View–style ground navigation arrow:
// teardrop chevron that appears to lie flat on the pavement.
const NAV_ARROW_HTML = `
<div
  style="cursor:pointer;width:68px;height:84px;opacity:0.88;
         filter:drop-shadow(0 6px 16px rgba(0,0,0,0.65)) drop-shadow(0 0 8px rgba(255,255,255,0.2));
         transition:transform 0.18s ease,opacity 0.18s ease;"
  onmouseover="this.style.transform='scale(1.15)';this.style.opacity='1'"
  onmouseout="this.style.transform='scale(1)';this.style.opacity='0.88'"
>
  <svg width="68" height="84" viewBox="0 0 68 84" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Ground shadow -->
    <ellipse cx="34" cy="79" rx="27" ry="5" fill="rgba(0,0,0,0.32)"/>
    <!-- Semi-transparent ground disc -->
    <ellipse cx="34" cy="74" rx="25" ry="9"
             fill="rgba(255,255,255,0.22)"
             stroke="rgba(255,255,255,0.65)" stroke-width="1.5"/>
    <!-- Chevron body — wide at bottom (near), tapers to point (far) -->
    <path d="M34 5 L56 67 L34 55 L12 67 Z"
          fill="rgba(255,255,255,0.95)"/>
    <!-- Blue-tint depth layer (matches Google Maps palette) -->
    <path d="M34 14 L53 64 L34 53 L15 64 Z"
          fill="rgba(60,140,255,0.18)"/>
    <!-- Centre spine crease — gives the 3-D folded look -->
    <line x1="34" y1="19" x2="34" y2="54"
          stroke="rgba(120,190,255,0.55)" stroke-width="1.8" stroke-linecap="round"/>
    <!-- Crisp edge outline -->
    <path d="M34 5 L56 67 L34 55 L12 67 Z"
          fill="none"
          stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linejoin="round"/>
  </svg>
</div>
`.trim();

const NORMAL_ZOOM = 50;
const NAV_ZOOM    = 70;

export default function PanoramaViewer({
  sceneId,
  panoramaUrl,
  shelves,
  links,
  onNavigate,
}: PanoramaViewerProps) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const viewerRef          = useRef<Viewer | null>(null);
  const markersPluginRef   = useRef<MarkersPlugin | null>(null);
  const isTransitioningRef = useRef(false);
  const sceneIdRef         = useRef(sceneId);
  const panoramaUrlRef     = useRef(panoramaUrl);
  const linksRef           = useRef(links);
  const onNavigateRef      = useRef(onNavigate);
  const [psvError, setPsvError] = useState<string | null>(null);

  useEffect(() => { linksRef.current     = links;      }, [links]);
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);

  const shelfMarkers = useMemo(
    () =>
      shelves.map((shelf) => ({
        id: `shelf-${shelf.id}`,
        position: { yaw: `${shelf.yaw}deg`, pitch: `${shelf.pitch}deg` },
        html: '<div style="width:16px;height:16px;background:#f59e0b;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(245,158,11,0.6);cursor:pointer;"></div>',
        anchor: 'center center' as const,
        tooltip: {
          content: `<strong>${shelf.label}</strong><br/>Position ${shelf.displayOrder}`,
          trigger: 'click' as const,
        },
      })),
    [shelves],
  );

  const linkMarkers = useMemo(
    () =>
      (links ?? []).map((link) => ({
        id: `link-${link.targetSceneId}`,
        position: { yaw: `${link.yaw}deg`, pitch: `${link.pitch ?? -25}deg` },
        html: NAV_ARROW_HTML,
        anchor: 'center center' as const,
      })),
    [links],
  );

  const allMarkers    = useMemo(() => [...shelfMarkers, ...linkMarkers], [shelfMarkers, linkMarkers]);
  const allMarkersRef = useRef(allMarkers);
  useEffect(() => { allMarkersRef.current = allMarkers; }, [allMarkers]);

  function applyMarkers() {
    const mp = markersPluginRef.current;
    if (!mp) return;
    mp.clearMarkers();
    allMarkersRef.current.forEach((m) => { try { mp.addMarker(m); } catch {} });
  }

  function doTransition(url: string) {
    const viewer = viewerRef.current;
    if (!viewer) return;
    isTransitioningRef.current = true;
    viewer
      .setPanorama(url, { transition: true, showLoader: false })
      .then(() => {
        viewer.animate({ zoom: NORMAL_ZOOM, speed: '2rpm' });
        isTransitioningRef.current = false;
        applyMarkers();
      })
      .catch(() => { isTransitioningRef.current = false; });
  }

  // ── Create viewer once on mount ─────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setPsvError(null);
    let raf: number;

    raf = requestAnimationFrame(() => {
      if (!container.isConnected) return;

      const viewer = new Viewer({
        container,
        panorama: panoramaUrl,
        navbar: ['zoom', 'fullscreen'],
        defaultZoomLvl: NORMAL_ZOOM,
        plugins: [[MarkersPlugin, { markers: allMarkersRef.current }]],
      });

      viewerRef.current        = viewer;
      sceneIdRef.current       = sceneId;
      panoramaUrlRef.current   = panoramaUrl;

      const mp = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);
      markersPluginRef.current = mp;

      mp?.addEventListener('select-marker', async ({ marker }) => {
        if (isTransitioningRef.current) return;
        if (!marker.id.startsWith('link-')) return;

        const targetSceneId = marker.id.slice('link-'.length);
        const link = linksRef.current?.find((l) => l.targetSceneId === targetSceneId);
        if (!link) return;

        isTransitioningRef.current = true;
        try {
          // Zoom toward the target direction — "walking forward" feel
          await viewer.animate({
            yaw: `${link.yaw}deg`,
            pitch: '-8deg',
            zoom: NAV_ZOOM,
            speed: '1.5rpm',
          });
          onNavigateRef.current?.(targetSceneId);
        } catch {
          isTransitioningRef.current = false;
        }
      });

      viewer.addEventListener('panorama-error', () => {
        setPsvError('Failed to load panorama.');
        isTransitioningRef.current = false;
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      viewerRef.current?.destroy();
      viewerRef.current        = null;
      markersPluginRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scene change ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!viewerRef.current) return;
    if (sceneId === sceneIdRef.current && panoramaUrl === panoramaUrlRef.current) return;
    sceneIdRef.current     = sceneId;
    panoramaUrlRef.current = panoramaUrl;
    doTransition(panoramaUrl);
  }, [sceneId, panoramaUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Marker sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!markersPluginRef.current || isTransitioningRef.current) return;
    applyMarkers();
  }, [allMarkers]); // eslint-disable-line react-hooks/exhaustive-deps

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
