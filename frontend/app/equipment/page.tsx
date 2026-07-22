import Link from "next/link";
import { fetchJson } from "@/lib/api";
import { EquipmentListItem } from "@/lib/types";

export default async function EquipmentPage() {
  try {
    const equipment = await fetchJson<EquipmentListItem[]>("/api/equipment");

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card">
          <Link href="/" className="back-link">
            Back
          </Link>

          <p className="eyebrow">Equipment cards</p>
          <h1>Equipment</h1>
          <p className="intro">Open any tracked machine to review failures, maintenance, downtime, and open handover.</p>

          <div className="insight-grid">
            {equipment.map((item) => (
              <article key={item.id} className="insight-card">
                <h2 className="section-title">{item.name}</h2>
                <p className="section-text">{item.category || "Uncategorized equipment"}</p>
                <div className="tag-row">
                  <span className="tag-pill">Failures: {item.failures_count}</span>
                  <span className="tag-pill">Maintenance: {item.maintenance_events_count}</span>
                  <span className="tag-pill">Open handover: {item.open_handover_items_count}</span>
                </div>
                <Link href={`/equipment/${item.id}`} className="text-link">
                  Open equipment card
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load equipment.";

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card">
          <Link href="/" className="back-link">
            Back
          </Link>

          <p className="eyebrow">Equipment cards</p>
          <h1>Equipment</h1>
          <div className="status-banner status-error" role="alert">
            <p className="status-title">Equipment cards are temporarily unavailable.</p>
            <p className="status-copy">{message}</p>
          </div>
        </section>
      </main>
    );
  }
}
