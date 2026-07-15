import Link from "next/link";
import { notFound } from "next/navigation";

type Failure = {
  id: number;
  equipment_id: number | null;
  equipment_name: string | null;
  problem: string;
  cause: string | null;
  solution: string | null;
  downtime_minutes: number | null;
  severity: string | null;
  created_at: string;
  updated_at: string;
};

type MaintenanceEvent = {
  id: number;
  equipment_id: number | null;
  equipment_name: string | null;
  action: string;
  parts_used: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ShiftNote = {
  id: number;
  category: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type ShiftDetail = {
  id: number;
  shift_date: string;
  heads_count: number | null;
  work_hours: string | number | null;
  co2_start_kg: string | number | null;
  co2_end_kg: string | number | null;
  co2_used_kg: string | number | null;
  co2_per_head_g: string | number | null;
  outside_temp_c: string | number | null;
  chiller_temp_c: string | number | null;
  meat_temp_c: string | number | null;
  raw_text: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  failures: Failure[];
  maintenance_events: MaintenanceEvent[];
  shift_notes: ShiftNote[];
};

type ShiftDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const noteSections = [
  { key: "production", title: "Production" },
  { key: "co2", title: "CO2" },
  { key: "temperatures", title: "Temperatures" },
  { key: "failures", title: "Failures" },
  { key: "maintenance", title: "Maintenance" },
  { key: "ideas", title: "Ideas" },
  { key: "general_notes", title: "General notes" },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatValue(value: string | number | null, suffix?: string) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    return suffix ? `${value} ${suffix}` : String(value);
  }

  const numericValue = Number(value);

  if (!Number.isNaN(numericValue) && suffix) {
    return `${numericValue.toFixed(2)} ${suffix}`;
  }

  return value;
}

async function getShift(id: string) {
  const response = await fetch(`${apiBaseUrl}/api/shifts/${id}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Unable to load shift details.");
  }

  return (await response.json()) as ShiftDetail;
}

export default async function ShiftDetailPage({ params }: ShiftDetailPageProps) {
  const { id } = await params;
  const shift = await getShift(id);

  const notesByCategory = new Map<string, ShiftNote[]>();

  for (const note of shift.shift_notes) {
    const current = notesByCategory.get(note.category) ?? [];
    current.push(note);
    notesByCategory.set(note.category, current);
  }

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card detail-card">
        <Link href="/shifts" className="back-link">
          Back to shifts
        </Link>

        <p className="eyebrow">Shift detail</p>
        <h1>{formatDate(shift.shift_date)}</h1>
        <p className="intro">Full production entry with temperatures, notes, failures, and maintenance.</p>

        <div className="detail-stack">
          <section className="detail-section">
            <h2 className="section-title">Shift fields</h2>
            <dl className="detail-grid">
              <div className="detail-row">
                <dt>Shift ID</dt>
                <dd>{shift.id}</dd>
              </div>
              <div className="detail-row">
                <dt>Shift date</dt>
                <dd>{formatDate(shift.shift_date)}</dd>
              </div>
              <div className="detail-row">
                <dt>Heads count</dt>
                <dd>{formatValue(shift.heads_count)}</dd>
              </div>
              <div className="detail-row">
                <dt>Work hours</dt>
                <dd>{formatValue(shift.work_hours, "hours")}</dd>
              </div>
              <div className="detail-row">
                <dt>CO2 start</dt>
                <dd>{formatValue(shift.co2_start_kg, "kg")}</dd>
              </div>
              <div className="detail-row">
                <dt>CO2 end</dt>
                <dd>{formatValue(shift.co2_end_kg, "kg")}</dd>
              </div>
              <div className="detail-row">
                <dt>CO2 used</dt>
                <dd>{formatValue(shift.co2_used_kg, "kg")}</dd>
              </div>
              <div className="detail-row">
                <dt>CO2 per head</dt>
                <dd>{formatValue(shift.co2_per_head_g, "g")}</dd>
              </div>
              <div className="detail-row">
                <dt>Outside temp</dt>
                <dd>{formatValue(shift.outside_temp_c, "°C")}</dd>
              </div>
              <div className="detail-row">
                <dt>Chiller temp</dt>
                <dd>{formatValue(shift.chiller_temp_c, "°C")}</dd>
              </div>
              <div className="detail-row">
                <dt>Meat temp</dt>
                <dd>{formatValue(shift.meat_temp_c, "°C")}</dd>
              </div>
              <div className="detail-row detail-row-wide">
                <dt>Raw text</dt>
                <dd>{shift.raw_text || "—"}</dd>
              </div>
              <div className="detail-row detail-row-wide">
                <dt>Notes</dt>
                <dd>{shift.notes || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>Created</dt>
                <dd>{formatDateTime(shift.created_at)}</dd>
              </div>
              <div className="detail-row">
                <dt>Updated</dt>
                <dd>{formatDateTime(shift.updated_at)}</dd>
              </div>
            </dl>
          </section>

          {noteSections.map((section) => {
            const categoryNotes = notesByCategory.get(section.key) ?? [];
            const isFailures = section.key === "failures";
            const isMaintenance = section.key === "maintenance";
            const hasStructuredContent =
              (isFailures && shift.failures.length > 0) ||
              (isMaintenance && shift.maintenance_events.length > 0);

            return (
              <section key={section.key} className="detail-section">
                <h2 className="section-title">{section.title}</h2>

                {categoryNotes.length > 0 ? (
                  <div className="category-note-list">
                    {categoryNotes.map((note) => (
                      <article key={note.id} className="list-card">
                        <p className="category-note-copy">{note.content}</p>
                      </article>
                    ))}
                  </div>
                ) : !hasStructuredContent ? (
                  <p className="section-empty">No {section.title.toLowerCase()} notes recorded for this shift.</p>
                ) : null}

                {isFailures && shift.failures.length > 0 ? (
                  <div className="entry-list structured-list">
                    {shift.failures.map((failure) => (
                      <article key={failure.id} className="entry-item">
                        <p className="entry-title">
                          {failure.equipment_name || "General equipment issue"}
                          {failure.severity ? ` · ${failure.severity}` : ""}
                        </p>
                        <p className="entry-copy">
                          <strong>Problem:</strong> {failure.problem}
                        </p>
                        <p className="entry-copy">
                          <strong>Cause:</strong> {failure.cause || "—"}
                        </p>
                        <p className="entry-copy">
                          <strong>Solution:</strong> {failure.solution || "—"}
                        </p>
                        <p className="entry-copy">
                          <strong>Downtime:</strong>{" "}
                          {failure.downtime_minutes !== null ? `${failure.downtime_minutes} min` : "—"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : null}

                {isMaintenance && shift.maintenance_events.length > 0 ? (
                  <div className="entry-list structured-list">
                    {shift.maintenance_events.map((event) => (
                      <article key={event.id} className="entry-item">
                        <p className="entry-title">{event.equipment_name || "General maintenance"}</p>
                        <p className="entry-copy">
                          <strong>Action:</strong> {event.action}
                        </p>
                        <p className="entry-copy">
                          <strong>Parts used:</strong> {event.parts_used || "—"}
                        </p>
                        <p className="entry-copy">
                          <strong>Notes:</strong> {event.notes || "—"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
