"use client";

import { Skeleton } from "@/components/ui/skeleton";

type Props = { rows?: number };

export function OrgOrderTableSkeleton({ rows = 8 }: Props) {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Filter bar skeleton */}
      <div className="space-y-4">
        {/* Status tabs */}
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>

        {/* Dropdowns and search */}
        <div className="flex gap-3">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-3">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="h-10 px-3">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="h-10 px-3">
                  <Skeleton className="h-4 w-12" />
                </th>
                <th className="h-10 px-3">
                  <Skeleton className="h-4 w-24" />
                </th>
                <th className="h-10 px-3">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="h-10 px-3">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="h-10 px-3">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="h-10 px-3">
                  <Skeleton className="h-4 w-16" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-6 w-20" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                      <Skeleton className="h-3 w-24 ml-auto" />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Skeleton className="h-8 w-16 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
