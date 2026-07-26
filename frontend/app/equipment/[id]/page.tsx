import Link from "next/link";
import { fetchJson } from "@/lib/api";
import { formatDate, formatPlainValue } from "@/lib/format";
import { EquipmentDetailResponse, Failure, MaintenanceEvent } from "@/lib/types";

type EquipmentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function tagClass(value: string) {
  return `tag-pill tag-pill-${value || "normal"}`;
}

function priorityLabel(value: string) {
  switch (value) {
    case "high":
      return "Высокий";
    case "medium":
      return "Средний";
    case "low":
      return "Низкий";
    default:
      return value;
  }
}

function statusLabel(value: string) {
  switch (value) {
    case "open":
      return "Открыто";
    case "in_progress":
      return "В работе";
    case "resolved":
      return "Закрыто";
    default:
      return value;
  }
}

type WorkHistoryItem = {
  id: string;
  kind: "maintenance" | "failure";
  title: string;
  shiftDate: string | null;
  createdAt: string;
  details: Array<{
    label: string;
    value: string;
  }>;
};

function buildWorkHistory(maintenanceEvents: MaintenanceEvent[], failures: Failure[]): WorkHistoryItem[] {
  const maintenanceHistory = maintenanceEvents.map((event) => ({
    id: `maintenance-${event.id}`,
    kind: "maintenance" as const,
    title: event.action,
    shiftDate: event.shift?.shift_date ?? null,
    createdAt: event.created_at,
    details: [
      { label: "Запчасти", value: event.parts_used || "—" },
      { label: "Заметка", value: event.notes || "—" },
    ],
  }));

  const failureHistory = failures.map((failure) => ({
    id: `failure-${failure.id}`,
    kind: "failure" as const,
    title: failure.problem,
    shiftDate: failure.shift?.shift_date ?? null,
    createdAt: failure.created_at,
    details: [
      { label: "Причина", value: failure.cause || "—" },
      { label: "Решение", value: failure.solution || "—" },
      { label: "Простой", value: formatPlainValue(failure.downtime_minutes, "min") },
    ],
  }));

  return [...maintenanceHistory, ...failureHistory].sort((left, right) => {
    const leftDate = Date.parse(left.shiftDate ?? left.createdAt);
    const rightDate = Date.parse(right.shiftDate ?? right.createdAt);

    return rightDate - leftDate;
  });
}

export default async function EquipmentDetailPage({ params }: EquipmentDetailPageProps) {
  const { id } = await params;

  try {
    const data = await fetchJson<EquipmentDetailResponse>(`/api/equipment/${id}`);
    const { equipment, summary } = data;
    const workHistory = buildWorkHistory(equipment.maintenance_events, equipment.failures);

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card detail-card">
          <Link href="/equipment" className="back-link">
            Назад к оборудованию
          </Link>

          <p className="eyebrow">Карточка узла</p>
          <h1>{equipment.name}</h1>
          <p className="intro">
            {equipment.notes || "Короткая история работ по узлу, чтобы быстро понять, что делали и что остается под контролем."}
          </p>

          <div className="tag-row">
            {equipment.category ? <span className="tag-pill">{equipment.category}</span> : null}
            {equipment.configuration ? <span className="tag-pill">{equipment.configuration}</span> : null}
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <p className="stat-label">Записей в истории</p>
              <p className="stat-value">{summary.work_history_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Работы</p>
              <p className="stat-value">{summary.maintenance_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Поломки</p>
              <p className="stat-value">{summary.failures_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Открытые задачи</p>
              <p className="stat-value">{summary.open_handover_items_count}</p>
            </article>
          </div>

          {equipment.service_points && equipment.service_points.length > 0 ? (
            <section className="detail-section">
              <h2 className="section-title">Основные элементы</h2>
              <div className="tag-row">
                {equipment.service_points.map((point) => (
                  <span key={point} className="tag-pill">
                    {point}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {equipment.common_issues && equipment.common_issues.length > 0 ? (
            <section className="detail-section">
              <h2 className="section-title">Типовые неисправности</h2>
              <div className="list-stack">
                {equipment.common_issues.map((issue) => (
                  <article key={issue.problem} className="list-card">
                    <p className="entry-title">{issue.problem}</p>
                    <p className="entry-copy">{issue.action}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="detail-section">
            <h2 className="section-title">История работ</h2>
            {workHistory.length > 0 ? (
              <div className="entry-list structured-list">
                {workHistory.map((item) => (
                  <article key={item.id} className="entry-item">
                    <div className="tag-row">
                      <span className="tag-pill">{item.kind === "maintenance" ? "Работа" : "Событие"}</span>
                    </div>
                    <p className="entry-title">{item.title}</p>
                    <p className="entry-copy">
                      <strong>Дата:</strong> {item.shiftDate ? formatDate(item.shiftDate) : formatDate(item.createdAt)}
                    </p>
                    {item.details.map((detail) => (
                      <p key={`${item.id}-${detail.label}`} className="entry-copy">
                        <strong>{detail.label}:</strong> {detail.value}
                      </p>
                    ))}
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-empty">По этому узлу пока нет записей в истории работ.</p>
            )}
          </section>

          <section className="detail-section">
            <h2 className="section-title">Текущие задачи по узлу</h2>
            {equipment.handover_items.length > 0 ? (
              <div className="list-stack">
                {equipment.handover_items.map((item) => (
                  <article key={item.id} className="list-card">
                    <div className="tag-row">
                      <span className={tagClass(item.priority)}>{priorityLabel(item.priority)}</span>
                      <span className={tagClass(item.status)}>{statusLabel(item.status)}</span>
                    </div>
                    <p className="entry-title">{item.title}</p>
                    <p className="entry-copy">{item.details || "Без описания."}</p>
                    <p className="entry-copy">
                      <strong>Смена:</strong> {item.shift?.shift_date ? formatDate(item.shift.shift_date) : "—"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-empty">По этому узлу нет открытых задач для следующей смены.</p>
            )}
          </section>
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось загрузить карточку узла.";

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card">
          <Link href="/equipment" className="back-link">
            Назад к оборудованию
          </Link>

          <p className="eyebrow">Карточка узла</p>
          <h1>Карточка недоступна</h1>
          <div className="status-banner status-error" role="alert">
            <p className="status-title">Данные по узлу временно недоступны.</p>
            <p className="status-copy">{message}</p>
          </div>
        </section>
      </main>
    );
  }
}
