import Link from "next/link";
import { fetchJson } from "@/lib/api";
import { formatDate, formatPlainValue } from "@/lib/format";
import { EquipmentDetailResponse } from "@/lib/types";

type EquipmentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function tagClass(value: string) {
  return `tag-pill tag-pill-${value || "normal"}`;
}

export default async function EquipmentDetailPage({ params }: EquipmentDetailPageProps) {
  const { id } = await params;

  try {
    const data = await fetchJson<EquipmentDetailResponse>(`/api/equipment/${id}`);
    const { equipment, summary } = data;

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card detail-card">
          <Link href="/equipment" className="back-link">
            Back to equipment
          </Link>

          <p className="eyebrow">Equipment card</p>
          <h1>{equipment.name}</h1>
          <p className="intro">{equipment.notes || "Failure, maintenance, and handover history for this equipment."}</p>

          <div className="stats-grid">
            <article className="stat-card">
              <p className="stat-label">Failures</p>
              <p className="stat-value">{summary.failures_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Maintenance</p>
              <p className="stat-value">{summary.maintenance_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Open handover</p>
              <p className="stat-value">{summary.open_handover_items_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Downtime</p>
              <p className="stat-value">{summary.total_downtime_minutes} min</p>
            </article>
          </div>

          <section className="detail-section">
            <h2 className="section-title">Repeated problems</h2>
            {summary.top_repeated_problems.length > 0 ? (
              <div className="list-stack">
                {summary.top_repeated_problems.map((item) => (
                  <article key={`${item.problem}-${item.count}`} className="list-card">
                    <p className="entry-title">{item.problem}</p>
                    <p className="entry-copy">Recorded {item.count} times.</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-empty">No repeated problems recorded yet.</p>
            )}
          </section>

          <section className="detail-section">
            <h2 className="section-title">Recent parts used</h2>
            {summary.recent_parts_used.length > 0 ? (
              <div className="tag-row">
                {summary.recent_parts_used.map((item) => (
                  <span key={`${item.parts_used}-${item.count}`} className="tag-pill">
                    {item.parts_used}: {item.count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="section-empty">No parts usage recorded yet.</p>
            )}
          </section>

          <section className="detail-section">
            <h2 className="section-title">Open and recent handover</h2>
            {equipment.handover_items.length > 0 ? (
              <div className="list-stack">
                {equipment.handover_items.map((item) => (
                  <article key={item.id} className="list-card">
                    <div className="tag-row">
                      <span className={tagClass(item.priority)}>{item.priority}</span>
                      <span className={tagClass(item.status)}>{item.status}</span>
                    </div>
                    <p className="entry-title">{item.title}</p>
                    <p className="entry-copy">{item.details || "No details."}</p>
                    <p className="entry-copy">
                      <strong>Shift:</strong> {item.shift?.shift_date ? formatDate(item.shift.shift_date) : "—"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-empty">No handover items for this equipment.</p>
            )}
          </section>

          <section className="detail-section">
            <h2 className="section-title">Recent failures</h2>
            {equipment.failures.length > 0 ? (
              <div className="entry-list structured-list">
                {equipment.failures.map((failure) => (
                  <article key={failure.id} className="entry-item">
                    <p className="entry-title">{failure.problem}</p>
                    <p className="entry-copy">
                      <strong>Date:</strong> {failure.shift?.shift_date ? formatDate(failure.shift.shift_date) : "—"}
                    </p>
                    <p className="entry-copy">
                      <strong>Cause:</strong> {failure.cause || "—"}
                    </p>
                    <p className="entry-copy">
                      <strong>Solution:</strong> {failure.solution || "—"}
                    </p>
                    <p className="entry-copy">
                      <strong>Status:</strong> {failure.status || "—"}
                    </p>
                    <p className="entry-copy">
                      <strong>Downtime:</strong> {formatPlainValue(failure.downtime_minutes, "min")}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-empty">No failures recorded for this equipment yet.</p>
            )}
          </section>

          <section className="detail-section">
            <h2 className="section-title">Recent maintenance</h2>
            {equipment.maintenance_events.length > 0 ? (
              <div className="entry-list structured-list">
                {equipment.maintenance_events.map((event) => (
                  <article key={event.id} className="entry-item">
                    <p className="entry-title">{event.action}</p>
                    <p className="entry-copy">
                      <strong>Date:</strong> {event.shift?.shift_date ? formatDate(event.shift.shift_date) : "—"}
                    </p>
                    <p className="entry-copy">
                      <strong>Parts:</strong> {event.parts_used || "—"}
                    </p>
                    <p className="entry-copy">
                      <strong>Notes:</strong> {event.notes || "—"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-empty">No maintenance recorded for this equipment yet.</p>
            )}
          </section>
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load equipment card.";

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card">
          <Link href="/equipment" className="back-link">
            Back to equipment
          </Link>

          <p className="eyebrow">Equipment card</p>
          <h1>Equipment unavailable</h1>
          <div className="status-banner status-error" role="alert">
            <p className="status-title">Equipment details are temporarily unavailable.</p>
            <p className="status-copy">{message}</p>
          </div>
        </section>
      </main>
    );
  }
}
