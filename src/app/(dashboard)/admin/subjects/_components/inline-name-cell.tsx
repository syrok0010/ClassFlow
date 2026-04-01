import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subjectNameSchema } from "../_lib/subject-schemas";

interface InlineNameCellProps {
  defaultValue: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function InlineNameCell({
  defaultValue,
  onSave,
  onCancel,
}: InlineNameCellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const save = useCallback(() => {
    const parsed = subjectNameSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Некорректное значение");
      return;
    }

    if (parsed.data === defaultValue.trim()) {
      onCancel();
      return;
    }

    onSave(parsed.data);
  }, [defaultValue, onCancel, onSave, value]);

  const onBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (containerRef.current?.contains(event.relatedTarget as Node)) {
      return;
    }

    save();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="h-7 w-full min-w-0"
        />
        <Button size="icon-xs" variant="ghost" onClick={save} title="Сохранить">
          <Check className="size-3.5" />
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
