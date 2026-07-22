import Link from "next/link";
import DashboardCharts from "./dashboard-charts";
import { fetchJson } from "@/lib/api";
import { Co2Response, FailuresResponse, SummaryResponse, TemperaturesResponse } from "@/lib/types";

function formatMetric(value: number | null, suffix = "") {
  if (value === null || value === undefined) {
    return "—";
  }

  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);

  return suffix ? `${formatted} ${suffix}` : formatted;
}

export default async function DashboardPage() {
  try {
    const [summary, co2, failures, temperatures] = await Promise.all([
      fetchJson<SummaryResponse>("/api/analytics/summary"),
      fetchJson<Co2Response>("/api/analytics/co2"),
      fetchJson<FailuresResponse>("/api/analytics/failures"),
      fetchJson<TemperaturesResponse>("/api/analytics/temperatures"),
    ]);

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card dashboard-card">
          <Link href="/" className="back-link">
            Back
          </Link>

          <p className="eyebrow">Dashboard</p>
          <h1>Analytics</h1>
          <p className="intro">
            Track output, CO2 efficiency, failures, attachments, and handover pressure across saved shifts.
          </p>

          <div className="stats-grid">
            <article className="stat-card">
              <p className="stat-label">Total shifts</p>
              <p className="stat-value">{summary.total_shifts}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Average heads</p>
              <p className="stat-value">{formatMetric(summary.average_heads_count)}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Average CO2 g/head</p>
              <p className="stat-value">{formatMetric(summary.average_co2_per_head_g, "g")}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Total failures</p>
              <p className="stat-value">{summary.total_failures}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Open handover</p>
              <p className="stat-value">{summary.open_handover_items}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Attachments</p>
              <p className="stat-value">{summary.attachments_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Tracked equipment</p>
              <p className="stat-value">{summary.tracked_equipment}</p>
            </article>
          </div>

          <DashboardCharts
            co2PerHeadByDate={co2.co2_per_head_by_date}
            meatTemperatureByDate={temperatures.meat_temperature_by_date}
            failuresByEquipment={failures.failures_by_equipment}
          />
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dashboard.";

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card dashboard-card">
          <Link href="/" className="back-link">
            Back
          </Link>

          <p className="eyebrow">Dashboard</p>
          <h1>Analytics</h1>
          <p className="intro">Track output, CO2 efficiency, failures, and temperature trends across saved shifts.</p>

          <div className="status-banner status-error" role="alert">
            <p className="status-title">Dashboard is temporarily unavailable.</p>
            <p className="status-copy">{message}</p>
            <p className="status-copy">
              Check that <code>NEXT_PUBLIC_API_BASE_URL</code> points to the Railway backend domain and that
              <code> /api/health</code> opens successfully.
            </p>
          </div>
        </section>
      </main>
    );
  }
}
