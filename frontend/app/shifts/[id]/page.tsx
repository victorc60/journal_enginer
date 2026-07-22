import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchJson } from "@/lib/api";
import { formatDate, formatDateTime, formatFileSize, formatPlainValue } from "@/lib/format";
import { ShiftDetail, ShiftNote } from "@/lib/types";

type ShiftDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const noteSections = [
  { key: "production", title: "Production" },
  { key: "co2", title: "CO2" },
  { key: "temperatures", title: "Temperatures" },
  { key: "failures", title: "Failures" },
  { key: "maintenance", title: "Maintenance" },
  { key: "ideas", title: "Ideas" },
  { key: "general_notes", title: "General notes" },
] as const;

async function getShift(id: string) {
  try {
    return await fetchJson<ShiftDetail>(`/api/shifts/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      notFound();
    }

    throw error;
  }
}

function getPriorityClass(priority: string) {
  return `tag-pill tag-pill-${priority || "normal"}`;
}

function getStatusClass(status: string) {
  return `tag-pill tag-pill-${status || "open"}`;
}

export default async function ShiftDetailPage({ params }: ShiftDetailPageProps) {
  const { id } = await params;

  try {
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
          <p className="intro">
            Full production entry with handover, attachments, temperatures, failures, and maintenance history.
          </p>

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
                  <dd>{formatPlainValue(shift.heads_count)}</dd>
                </div>
                <div className="detail-row">
                  <dt>Work hours</dt>
                  <dd>{formatPlainValue(shift.work_hours, "hours")}</dd>
                </div>
                <div className="detail-row">
                  <dt>CO2 start</dt>
                  <dd>{formatPlainValue(shift.co2_start_kg, "kg")}</dd>
                </div>
                <div className="detail-row">
                  <dt>CO2 end</dt>
                  <dd>{formatPlainValue(shift.co2_end_kg, "kg")}</dd>
                </div>
                <div className="detail-row">
                  <dt>CO2 used</dt>
                  <dd>{formatPlainValue(shift.co2_used_kg, "kg")}</dd>
                </div>
                <div className="detail-row">
                  <dt>CO2 per head</dt>
                  <dd>{formatPlainValue(shift.co2_per_head_g, "g")}</dd>
                </div>
                <div className="detail-row">
                  <dt>Outside temp</dt>
                  <dd>{formatPlainValue(shift.outside_temp_c, "°C")}</dd>
                </div>
                <div className="detail-row">
                  <dt>Chiller temp</dt>
                  <dd>{formatPlainValue(shift.chiller_temp_c, "°C")}</dd>
                </div>
                <div className="detail-row">
                  <dt>Meat temp</dt>
                  <dd>{formatPlainValue(shift.meat_temp_c, "°C")}</dd>
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

            <section className="detail-section">
              <h2 className="section-title">Handover items</h2>
              {shift.handover_items.length > 0 ? (
                <div className="list-stack">
                  {shift.handover_items.map((item) => (
                    <article key={item.id} className="list-card">
                      <div className="tag-row">
                        <span className={getPriorityClass(item.priority)}>{item.priority}</span>
                        <span className={getStatusClass(item.status)}>{item.status}</span>
                      </div>
                      <p className="entry-title">{item.title}</p>
                      <p className="entry-copy">{item.details || "No details."}</p>
                      <p className="entry-copy">
                        <strong>Equipment:</strong>{" "}
                        {item.equipment_id ? <Link href={`/equipment/${item.equipment_id}`}>{item.equipment_name}</Link> : item.equipment_name || "—"}
                      </p>
                      <p className="entry-copy">
                        <strong>Assigned:</strong> {item.assigned_to || "—"}
                      </p>
                      <p className="entry-copy">
                        <strong>Due:</strong> {item.due_date ? formatDate(item.due_date) : "—"}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="section-empty">No handover items recorded for this shift.</p>
              )}
            </section>

            <section className="detail-section">
              <h2 className="section-title">Attachments</h2>
              {shift.attachments.length > 0 ? (
                <div className="list-stack">
                  {shift.attachments.map((attachment) => (
                    <article key={attachment.id} className="list-card">
                      <p className="entry-title">{attachment.original_name}</p>
                      <p className="entry-copy">
                        <strong>Type:</strong> {attachment.attachment_type}
                      </p>
                      <p className="entry-copy">
                        <strong>Size:</strong> {formatFileSize(attachment.size_bytes)}
                      </p>
                      {attachment.caption ? (
                        <p className="entry-copy">
                          <strong>Caption:</strong> {attachment.caption}
                        </p>
                      ) : null}
                      <a href={attachment.download_url} className="text-link">
                        Download
                      </a>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="section-empty">No attachments saved for this shift.</p>
              )}
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
                            {failure.equipment_id ? (
                              <Link href={`/equipment/${failure.equipment_id}`}>{failure.equipment_name || "Equipment issue"}</Link>
                            ) : (
                              failure.equipment_name || "General equipment issue"
                            )}
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
                            <strong>Status:</strong> {failure.status || "—"}
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
                          <p className="entry-title">
                            {event.equipment_id ? (
                              <Link href={`/equipment/${event.equipment_id}`}>{event.equipment_name || "Maintenance item"}</Link>
                            ) : (
                              event.equipment_name || "General maintenance"
                            )}
                          </p>
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load shift details.";

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card detail-card">
          <Link href="/shifts" className="back-link">
            Back to shifts
          </Link>

          <p className="eyebrow">Shift detail</p>
          <h1>Shift unavailable</h1>
          <p className="intro">The full shift record could not be loaded right now.</p>

          <div className="status-banner status-error" role="alert">
            <p className="status-title">Shift details are temporarily unavailable.</p>
            <p className="status-copy">{message}</p>
            <p className="status-copy">
              Check that <code>NEXT_PUBLIC_API_BASE_URL</code> points to the Railway backend domain and that
              <code> /api/shifts/{id}</code> returns JSON.
            </p>
          </div>
        </section>
      </main>
    );
  }
}
