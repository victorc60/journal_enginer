import Link from "next/link";

type ShiftListItem = {
  id: number;
  shift_date: string;
  heads_count: number | null;
  co2_used_kg: string | number | null;
  co2_per_head_g: string | number | null;
  meat_temp_c: string | number | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMetric(value: string | number | null, suffix: string) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${Number(value).toFixed(2)} ${suffix}`;
}

async function getShifts() {
  const response = await fetch(`${apiBaseUrl}/api/shifts`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to load shifts.");
  }

  return (await response.json()) as ShiftListItem[];
}

export default async function ShiftsPage() {
  try {
    const shifts = await getShifts();

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card history-card">
          <Link href="/" className="back-link">
            Back
          </Link>

          <p className="eyebrow">Shift history</p>
          <h1>Shifts</h1>
          <p className="intro">Review recent production entries and open a full shift record.</p>

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
                  </dl>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <p className="status-title">No shifts recorded yet.</p>
                <p className="status-copy">Use Record shift to save the first journal entry.</p>
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
