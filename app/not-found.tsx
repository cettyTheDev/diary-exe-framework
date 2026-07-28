import Link from "next/link"
import { FileQuestionIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl items-center px-4 py-16">
      <Alert>
        <FileQuestionIcon />
        <AlertTitle>TRACE NOT FOUND</AlertTitle>
        <AlertDescription>
          This route is not present in the local archive index.
          <Button
            render={<Link href="/receipts" />}
            nativeButton={false}
            variant="outline"
            className="mt-4"
          >
            RETURN TO RECEIPTS
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  )
}
