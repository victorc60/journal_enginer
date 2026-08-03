"use client";

import { type ReactNode, useId, useState } from "react";

type AccordionSectionProps = {
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  nested?: boolean;
  className?: string;
  children: ReactNode;
};

export default function AccordionSection({
  title,
  description,
  badge,
  defaultOpen = false,
  nested = false,
  className,
  children,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  const classes = ["accordion", nested ? "accordion-nested" : "", isOpen ? "is-open" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      <button
        type="button"
        className="accordion-summary"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="accordion-copy">
          <span className="accordion-title">{title}</span>
          {description ? <span className="accordion-description">{description}</span> : null}
        </span>

        <span className="accordion-side">
          {badge ? <span className="accordion-badge">{badge}</span> : null}
          <span className="accordion-chevron" aria-hidden="true" />
        </span>
      </button>

      {isOpen ? (
        <div id={panelId} className="accordion-body">
          {children}
        </div>
      ) : null}
    </section>
  );
}
