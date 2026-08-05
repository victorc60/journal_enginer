"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AccordionSection from "@/components/AccordionSection";
import { apiBaseUrl, buildQuery, extractApiError, fetchJson } from "@/lib/api";
import { getTodayInputValue } from "@/lib/work-week";
import {
  MorningRoundChecklistItem,
  MorningRoundResponse,
  MorningRoundTemplateItem,
} from "@/lib/types";

type NewItemFormState = {
  section: string;
  title: string;
  details: string;
  sort_order: string;
};

const initialNewItemForm: NewItemFormState = {
  section: "Общий осмотр",
  title: "",
  details: "",
  sort_order: "",
};

async function fetchMorningRoundData(date: string) {
  return fetchJson<MorningRoundResponse>(`/api/morning-rounds${buildQuery({ date })}`);
}

function sortTemplateItems(items: MorningRoundTemplateItem[]) {
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

    return left.id - right.id;
  });
}

function sortChecklistItems(items: MorningRoundChecklistItem[]) {
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

    return left.morning_round_item_id - right.morning_round_item_id;
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

function toChecklistItem(item: MorningRoundTemplateItem): MorningRoundChecklistItem {
  return {
    morning_round_item_id: item.id,
    section: item.section,
    title: item.title,
    details: item.details,
    sort_order: item.sort_order,
    is_active: item.is_active,
    is_checked: false,
    note: null,
    from_history_only: false,
  };
}

export default function MorningRoundsPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [checklistItems, setChecklistItems] = useState<MorningRoundChecklistItem[]>([]);
  const [templateItems, setTemplateItems] = useState<MorningRoundTemplateItem[]>([]);
  const [expectedIsSlaughterDay, setExpectedIsSlaughterDay] = useState(false);
  const [isSlaughterDay, setIsSlaughterDay] = useState(false);
  const [hasSavedRound, setHasSavedRound] = useState(false);
  const [savingRound, setSavingRound] = useState(false);
  const [roundMessage, setRoundMessage] = useState("");
  const [editorMessage, setEditorMessage] = useState("");
  const [creatingItem, setCreatingItem] = useState(false);
  const [savingItemIds, setSavingItemIds] = useState<number[]>([]);
  const [archivingItemIds, setArchivingItemIds] = useState<number[]>([]);
  const [newItemForm, setNewItemForm] = useState<NewItemFormState>(initialNewItemForm);

  const applyResponseData = (data: MorningRoundResponse) => {
    setChecklistItems(sortChecklistItems(data.checklist_items));
    setTemplateItems(sortTemplateItems(data.template_items));
    setExpectedIsSlaughterDay(Boolean(data.expected_is_slaughter_day));
    setHasSavedRound(Boolean(data.round));
    setIsSlaughterDay(Boolean(data.round?.is_slaughter_day ?? data.expected_is_slaughter_day));
    setLoadingError("");
  };

  const loadRound = async (date: string) => {
    setLoading(true);
    setLoadingError("");
    setRoundMessage("");

    try {
      const data = await fetchMorningRoundData(date);
      applyResponseData(data);
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : "Не удалось загрузить утренний обход.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadSelectedDate = async () => {
      setLoading(true);
      setLoadingError("");
      setRoundMessage("");

      try {
        const data = await fetchMorningRoundData(selectedDate);

        if (isCancelled) {
          return;
        }

        applyResponseData(data);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setLoadingError(error instanceof Error ? error.message : "Не удалось загрузить утренний обход.");
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

  const updateChecklistItem = (morningRoundItemId: number, patch: Partial<MorningRoundChecklistItem>) => {
    setChecklistItems((current) =>
      sortChecklistItems(
        current.map((item) =>
          item.morning_round_item_id === morningRoundItemId
            ? {
                ...item,
                ...patch,
              }
            : item,
        ),
      ),
    );
  };

  const updateTemplateItem = (id: number, patch: Partial<MorningRoundTemplateItem>) => {
    setTemplateItems((current) =>
      sortTemplateItems(
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                ...patch,
              }
            : item,
        ),
      ),
    );
  };

  const saveRound = async () => {
    if (!isSlaughterDay && !hasSavedRound) {
      setRoundMessage("Для обычного дня обход не записывается в базу. Отметьте день забоя, если хотите сохранить результат.");
      return;
    }

    setSavingRound(true);
    setRoundMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/morning-rounds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          round_date: selectedDate,
          is_slaughter_day: true,
          entries: checklistItems.map((item) => ({
            morning_round_item_id: item.morning_round_item_id,
            is_checked: item.is_checked,
            note: item.note ?? "",
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Не удалось сохранить утренний обход."));
      }

      const data = (await response.json()) as MorningRoundResponse;
      applyResponseData(data);
      setRoundMessage("Утренний обход сохранен.");
    } catch (error) {
      setRoundMessage(error instanceof Error ? error.message : "Не удалось сохранить утренний обход.");
    } finally {
      setSavingRound(false);
    }
  };

  const createItem = async () => {
    setCreatingItem(true);
    setEditorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/morning-round-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          section: newItemForm.section,
          title: newItemForm.title,
          details: newItemForm.details,
          sort_order: newItemForm.sort_order ? Number(newItemForm.sort_order) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Не удалось добавить пункт обхода."));
      }

      const item = (await response.json()) as MorningRoundTemplateItem;

      setTemplateItems((current) => sortTemplateItems([...current, item]));
      setChecklistItems((current) => sortChecklistItems([...current, toChecklistItem(item)]));
      setNewItemForm((current) => ({
        ...current,
        title: "",
        details: "",
        sort_order: "",
      }));
      setEditorMessage(`Пункт "${item.title}" добавлен в обход.`);
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "Не удалось добавить пункт обхода.");
    } finally {
      setCreatingItem(false);
    }
  };

  const saveTemplateItem = async (item: MorningRoundTemplateItem) => {
    setSavingItemIds((current) => [...current, item.id]);
    setEditorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/morning-round-items/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          section: item.section,
          title: item.title,
          details: item.details ?? "",
          sort_order: item.sort_order,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Не удалось обновить пункт обхода."));
      }

      const savedItem = (await response.json()) as MorningRoundTemplateItem;

      setTemplateItems((current) =>
        sortTemplateItems(current.map((currentItem) => (currentItem.id === savedItem.id ? savedItem : currentItem))),
      );
      setChecklistItems((current) =>
        sortChecklistItems(
          current.map((currentItem) =>
            currentItem.morning_round_item_id === savedItem.id
              ? {
                  ...currentItem,
                  section: savedItem.section,
                  title: savedItem.title,
                  details: savedItem.details,
                  sort_order: savedItem.sort_order,
                  is_active: savedItem.is_active,
                }
              : currentItem,
          ),
        ),
      );
      setEditorMessage(`Пункт "${savedItem.title}" обновлен.`);
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "Не удалось обновить пункт обхода.");
    } finally {
      setSavingItemIds((current) => current.filter((value) => value !== item.id));
    }
  };

  const archiveTemplateItem = async (item: MorningRoundTemplateItem) => {
    setArchivingItemIds((current) => [...current, item.id]);
    setEditorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/morning-round-items/${item.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Не удалось убрать пункт обхода."));
      }

      const archivedItem = (await response.json()) as MorningRoundTemplateItem;

      setTemplateItems((current) => current.filter((currentItem) => currentItem.id !== archivedItem.id));
      setChecklistItems((current) => {
        if (hasSavedRound) {
          return sortChecklistItems(
            current.map((currentItem) =>
              currentItem.morning_round_item_id === archivedItem.id
                ? {
                    ...currentItem,
                    is_active: false,
                    from_history_only: true,
                  }
                : currentItem,
            ),
          );
        }

        return sortChecklistItems(
          current.filter((currentItem) => currentItem.morning_round_item_id !== archivedItem.id),
        );
      });
      setEditorMessage(`Пункт "${archivedItem.title}" убран из активного обхода.`);
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "Не удалось убрать пункт обхода.");
    } finally {
      setArchivingItemIds((current) => current.filter((value) => value !== item.id));
    }
  };

  const groupedChecklistItems = groupBySection(checklistItems);
  const groupedTemplateItems = groupBySection(templateItems);
  const checkedCount = checklistItems.filter((item) => item.is_checked).length;
  const activeChecklistCount = checklistItems.filter((item) => item.is_active).length;
  const sectionCount = new Set(templateItems.map((item) => item.section)).size;

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card detail-card">
        <Link href="/" className="back-link">
          Назад
        </Link>

        <p className="eyebrow">Ежедневный контроль</p>
        <h1>Утренний обход оборудования</h1>
        <p className="intro">
          Здесь можно провести утренний обход на конкретную дату и сразу управлять самим списком точек обхода:
          добавлять новые, редактировать формулировки и убирать неактуальные.
        </p>

        {loading && !loadingError ? (
          <div className="status-banner status-success" role="status">
            <p className="status-title">Загружаю текущий обход.</p>
            <p className="status-copy">Подтягиваю пункты списка и сохраненную историю по выбранной дате.</p>
          </div>
        ) : null}

        {loadingError ? (
          <div className="status-banner status-error" role="alert">
            <p className="status-title">Раздел обхода временно недоступен.</p>
            <p className="status-copy">{loadingError}</p>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => void loadRound(selectedDate)}>
                Повторить загрузку
              </button>
            </div>
          </div>
        ) : null}

        {!loadingError ? (
          <>
            <div className="stats-grid">
              <article className="stat-card">
                <p className="stat-label">Дата обхода</p>
                <p className="stat-value">{selectedDate}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Активных точек</p>
                <p className="stat-value">{activeChecklistCount}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Отмечено</p>
                <p className="stat-value">{checkedCount}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Разделов</p>
                <p className="stat-value">{sectionCount}</p>
              </article>
            </div>

            <AccordionSection
              title="Чеклист обхода"
              description="Если это день забоя, сохраните обход в базу. Для обычного дня список остается только рабочей заметкой на экране."
              badge={`${checkedCount}/${activeChecklistCount}`}
              defaultOpen
            >
              <div className="filter-grid">
                <label className="field">
                  <span className="field-label">Дата</span>
                  <input
                    type="date"
                    className="text-input"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                </label>
              </div>

              <div className="toolbar-row">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={hasSavedRound ? true : isSlaughterDay}
                    disabled={hasSavedRound || !expectedIsSlaughterDay}
                    onChange={(event) => setIsSlaughterDay(event.target.checked)}
                  />
                  <span>
                    {hasSavedRound
                      ? "Для этой даты уже сохранен день забоя"
                      : expectedIsSlaughterDay
                        ? "Сегодня день забоя"
                        : "Сегодня нерабочий день по графику"}
                  </span>
                </label>
                {hasSavedRound ? <span className="tag-pill tag-pill-resolved">Обход уже сохранен</span> : null}
              </div>

              {!hasSavedRound && expectedIsSlaughterDay ? (
                <div className="status-banner status-success" role="status">
                  <p className="status-title">Рабочая неделя уже учтена</p>
                  <p className="status-copy">
                    По графику воскресенье, понедельник, вторник, среда и четверг считаются днями забоя. Чек-лист
                    включается автоматически, но вы можете снять галочку, если это исключение.
                  </p>
                </div>
              ) : null}

              {!hasSavedRound && !expectedIsSlaughterDay ? (
                <div className="status-banner">
                  <p className="status-title">Пятница или суббота</p>
                  <p className="status-copy">
                    Можете пройтись по пунктам как по подсказке, но для нерабочего дня запись в базу не сохраняется.
                  </p>
                </div>
              ) : null}

              {roundMessage ? <p className="inline-status morning-round-status">{roundMessage}</p> : null}

              <div className="list-stack">
                {groupedChecklistItems.length === 0 ? (
                  <div className="status-banner">
                    <p className="status-title">Список обхода пока пуст.</p>
                    <p className="status-copy">Добавьте первые точки ниже, и они сразу появятся в ежедневном обходе.</p>
                  </div>
                ) : null}

                {groupedChecklistItems.map(([section, items]) => {
                  const sectionCheckedCount = items.filter((item) => item.is_checked).length;

                  return (
                    <AccordionSection
                      key={section}
                      title={section}
                      description="Пункты, которые будут проходиться на выбранную дату."
                      badge={`${sectionCheckedCount}/${items.length}`}
                      defaultOpen={sectionCheckedCount > 0 || groupedChecklistItems.length === 1}
                      nested
                    >
                      <div className="list-stack">
                        {items.map((item) => (
                          <article
                            key={item.morning_round_item_id}
                            className={`checklist-card${item.from_history_only ? " checklist-card-muted" : ""}`}
                          >
                            <div className="toolbar-row toolbar-row-spread">
                              <div>
                                <p className="entry-title">{item.title}</p>
                                {item.details ? <p className="section-text">{item.details}</p> : null}
                              </div>

                              <div className="tag-row">
                                {item.from_history_only ? <span className="tag-pill">Архивный пункт</span> : null}
                                {!item.is_active ? <span className="tag-pill">Не активен</span> : null}
                              </div>
                            </div>

                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={item.is_checked}
                                onChange={(event) =>
                                  updateChecklistItem(item.morning_round_item_id, { is_checked: event.target.checked })
                                }
                              />
                              <span>Проверено / выполнено</span>
                            </label>

                            <label className="field">
                              <span className="field-label">Комментарий</span>
                              <textarea
                                rows={3}
                                className="text-input text-area"
                                placeholder="Например: подтянул цепь, проверил датчик, отрегулировал узел."
                                value={item.note ?? ""}
                                onChange={(event) =>
                                  updateChecklistItem(item.morning_round_item_id, { note: event.target.value })
                                }
                              />
                            </label>
                          </article>
                        ))}
                      </div>
                    </AccordionSection>
                  );
                })}
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="action-button"
                  disabled={savingRound || (!isSlaughterDay && !hasSavedRound)}
                  onClick={saveRound}
                >
                  {savingRound ? "Сохраняю обход..." : "Сохранить обход"}
                </button>
              </div>
            </AccordionSection>

            <AccordionSection
              title="Редактор точек обхода"
              description="Здесь вы сами регулируете MVP: добавляете новые места обхода, меняете названия и убираете лишнее."
              badge={`${templateItems.filter((item) => item.is_active).length} активных`}
            >

              {editorMessage ? <p className="inline-status morning-round-status">{editorMessage}</p> : null}

              <AccordionSection
                title="Добавить новый пункт"
                description="Новый пункт сразу попадет в активный утренний обход."
                badge="Быстрое добавление"
                defaultOpen
                nested
              >
                <div className="filter-grid">
                  <label className="field">
                    <span className="field-label">Раздел</span>
                    <input
                      className="text-input"
                      value={newItemForm.section}
                      onChange={(event) =>
                        setNewItemForm((current) => ({
                          ...current,
                          section: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Порядок</span>
                    <input
                      type="number"
                      min="0"
                      className="text-input"
                      value={newItemForm.sort_order}
                      onChange={(event) =>
                        setNewItemForm((current) => ({
                          ...current,
                          sort_order: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="field-label">Название пункта</span>
                  <input
                    className="text-input"
                    placeholder="Например: Насосная группа перед запуском"
                    value={newItemForm.title}
                    onChange={(event) =>
                      setNewItemForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span className="field-label">Подсказка / что смотреть</span>
                  <textarea
                    rows={3}
                    className="text-input text-area"
                    placeholder="Коротко напишите, что именно нужно проверить на этом месте."
                    value={newItemForm.details}
                    onChange={(event) =>
                      setNewItemForm((current) => ({
                        ...current,
                        details: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="button-row">
                  <button type="button" className="action-button" disabled={creatingItem} onClick={createItem}>
                    {creatingItem ? "Добавляю пункт..." : "Добавить пункт обхода"}
                  </button>
                </div>
              </AccordionSection>

              <div className="list-stack">
                {groupedTemplateItems.map(([section, items]) => (
                  <AccordionSection
                    key={section}
                    title={section}
                    description="Активные пункты, которые сейчас входят в ежедневный обход."
                    badge={`${items.length} пунктов`}
                    nested
                  >
                    <div className="list-stack">
                      {items.map((item) => {
                        const isSavingItem = savingItemIds.includes(item.id);
                        const isArchivingItem = archivingItemIds.includes(item.id);

                        return (
                          <article key={item.id} className="checklist-card">
                            <div className="filter-grid">
                              <label className="field">
                                <span className="field-label">Раздел</span>
                                <input
                                  className="text-input"
                                  value={item.section}
                                  onChange={(event) => updateTemplateItem(item.id, { section: event.target.value })}
                                />
                              </label>

                              <label className="field">
                                <span className="field-label">Порядок</span>
                                <input
                                  type="number"
                                  min="0"
                                  className="text-input"
                                  value={item.sort_order}
                                  onChange={(event) =>
                                    updateTemplateItem(item.id, {
                                      sort_order: Number(event.target.value || 0),
                                    })
                                  }
                                />
                              </label>
                            </div>

                            <label className="field">
                              <span className="field-label">Название</span>
                              <input
                                className="text-input"
                                value={item.title}
                                onChange={(event) => updateTemplateItem(item.id, { title: event.target.value })}
                              />
                            </label>

                            <label className="field">
                              <span className="field-label">Подсказка</span>
                              <textarea
                                rows={3}
                                className="text-input text-area"
                                value={item.details ?? ""}
                                onChange={(event) => updateTemplateItem(item.id, { details: event.target.value })}
                              />
                            </label>

                            <div className="button-row morning-round-button-row">
                              <button
                                type="button"
                                className="action-button"
                                disabled={isSavingItem || isArchivingItem}
                                onClick={() => saveTemplateItem(item)}
                              >
                                {isSavingItem ? "Сохраняю..." : "Сохранить пункт"}
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                disabled={isSavingItem || isArchivingItem}
                                onClick={() => archiveTemplateItem(item)}
                              >
                                {isArchivingItem ? "Убираю..." : "Убрать из обхода"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </AccordionSection>
                ))}
              </div>
            </AccordionSection>
          </>
        ) : null}
      </section>
    </main>
  );
}
