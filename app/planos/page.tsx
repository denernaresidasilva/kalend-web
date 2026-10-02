import type { Metadata } from "next";
import { PublicPlans } from "@/components/plans/public-plans";
export const metadata: Metadata = { title: "Planos · Kalend", description: "Compare os planos, recursos e limites do Kalend." };
export default function PlansPage() { return <PublicPlans />; }
