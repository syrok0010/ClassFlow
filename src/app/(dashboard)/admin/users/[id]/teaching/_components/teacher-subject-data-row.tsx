import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubjectTypeBadge } from "@/components/ui/subject-type-badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { getFieldErrorMessages } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import {
  gradeInputSchema,
  updateTeacherSubjectInlineFormSchema,
  updateTeacherSubjectInlineValidationSchema,
  type UpdateTeacherSubjectInlineFormValues,
  type UpdateTeacherSubjectInput,
} from "../_lib/schemas";
import type { TeacherSubjectRow } from "../_lib/types";

type EditingField = "minGrade" | "maxGrade";

interface TeacherSubjectDataRowProps {
  row: TeacherSubjectRow;
  subjectName: string;
  onUpdateSubject: (row: TeacherSubjectRow, payload: UpdateTeacherSubjectInput) => Promise<boolean>;
  onDeleteRequest: (row: TeacherSubjectRow) => void;
}

export function TeacherSubjectDataRow({
  row,
  subjectName,
  onUpdateSubject,
  onDeleteRequest,
}: TeacherSubjectDataRowProps) {
  const [editingCell, setEditingCell] = useState<EditingField | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      minGrade: row.minGrade === null ? "" : String(row.minGrade),
      maxGrade: row.maxGrade === null ? "" : String(row.maxGrade),
    } as UpdateTeacherSubjectInlineFormValues,
    validators: {
      onSubmit: updateTeacherSubjectInlineValidationSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = updateTeacherSubjectInlineFormSchema.parse(value);

      if (row.minGrade === parsed.minGrade && row.maxGrade === parsed.maxGrade) {
        setServerError(null);
        setEditingCell(null);
        return;
      }

      const success = await onUpdateSubject(row, parsed);

      if (success) {
        setServerError(null);
        setEditingCell(null);
        return;
      }

      setServerError("Не удалось сохранить изменения");
    },
  });

  const beginEdit = (field: EditingField) => {
    setEditingCell(field);
    setServerError(null);
    form.reset({
      minGrade: row.minGrade === null ? "" : String(row.minGrade),
      maxGrade: row.maxGrade === null ? "" : String(row.maxGrade),
    });
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setServerError(null);
    form.reset({
      minGrade: row.minGrade === null ? "" : String(row.minGrade),
      maxGrade: row.maxGrade === null ? "" : String(row.maxGrade),
    });
  };

  const isEditing = editingCell !== null;

  return (
    <TableRow>
      <TableCell className="font-medium">{subjectName}</TableCell>
      <TableCell>
        <SubjectTypeBadge type={row.subjectType} />
      </TableCell>

      <TableCell>
        {isEditing ? (
          <form.Field name="minGrade" validators={{ onBlur: gradeInputSchema }}>
            {(field) => {
              const errors = getFieldErrorMessages(field);

              return (
                <div className="grid gap-1">
                  <Input
                    autoFocus={editingCell === "minGrade"}
                    type="number"
                    min={0}
                    max={11}
                    step={1}
                    inputMode="numeric"
                    className={cn("h-7", errors.length > 0 && "border-destructive")}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      if (serverError) {
                        setServerError(null);
                      }
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      if (!form.state.isSubmitting) {
                        void form.handleSubmit();
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void form.handleSubmit();
                        return;
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEdit();
                      }
                    }}
                    disabled={form.state.isSubmitting}
                  />
                  {errors.length > 0 ? (
                    <p className="text-xs text-destructive">{errors.join(", ")}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
        ) : (
          <button
            type="button"
            className="w-full cursor-pointer rounded px-1 py-1 text-left hover:bg-muted"
            onClick={() => beginEdit("minGrade")}
          >
            {row.minGrade ?? "-"}
          </button>
        )}
      </TableCell>

      <TableCell>
        {isEditing ? (
          <form.Field name="maxGrade" validators={{ onBlur: gradeInputSchema }}>
            {(field) => {
              const errors = getFieldErrorMessages(field);

              return (
                <div className="grid gap-1">
                  <Input
                    autoFocus={editingCell === "maxGrade"}
                    type="number"
                    min={0}
                    max={11}
                    step={1}
                    inputMode="numeric"
                    className={cn("h-7", errors.length > 0 && "border-destructive")}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      if (serverError) {
                        setServerError(null);
                      }
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      if (!form.state.isSubmitting) {
                        void form.handleSubmit();
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void form.handleSubmit();
                        return;
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEdit();
                      }
                    }}
                    disabled={form.state.isSubmitting}
                  />
                  {errors.length > 0 ? (
                    <p className="text-xs text-destructive">{errors.join(", ")}</p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
        ) : (
          <button
            type="button"
            className="w-full cursor-pointer rounded px-1 py-1 text-left hover:bg-muted"
            onClick={() => beginEdit("maxGrade")}
          >
            {row.maxGrade ?? "-"}
          </button>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDeleteRequest(row)}
            aria-label="Удалить компетенцию"
          >
            <Trash2 className="size-4" />
          </Button>
          {serverError ? <span className="text-xs text-destructive">{serverError}</span> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
