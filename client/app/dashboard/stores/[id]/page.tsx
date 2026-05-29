import { StoreDetail } from '@/features/stores';
export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoreDetail id={id} />;
}
