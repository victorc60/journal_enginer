import Link from "next/link";

type Insight = {
  title: string;
  explanation: string;
  related_dates: string[];
  suggested_action: string;
};

type InsightsResponse = {
  preliminary: boolean;
  overview: string | null;
  insights: Insight[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

async function getInsights() {
  const response = await fetch(`${apiBaseUrl}/api/ai/insights`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to load AI insights.");
  }

  return (await response.json()) as InsightsResponse;
}

export default async function InsightsPage() {
  const data = await getInsights();

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card insights-card">
        <Link href="/" className="back-link">
          Back
        </Link>

        <p className="eyebrow">AI insights</p>
        <h1>Insights</h1>
        <p className="intro">Useful observations generated only from saved shift data, with exact dates when available.</p>

        {data.overview ? (
          <div className={data.preliminary ? "status-banner status-warning" : "status-banner status-success"}>
            <p className="status-title">{data.preliminary ? "Preliminary insights" : "Insights overview"}</p>
            <p className="status-copy">{data.overview}</p>
          </div>
        ) : null}

        <div className="insight-grid">
          {data.insights.length > 0 ? (
            data.insights.map((insight) => (
              <article key={`${insight.title}-${insight.explanation}`} className="insight-card">
                <h2 className="section-title">{insight.title}</h2>
                <p className="insight-text">{insight.explanation}</p>

                <div className="insight-block">
                  <p className="insight-label">Related dates</p>
                  {insight.related_dates.length > 0 ? (
                    <div className="insight-date-list">
                      {insight.related_dates.map((date) => (
                        <span key={`${insight.title}-${date}`} className="insight-date-chip">
                          {formatDate(date)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="section-empty">No exact dates available.</p>
                  )}
                </div>

                <div className="insight-block">
                  <p className="insight-label">Suggested action</p>
                  <p className="insight-text">{insight.suggested_action}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <p className="status-title">No strong insights yet.</p>
              <p className="status-copy">Add more saved shifts to build stronger observations from the journal data.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
