"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

import {
  type ArchiveParamValue,
  withArchiveParams,
} from "@/lib/archive/url-state"

export function useArchiveQuery() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParams = React.useCallback(
    (
      updates: Record<string, ArchiveParamValue>,
      history: "push" | "replace" = "push"
    ) => {
      const href = withArchiveParams(pathname, searchParams, updates)
      if (history === "replace") {
        window.history.replaceState(null, "", href)
      } else {
        window.history.pushState(null, "", href)
      }
    },
    [pathname, searchParams]
  )

  return { searchParams, updateParams }
}
