export function sourcePageHref(pageNumber: number) {
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
    throw new Error("Source page number must be a positive integer.")
  }

  return pageNumber === 1
    ? "/sources#page-review"
    : `/sources?page=${pageNumber}#page-review`
}

export function officialSourcePageHref(sourceUrl: string, pageNumber: number) {
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
    throw new Error("Source page number must be a positive integer.")
  }

  const url = new URL(sourceUrl)
  url.hash = `page=${pageNumber}`
  return url.toString()
}
