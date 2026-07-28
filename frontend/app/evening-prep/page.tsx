"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBaseUrl, buildQuery, extractApiError, fetchJson } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { EveningPrepChecklistItem, EveningPrepResponse } from "@/lib/types";

function getTodayInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 10);
}

function getNextDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + 1);

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 10);
}

async function fetchEveningPrepData(date: string) {
  return fetchJson<EveningPrepResponse>(`/api/evening-preps${buildQuery({ date })}`);
}

function sortChecklistItems(items: EveningPrepChecklistItem[]) {
  return [...items].sort((left, right) => {
    const byOrder = left.sort_order - right.sort_order;

    if (byOrder !== 0) {
      return byOrder;
    }

    const bySection = left.section.localeCompare(right.section, "ru");

    if (bySection !== 0) {
      return bySection;
    }

    const byTitle = left.title.localeCompare(right.title, "ru");

    if (byTitle !== 0) {
      return byTitle;
    }

    return left.evening_prep_item_id - right.evening_prep_item_id;
  });
}

function groupBySection<T extends { section: string }>(items: T[]) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const currentItems = groups.get(item.section) ?? [];

    currentItems.push(item);
    groups.set(item.section, currentItems);
  }

  return Array.from(groups.entries());
}

export default function EveningPrepPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const [targetDate, setTargetDate] = useState(getNextDateInputValue(getTodayInputValue()));
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [checklistItems, setChecklistItems] = useState<EveningPrepChecklistItem[]>([]);
  const [isNextDaySlaughter, setIsNextDaySlaughter] = useState(false);
  const [hasSavedPrep, setHasSavedPrep] = useState(false);
  const [savingPrep, setSavingPrep] = useState(false);
  const [prepMessage, setPrepMessage] = useState("");

  const applyResponseData = (data: EveningPrepResponse) => {
    setChecklistItems(sortChecklistItems(data.checklist_items));
    setTargetDate(data.target_date);
    setHasSavedPrep(Boolean(data.prep));
    setIsNextDaySlaughter(Boolean(data.prep?.is_next_day_slaughter));
    setLoadingError("");
  };

  const loadPrep = async (date: string) => {
    setLoading(true);
    setLoadingError("");
    setPrepMessage("");

    try {
      const data = await fetchEveningPrepData(date);
      applyResponseData(data);
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : "Не удалось загрузить вечернюю подготовку.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadSelectedDate = async () => {
      setLoading(true);
      setLoadingError("");
      setPrepMessage("");

      try {
        const data = await fetchEveningPrepData(selectedDate);

        if (isCancelled) {
          return;
        }

        applyResponseData(data);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setLoadingError(error instanceof Error ? error.message : "Не удалось загрузить вечернюю подготовку.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadSelectedDate();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  const updateChecklistItem = (eveningPrepItemId: number, patch: Partial<EveningPrepChecklistItem>) => {
    setChecklistItems((current) =>
      sortChecklistItems(
        current.map((item) =>
          item.evening_prep_item_id === eveningPrepItemId
            ? {
                ...item,
                ...patch,
              }
            : item,
        ),
      ),
    );
  };

  const savePrep = async () => {
    if (!isNextDaySlaughter && !hasSavedPrep) {
      setPrepMessage("Если завтра не день забоя, эта вечерняя подготовка не записывается в базу.");
      return;
    }

    setSavingPrep(true);
    setPrepMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/evening-preps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          prep_date: selectedDate,
          is_next_day_slaughter: true,
          entries: checklistItems.map((item) => ({
            evening_prep_item_id: item.evening_prep_item_id,
            is_checked: item.is_checked,
            note: item.note ?? "",
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Не удалось сохранить вечернюю подготовку."));
      }

      const data = (await response.json()) as EveningPrepResponse;
      applyResponseData(data);
      setPrepMessage("Вечерняя подготовка сохранена.");
    } catch (error) {
      setPrepMessage(error instanceof Error ? error.message : "Не удалось сохранить вечернюю подготовку.");
    } finally {
      setSavingPrep(false);
    }
  };

  const groupedChecklistItems = groupBySection(checklistItems);
  const checkedCount = checklistItems.filter((item) => item.is_checked).length;

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card detail-card">
        <Link href="/" className="back-link">
          Назад
        </Link>

        <p className="eyebrow">Закрытие смены</p>
        <h1>Вечерняя подготовка на завтра</h1>
        <p className="intro">
          Простой чек-лист перед уходом: пройтись по ключевым узлам и зафиксировать, что линия подготовлена к
          завтрашнему дню забоя.
        </p>

        {loading && !loadingError ? (
          <div className="status-banner status-success" role="status">
            <p className="status-title">Загружаю вечерний чек-лист.</p>
            <p className="status-copy">Подтягиваю пункты подготовки и сохраненные отметки по выбранной дате.</p>
          </div>
        ) : null}

        {loadingError ? (
          <div className="status-banner status-error" role="alert">
            <p className="status-title">Секция вечерней подготовки временно недоступна.</p>
            <p className="status-copy">{loadingError}</p>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => void loadPrep(selectedDate)}>
                Повторить загрузку
              </button>
            </div>
          </div>
        ) : null}

        {!loadingError ? (
          <>
            <div className="stats-grid">
              <article className="stat-card">
                <p className="stat-label">Закрытие дня</p>
                <p className="stat-value">{formatDate(selectedDate)}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Подготовка на</p>
                <p className="stat-value">{formatDate(targetDate)}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Пунктов</p>
                <p className="stat-value">{checklistItems.length}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Отмечено</p>
                <p className="stat-value">{checkedCount}</p>
              </article>
            </div>

            <div className="section-divider" />

            <section className="detail-section">
              <div className="section-heading-wrap">
                <h2 className="section-title">Чек-лист подготовки</h2>
                <p className="section-text">
                  Отметьте только те действия, которые действительно выполнены перед уходом со смены.
                </p>
              </div>

              <div className="filter-grid">
                <label className="field">
                  <span className="field-label">Дата закрытия смены</span>
                  <input
                    type="date"
                    className="text-input"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                </label>

                <label className="field">
                  <span className="field-label">Подготовка на дату</span>
                  <input type="text" className="text-input" value={formatDate(targetDate)} readOnly />
                </label>
              </div>

              <div className="toolbar-row">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={hasSavedPrep ? true : isNextDaySlaughter}
                    disabled={hasSavedPrep}
                    onChange={(event) => setIsNextDaySlaughter(event.target.checked)}
                  />
                  <span>{hasSavedPrep ? "Подготовка на день забоя уже сохранена" : "Завтра день забоя"}</span>
                </label>
                {hasSavedPrep ? <span className="tag-pill tag-pill-resolved">Подготовка уже сохранена</span> : null}
              </div>

              {!hasSavedPrep && !isNextDaySlaughter ? (
                <div className="status-banner">
                  <p className="status-title">Обычный следующий день</p>
                  <p className="status-copy">
                    Если завтра не день забоя, этот чек-лист можно использовать как подсказку, но он не будет записан в
                    базу.
                  </p>
                </div>
              ) : null}

              {prepMessage ? <p className="inline-status morning-round-status">{prepMessage}</p> : null}

              <div className="list-stack">
                {groupedChecklistItems.map(([section, items]) => (
                  <section key={section} className="detail-section">
                    <div className="section-heading-wrap">
                      <h3 className="section-title">{section}</h3>
                      <p className="section-text">Подтвердите, что этот участок подготовлен на утренний запуск.</p>
                    </div>

                    <div className="list-stack">
                      {items.map((item) => (
                        <article key={item.evening_prep_item_id} className="checklist-card">
                          <div className="toolbar-row toolbar-row-spread">
                            <div>
                              <p className="entry-title">{item.title}</p>
                              {item.details ? <p className="section-text">{item.details}</p> : null}
                            </div>
                          </div>

                          <label className="checkbox-row">
                            <input
                              type="checkbox"
                              checked={item.is_checked}
                              onChange={(event) =>
                                updateChecklistItem(item.evening_prep_item_id, { is_checked: event.target.checked })
                              }
                            />
                            <span>Сделано</span>
                          </label>

                          <label className="field">
                            <span className="field-label">Комментарий</span>
                            <textarea
                              rows={3}
                              className="text-input text-area"
                              placeholder="Например: вода набрана, таймер выставлен, камеры проверены."
                              value={item.note ?? ""}
                              onChange={(event) =>
                                updateChecklistItem(item.evening_prep_item_id, { note: event.target.value })
                              }
                            />
                          </label>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="action-button"
                  disabled={savingPrep || (!isNextDaySlaughter && !hasSavedPrep)}
                  onClick={savePrep}
                >
                  {savingPrep ? "Сохраняю подготовку..." : "Сохранить подготовку"}
                </button>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
