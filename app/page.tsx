import { redirect } from "next/navigation";

/**
 * Real marketing lives in GHL. This app's root just routes people to the product:
 * the dashboard (which itself sends unauthenticated visitors to /login).
 */
export default function Home() {
  redirect("/dashboard");
}
