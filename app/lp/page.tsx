import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

const devBuild = (process.env.NEXT_PUBLIC_API_URL ?? "").includes("api-dev.");

export const metadata: Metadata = {
  title: "Kalend | Agenda e gestão para seu negócio",
  description: "Conheça o Kalend, consulte os planos disponíveis e comece seu teste grátis sem cartão de crédito.",
  alternates: devBuild ? undefined : { canonical: "https://kalend.tech/lp" },
  robots: devBuild ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: {
    title: "Kalend | Organize seu negócio com mais clareza",
    description: "Conheça a plataforma Kalend e os planos disponíveis para sua empresa.",
    type: "website",
  },
};

export default function LandingRoute() {
  return <LandingPage />;
}
