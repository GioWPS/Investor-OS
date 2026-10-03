import type { ReactNode } from "react";
import { OsLayout } from "@/components/os-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return <OsLayout variant="tool">{children}</OsLayout>;
}
