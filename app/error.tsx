"use client"

import { ShieldAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl items-center px-4 py-16">
      <Alert variant="destructive">
        <ShieldAlertIcon />
        <AlertTitle>ARCHIVE PROCESS INTERRUPTED</AlertTitle>
        <AlertDescription>
          The local interface hit an unexpected error. No source data was
          modified.
          <Button variant="outline" className="mt-4" onClick={unstable_retry}>
            RETRY VIEW
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  )
}
