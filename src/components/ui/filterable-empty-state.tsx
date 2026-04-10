import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type EmptyStateConfig = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

type FilterableEmptyStateProps = {
  hasFilters: boolean;
  empty: EmptyStateConfig;
  onResetFilters?: () => void;
};

export function FilterableEmptyState({
  hasFilters,
  empty,
  onResetFilters,
}: FilterableEmptyStateProps) {
  if (hasFilters) {
    return (
      <Empty className="min-h-48 py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-muted/60">
            <Search className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Ничего не найдено</EmptyTitle>
          <EmptyDescription>
            Измените условия поиска или сбросьте фильтры.
          </EmptyDescription>
        </EmptyHeader>
        {onResetFilters ? (
          <EmptyContent>
            <Button variant="link" onClick={onResetFilters}>
              Сбросить фильтры
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <Empty className={empty.className ?? "min-h-56"}>
      <EmptyHeader>
        {empty.icon ? <EmptyMedia variant="icon">{empty.icon}</EmptyMedia> : null}
        <EmptyTitle>{empty.title}</EmptyTitle>
        {empty.description ? <EmptyDescription>{empty.description}</EmptyDescription> : null}
      </EmptyHeader>
      {empty.action ? <EmptyContent>{empty.action}</EmptyContent> : null}
    </Empty>
  );
}
