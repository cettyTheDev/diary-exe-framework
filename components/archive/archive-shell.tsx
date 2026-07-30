import type * as React from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  navigation,
  type ArchiveView,
  viewCopy,
} from "@/components/archive/archive-config"
import { cn } from "@/lib/utils"

const introActions: Record<
  ArchiveView,
  { label: string; target: `#${string}` }
> = {
  receipts: { label: "START WITH A DEMO RECEIPT", target: "#receipt-feed" },
  timeline: { label: "SEARCH THE DEMO RECORD", target: "#timeline-record" },
  board: { label: "CHOOSE A FIXTURE ISLAND", target: "#board-start" },
  sources: { label: "CHOOSE A DEMO PAGE", target: "#source-map" },
}

const evidenceJourney = [
  "DEMO EXCERPT",
  "EVIDENCE DETAILS",
  "DEMO PAGE",
  "SOURCE REQUIRED",
] as const

export function ArchiveShell({
  children,
  view,
}: {
  children: React.ReactNode
  view: ArchiveView
}) {
  const introAction = introActions[view]
  const activeJourneyStep = view === "sources" ? 2 : view === "board" ? 1 : 0

  return (
    <div className="archive-shell min-h-svh">
      <a className="skip-link" href="#archive-content">
        SKIP TO CONTENT
      </a>
      <header className="archive-header">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Link
              href="/receipts"
              className="brand-lockup"
              aria-label="DIARY.EXE receipts"
            >
              <span className="brand-name">DIARY.EXE</span>
              <span className="brand-subtitle">EVIDENCE ARCHIVE FRAMEWORK</span>
              <span className="brand-count">
                0 REAL SOURCES / SYNTHETIC FIXTURES ONLY
              </span>
            </Link>
            <div className="system-cluster">
              <span className="system-light" aria-hidden="true" />
              <span>SYSTEM: M4 PREFLIGHT</span>
              <span className="system-divider" aria-hidden="true" />
              <span>NO SOURCE DATA</span>
            </div>
          </div>
          <nav className="archive-nav" aria-label="Primary navigation">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.view}
                  href={item.href}
                  className={cn(
                    "archive-nav-link",
                    item.view === view && "is-active"
                  )}
                  aria-current={item.view === view ? "page" : undefined}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <div className="source-warning">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-10">
          <span>
            NOTICE: ALL RECORDS BELOW ARE SYNTHETIC INTERFACE FIXTURES.
          </span>
          <span>AUTHORITATIVE SOURCE ACQUISITION: BLOCKED</span>
        </div>
      </div>

      <main
        id="archive-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
      >
        <section className="view-intro">
          <div className="flex flex-col gap-3">
            <span className="section-kicker">{viewCopy[view].sequence}</span>
            <h1>{viewCopy[view].title}</h1>
            <p>{viewCopy[view].description}</p>
          </div>
          <Button
            render={<a href={introAction.target} />}
            nativeButton={false}
            variant="outline"
            className="intro-command"
          >
            {introAction.label}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </section>

        <aside className="evidence-journey" aria-label="Demo evidence path">
          <span>THE FRAMEWORK DEMONSTRATES THIS PATH</span>
          <ol>
            {evidenceJourney.map((label, index) => (
              <li
                key={label}
                className={
                  index === activeJourneyStep ? "is-current" : undefined
                }
                aria-current={index === activeJourneyStep ? "step" : undefined}
              >
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </aside>

        {children}
      </main>

      <footer className="archive-footer">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <strong>DIARY.EXE / FRAMEWORK DEMO</strong>
            <p>
              Independent software template. No source rights, factual claims,
              or production data are supplied.
            </p>
          </div>
          <p className="max-w-xl text-xs leading-relaxed">
            Use of this framework does not establish authenticity, permission,
            endorsement, or legal clearance for any connected material.
          </p>
        </div>
      </footer>
    </div>
  )
}
