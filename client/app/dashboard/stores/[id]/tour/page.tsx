import { TourViewerPage } from '@/features/tours';

export default async function StoreTourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TourViewerPage storeId={id} />;
}
