"use client";

import { useState } from "react";
import { apiBaseUrl, extractApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { HandoverItem } from "@/lib/types";

type HandoverBoardProps = {
  initialItems: HandoverItem[];
};

const statuses = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
] as const;

const priorities = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
] as const;

export default function HandoverBoard({ initialItems }: HandoverBoardProps) {
  const [items, setItems] = useState(initialItems);
  const [savingIds, setSavingIds] = useState<number[]>([]);
  const [messageById, setMessageById] = useState<Record<number, string>>({});

  const updateItem = (id: number, patch: Partial<HandoverItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const saveItem = async (item: HandoverItem) => {
    setSavingIds((current) => [...current, item.id]);
    setMessageById((current) => ({ ...current, [item.id]: "" }));

    try {
      const response = await fetch(`${apiBaseUrl}/api/handover/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          status: item.status,
          priority: item.priority,
          assigned_to: item.assigned_to,
          due_date: item.due_date,
          resolution_notes: item.resolution_notes,
          details: item.details,
          title: item.title,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Unable to update handover item."));
      }

      const data = (await response.json()) as HandoverItem;
      updateItem(item.id, data);
      setMessageById((current) => ({ ...current, [item.id]: "Saved." }));
    } catch (error) {
      setMessageById((current) => ({
        ...current,
        [item.id]: error instanceof Error ? error.message : "Unable to update handover item.",
      }));
    } finally {
      setSavingIds((current) => current.filter((value) => value !== item.id));
    }
  };

  return (
    <div className="list-stack">
      {items.map((item) => {
        const isSaving = savingIds.includes(item.id);

        return (
          <article key={item.id} className="detail-section">
            <div className="toolbar-row toolbar-row-spread">
              <div>
                <p className="entry-title">{item.title}</p>
                <p className="section-text">
                  Shift: {item.shift?.shift_date ? formatDate(item.shift.shift_date) : "—"}
                  {item.equipment_name ? ` · ${item.equipment_name}` : ""}
                </p>
              </div>
              {item.is_overdue ? <span className="tag-pill tag-pill-urgent">Overdue</span> : null}
            </div>

            <div className="filter-grid">
              <label className="field">
                <span className="field-label">Status</span>
                <select
                  className="text-input"
                  value={item.status}
                  onChange={(event) => updateItem(item.id, { status: event.target.value })}
                >
                  {statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Priority</span>
                <select
                  className="text-input"
                  value={item.priority}
                  onChange={(event) => updateItem(item.id, { priority: event.target.value })}
                >
                  {priorities.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Assigned to</span>
                <input
                  className="text-input"
                  value={item.assigned_to ?? ""}
                  onChange={(event) => updateItem(item.id, { assigned_to: event.target.value })}
                />
              </label>

              <label className="field">
                <span className="field-label">Due date</span>
                <input
                  type="date"
                  className="text-input"
                  value={item.due_date ?? ""}
                  onChange={(event) => updateItem(item.id, { due_date: event.target.value })}
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Details</span>
              <textarea
                rows={3}
                className="text-input text-area"
                value={item.details ?? ""}
                onChange={(event) => updateItem(item.id, { details: event.target.value })}
              />
            </label>

            <label className="field">
              <span className="field-label">Resolution notes</span>
              <textarea
                rows={2}
                className="text-input text-area"
                value={item.resolution_notes ?? ""}
                onChange={(event) => updateItem(item.id, { resolution_notes: event.target.value })}
              />
            </label>

            <div className="button-row">
              <button type="button" className="action-button" disabled={isSaving} onClick={() => saveItem(item)}>
                {isSaving ? "Saving..." : "Save handover item"}
              </button>
              {messageById[item.id] ? <p className="inline-status">{messageById[item.id]}</p> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
