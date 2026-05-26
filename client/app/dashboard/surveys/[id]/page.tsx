import { SurveyDetail } from '@/features/surveys';
export default function SurveyDetailPage({ params }: { params: { id: string } }) {
  return <SurveyDetail id={params.id} />;
}
