import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  InlineCreateRowFrame,
  InlineCreateRowFrameActions,
} from "@/components/ui/inline-create-row-frame";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SubjectOption } from "../_lib/types";

interface InlineCreateTeacherSubjectRowProps {
  subjectOptions: SubjectOption[];
  onSave: (payload: { subjectId: string; minGrade: number; maxGrade: number }) => Promise<boolean>;
  onCancel: () => void;
}

function toGrade(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function validateRange(minGrade: number | null, maxGrade: number | null): string | null {
  if (minGrade === null || maxGrade === null) {
    return "Укажите диапазон классов";
  }

  if (minGrade < 0 || maxGrade < 0 || minGrade > 11 || maxGrade > 11) {
    return "Класс должен быть в диапазоне от 0 до 11";
  }

  if (minGrade > maxGrade) {
    return "Класс от не может быть больше класса до";
  }

  return null;
}

export function InlineCreateRow({
  subjectOptions,
  onSave,
  onCancel,
}: InlineCreateTeacherSubjectRowProps) {
  const [subjectId, setSubjectId] = useState("");
  const [minGradeRaw, setMinGradeRaw] = useState("");
  const [maxGradeRaw, setMaxGradeRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      selectTriggerRef.current?.focus();
    });
  }, []);

  const submit = async () => {
    if (!subjectId) {
      setError("Выберите предмет");
      return;
    }

    const minGrade = toGrade(minGradeRaw);
    const maxGrade = toGrade(maxGradeRaw);
    const rangeError = validateRange(minGrade, maxGrade);

    if (rangeError) {
      setError(rangeError);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSave({
        subjectId,
        minGrade: minGrade as number,
        maxGrade: maxGrade as number,
      });

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
        <Select
          value={subjectId || null}
          onValueChange={(value) => {
            setSubjectId(value ?? "");
            if (error) {
              setError(null);
            }
          }}
          items={subjectOptions.reduce<Record<string, string>>((acc, option) => {
            acc[option.id] = option.name;
            return acc;
          }, {})}
        >
          <SelectTrigger
            ref={selectTriggerRef}
            className="w-full"
            onKeyDown={(event) => onFieldKeyDown(event)}
          >
            <SelectValue placeholder="Выберите предмет" />
          </SelectTrigger>
          <SelectContent>
            {subjectOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

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

      <TableCell>
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
