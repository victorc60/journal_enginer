"use client";

import Link from "next/link";
import { useEffect } from "react";

type AppErrorProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-shell page-shell-top">
      <section className="hero-card history-card">
        <Link href="/" className="back-link">
          Back
        </Link>

        <p className="eyebrow">Application error</p>
        <h1>Something went wrong</h1>
        <p className="intro">
          The page could not finish loading. This usually means the frontend could not reach the backend API or the
          backend returned an unexpected response.
        </p>

        <div className="status-banner status-error" role="alert">
          <p className="status-title">Server-side render failed.</p>
          <p className="status-copy">
            Check the Railway backend domain, the frontend variable <code>NEXT_PUBLIC_API_BASE_URL</code>, and the
            backend logs.
          </p>
          {error.digest ? <p className="status-copy">Digest: {error.digest}</p> : null}
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={reset}>
            Try again
          </button>

          <Link href="/" className="action-button">
            <span className="action-button-label">Go home</span>
            <span className="action-button-hint">Return to the main menu and open another page.</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
