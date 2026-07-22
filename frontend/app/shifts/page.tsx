import Link from "next/link";
import { apiBaseUrl, buildQuery, fetchJson } from "@/lib/api";
import { formatDate, formatMetric } from "@/lib/format";
import { ShiftListItem } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getExportUrl(searchParams: Record<string, string | string[] | undefined>) {
  return `${apiBaseUrl}/api/shifts/export${buildQuery({
    q: getSingleValue(searchParams.q),
    from: getSingleValue(searchParams.from),
    to: getSingleValue(searchParams.to),
    equipment: getSingleValue(searchParams.equipment),
    has_failures: getSingleValue(searchParams.has_failures),
    has_open_handover: getSingleValue(searchParams.has_open_handover),
  })}`;
}

async function getShifts(searchParams: Record<string, string | string[] | undefined>) {
  return fetchJson<ShiftListItem[]>(
    `/api/shifts${buildQuery({
      q: getSingleValue(searchParams.q),
      from: getSingleValue(searchParams.from),
      to: getSingleValue(searchParams.to),
      equipment: getSingleValue(searchParams.equipment),
      has_failures: getSingleValue(searchParams.has_failures),
      has_open_handover: getSingleValue(searchParams.has_open_handover),
    })}`,
  );
}

export default async function ShiftsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  try {
    const shifts = await getShifts(params);

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card history-card">
          <Link href="/" className="back-link">
            Back
          </Link>

          <p className="eyebrow">Shift history</p>
          <h1>Shifts</h1>
          <p className="intro">Search shifts, filter by equipment or incidents, and export the result set to CSV.</p>

          <form method="GET" className="detail-section">
            <div className="filter-grid">
              <label className="field">
                <span className="field-label">Search</span>
                <input name="q" defaultValue={getSingleValue(params.q)} className="text-input" placeholder="pilot, CO2, Marel..." />
              </label>

              <label className="field">
                <span className="field-label">From</span>
                <input name="from" type="date" defaultValue={getSingleValue(params.from)} className="text-input" />
              </label>

              <label className="field">
                <span className="field-label">To</span>
                <input name="to" type="date" defaultValue={getSingleValue(params.to)} className="text-input" />
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

            <div className="toolbar-row">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="has_failures"
                  value="true"
                  defaultChecked={getSingleValue(params.has_failures) === "true"}
                />
                <span>Only shifts with failures</span>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="has_open_handover"
                  value="true"
                  defaultChecked={getSingleValue(params.has_open_handover) === "true"}
                />
                <span>Only shifts with open handover</span>
              </label>
            </div>

            <div className="button-row">
              <button type="submit" className="action-button">
                Apply filters
              </button>
              <Link href="/shifts" className="secondary-button">
                Reset
              </Link>
              <a href={getExportUrl(params)} className="secondary-button">
                Export CSV
              </a>
            </div>
          </form>

          <div className="history-list">
            {shifts.length > 0 ? (
              shifts.map((shift) => (
                <article key={shift.id} className="history-item">
                  <div className="history-header">
                    <div>
                      <p className="history-date">{formatDate(shift.shift_date)}</p>
                      <p className="history-id">Shift #{shift.id}</p>
                    </div>

                    <Link href={`/shifts/${shift.id}`} className="text-link">
                      Details
                    </Link>
                  </div>

                  <dl className="metric-grid">
                    <div className="metric-item">
                      <dt>Heads</dt>
                      <dd>{shift.heads_count ?? "—"}</dd>
                    </div>
                    <div className="metric-item">
                      <dt>CO2 used</dt>
                      <dd>{formatMetric(shift.co2_used_kg, "kg")}</dd>
                    </div>
                    <div className="metric-item">
                      <dt>CO2 / head</dt>
                      <dd>{formatMetric(shift.co2_per_head_g, "g")}</dd>
                    </div>
                    <div className="metric-item">
                      <dt>Meat temp</dt>
                      <dd>{formatMetric(shift.meat_temp_c, "°C")}</dd>
                    </div>
                    <div className="metric-item">
                      <dt>Failures</dt>
                      <dd>{shift.failures_count ?? 0}</dd>
                    </div>
                    <div className="metric-item">
                      <dt>Open handover</dt>
                      <dd>{shift.open_handover_items_count ?? 0}</dd>
                    </div>
                  </dl>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <p className="status-title">No shifts match these filters.</p>
                <p className="status-copy">Try clearing a filter or record the next shift.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load shifts.";

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card history-card">
          <Link href="/" className="back-link">
            Back
          </Link>

          <p className="eyebrow">Shift history</p>
          <h1>Shifts</h1>
          <p className="intro">Review recent production entries and open a full shift record.</p>

          <div className="status-banner status-error" role="alert">
            <p className="status-title">Shift history is temporarily unavailable.</p>
            <p className="status-copy">{message}</p>
            <p className="status-copy">
              Check that <code>NEXT_PUBLIC_API_BASE_URL</code> points to the Railway backend domain and that
              <code> /api/shifts</code> returns JSON.
            </p>
          </div>
        </section>
      </main>
    );
  }
}
