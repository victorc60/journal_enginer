"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AccordionSection from "@/components/AccordionSection";
import { apiBaseUrl, buildQuery, extractApiError } from "@/lib/api";
import {
  ActivityCalendarDay,
  ActivityCalendarItem,
  ActivityCalendarItemKey,
  ActivityCalendarResponse,
} from "@/lib/types";

type HomeDashboardClientProps = {
  initialCalendar: ActivityCalendarResponse | null;
  initialCalendarError?: string | null;
};

const actionGroups = [
  {
    title: "Смена и записи",
    description: "Фиксация смены, handover и полная история работы линии.",
    badge: "3 раздела",
    defaultOpen: true,
    actions: [
      {
        label: "Записать смену",
        hint: "Диктовка, ручной ввод, handover и вложения.",
        href: "/record",
      },
      {
        label: "История смен",
        hint: "Поиск, фильтры, экспорт и открытие полной записи.",
        href: "/shifts",
      },
      {
        label: "Доска handover",
        hint: "Открытые задачи и контроль статусов между сменами.",
        href: "/handover",
      },
    ],
  },
  {
    title: "Оборудование и обходы",
    description: "Узлы линии, утренний обход и вечерняя подготовка к следующему запуску.",
    badge: "3 раздела",
    defaultOpen: false,
    actions: [
      {
        label: "Оборудование",
        hint: "Карточки узлов, поломки и история работ.",
        href: "/equipment",
      },
      {
        label: "Утренний обход",
        hint: "Чек-лист точек обхода и состояние на дату.",
        href: "/morning-rounds",
      },
      {
        label: "Вечерняя подготовка",
        hint: "Подготовка перед следующим днём забоя.",
        href: "/evening-prep",
      },
    ],
  },
  {
    title: "Ресурсы и контроль",
    description: "Вода, CO2, сводные показатели и сохранённые смены.",
    badge: "3 раздела",
    defaultOpen: false,
    actions: [
      {
        label: "Дашборд",
        hint: "Головы, температуры, CO2 и общая динамика.",
        href: "/dashboard",
      },
      {
        label: "Вода и CO2",
        hint: "Счётчики воды, химия и остаток газа.",
        href: "/water-co2",
      },
      {
        label: "AI ассистент",
        hint: "Сводки, ответы по журналу и быстрый разбор данных.",
        href: "/chat",
      },
    ],
  },
] as const;

const quickLaunchActions = [
  {
    label: "Записать смену",
    hint: "Быстрый вход в основную запись дня.",
    href: "/record",
  },
  {
    label: "Открыть обход",
    hint: "Утренний чек-лист и отметки.",
    href: "/morning-rounds",
  },
  {
    label: "Вода и CO2",
    hint: "Счётчики, химия и расход.",
    href: "/water-co2",
  },
] as const;

const weekdayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

const calendarLegend: Array<{ key: ActivityCalendarItemKey; label: string }> = [
  { key: "morning_round", label: "Обход" },
  { key: "evening_prep", label: "Подготовка" },
  { key: "shift", label: "Смена" },
  { key: "water", label: "Вода" },
  { key: "co2", label: "CO2" },
];

function getCurrentMonthKey() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 7);
}

function monthKeyToDate(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Date(year, month - 1, 1, 12, 0, 0, 0);
}

function shiftMonth(month: string, offset: number) {
  const date = monthKeyToDate(month);

  date.setMonth(date.getMonth() + offset);

  const year = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${nextMonth}`;
}

function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(monthKeyToDate(value));
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function pickSelectedDate(calendar: ActivityCalendarResponse) {
  const todayDay = calendar.days.find((day) => day.is_today);

  if (todayDay) {
    return todayDay.date;
  }

  const firstActiveDay = calendar.days.find((day) => day.recorded_items_count > 0);

  return firstActiveDay?.date ?? calendar.days[0]?.date ?? "";
}

function buildCalendarCells(days: ActivityCalendarDay[], month: string) {
  const firstDayOffset = monthKeyToDate(month).getDay();
  const cells: Array<ActivityCalendarDay | null> = Array.from({ length: firstDayOffset }, () => null);

  cells.push(...days);

  const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);

  return cells.concat(Array.from({ length: trailing }, () => null));
}

function statusBadgeLabel(item: ActivityCalendarItem) {
  if (item.recorded) {
    return "Записано";
  }

  if (item.expected) {
    return "Нет записи";
  }

  return "Не требуется";
}

function statusBadgeClass(item: ActivityCalendarItem) {
  if (item.recorded) {
    return "tag-pill tag-pill-resolved";
  }

  if (item.expected) {
    return "tag-pill tag-pill-high";
  }

  return "tag-pill";
}

function selectedDaySummary(day: ActivityCalendarDay) {
  if (day.recorded_items_count === 0) {
    return day.is_work_day
      ? "На этот день пока нет сохранённых записей."
      : "По этому дню ещё ничего не зафиксировано.";
  }

  if (day.is_complete) {
    return "Все ожидаемые записи на этот день сохранены.";
  }

  if (day.expected_items_count === 0) {
    return "День вне основного графика, но в журнале есть активность.";
  }

  return `Сохранено ${day.completed_expected_count} из ${day.expected_items_count} ожидаемых записей.`;
}

function sortDayItems(items: ActivityCalendarItem[]) {
  return [...items].sort((left, right) => {
    const leftRank = left.expected && !left.recorded ? 0 : left.recorded ? 1 : 2;
    const rightRank = right.expected && !right.recorded ? 0 : right.recorded ? 1 : 2;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.label.localeCompare(right.label, "ru");
  });
}

function focusCardClass(item: ActivityCalendarItem) {
  if (item.expected && !item.recorded) {
    return "list-card focus-card focus-card-attention";
  }

  if (item.recorded) {
    return "list-card focus-card focus-card-complete";
  }

  return "list-card focus-card";
}

export default function HomeDashboardClient({
  initialCalendar,
  initialCalendarError = null,
}: HomeDashboardClientProps) {
  const [calendar, setCalendar] = useState<ActivityCalendarResponse | null>(initialCalendar);
  const [selectedDate, setSelectedDate] = useState(initialCalendar ? pickSelectedDate(initialCalendar) : "");
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarError, setCalendarError] = useState(initialCalendarError);

  const month = calendar?.month ?? getCurrentMonthKey();
  const currentMonthKey = getCurrentMonthKey();

  useEffect(() => {
    if (calendar !== null) {
      return;
    }

    let isCancelled = false;

    const loadInitialCalendar = async () => {
      setLoading(true);
      setCalendarError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/activity-calendar${buildQuery({ month: getCurrentMonthKey() })}`, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(await extractApiError(response, "Не удалось загрузить календарь."));
        }

        const data = (await response.json()) as ActivityCalendarResponse;

        if (isCancelled) {
          return;
        }

        setCalendar(data);
        setSelectedDate(pickSelectedDate(data));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setCalendarError(error instanceof Error ? error.message : "Не удалось загрузить календарь.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadInitialCalendar();

    return () => {
      isCancelled = true;
    };
  }, [calendar]);

  useEffect(() => {
    if (!isDaySheetOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDaySheetOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDaySheetOpen]);

  const loadMonth = async (nextMonth: string) => {
    setLoading(true);
    setCalendarError(null);
    setIsDaySheetOpen(false);

    try {
      const response = await fetch(`${apiBaseUrl}/api/activity-calendar${buildQuery({ month: nextMonth })}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Не удалось загрузить календарь."));
      }

      const data = (await response.json()) as ActivityCalendarResponse;

      setCalendar(data);
      setSelectedDate((current) =>
        data.days.some((day) => day.date === current) ? current : pickSelectedDate(data),
      );
    } catch (error) {
      setCalendarError(error instanceof Error ? error.message : "Не удалось загрузить календарь.");
    } finally {
      setLoading(false);
    }
  };

  const calendarCells = useMemo(
    () => (calendar ? buildCalendarCells(calendar.days, calendar.month) : []),
    [calendar],
  );
  const todayDay =
    calendar?.month === currentMonthKey
      ? (calendar.days.find((day) => day.is_today) ?? null)
      : null;
  const selectedDay =
    calendar?.days.find((day) => day.date === selectedDate) ??
    calendar?.days.find((day) => day.is_today) ??
    calendar?.days[0] ??
    null;
  const todayItems = todayDay ? sortDayItems(todayDay.items) : [];
  const missingTodayItems = todayItems.filter((item) => item.expected && !item.recorded);

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card home-card">
        <p className="eyebrow">Инженерный журнал линии</p>

        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <h1>Пульт инженера</h1>
            <p className="intro">
              Главная страница теперь работает как ежедневная панель: ключевые разделы, календарь записей и быстрый
              контроль по тому, что уже зафиксировано в журнале.
            </p>
          </div>

          <aside className="home-highlight-card">
            <p className="home-highlight-label">Рабочий график</p>
            <p className="home-highlight-value">Воскресенье-четверг</p>
            <p className="home-highlight-copy">
              Утренние обходы, смены, вода и CO2 ожидаются в рабочие дни. Вечерняя подготовка ожидается накануне
              следующего рабочего дня.
            </p>
          </aside>
        </div>

        {calendar ? (
          <div className="stats-grid home-stats-grid">
            <article className="stat-card">
              <p className="stat-label">Активных дней за месяц</p>
              <p className="stat-value">{calendar.summary.active_days_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Полностью закрытых дней</p>
              <p className="stat-value">{calendar.summary.complete_days_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Утренних обходов</p>
              <p className="stat-value">{calendar.summary.morning_round_days_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Записей воды</p>
              <p className="stat-value">{calendar.summary.water_log_days_count}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Записей CO2</p>
              <p className="stat-value">{calendar.summary.co2_days_count}</p>
            </article>
          </div>
        ) : null}

        <div className="home-layout">
          <div className="home-primary-column">
            <section className="detail-section home-focus-section">
              <div className="section-heading-wrap">
                <h2 className="section-heading">Сегодняшний статус</h2>
                <p className="section-text">
                  Самое важное на текущий день: что уже записано и куда нужно зайти дальше без лишних переходов.
                </p>
              </div>

              {todayDay ? (
                <>
                  <div className="tag-row">
                    <span className="tag-pill tag-pill-high">{formatFullDate(todayDay.date)}</span>
                    <span className={todayDay.is_complete ? "tag-pill tag-pill-resolved" : "tag-pill tag-pill-high"}>
                      Закрыто: {todayDay.completed_expected_count}/{todayDay.expected_items_count}
                    </span>
                    <span className="tag-pill">Записей: {todayDay.recorded_items_count}</span>
                  </div>

                  {missingTodayItems.length > 0 ? (
                    <div className="status-banner status-warning" role="status">
                      <p className="status-title">Есть незакрытые действия на сегодня</p>
                      <p className="status-copy">
                        Сначала имеет смысл добить обязательные записи: {missingTodayItems.map((item) => item.label).join(", ")}.
                      </p>
                    </div>
                  ) : (
                    <div className="status-banner status-success" role="status">
                      <p className="status-title">Обязательная часть дня закрыта</p>
                      <p className="status-copy">Все ожидаемые записи на текущий день уже сохранены.</p>
                    </div>
                  )}

                  <div className="home-quick-launch">
                    {quickLaunchActions.map((action) => (
                      <Link key={action.label} href={action.href} className="home-quick-launch-card">
                        <span className="action-button-label">{action.label}</span>
                        <span className="action-button-hint">{action.hint}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="list-stack">
                    {todayItems.map((item) => (
                      <article key={`today-${item.key}`} className={focusCardClass(item)}>
                        <div className="toolbar-row toolbar-row-spread">
                          <div className="calendar-sheet-item-copy">
                            <div className="calendar-sheet-item-topline">
                              <span
                                className={`calendar-indicator calendar-indicator-${item.key}`}
                                aria-hidden="true"
                              />
                              <p className="entry-title">{item.label}</p>
                            </div>
                            <p className="entry-copy">{item.value}</p>
                          </div>
                          <span className={statusBadgeClass(item)}>{statusBadgeLabel(item)}</span>
                        </div>

                        <Link href={item.href} className="text-link">
                          Открыть раздел
                        </Link>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="status-banner" role="status">
                  <p className="status-title">Сейчас открыт не текущий месяц</p>
                  <p className="status-copy">
                    Вернитесь к текущему месяцу, чтобы быстро увидеть оперативный статус сегодняшнего дня.
                  </p>
                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void loadMonth(currentMonthKey)}
                      disabled={loading}
                    >
                      Открыть текущий месяц
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="detail-section home-calendar-section">
              <div className="calendar-toolbar">
                <div className="section-heading-wrap">
                  <h2 className="section-heading">Интерактивный календарь</h2>
                  <p className="section-text">
                    Отмечает, что по конкретной дате уже сохранено: утренний обход, вечерняя подготовка, запись смены,
                    вода и CO2.
                  </p>
                </div>

                <div className="calendar-nav">
                  <button
                    type="button"
                    className="secondary-button calendar-today-button"
                    onClick={() => void loadMonth(currentMonthKey)}
                    disabled={loading && month === currentMonthKey}
                  >
                    Сегодня
                  </button>
                  <button
                    type="button"
                    className="calendar-nav-button"
                    onClick={() => void loadMonth(shiftMonth(month, -1))}
                    disabled={loading}
                    aria-label="Предыдущий месяц"
                  >
                    ←
                  </button>
                  <div className="calendar-month-chip">{formatMonthLabel(month)}</div>
                  <button
                    type="button"
                    className="calendar-nav-button"
                    onClick={() => void loadMonth(shiftMonth(month, 1))}
                    disabled={loading}
                    aria-label="Следующий месяц"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="calendar-legend">
                {calendarLegend.map((item) => (
                  <span key={item.key} className="calendar-legend-item">
                    <span className={`calendar-indicator calendar-indicator-${item.key}`} aria-hidden="true" />
                    {item.label}
                  </span>
                ))}
              </div>

              {loading ? <p className="inline-status">Загружаю календарь месяца...</p> : null}

              {calendarError ? (
                <div className="status-banner status-error" role="alert">
                  <p className="status-title">Календарь временно недоступен.</p>
                  <p className="status-copy">{calendarError}</p>
                </div>
              ) : null}

              {calendar ? (
                <>
                  <div className="calendar-grid-shell">
                    <div className="calendar-grid">
                      {weekdayLabels.map((label) => (
                        <div key={label} className="calendar-weekday">
                          {label}
                        </div>
                      ))}

                      {calendarCells.map((day, index) =>
                        day ? (
                          <button
                            key={day.date}
                            type="button"
                            className={[
                              "calendar-day-card",
                              day.is_today ? "is-today" : "",
                              day.is_work_day ? "is-work-day" : "is-off-day",
                              day.recorded_items_count > 0 ? "has-activity" : "",
                              day.is_complete ? "is-complete" : "",
                              selectedDay?.date === day.date ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => {
                              setSelectedDate(day.date);
                              setIsDaySheetOpen(true);
                            }}
                          >
                            <span className="calendar-day-top">
                              <span className="calendar-day-number">{day.day_number}</span>
                              {day.is_today ? <span className="calendar-day-tag">Сегодня</span> : null}
                            </span>

                            <span className="calendar-day-progress">
                              {day.expected_items_count > 0
                                ? `${day.completed_expected_count}/${day.expected_items_count}`
                                : day.recorded_items_count > 0
                                  ? `${day.recorded_items_count} записей`
                                  : "—"}
                            </span>

                            <span className="calendar-indicators-row">
                              {day.recorded_keys.length > 0 ? (
                                day.recorded_keys.map((key) => (
                                  <span
                                    key={`${day.date}-${key}`}
                                    className={`calendar-indicator calendar-indicator-${key}`}
                                    aria-hidden="true"
                                  />
                                ))
                              ) : (
                                <span className="calendar-day-empty">Пусто</span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <div key={`empty-${index}`} className="calendar-day-blank" aria-hidden="true" />
                        ),
                      )}
                    </div>
                  </div>

                </>
              ) : null}
            </section>
          </div>

          <aside className="home-secondary-column">
            <section className="detail-section home-plan-section">
              <div className="section-heading-wrap">
                <h2 className="section-heading">План и разделы</h2>
                <p className="section-text">
                  Все ключевые разделы оставлены на главной. Календарь сверху даёт быстрый контроль, а ниже остаётся
                  полный план работы по системе.
                </p>
              </div>

              <div className="action-group-list" aria-label="Primary actions">
                {actionGroups.map((group) => (
                  <AccordionSection
                    key={group.title}
                    title={group.title}
                    description={group.description}
                    badge={group.badge}
                    defaultOpen={group.defaultOpen}
                  >
                    <div className="action-list action-list-compact">
                      {group.actions.map((action) => (
                        <Link key={action.label} href={action.href} className="action-button">
                          <span className="action-button-label">{action.label}</span>
                          <span className="action-button-hint">{action.hint}</span>
                        </Link>
                      ))}
                    </div>
                  </AccordionSection>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      {selectedDay && isDaySheetOpen ? (
        <div
          className="calendar-sheet-backdrop"
          role="presentation"
          onClick={() => setIsDaySheetOpen(false)}
        >
          <section
            className="calendar-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="calendar-sheet-handle" aria-hidden="true" />

            <div className="calendar-sheet-header">
              <div className="section-heading-wrap">
                <h2 id="calendar-sheet-title" className="section-heading">
                  {formatFullDate(selectedDay.date)}
                </h2>
                <p className="section-text">{selectedDaySummary(selectedDay)}</p>
              </div>

              <button
                type="button"
                className="calendar-sheet-close"
                onClick={() => setIsDaySheetOpen(false)}
                aria-label="Закрыть детали дня"
              >
                ×
              </button>
            </div>

            <div className="tag-row">
              <span className={selectedDay.is_work_day ? "tag-pill tag-pill-high" : "tag-pill"}>
                {selectedDay.is_work_day ? "Рабочий день" : "Вне графика"}
              </span>
              <span className={selectedDay.is_complete ? "tag-pill tag-pill-resolved" : "tag-pill"}>
                Ожидаемо закрыто: {selectedDay.completed_expected_count}/{selectedDay.expected_items_count}
              </span>
              <span className="tag-pill">Всего записей: {selectedDay.recorded_items_count}</span>
            </div>

            <div className="list-stack calendar-sheet-list">
              {selectedDay.items.map((item) => (
                <article key={`${selectedDay.date}-${item.key}`} className="list-card calendar-sheet-card">
                  <div className="toolbar-row toolbar-row-spread">
                    <div className="calendar-sheet-item-copy">
                      <div className="calendar-sheet-item-topline">
                        <span
                          className={`calendar-indicator calendar-indicator-${item.key}`}
                          aria-hidden="true"
                        />
                        <p className="entry-title">{item.label}</p>
                      </div>
                      <p className="entry-copy">{item.value}</p>
                    </div>
                    <span className={statusBadgeClass(item)}>{statusBadgeLabel(item)}</span>
                  </div>

                  <Link
                    href={item.href}
                    className="text-link"
                    onClick={() => setIsDaySheetOpen(false)}
                  >
                    Открыть раздел
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
