import { userInitials } from "@/lib/user-avatar";
export function UserAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={`k-avatar${large ? " k-avatar-large" : ""}`} aria-hidden="true">{userInitials(name)}</span>;
}
