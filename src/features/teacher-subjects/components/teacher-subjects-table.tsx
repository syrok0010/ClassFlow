import { useMemo, useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  subjectGradeRangeSchema,
  type CreateTeacherSubjectFormInput,
  type UpdateTeacherSubjectInput,
} from "../lib/schemas";
import type { SubjectOption, TeacherSubjectRow } from "../lib/types";
import { InlineCreateRow } from "./inline-create-row";
import { TeacherSubjectDataRow } from "./teacher-subject-data-row";
import { EmptyStateConfig } from "@/lib/types";

interface TeacherSubjectsTableProps {
  rows: TeacherSubjectRow[];
  subjectOptions: SubjectOption[];
  isAddingRow: boolean;
  hasActiveFilters: boolean;
  onCreateSubject: (payload: CreateTeacherSubjectFormInput) => Promise<boolean>;
  onUpdateSubject: (row: TeacherSubjectRow, payload: UpdateTeacherSubjectInput) => Promise<boolean>;
  onDeleteRequest: (row: TeacherSubjectRow) => void;
  onCancelAddRow: () => void;
  onResetFilters: () => void;
  emptyStateConfig: EmptyStateConfig;
}

function rowKey(row: TeacherSubjectRow) {
  return `${row.teacherId}:${row.subjectId}`;
}

export function TeacherSubjectsTable({
  rows,
  subjectOptions,
  isAddingRow,
  hasActiveFilters,
  onCreateSubject,
  onUpdateSubject,
  onDeleteRequest,
  onCancelAddRow,
  onResetFilters,
  emptyStateConfig,
}: TeacherSubjectsTableProps) {
  const hasRows = rows.length > 0;

  const createResultRef = useRef(false);

  const createSubjectForm = useForm({
    defaultValues: {
      subjectId: "",
      minGrade: 1,
      maxGrade: 11,
    },
    validators: {
      onChange: subjectGradeRangeSchema,
      onSubmit: subjectGradeRangeSchema,
    },
    onSubmit: async ({ value }) => {
      createResultRef.current = await onCreateSubject(value);
    },
  });

  const handleCreateSubjectWithTableValidation = async (payload: CreateTeacherSubjectFormInput) => {
    createResultRef.current = false;
    createSubjectForm.reset(payload);
    await createSubjectForm.handleSubmit();
    return createResultRef.current;
  };

  const subjectNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of subjectOptions) {
      map.set(option.id, option.name);
    }
    return map;
  }, [subjectOptions]);

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>Предмет</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead className="w-65">От класса</TableHead>
            <TableHead className="w-65">До класса</TableHead>
            <TableHead className="w-45" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isAddingRow ? (
            <InlineCreateRow
              subjectOptions={subjectOptions}
              onSave={handleCreateSubjectWithTableValidation}
              onCancel={onCancelAddRow}
            />
          ) : null}

          {!hasRows && !isAddingRow ? (
            <TableRow>
              <TableCell colSpan={5}>
                <FilterableEmptyState
                  hasFilters={hasActiveFilters}
                  empty={emptyStateConfig}
                  onResetFilters={onResetFilters}
                />
              </TableCell>
            </TableRow>
          ) : null}

          {rows.map((row) => {
            const id = rowKey(row);
            const subjectName = subjectNamesById.get(row.subjectId) ?? row.subjectName;

            return (
              <TeacherSubjectDataRow
                key={id}
                row={row}
                subjectName={subjectName}
                onUpdateSubject={onUpdateSubject}
                onDeleteRequest={onDeleteRequest}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
