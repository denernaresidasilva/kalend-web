import DashboardSummary from "@/components/dashboard-summary";
import { DashboardOperations } from "@/components/dashboard-operations";
export default function SuperAdminPage() {
  return <main><h1 className="k-sr-only">Visão geral da plataforma</h1><DashboardSummary /><DashboardOperations /></main>;
}
