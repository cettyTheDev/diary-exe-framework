export type ArchiveParamValue = string | number | null | undefined

type SearchParamsLike = Pick<URLSearchParams, "toString">

export function withArchiveParams(
  pathname: string,
  current: SearchParamsLike,
  updates: Record<string, ArchiveParamValue>
) {
  const params = new URLSearchParams(current.toString())

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key)
    } else {
      params.set(key, String(value))
    }
  }

  params.sort()
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function readEnumParam<T extends string>(
  params: SearchParamsLike & { get(name: string): string | null },
  key: string,
  allowed: readonly T[],
  fallback: T
) {
  const value = params.get(key)
  return value && allowed.includes(value as T) ? (value as T) : fallback
}

export function readPositiveIntParam(
  params: SearchParamsLike & { get(name: string): string | null },
  key: string,
  allowed: readonly number[],
  fallback: number
) {
  const value = Number(params.get(key))
  return Number.isInteger(value) && allowed.includes(value) ? value : fallback
}
