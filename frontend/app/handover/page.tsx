import Link from "next/link";
import { buildQuery, fetchJson } from "@/lib/api";
import HandoverBoard from "./handover-board";
import { HandoverItem } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function HandoverPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  try {
    const items = await fetchJson<HandoverItem[]>(
      `/api/handover${buildQuery({
        status: getSingleValue(params.status),
        equipment: getSingleValue(params.equipment),
        priority: getSingleValue(params.priority),
      })}`,
    );

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card">
          <Link href="/" className="back-link">
            Back
          </Link>

          <p className="eyebrow">Cross-shift handover</p>
          <h1>Handover board</h1>
          <p className="intro">Track what remains open, who owns it, and what must be passed to the next shift.</p>

          <form method="GET" className="detail-section">
            <div className="filter-grid">
              <label className="field">
                <span className="field-label">Status</span>
                <select name="status" defaultValue={getSingleValue(params.status)} className="text-input">
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Priority</span>
                <select name="priority" defaultValue={getSingleValue(params.priority)} className="text-input">
                  <option value="">All</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Equipment</span>
                <input
                  name="equipment"
                  defaultValue={getSingleValue(params.equipment)}
                  className="text-input"
                  placeholder="pumps, pilots..."
                />
              </label>
            </div>

            <div className="button-row">
              <button type="submit" className="action-button">
                Apply filters
              </button>
              <Link href="/handover" className="secondary-button">
                Reset
              </Link>
            </div>
          </form>

          {items.length > 0 ? (
            <HandoverBoard initialItems={items} />
          ) : (
            <div className="empty-state">
              <p className="status-title">No handover items match these filters.</p>
              <p className="status-copy">New handover entries will appear here after saving a shift.</p>
            </div>
          )}
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load handover board.";

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card">
          <Link href="/" className="back-link">
            Back
          </Link>

          <p className="eyebrow">Cross-shift handover</p>
          <h1>Handover board</h1>

          <div className="status-banner status-error" role="alert">
            <p className="status-title">Handover board is temporarily unavailable.</p>
            <p className="status-copy">{message}</p>
          </div>
        </section>
      </main>
    );
  }
}
