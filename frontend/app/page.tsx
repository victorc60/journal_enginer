import Link from "next/link";

const actions = [
  {
    label: "Record shift",
    hint: "Capture a shift quickly with manual entry or dictated text.",
    href: "/record",
  },
  {
    label: "Dashboard",
    hint: "See production, CO2, temperature, and failure trends.",
    href: "/dashboard",
  },
  {
    label: "Shift history",
    hint: "Open saved shifts and review full details by date.",
    href: "/shifts",
  },
  {
    label: "AI assistant",
    hint: "Ask questions using the saved journal database.",
    href: "/chat",
  },
  {
    label: "AI insights",
    hint: "Review practical observations generated from saved shifts.",
    href: "/insights",
  },
] as const;

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Industrial shift journal</p>
        <h1>Factory AI Journal</h1>
        <p className="intro">
          A simple workspace for capturing production notes, incidents, and end-of-shift context.
        </p>

        <div className="action-list" aria-label="Primary actions">
          {actions.map((action) =>
            action.href ? (
              <Link key={action.label} href={action.href} className="action-button">
                <span className="action-button-label">{action.label}</span>
                <span className="action-button-hint">{action.hint}</span>
              </Link>
            ) : (
              <button key={action.label} type="button" className="action-button">
                <span className="action-button-label">{action.label}</span>
                <span className="action-button-hint">{action.hint}</span>
              </button>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
