"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import AccordionSection from "@/components/AccordionSection";
import { apiBaseUrl, extractApiError } from "@/lib/api";
import { formatDate, formatDateTime, formatPlainValue } from "@/lib/format";
import { EquipmentDetailResponse, EquipmentWorkLog, Failure, MaintenanceEvent } from "@/lib/types";
import { getTodayInputValue } from "@/lib/work-week";

type EquipmentDetailClientProps = {
  initialData: EquipmentDetailResponse;
};

type WorkHistoryItem = {
  id: string;
  kind: "manual" | "maintenance" | "failure";
  badge: string;
  title: string;
  dateValue: string;
  details: Array<{
    label: string;
    value: string;
  }>;
};

type WorkLogFormState = {
  performedOn: string;
  action: string;
  partsUsed: string;
  notes: string;
};

type StoreWorkLogResponse = {
  message: string;
  work_log: EquipmentWorkLog;
};

const initialFormState: WorkLogFormState = {
  performedOn: getTodayInputValue(),
  action: "",
  partsUsed: "",
  notes: "",
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

function buildMaintenanceHistory(events: MaintenanceEvent[]): WorkHistoryItem[] {
  return events.map((event) => ({
    id: `maintenance-${event.id}`,
    kind: "maintenance",
    badge: "Работа из смены",
    title: event.action,
    dateValue: event.shift?.shift_date ?? event.created_at,
    details: [
      { label: "Дата", value: event.shift?.shift_date ? formatDate(event.shift.shift_date) : formatDateTime(event.created_at) },
      { label: "Запчасти", value: event.parts_used || "—" },
      { label: "Комментарий", value: event.notes || "—" },
    ],
  }));
}

function buildFailureHistory(failures: Failure[]): WorkHistoryItem[] {
  return failures.map((failure) => ({
    id: `failure-${failure.id}`,
    kind: "failure",
    badge: "Поломка",
    title: failure.problem,
    dateValue: failure.shift?.shift_date ?? failure.created_at,
    details: [
      { label: "Дата", value: failure.shift?.shift_date ? formatDate(failure.shift.shift_date) : formatDateTime(failure.created_at) },
      { label: "Причина", value: failure.cause || "—" },
      { label: "Решение", value: failure.solution || "—" },
      { label: "Простой", value: formatPlainValue(failure.downtime_minutes, "min") },
    ],
  }));
}

function buildManualHistory(workLogs: EquipmentWorkLog[]): WorkHistoryItem[] {
  return workLogs.map((workLog) => ({
    id: `manual-${workLog.id}`,
    kind: "manual",
    badge: "Ручная запись",
    title: workLog.action,
    dateValue: workLog.performed_on,
    details: [
      { label: "Дата работ", value: formatDate(workLog.performed_on) },
      { label: "Запчасти", value: workLog.parts_used || "—" },
      { label: "Комментарий", value: workLog.notes || "—" },
      { label: "Внесено", value: formatDateTime(workLog.created_at) },
    ],
  }));
}

function buildWorkHistory(equipment: EquipmentDetailResponse["equipment"]) {
  return [
    ...buildManualHistory(equipment.work_logs),
    ...buildMaintenanceHistory(equipment.maintenance_events),
    ...buildFailureHistory(equipment.failures),
  ].sort((left, right) => Date.parse(right.dateValue) - Date.parse(left.dateValue));
}

export default function EquipmentDetailClient({ initialData }: EquipmentDetailClientProps) {
  const [data, setData] = useState(initialData);
  const [formState, setFormState] = useState<WorkLogFormState>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const { equipment, summary } = data;
  const workHistory = useMemo(() => buildWorkHistory(equipment), [equipment]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formState.action.trim() === "") {
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/equipment/${equipment.id}/work-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          performed_on: formState.performedOn,
          action: formState.action.trim(),
          parts_used: formState.partsUsed.trim() || undefined,
          notes: formState.notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Не удалось сохранить работу по узлу."));
      }

      const responseData = (await response.json()) as StoreWorkLogResponse;

      setData((current) => ({
        equipment: {
          ...current.equipment,
          work_logs: [responseData.work_log, ...current.equipment.work_logs],
        },
        summary: {
          ...current.summary,
          manual_work_logs_count: current.summary.manual_work_logs_count + 1,
          work_history_count: current.summary.work_history_count + 1,
        },
      }));
      setFormState((current) => ({
        ...initialFormState,
        performedOn: current.performedOn,
      }));
      setStatusMessage(responseData.message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Не удалось сохранить работу по узлу.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card detail-card">
        <Link href="/equipment" className="back-link">
          Назад к оборудованию
        </Link>

        <p className="eyebrow">Карточка узла</p>
        <h1>{equipment.name}</h1>
        <p className="intro">
          {equipment.notes || "Короткая история работ по узлу, чтобы быстро видеть, что уже делали и что остается под контролем."}
        </p>

        <div className="tag-row">
          {equipment.category ? <span className="tag-pill">{equipment.category}</span> : null}
          {equipment.configuration ? <span className="tag-pill">{equipment.configuration}</span> : null}
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <p className="stat-label">Всего записей</p>
            <p className="stat-value">{summary.work_history_count}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Ручных записей</p>
            <p className="stat-value">{summary.manual_work_logs_count}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Работ из смен</p>
            <p className="stat-value">{summary.maintenance_count}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Поломок</p>
            <p className="stat-value">{summary.failures_count}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Открытых задач</p>
            <p className="stat-value">{summary.open_handover_items_count}</p>
          </article>
        </div>

        <AccordionSection
          title="Добавить выполненную работу"
          description="Открывайте узел и сразу заносите, что именно сделали: ремонт, регулировку, замену деталей или осмотр."
          badge={`История: ${summary.work_history_count}`}
          defaultOpen
        >
          <form className="record-form" onSubmit={handleSubmit}>
            <div className="filter-grid">
              <label className="field">
                <span className="field-label">Дата работ</span>
                <input
                  type="date"
                  className="text-input"
                  value={formState.performedOn}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      performedOn: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="field">
                <span className="field-label">Что сделали</span>
                <input
                  className="text-input"
                  value={formState.action}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      action: event.target.value,
                    }))
                  }
                  placeholder="Например: заменили сальники на двух цилиндрах"
                  required
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Запчасти и материалы</span>
              <input
                className="text-input"
                value={formState.partsUsed}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    partsUsed: event.target.value,
                  }))
                }
                placeholder="Например: сальники, датчик, смазка"
              />
            </label>

            <label className="field">
              <span className="field-label">Комментарий</span>
              <textarea
                rows={4}
                className="text-input text-area"
                value={formState.notes}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Что нашли, что отрегулировали, что важно проверить в следующий раз."
              />
            </label>

            <button type="submit" className="action-button" disabled={isSaving || formState.action.trim() === ""}>
              {isSaving ? "Сохраняю запись..." : "Сохранить работу по узлу"}
            </button>

            {statusMessage ? <p className="inline-status">{statusMessage}</p> : null}
          </form>
        </AccordionSection>

        <AccordionSection
          title="Основные элементы"
          description="Ключевые элементы и точки, на которые обычно смотрят при осмотре этого узла."
          badge={`${equipment.service_points?.length ?? 0}`}
          defaultOpen={(equipment.service_points?.length ?? 0) > 0}
        >
          {equipment.service_points && equipment.service_points.length > 0 ? (
            <div className="tag-row">
              {equipment.service_points.map((point) => (
                <span key={point} className="tag-pill">
                  {point}
                </span>
              ))}
            </div>
          ) : (
            <p className="section-empty">Для этого узла основные элементы пока не заполнены.</p>
          )}
        </AccordionSection>

        <AccordionSection
          title="Типовые неисправности"
          description="Список частых проблем и коротких подсказок по действиям."
          badge={`${equipment.common_issues?.length ?? 0}`}
        >
          {equipment.common_issues && equipment.common_issues.length > 0 ? (
            <div className="list-stack">
              {equipment.common_issues.map((issue) => (
                <article key={`${issue.problem}-${issue.action}`} className="list-card">
                  <p className="entry-title">{issue.problem}</p>
                  <p className="entry-copy">{issue.action}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="section-empty">Типовые неисправности для этого узла пока не добавлены.</p>
          )}
        </AccordionSection>

        <AccordionSection
          title="История работ"
          description="Объединенная лента ручных записей, работ из смен и зафиксированных поломок."
          badge={`${workHistory.length}`}
          defaultOpen
        >
          {workHistory.length > 0 ? (
            <div className="entry-list structured-list">
              {workHistory.map((item) => (
                <article key={item.id} className="entry-item">
                  <div className="tag-row">
                    <span className="tag-pill">{item.badge}</span>
                  </div>
                  <p className="entry-title">{item.title}</p>
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
        </AccordionSection>

        <AccordionSection
          title="Текущие задачи по узлу"
          description="Что по этому оборудованию еще висит в handover и требует внимания следующей смены."
          badge={`${equipment.handover_items.length}`}
        >
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
        </AccordionSection>
      </section>
    </main>
  );
}
