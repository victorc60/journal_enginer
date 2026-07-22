import Link from "next/link";

const actions = [
  {
    label: "Record shift",
    hint: "Capture a shift with dictation, handover items, and attachments.",
    href: "/record",
  },
  {
    label: "Dashboard",
    hint: "Track production, CO2, temperature, failures, and open handover.",
    href: "/dashboard",
  },
  {
    label: "Shift history",
    hint: "Search, filter, export, and open full shift records.",
    href: "/shifts",
  },
  {
    label: "Handover board",
    hint: "See open issues across shifts and update their status.",
    href: "/handover",
  },
  {
    label: "Equipment",
    hint: "Open equipment cards with failures, downtime, and maintenance.",
    href: "/equipment",
  },
  {
    label: "AI assistant",
    hint: "Run weekly summaries, equipment digests, and journal Q&A.",
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
          A practical engineer workspace for recording shifts, passing issues forward, and keeping the production
          picture visible.
        </p>

        <div className="action-list" aria-label="Primary actions">
          {actions.map((action) => (
            <Link key={action.label} href={action.href} className="action-button">
              <span className="action-button-label">{action.label}</span>
              <span className="action-button-hint">{action.hint}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
