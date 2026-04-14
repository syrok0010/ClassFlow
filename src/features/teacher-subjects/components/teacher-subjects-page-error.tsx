import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface TeacherSubjectsPageErrorProps {
  title: string;
  description: string;
  message: string;
  retryHref: string;
  retryLabel: string;
}

export function TeacherSubjectsPageError({
  title,
  description,
  message,
  retryHref,
  retryLabel,
}: TeacherSubjectsPageErrorProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        <div className="mt-5 rounded-lg border bg-muted/40 p-3">
          <p className="text-sm text-foreground">• {message}</p>
        </div>

        <div className="mt-6 flex gap-2">
          <Link
            href={retryHref}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {retryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
