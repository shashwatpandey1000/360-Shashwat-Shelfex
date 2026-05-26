import { StoreDetail } from '@/features/stores';
export default function StoreDetailPage({ params }: { params: { id: string } }) {
  return <StoreDetail id={params.id} />;
}
