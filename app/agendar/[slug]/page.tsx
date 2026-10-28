"use client";

import { useParams } from "next/navigation";
import { PublicBooking } from "@/components/bookings/public-booking";

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();
  return <PublicBooking slug={params.slug} />;
}
