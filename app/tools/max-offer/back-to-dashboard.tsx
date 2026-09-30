import Link from "next/link";

/** Returns to the dashboard in the same tab (the calculator opens in the dashboard's tab). */
export function BackToDashboard() {
  return (
    <Link href="/dashboard" className="btn-back no-print" title="Back to your dashboard">
      ← Dashboard
    </Link>
  );
}
