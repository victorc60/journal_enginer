"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ChatEntry = {
  id: number;
  question: string;
  answer: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const exampleQuestions = [
  "Какой средний расход CO2 за последний месяц?",
  "Когда последний раз тухли пилоты?",
  "Какие поломки повторяются чаще всего?",
  "Была ли связь между температурой мяса и настройкой холодильника?",
] as const;

async function extractApiError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? "Не удалось получить ответ.";
  } catch {
    return "Не удалось получить ответ.";
  }
}

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
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
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response));
      }

      const data = (await response.json()) as { answer: string };

      setEntries((current) => [
        {
          id: Date.now(),
          question: trimmedQuestion,
          answer: data.answer,
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
          Задавайте вопросы по сохраненным сменам. Для MVP ассистент опирается только на последние 100 смен.
        </p>

        <section className="section-block">
          <div className="section-heading-wrap">
            <h2 className="section-heading">Example questions</h2>
            <p className="section-text">Нажмите на пример, чтобы быстро подставить вопрос.</p>
          </div>

          <div className="example-grid">
            {exampleQuestions.map((item) => (
              <button
                key={item}
                type="button"
                className="example-chip"
                onClick={() => {
                  setQuestion(item);
                  setErrorMessage(null);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <div className="section-divider" />

        <section className="section-block">
          <div className="section-heading-wrap">
            <h2 className="section-heading">Ask a question</h2>
            <p className="section-text">
              Ассистент отвечает только по данным журнала и сообщает, если информации недостаточно.
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
                <p className="status-copy">Задайте вопрос по сохраненным сменам, поломкам или температурам.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
