'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SurveyPhoto } from '../api';
import { useSurveyByIdQuery } from '../queries';
import StatusBadge from '@/components/common/StatusBadge';
import PageLoader from '@/components/common/PageLoader';
import { ChevronRight, Image as ImageIcon, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHOTO_TYPE_LABELS: Record<string, string> = {
  shelf: 'Shelf',
  panorama_crop: 'Panorama',
  manual: 'Manual',
};

const AI_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  not_applicable: 'bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-gray-400',
};

interface Props {
  id: string;
}

export default function SurveyDetail({ id }: Props) {
  const router = useRouter();

  const { data: response, isLoading, isError } = useSurveyByIdQuery(id);
  const survey = response?.data;

  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<SurveyPhoto | null>(null);

  if (isLoading) return <PageLoader />;
  if (isError || !survey) return null;

  const allPhotos = [
    ...survey.scenes.flatMap((s) => s.photos),
    ...survey.photos,
  ];

  const currentScenePhotos = selectedScene
    ? survey.scenes.find((s) => s.id === selectedScene)?.photos ?? []
    : allPhotos;

  const duration = survey.durationSeconds != null
    ? `${Math.floor(survey.durationSeconds / 60)}m ${survey.durationSeconds % 60}s`
    : '—';

  return (
    <section className="bg-surface text-brand flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-surface flex h-max w-full shrink-0 items-center justify-between border-b px-8 py-4">
        <div className="flex flex-col gap-1.5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <button type="button" onClick={() => router.back()} className="hover:text-gray-700 hover:underline dark:hover:text-gray-300">
              Surveys
            </button>
            <ChevronRight size={12} />
            <span className="text-gray-600 dark:text-gray-400">
              {survey.storeName || survey.storeId}
            </span>
            <ChevronRight size={12} />
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(survey.startedAt).toLocaleDateString()}
            </span>
          </div>
          {/* Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold uppercase">Survey</h1>
            <StatusBadge status={survey.status} />
            <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 text-xs text-gray-500 dark:bg-neutral-800 dark:text-gray-400">
              <Camera size={12} />
              {survey.sceneCount} scenes · {allPhotos.length} photos
            </span>
          </div>
        </div>
      </div>

      {/* Body — two columns */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* LEFT — photo grid */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Scene tabs */}
          {survey.scenes.length > 0 && (
            <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedScene(null)}
                className={cn(
                  'shrink-0 px-3 py-1.5 text-xs transition-colors',
                  selectedScene === null
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-neutral-800',
                )}
              >
                All ({allPhotos.length})
              </button>
              {survey.scenes.map((scene, i) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setSelectedScene(scene.id)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 text-xs transition-colors',
                    selectedScene === scene.id
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-neutral-800',
                  )}
                >
                  Scene {i + 1} ({scene.photos.length})
                </button>
              ))}
            </div>
          )}

          {/* Photo grid */}
          {currentScenePhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ImageIcon size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No photos in this scene.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {currentScenePhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxPhoto(photo)}
                  className="group relative aspect-square overflow-hidden border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-neutral-900"
                >
                  <img
                    src={photo.thumbnailUrl || photo.photoUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/50 px-2 py-1">
                    <span className="text-[10px] text-white">{PHOTO_TYPE_LABELS[photo.photoType] || photo.photoType}</span>
                    <span className={cn('px-1.5 py-0.5 text-[9px]', AI_STATUS_COLORS[photo.aiStatus] || 'bg-gray-200 text-gray-500')}>
                      AI: {photo.aiStatus.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — survey info sidebar */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-violet-50/60 dark:border-gray-800 dark:bg-neutral-950/60">
          {/* Store + surveyor */}
          <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Survey Info</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Store</span>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/stores/${survey.storeId}`)}
                  className="text-right text-gray-800 hover:underline dark:text-gray-200"
                >
                  {survey.storeName || '—'}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Surveyor</span>
                <span className="text-right text-gray-800 dark:text-gray-200">{survey.surveyorName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <StatusBadge status={survey.status} />
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Timing</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Started</span>
                <span className="text-right text-gray-800 dark:text-gray-200">
                  {new Date(survey.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              {survey.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Completed</span>
                  <span className="text-right text-gray-800 dark:text-gray-200">
                    {new Date(survey.completedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Duration</span>
                <span className="font-mono text-xs text-gray-800 dark:text-gray-200">{duration}</span>
              </div>
            </div>
          </div>

          {/* Capture stats */}
          <div className="px-5 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Capture</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Scenes</span>
                <span className="font-mono text-xs text-gray-800 dark:text-gray-200">{survey.sceneCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Photos</span>
                <span className="font-mono text-xs text-gray-800 dark:text-gray-200">{allPhotos.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">AI pending</span>
                <span className="font-mono text-xs text-gray-800 dark:text-gray-200">
                  {allPhotos.filter((p) => p.aiStatus === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">ID</span>
                <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{survey.id.slice(0, 8)}…</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxPhoto(null)}
        >
          <img
            src={lightboxPhoto.photoUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
