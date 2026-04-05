import { Skeleton } from "@/components/ui/skeleton";

export function SidebarNavSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      {[0, 1, 2, 3, 4, 5].map((itemIndex) => (
        <div key={itemIndex} className="flex h-10 items-center justify-center overflow-hidden rounded-md">
          <div className="flex h-full w-10 shrink-0 items-center justify-center">
            <Skeleton className="h-5 w-5 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
