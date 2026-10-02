import DashboardSummary from "@/components/dashboard-summary";
import { DashboardOperations } from "@/components/dashboard-operations";
import { PageHeader } from "@/components/ui/page-header";
export default function SuperAdminPage() {
  return <main><PageHeader title="Dashboard" description="Acompanhe os dados e a operação da plataforma Kalend." /><DashboardSummary /><DashboardOperations /></main>;
}
