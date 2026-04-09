import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { SubjectTypeBadge } from "@/components/ui/subject-type-badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  gradeSchema,
  gradeRangeSchema,
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

  const form = useForm({
    defaultValues: {
      minGrade: row.minGrade === null ? "" : String(row.minGrade),
      maxGrade: row.maxGrade === null ? "" : String(row.maxGrade),
    } as z.input<typeof gradeRangeSchema>,
    validators: {
      onSubmit: gradeRangeSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = gradeRangeSchema.parse(value);

      if (row.minGrade === parsed.minGrade && row.maxGrade === parsed.maxGrade) {
        setEditingCell(null);
        return;
      }

      const success = await onUpdateSubject(row, parsed);

      if (success) {
        setEditingCell(null);
      }
    },
  });

  const beginEdit = (field: EditingField) => {
    setEditingCell(field);
    form.reset({
      minGrade: row.minGrade === null ? "" : String(row.minGrade),
      maxGrade: row.maxGrade === null ? "" : String(row.maxGrade),
    });
  };

  const cancelEdit = () => {
    setEditingCell(null);
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

      {isEditing ? (
        <>
          <TableCell>
            <form.Field name="minGrade" validators={{ onBlur: gradeSchema }}>
              {(field) => (
                <FormField
                  field={field}
                  id={`teacher-subject-${row.subjectId}-min-grade`}
                  type="number"
                  inputClassName="h-7"
                  inputProps={{
                    autoFocus: editingCell === "minGrade",
                    min: 0,
                    max: 11,
                    step: 1,
                    inputMode: "numeric",
                    onKeyDown: (event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void form.handleSubmit();
                        return;
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEdit();
                      }
                    },
                  }}
                  onFieldBlur={() => {
                    if (!form.state.isSubmitting) {
                      void form.handleSubmit();
                    }
                  }}
                />
              )}
            </form.Field>
          </TableCell>

          <TableCell>
            <form.Field name="maxGrade" validators={{ onBlur: gradeSchema }}>
              {(field) => (
                <FormField
                  field={field}
                  id={`teacher-subject-${row.subjectId}-max-grade`}
                  type="number"
                  inputClassName="h-7"
                  inputProps={{
                    autoFocus: editingCell === "maxGrade",
                    min: 0,
                    max: 11,
                    step: 1,
                    inputMode: "numeric",
                    onKeyDown: (event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void form.handleSubmit();
                        return;
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelEdit();
                      }
                    },
                  }}
                  onFieldBlur={() => {
                    if (!form.state.isSubmitting) {
                      void form.handleSubmit();
                    }
                  }}
                />
              )}
            </form.Field>
          </TableCell>
        </>
      ) : (
        <>
          <TableCell>
            <button
              type="button"
              className="w-full cursor-pointer rounded px-1 py-1 text-left hover:bg-muted"
              onClick={() => beginEdit("minGrade")}
            >
              {row.minGrade ?? "-"}
            </button>
          </TableCell>

          <TableCell>
            <button
              type="button"
              className="w-full cursor-pointer rounded px-1 py-1 text-left hover:bg-muted"
              onClick={() => beginEdit("maxGrade")}
            >
              {row.maxGrade ?? "-"}
            </button>
          </TableCell>
        </>
      )}

      <TableCell className="text-right">
        <div className="flex items-start justify-end">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDeleteRequest(row)}
            aria-label="Удалить компетенцию"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
