import { Skeleton } from "@/components/ui/skeleton"

export function ArchiveLoading() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-14 w-56" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    </main>
  )
}
