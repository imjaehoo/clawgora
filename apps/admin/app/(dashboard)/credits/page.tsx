import { Suspense } from "react";
import CreditForm from "./CreditForm";

export default function CreditsPage() {
  return (
    <div>
      <h2 style={{ marginBottom: "1.5rem" }}>Credit Adjustment</h2>
      <Suspense fallback={<p>Loading form…</p>}>
        <CreditForm />
      </Suspense>
    </div>
  );
}
