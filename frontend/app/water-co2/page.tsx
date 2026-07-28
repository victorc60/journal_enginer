"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBaseUrl, buildQuery, extractApiError, fetchJson } from "@/lib/api";
import { formatDate, formatPlainValue } from "@/lib/format";
import { Co2ControlResponse, WaterControlLog, WaterControlResponse } from "@/lib/types";

type WaterFormValues = {
  logDate: string;
  artesianSupplyStart: string;
  artesianSupplyEnd: string;
  pumpPowerStart: string;
  pumpPowerEnd: string;
  purifiedWaterStart: string;
  purifiedWaterEnd: string;
  rawWaterDirectStart: string;
  rawWaterDirectEnd: string;
  sodiumHypochloriteLiters: string;
  antiscalantGrams: string;
  notes: string;
};

type MeterConfig = {
  key: string;
  label: string;
  description: string;
  startKey: keyof WaterFormValues;
  endKey: keyof WaterFormValues;
  usedKey: keyof WaterControlLog;
  unit: string;
};

const meterConfigs: MeterConfig[] = [
  {
    key: "artesian-supply",
    label: "Артезианка -> первые бочки",
    description: "Счетчик подачи воды с артезианки в первые три бочки.",
    startKey: "artesianSupplyStart",
    endKey: "artesianSupplyEnd",
    usedKey: "artesian_supply_used",
    unit: "показание",
  },
  {
    key: "pump-power",
    label: "Электросчетчик насосов и осмоса",
    description: "Общий расход электроэнергии на насосы, осмос и подачу воды.",
    startKey: "pumpPowerStart",
    endKey: "pumpPowerEnd",
    usedKey: "pump_power_used",
    unit: "кВт·ч",
  },
  {
    key: "purified-water",
    label: "Чистая вода после осмоса и колонн",
    description: "Расход суперчистой воды из второй секции бочек.",
    startKey: "purifiedWaterStart",
    endKey: "purifiedWaterEnd",
    usedKey: "purified_water_used",
    unit: "показание",
  },
  {
    key: "raw-water-direct",
    label: "Прямая вода из первых бочек",
    description: "Расход воды напрямую из первой секции бочек, которую дала артезианка.",
    startKey: "rawWaterDirectStart",
    endKey: "rawWaterDirectEnd",
    usedKey: "raw_water_direct_used",
    unit: "показание",
  },
] as const;

function getTodayInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 10);
}

function getDateOffsetInputValue(days: number) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 10);
}

function parseNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

function stringifyNullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function calculateUsage(startValue: string, endValue: string) {
  if (startValue.trim() === "" || endValue.trim() === "") {
    return null;
  }

  const start = Number(startValue);
  const end = Number(endValue);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }

  return Number((end - start).toFixed(2));
}

function toWaterFormValues(date: string, log: WaterControlLog | null): WaterFormValues {
  return {
    logDate: date,
    artesianSupplyStart: stringifyNullableNumber(log?.artesian_supply_start),
    artesianSupplyEnd: stringifyNullableNumber(log?.artesian_supply_end),
    pumpPowerStart: stringifyNullableNumber(log?.pump_power_start),
    pumpPowerEnd: stringifyNullableNumber(log?.pump_power_end),
    purifiedWaterStart: stringifyNullableNumber(log?.purified_water_start),
    purifiedWaterEnd: stringifyNullableNumber(log?.purified_water_end),
    rawWaterDirectStart: stringifyNullableNumber(log?.raw_water_direct_start),
    rawWaterDirectEnd: stringifyNullableNumber(log?.raw_water_direct_end),
    sodiumHypochloriteLiters: stringifyNullableNumber(log?.sodium_hypochlorite_liters),
    antiscalantGrams: stringifyNullableNumber(log?.antiscalant_grams),
    notes: log?.notes ?? "",
  };
}

async function fetchWaterControlData(date: string) {
  return fetchJson<WaterControlResponse>(`/api/water-control${buildQuery({ date })}`);
}

async function fetchCo2ControlData(from: string, to: string) {
  return fetchJson<Co2ControlResponse>(`/api/co2-control${buildQuery({ from, to })}`);
}

export default function WaterCo2Page() {
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const [waterForm, setWaterForm] = useState<WaterFormValues>(toWaterFormValues(getTodayInputValue(), null));
  const [waterHistory, setWaterHistory] = useState<WaterControlLog[]>([]);
  const [waterLoading, setWaterLoading] = useState(true);
  const [waterSaving, setWaterSaving] = useState(false);
  const [waterError, setWaterError] = useState("");
  const [waterMessage, setWaterMessage] = useState("");
  const [co2FromDate, setCo2FromDate] = useState(getDateOffsetInputValue(-30));
  const [co2ToDate, setCo2ToDate] = useState(getTodayInputValue);
  const [co2Loading, setCo2Loading] = useState(true);
  const [co2Error, setCo2Error] = useState("");
  const [co2Data, setCo2Data] = useState<Co2ControlResponse | null>(null);

  const loadWaterControl = async (date: string) => {
    setWaterLoading(true);
    setWaterError("");
    setWaterMessage("");

    try {
      const data = await fetchWaterControlData(date);
      setWaterForm(toWaterFormValues(date, data.log));
      setWaterHistory(data.history);
    } catch (error) {
      setWaterError(error instanceof Error ? error.message : "Не удалось загрузить контроль воды.");
    } finally {
      setWaterLoading(false);
    }
  };

  const loadCo2Control = async (from: string, to: string) => {
    setCo2Loading(true);
    setCo2Error("");

    try {
      const data = await fetchCo2ControlData(from, to);
      setCo2Data(data);
    } catch (error) {
      setCo2Error(error instanceof Error ? error.message : "Не удалось загрузить CO2-контроль.");
    } finally {
      setCo2Loading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadSelectedDate = async () => {
      setWaterLoading(true);
      setWaterError("");
      setWaterMessage("");

      try {
        const data = await fetchWaterControlData(selectedDate);

        if (isCancelled) {
          return;
        }

        setWaterForm(toWaterFormValues(selectedDate, data.log));
        setWaterHistory(data.history);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setWaterError(error instanceof Error ? error.message : "Не удалось загрузить контроль воды.");
      } finally {
        if (!isCancelled) {
          setWaterLoading(false);
        }
      }
    };

    void loadSelectedDate();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  useEffect(() => {
    let isCancelled = false;

    const loadCo2 = async () => {
      setCo2Loading(true);
      setCo2Error("");

      try {
        const data = await fetchCo2ControlData(co2FromDate, co2ToDate);

        if (isCancelled) {
          return;
        }

        setCo2Data(data);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setCo2Error(error instanceof Error ? error.message : "Не удалось загрузить CO2-контроль.");
      } finally {
        if (!isCancelled) {
          setCo2Loading(false);
        }
      }
    };

    void loadCo2();

    return () => {
      isCancelled = true;
    };
  }, [co2FromDate, co2ToDate]);

  const saveWaterControl = async () => {
    setWaterSaving(true);
    setWaterMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/water-control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          log_date: waterForm.logDate,
          artesian_supply_start: parseNumber(waterForm.artesianSupplyStart),
          artesian_supply_end: parseNumber(waterForm.artesianSupplyEnd),
          pump_power_start: parseNumber(waterForm.pumpPowerStart),
          pump_power_end: parseNumber(waterForm.pumpPowerEnd),
          purified_water_start: parseNumber(waterForm.purifiedWaterStart),
          purified_water_end: parseNumber(waterForm.purifiedWaterEnd),
          raw_water_direct_start: parseNumber(waterForm.rawWaterDirectStart),
          raw_water_direct_end: parseNumber(waterForm.rawWaterDirectEnd),
          sodium_hypochlorite_liters: parseNumber(waterForm.sodiumHypochloriteLiters),
          antiscalant_grams: parseNumber(waterForm.antiscalantGrams),
          notes: waterForm.notes,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Не удалось сохранить контроль воды."));
      }

      const data = (await response.json()) as WaterControlResponse;
      setWaterForm(toWaterFormValues(selectedDate, data.log));
      setWaterHistory(data.history);
      setWaterMessage("Контроль воды сохранен.");
    } catch (error) {
      setWaterMessage(error instanceof Error ? error.message : "Не удалось сохранить контроль воды.");
    } finally {
      setWaterSaving(false);
    }
  };

  const waterUsagePreview = {
    artesianSupplyUsed: calculateUsage(waterForm.artesianSupplyStart, waterForm.artesianSupplyEnd),
    pumpPowerUsed: calculateUsage(waterForm.pumpPowerStart, waterForm.pumpPowerEnd),
    purifiedWaterUsed: calculateUsage(waterForm.purifiedWaterStart, waterForm.purifiedWaterEnd),
    rawWaterDirectUsed: calculateUsage(waterForm.rawWaterDirectStart, waterForm.rawWaterDirectEnd),
  };

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card detail-card">
        <Link href="/" className="back-link">
          Назад
        </Link>

        <p className="eyebrow">Ресурсы линии</p>
        <h1>Контроль воды и CO2</h1>
        <p className="intro">
          Здесь можно ежедневно фиксировать воду по 4 счетчикам с авторасчетом расхода, отмечать химию для
          водоподготовки и отдельно видеть CO2-таблицу, которая наполняется автоматически из отчетов смен.
        </p>

        <section className="detail-section">
          <div className="section-heading-wrap">
            <h2 className="section-title">Контроль воды</h2>
            <p className="section-text">
              Для каждого счетчика введите начальное и конечное показание, а система сама посчитает расход за день.
            </p>
          </div>

          {waterLoading && !waterError ? (
            <div className="status-banner status-success" role="status">
              <p className="status-title">Загружаю водяной журнал.</p>
              <p className="status-copy">Подтягиваю сохраненную запись и последние даты контроля воды.</p>
            </div>
          ) : null}

          {waterError ? (
            <div className="status-banner status-error" role="alert">
              <p className="status-title">Водяной журнал временно недоступен.</p>
              <p className="status-copy">{waterError}</p>
              <div className="button-row">
                <button type="button" className="secondary-button" onClick={() => void loadWaterControl(selectedDate)}>
                  Повторить загрузку
                </button>
              </div>
            </div>
          ) : null}

          <div className="stats-grid">
            <article className="stat-card">
              <p className="stat-label">Дата контроля</p>
              <p className="stat-value">{formatDate(selectedDate)}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Счетчиков</p>
              <p className="stat-value">4</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Гипохлорит</p>
              <p className="stat-value">{formatPlainValue(waterForm.sodiumHypochloriteLiters, "л")}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Антискалант</p>
              <p className="stat-value">{formatPlainValue(waterForm.antiscalantGrams, "г")}</p>
            </article>
          </div>

          <label className="field">
            <span className="field-label">Дата журнала</span>
            <input
              type="date"
              className="text-input"
              value={selectedDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setSelectedDate(nextDate);
                setWaterForm((current) => ({
                  ...current,
                  logDate: nextDate,
                }));
              }}
            />
          </label>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Счетчик</th>
                  <th>Начало</th>
                  <th>Конец</th>
                  <th>Расход</th>
                </tr>
              </thead>
              <tbody>
                {meterConfigs.map((meter) => {
                  const usedValue =
                    meter.usedKey === "artesian_supply_used"
                      ? waterUsagePreview.artesianSupplyUsed
                      : meter.usedKey === "pump_power_used"
                        ? waterUsagePreview.pumpPowerUsed
                        : meter.usedKey === "purified_water_used"
                          ? waterUsagePreview.purifiedWaterUsed
                          : waterUsagePreview.rawWaterDirectUsed;

                  return (
                    <tr key={meter.key}>
                      <td>
                        <div className="table-label">
                          <strong>{meter.label}</strong>
                          <span>{meter.description}</span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="text-input table-input"
                          value={waterForm[meter.startKey]}
                          onChange={(event) =>
                            setWaterForm((current) => ({
                              ...current,
                              [meter.startKey]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="text-input table-input"
                          value={waterForm[meter.endKey]}
                          onChange={(event) =>
                            setWaterForm((current) => ({
                              ...current,
                              [meter.endKey]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>{usedValue === null ? "—" : `${usedValue.toFixed(2)} ${meter.unit}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="filter-grid">
            <label className="field">
              <span className="field-label">Гипохлорит натрия, л</span>
              <input
                type="number"
                step="0.01"
                className="text-input"
                value={waterForm.sodiumHypochloriteLiters}
                onChange={(event) =>
                  setWaterForm((current) => ({
                    ...current,
                    sodiumHypochloriteLiters: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span className="field-label">Антискалант, г</span>
              <input
                type="number"
                step="0.01"
                className="text-input"
                value={waterForm.antiscalantGrams}
                onChange={(event) =>
                  setWaterForm((current) => ({
                    ...current,
                    antiscalantGrams: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">Заметки</span>
            <textarea
              rows={4}
              className="text-input text-area"
              placeholder="Например: колонны промыты, осмос работал стабильно, подлил 70 литров гипохлорита."
              value={waterForm.notes}
              onChange={(event) =>
                setWaterForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>

          {waterMessage ? <p className="inline-status morning-round-status">{waterMessage}</p> : null}

          <div className="button-row">
            <button type="button" className="action-button" disabled={waterSaving} onClick={saveWaterControl}>
              {waterSaving ? "Сохраняю журнал..." : "Сохранить контроль воды"}
            </button>
          </div>

          <div className="section-divider" />

          <div className="section-heading-wrap">
            <h3 className="section-title">Последние записи</h3>
            <p className="section-text">Короткая история по воде, химии и расходам за последние дни.</p>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Артезианка</th>
                  <th>Электронасосы</th>
                  <th>Чистая вода</th>
                  <th>Прямая вода</th>
                  <th>Гипохлорит</th>
                  <th>Антискалант</th>
                </tr>
              </thead>
              <tbody>
                {waterHistory.length > 0 ? (
                  waterHistory.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDate(log.log_date)}</td>
                      <td>{formatPlainValue(log.artesian_supply_used)}</td>
                      <td>{formatPlainValue(log.pump_power_used)}</td>
                      <td>{formatPlainValue(log.purified_water_used)}</td>
                      <td>{formatPlainValue(log.raw_water_direct_used)}</td>
                      <td>{formatPlainValue(log.sodium_hypochlorite_liters, "л")}</td>
                      <td>{formatPlainValue(log.antiscalant_grams, "г")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>Пока нет сохраненных записей по воде.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="section-divider" />

        <section className="detail-section">
          <div className="section-heading-wrap">
            <h2 className="section-title">Контроль CO2</h2>
            <p className="section-text">
              Этот блок заполняется автоматически из сохраненных смен. Если вы диктуете отчет и в нем есть CO2, расход
              на голову и остаток в газовом хранилище, эти значения сразу попадают сюда.
            </p>
          </div>

          {co2Loading && !co2Error ? (
            <div className="status-banner status-success" role="status">
              <p className="status-title">Загружаю CO2-контроль.</p>
              <p className="status-copy">Собираю данные из уже сохраненных отчетов смен.</p>
            </div>
          ) : null}

          {co2Error ? (
            <div className="status-banner status-error" role="alert">
              <p className="status-title">CO2-контроль временно недоступен.</p>
              <p className="status-copy">{co2Error}</p>
              <div className="button-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void loadCo2Control(co2FromDate, co2ToDate)}
                >
                  Повторить загрузку
                </button>
              </div>
            </div>
          ) : null}

          <div className="filter-grid">
            <label className="field">
              <span className="field-label">С даты</span>
              <input type="date" className="text-input" value={co2FromDate} onChange={(event) => setCo2FromDate(event.target.value)} />
            </label>

            <label className="field">
              <span className="field-label">По дату</span>
              <input type="date" className="text-input" value={co2ToDate} onChange={(event) => setCo2ToDate(event.target.value)} />
            </label>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <p className="stat-label">Смен в контроле</p>
              <p className="stat-value">{co2Data?.summary.tracked_shifts_count ?? 0}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">CO2 всего, кг</p>
              <p className="stat-value">{formatPlainValue(co2Data?.summary.total_co2_used_kg)}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Средний CO2 / гол</p>
              <p className="stat-value">{formatPlainValue(co2Data?.summary.average_co2_per_head_g, "г")}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Остаток в хранилище</p>
              <p className="stat-value">{formatPlainValue(co2Data?.summary.latest_remaining_tons, "т")}</p>
            </article>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Голов</th>
                  <th>CO2 start, кг</th>
                  <th>CO2 end, кг</th>
                  <th>CO2 used, кг</th>
                  <th>CO2 / гол, г</th>
                  <th>Остаток, т</th>
                  <th>Заполнение</th>
                </tr>
              </thead>
              <tbody>
                {co2Data && co2Data.rows.length > 0 ? (
                  co2Data.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.shift_date ? formatDate(row.shift_date) : "—"}</td>
                      <td>{formatPlainValue(row.heads_count)}</td>
                      <td>{formatPlainValue(row.co2_start_kg, "кг")}</td>
                      <td>{formatPlainValue(row.co2_end_kg, "кг")}</td>
                      <td>{formatPlainValue(row.co2_used_kg, "кг")}</td>
                      <td>{formatPlainValue(row.co2_per_head_g, "г")}</td>
                      <td>{formatPlainValue(row.remaining_tons, "т")}</td>
                      <td>{formatPlainValue(row.storage_fill_percent, "%")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>Пока нет сохраненных смен с CO2-показателями.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
