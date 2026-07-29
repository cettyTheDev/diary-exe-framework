"use client"

import { FileWarningIcon, LockKeyholeIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ArchiveSummary } from "@/lib/archive/repository"

export function EvidenceMagazineCover({
  summary,
  citationCount,
}: {
  summary: ArchiveSummary
  citationCount: number
}) {
  return (
    <Card className="evidence-cover is-fixture">
      <CardHeader className="evidence-cover-header">
        <div className="evidence-cover-lockup" aria-hidden="true">
          <LockKeyholeIcon />
          <span>DO NOT OPEN</span>
        </div>
        <Badge variant="destructive">DESIGN FIXTURE</Badge>
        <CardTitle>
          <span>Evidence</span>
          <strong>DIARY.EXE</strong>
        </CardTitle>
        <p className="evidence-cover-deck">
          THE PRIVATE RECORD
          <span aria-hidden="true"> / </span>
          <em>THE PUBLIC TRACE</em>
        </p>
      </CardHeader>

      <CardContent className="evidence-cover-content">
        <div className="evidence-cover-metrics" aria-label="Fixture totals">
          <div>
            <strong>{summary.verifiedPages}</strong>
            <span>verified pages</span>
          </div>
          <div>
            <strong>{summary.demoRecords}</strong>
            <span>demo cards</span>
          </div>
          <div>
            <strong>{citationCount}</strong>
            <span>demo citations</span>
          </div>
        </div>

        <div className="evidence-cover-feature">
          <span className="evidence-cover-rubric">SOURCE FILE REQUIRED</span>
          <h3>No claim without a source trail.</h3>
          <p>
            This public framework ships synthetic fixtures only. Connect a
            private, reviewed adapter before publishing real records.
          </p>
        </div>
      </CardContent>

      <CardFooter className="evidence-cover-footer">
        <Button variant="outline" disabled>
          <FileWarningIcon data-icon="inline-start" />
          PUBLICATION LOCKED
        </Button>
        <span>NO PORTRAIT · NO INVENTED HEADLINE · PAGE-LEVEL CITATIONS</span>
      </CardFooter>
    </Card>
  )
}
