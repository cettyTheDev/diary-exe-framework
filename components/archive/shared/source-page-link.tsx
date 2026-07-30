import Link from "next/link"
import { FolderOpenIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { sourcePageHref } from "@/lib/archive/source-links"
import { cn } from "@/lib/utils"

export function SourcePageLink({
  pageNumber,
  isFixture,
  variant = "outline",
  size = "sm",
  className,
  label = "SOURCE PAGE",
}: {
  pageNumber: number | undefined
  isFixture: boolean
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm"
  className?: string
  label?: string
}) {
  if (!pageNumber) return null

  return (
    <Button
      render={<Link href={sourcePageHref(pageNumber)} />}
      nativeButton={false}
      variant={variant}
      size={size}
      className={cn("source-page-link", className)}
    >
      <FolderOpenIcon data-icon="inline-start" />
      {isFixture ? "DEMO " : ""}
      {label} {pageNumber.toString().padStart(3, "0")}
    </Button>
  )
}
