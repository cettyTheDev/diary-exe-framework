import type * as React from "react"
import {
  BookOpenIcon,
  CalendarDaysIcon,
  FolderOpenIcon,
  NetworkIcon,
} from "lucide-react"

export type ArchiveView = "receipts" | "timeline" | "board" | "sources"

export type OpenTrace = (
  id: string,
  updates?: Record<string, string | null>
) => void

export const navigation: {
  href: string
  label: string
  view: ArchiveView
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}[] = [
  {
    href: "/receipts",
    label: "RECEIPTS",
    view: "receipts",
    icon: BookOpenIcon,
  },
  {
    href: "/timeline",
    label: "TIMELINE",
    view: "timeline",
    icon: CalendarDaysIcon,
  },
  {
    href: "/board",
    label: "THE BOARD",
    view: "board",
    icon: NetworkIcon,
  },
  {
    href: "/sources",
    label: "SOURCE FILES",
    view: "sources",
    icon: FolderOpenIcon,
  },
]

export const viewCopy: Record<
  ArchiveView,
  { sequence: string; title: string; description: string }
> = {
  receipts: {
    sequence: "01 / DISCOVERY FEED",
    title: "Receipts, with the chain of custody attached.",
    description:
      "A fast editorial surface that always opens back into the source trail. Current entries are interface fixtures only—no diary quotation is loaded.",
  },
  timeline: {
    sequence: "02 / CHRONOLOGICAL SPINE",
    title: "Every record stays in time and in context.",
    description:
      "Search, filter, and switch density over the canonical record graph. The synthetic dates below test controls; they are not diary events.",
  },
  board: {
    sequence: "03 / CITED RELATIONSHIPS",
    title: "Connections you can inspect, not insinuations.",
    description:
      "Typed edges separate source-supported relationships from editorial links. Every demo edge carries a citation state.",
  },
  sources: {
    sequence: "04 / ORIGINAL ARCHIVE",
    title: "See the cited page behind every excerpt.",
    description:
      "Follow a demo evidence path from an archive entry to its page record. This fixture manifest remains deliberately unresolved until authoritative files are approved.",
  },
}

export const sourceReadiness: readonly {
  label: string
  state: "READY" | "BLOCKED"
  note: string
}[] = [
  {
    label: "OFFICIAL LISTING",
    state: "BLOCKED",
    note: "The public framework does not include a real source registry.",
  },
  {
    label: "FILE IDENTITY",
    state: "BLOCKED",
    note: "Document bytes, size, checksum, and page count are not verified.",
  },
  {
    label: "USE BOUNDARY",
    state: "BLOCKED",
    note: "Storage, extraction, quotation, and page display remain unapproved.",
  },
  {
    label: "PAGE INVENTORY",
    state: "BLOCKED",
    note: "Begins only after authorized immutable source intake.",
  },
]
