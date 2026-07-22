"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiBaseUrl, extractApiError } from "@/lib/api";

type ChatEntry = {
  id: number;
  question: string;
  answer: string;
  scenario: string;
};

const quickScenarios = [
  {
    id: "weekly_summary",
    label: "Weekly summary",
    description: "Сводка по выпуску, CO2, поломкам и handover за выбранный период.",
    question: "Сделай недельную сводку по журналу.",
  },
  {
    id: "repeated_failures",
    label: "Repeated failures",
    description: "Повторяющиеся поломки с датами и приоритетом внимания.",
    question: "Какие поломки повторяются чаще всего?",
  },
  {
    id: "co2_watch",
    label: "CO2 watch",
    description: "Подсветка перерасхода и аномалий CO2 по сменам.",
    question: "Есть ли признаки перерасхода CO2 и на каких датах?",
  },
  {
    id: "handover_digest",
    label: "Handover digest",
    description: "Список незакрытых handover-пунктов и что важно для следующей смены.",
    question: "Собери digest по незакрытым handover-пунктам.",
  },
  {
    id: "equipment_focus",
    label: "Equipment focus",
    description: "Фокус только на выбранном оборудовании.",
    question: "Что важно знать по выбранному оборудованию?",
  },
  {
    id: "shift_compare",
    label: "Compare shift",
    description: "Сравнение целевой смены с остальными загруженными сменами.",
    question: "Сравни выбранную смену с остальными загруженными сменами.",
  },
] as const;

function getScenarioLabel(value: string) {
  return quickScenarios.find((item) => item.id === value)?.label ?? "Freeform";
}

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [scenario, setScenario] = useState("freeform");
  const [equipmentName, setEquipmentName] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (trimmedQuestion === "") {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          scenario,
          equipment_name: equipmentName.trim() || undefined,
          shift_id: shiftId.trim() === "" ? undefined : Number(shiftId),
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Не удалось получить ответ."));
      }

      const data = (await response.json()) as { answer: string };

      setEntries((current) => [
        {
          id: Date.now(),
          question: trimmedQuestion,
          answer: data.answer,
          scenario,
        },
        ...current,
      ]);
      setQuestion("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось получить ответ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card chat-card">
        <Link href="/" className="back-link">
          Back
        </Link>

        <p className="eyebrow">AI assistant</p>
        <h1>Chat</h1>
        <p className="intro">
          Используйте готовые сценарии: недельная сводка, handover digest, повторяющиеся поломки и фокус по
          оборудованию.
        </p>

        <section className="section-block">
          <div className="section-heading-wrap">
            <h2 className="section-heading">Quick scenarios</h2>
            <p className="section-text">Выберите сценарий, чтобы быстро собрать нужный тип ответа.</p>
          </div>

          <div className="example-grid">
            {quickScenarios.map((item) => (
              <button
                key={item.id}
                type="button"
                className="example-chip"
                onClick={() => {
                  setScenario(item.id);
                  setQuestion(item.question);
                  setErrorMessage(null);
                }}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>

          <div className="toolbar-row">
            <span className="tag-pill">{getScenarioLabel(scenario)}</span>
            {scenario !== "freeform" ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setScenario("freeform");
                  setQuestion("");
                }}
              >
                Reset scenario
              </button>
            ) : null}
          </div>
        </section>

        <div className="section-divider" />

        <section className="section-block">
          <div className="section-heading-wrap">
            <h2 className="section-heading">Context filters</h2>
            <p className="section-text">Необязательный контекст помогает AI отвечать прицельно и коротко.</p>
          </div>

          <div className="filter-grid">
            <label className="field">
              <span className="field-label">Equipment</span>
              <input
                className="text-input"
                value={equipmentName}
                onChange={(event) => setEquipmentName(event.target.value)}
                placeholder="pilots, pumps..."
              />
            </label>

            <label className="field">
              <span className="field-label">Shift ID</span>
              <input
                className="text-input"
                inputMode="numeric"
                value={shiftId}
                onChange={(event) => setShiftId(event.target.value)}
                placeholder="42"
              />
            </label>

            <label className="field">
              <span className="field-label">From date</span>
              <input type="date" className="text-input" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>

            <label className="field">
              <span className="field-label">To date</span>
              <input type="date" className="text-input" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>
          </div>
        </section>

        <div className="section-divider" />

        <section className="section-block">
          <div className="section-heading-wrap">
            <h2 className="section-heading">Ask a question</h2>
            <p className="section-text">
              Ассистент отвечает только по данным журнала и называет точные даты, если находит подтверждение.
            </p>
          </div>

          <form className="record-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Question</span>
              <textarea
                className="text-input text-area chat-textarea"
                rows={5}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Когда последний раз тухли пилоты?"
                required
              />
            </label>

            <button type="submit" className="action-button" disabled={isLoading || question.trim() === ""}>
              {isLoading ? "Asking..." : "Ask AI assistant"}
            </button>
          </form>

          {errorMessage ? (
            <p className="status-banner status-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </section>

        <div className="section-divider" />

        <section className="section-block">
          <div className="section-heading-wrap">
            <h2 className="section-heading">Answer area</h2>
            <p className="section-text">Последние ответы показываются сверху.</p>
          </div>

          <div className="chat-history">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <article key={entry.id} className="chat-thread">
                  <div className="chat-bubble chat-bubble-user">
                    <p className="chat-role">You</p>
                    <p className="chat-copy">{entry.question}</p>
                    <p className="section-text">{getScenarioLabel(entry.scenario)}</p>
                  </div>
                  <div className="chat-bubble chat-bubble-assistant">
                    <p className="chat-role">Assistant</p>
                    <p className="chat-copy">{entry.answer}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <p className="status-title">Пока нет ответов.</p>
                <p className="status-copy">Запустите готовый сценарий или задайте свой вопрос по данным журнала.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
