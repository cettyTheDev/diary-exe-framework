"use client"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { archiveRepository } from "@/data/archive-repository"
import { type ArchiveEntry } from "@/lib/archive/repository"
import { evidenceLabels, type EvidenceKind } from "@/lib/archive/types"

export const evidenceFilterItems = [
  { label: "All evidence labels", value: "all" },
  ...Object.entries(evidenceLabels).map(([value, label]) => ({ value, label })),
]

export const entityFilterItems = [
  { label: "All people / orgs", value: "all" },
  ...archiveRepository
    .listEntities({ kinds: ["person", "organization"] })
    .map((entity) => ({ label: entity.label, value: entity.id })),
]

export const topicFilterItems = [
  { label: "All topics", value: "all" },
  ...archiveRepository.listTopics().map((topic) => ({
    label: topic.label,
    value: topic.id,
  })),
]

export const arcFilterItems = [
  { label: "All story arcs", value: "all" },
  ...archiveRepository.listStoryArcs().map((arc) => ({
    label: arc.label,
    value: arc.id,
  })),
]

export function formatDate(entry: ArchiveEntry) {
  if (!entry.date) return "DATE UNRESOLVED"

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${entry.date}T00:00:00Z`))
    .toUpperCase()
}

export function EvidenceBadge({ kind }: { kind: EvidenceKind }) {
  const variant =
    kind === "editorial_note"
      ? "outline"
      : kind === "ocr_unverified"
        ? "secondary"
        : kind === "unresolved" || kind === "third_party_claim"
          ? "destructive"
          : "default"

  return <Badge variant={variant}>{evidenceLabels[kind]}</Badge>
}

export function DemoFlag() {
  return <Badge variant="destructive">FIXTURE — NOT SOURCE EVIDENCE</Badge>
}

export function ArchiveSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => next && onChange(next)}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}
