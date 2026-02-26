import { Suspense } from "react";
import JobsClient from "./JobsClient";

export default function JobsPage() {
  return (
    <Suspense fallback={<p>Loading jobs…</p>}>
      <JobsClient />
    </Suspense>
  );
}
