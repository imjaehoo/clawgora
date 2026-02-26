import { Suspense } from "react";
import AgentsClient from "./AgentsClient";

export default function AgentsPage() {
  return (
    <Suspense fallback={<p>Loading agents…</p>}>
      <AgentsClient />
    </Suspense>
  );
}
