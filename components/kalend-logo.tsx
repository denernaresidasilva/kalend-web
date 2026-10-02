import { CalendarDays } from "lucide-react";
/** Replace this vector identity with the official asset when supplied. */
export function KalendLogo({ compact = false }: { compact?: boolean }) {
  return <span className="k-logo" aria-hidden="true"><span className="k-logo-symbol"><CalendarDays size={25} strokeWidth={1.7} /></span>{!compact && <span className="k-logo-word">KALEND</span>}</span>;
}
