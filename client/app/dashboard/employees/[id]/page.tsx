import { EmployeeDetail } from '@/features/employees';
export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  return <EmployeeDetail id={params.id} />;
}
