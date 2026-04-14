import { type KeyboardEvent, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { SubjectTypeBadge } from "@/components/ui/subject-type-badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { gradeRangeSchema, type UpdateTeacherSubjectInput } from "../lib/schemas";
import type { TeacherSubjectRow } from "../lib/types";

type EditingField = "minGrade" | "maxGrade";

const GRADE_FIELDS: EditingField[] = ["minGrade", "maxGrade"];

function getResetValues(row: TeacherSubjectRow): UpdateTeacherSubjectInput {
  return {
    minGrade: row.minGrade ?? 1,
    maxGrade: row.maxGrade ?? 11,
  };
}

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
    defaultValues: getResetValues(row),
    validators: {
      onBlur: gradeRangeSchema,
      onChange: gradeRangeSchema,
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

  const resetForm = () => {
    form.reset(getResetValues(row));
  };

  const beginEdit = (field: EditingField) => {
    setEditingCell(field);
    resetForm();
  };

  const cancelEdit = () => {
    setEditingCell(null);
    resetForm();
  };

  const submitIfIdle = () => {
    if (!form.state.isSubmitting) {
      void form.handleSubmit();
    }
  };

  const handleGradeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void form.handleSubmit();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };

  const renderGradeInput = (fieldName: EditingField) => {
    return (
      <form.Field name={fieldName}>
        {(field) => (
          <FormField
            field={field}
            id={`teacher-subject-${row.subjectId}-${fieldName}`}
            type="number"
            inputProps={{
              autoFocus: editingCell === fieldName,
              min: 0,
              max: 11,
              step: 1,
              inputMode: "numeric",
              onBlur: submitIfIdle,
              onKeyDown: handleGradeKeyDown,
            }}
          />
        )}
      </form.Field>
    );
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
          {GRADE_FIELDS.map((fieldName) => (
            <TableCell key={fieldName}>{renderGradeInput(fieldName)}</TableCell>
          ))}
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
