import { Suspense } from "react";
import LedgerClient from "./LedgerClient";

export default function LedgerPage() {
  return (
    <Suspense fallback={<p>Loading ledger…</p>}>
      <LedgerClient />
    </Suspense>
  );
}
