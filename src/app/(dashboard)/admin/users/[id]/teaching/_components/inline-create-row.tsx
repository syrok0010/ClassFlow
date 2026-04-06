import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { z } from "zod/v4";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  InlineCreateRowFrame,
  InlineCreateRowFrameActions,
} from "@/components/ui/inline-create-row-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { idSchema, updateTeacherSubjectSchema } from "../_lib/schemas";
import type { SubjectOption } from "../_lib/types";

interface InlineCreateTeacherSubjectRowProps {
  subjectOptions: SubjectOption[];
  onSave: (payload: { subjectId: string; minGrade: number; maxGrade: number }) => Promise<boolean>;
  onCancel: () => void;
}

const gradeTextSchema = z.string().trim().min(1, "Укажите диапазон классов").pipe(z.coerce.number());

function parseCreatePayload(payload: {
  subjectId: string;
  minGradeRaw: string;
  maxGradeRaw: string;
}) {
  if (!payload.subjectId.trim()) {
    return { error: "Выберите предмет" } as { error: string };
  }

  const subjectResult = idSchema.safeParse(payload.subjectId);
  if (!subjectResult.success) {
    return { error: subjectResult.error.issues[0]?.message ?? "Выберите предмет" } as {
      error: string;
    };
  }

  const minResult = gradeTextSchema.safeParse(payload.minGradeRaw);
  const maxResult = gradeTextSchema.safeParse(payload.maxGradeRaw);
  if (!minResult.success || !maxResult.success) {
    return { error: "Укажите диапазон классов" } as { error: string };
  }

  const rangeResult = updateTeacherSubjectSchema.safeParse({
    minGrade: minResult.data,
    maxGrade: maxResult.data,
  });

  if (!rangeResult.success) {
    return {
      error: rangeResult.error.issues[0]?.message ?? "Некорректный диапазон классов",
    } as { error: string };
  }

  return {
    value: {
      subjectId: subjectResult.data,
      minGrade: rangeResult.data.minGrade,
      maxGrade: rangeResult.data.maxGrade,
    },
  } as {
    value: { subjectId: string; minGrade: number; maxGrade: number };
  };
}

export function InlineCreateRow({
  subjectOptions,
  onSave,
  onCancel,
}: InlineCreateTeacherSubjectRowProps) {
  const [subjectId, setSubjectId] = useState("");
  const [minGradeRaw, setMinGradeRaw] = useState("");
  const [maxGradeRaw, setMaxGradeRaw] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subjectTriggerRef = useRef<HTMLButtonElement | null>(null);
  const subjectSearchRef = useRef<HTMLInputElement | null>(null);

  const selectedSubject = useMemo(
    () => subjectOptions.find((option) => option.id === subjectId) ?? null,
    [subjectId, subjectOptions]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return subjectOptions;
    }

    return subjectOptions.filter((option) =>
      option.name.toLowerCase().includes(normalizedQuery)
    );
  }, [searchQuery, subjectOptions]);

  useEffect(() => {
    requestAnimationFrame(() => {
      subjectTriggerRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!isSubjectOpen) {
      return;
    }

    requestAnimationFrame(() => {
      subjectSearchRef.current?.focus();
    });
  }, [isSubjectOpen]);

  const submit = async () => {
    const parsed = parseCreatePayload({
      subjectId,
      minGradeRaw,
      maxGradeRaw,
    });

    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave(parsed.value);

      if (success) {
        onCancel();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFieldKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsSubjectOpen(false);
      onCancel();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <InlineCreateRowFrame>
      <TableCell>
        <Popover open={isSubjectOpen} onOpenChange={setIsSubjectOpen}>
          <PopoverTrigger
            ref={subjectTriggerRef}
            className={cn(
              "flex h-7 w-full items-center justify-between rounded-md border border-input px-2 text-sm",
              "hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              error ? "border-destructive" : undefined
            )}
            onKeyDown={(event) => onFieldKeyDown(event)}
          >
            <span className={cn("truncate", !selectedSubject && "text-muted-foreground")}>
              {selectedSubject?.name ?? "Выберите предмет"}
            </span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent className="w-105 p-2" align="start">
            <Input
              ref={subjectSearchRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => onFieldKeyDown(event)}
              placeholder="Поиск предмета..."
              className="h-8"
            />
            <div className="max-h-56 overflow-auto">
              {filteredOptions.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">Ничего не найдено</p>
              ) : (
                filteredOptions.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant="ghost"
                    className="h-8 w-full justify-start px-2"
                    onClick={() => {
                      setSubjectId(option.id);
                      setSearchQuery(option.name);
                      setIsSubjectOpen(false);
                      if (error) {
                        setError(null);
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4 text-primary",
                        subjectId === option.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.name}</span>
                  </Button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>

      <TableCell className="text-muted-foreground">-</TableCell>

      <TableCell className="w-35">
        <Input
          value={minGradeRaw}
          onChange={(event) => {
            setMinGradeRaw(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          onKeyDown={(event) => onFieldKeyDown(event)}
          inputMode="numeric"
          placeholder="0"
          className={cn("h-7", error ? "border-destructive" : undefined)}
        />
      </TableCell>

      <TableCell className="w-35">
        <Input
          value={maxGradeRaw}
          onChange={(event) => {
            setMaxGradeRaw(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          onKeyDown={(event) => onFieldKeyDown(event)}
          inputMode="numeric"
          placeholder="11"
          className={cn("h-7", error ? "border-destructive" : undefined)}
        />
      </TableCell>

      <TableCell className="w-45 align-top">
        <InlineCreateRowFrameActions
          onSave={() => void submit()}
          onCancel={onCancel}
          isSaveDisabled={isSubmitting}
          isCancelDisabled={isSubmitting}
          align="end"
        />
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </TableCell>
    </InlineCreateRowFrame>
  );
}
