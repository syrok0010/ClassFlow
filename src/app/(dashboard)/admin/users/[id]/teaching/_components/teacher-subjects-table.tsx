import { useMemo, useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CreateTeacherSubjectFormInput,
  UpdateTeacherSubjectInput,
} from "../_lib/schemas";
import { subjectGradeRangeSchema } from "../_lib/schemas";
import type { SubjectOption, TeacherSubjectRow } from "../_lib/types";
import { InlineCreateRow } from "./inline-create-row";
import { TeacherSubjectDataRow } from "./teacher-subject-data-row";

interface TeacherSubjectsTableProps {
  allRowsCount: number;
  rows: TeacherSubjectRow[];
  subjectOptions: SubjectOption[];
  isAddingRow: boolean;
  hasActiveFilters: boolean;
  onCreateSubject: (payload: CreateTeacherSubjectFormInput) => Promise<boolean>;
  onUpdateSubject: (row: TeacherSubjectRow, payload: UpdateTeacherSubjectInput) => Promise<boolean>;
  onDeleteRequest: (row: TeacherSubjectRow) => void;
  onCancelAddRow: () => void;
  onCreateFirst: () => void;
  onResetFilters: () => void;
}

function rowKey(row: TeacherSubjectRow) {
  return `${row.teacherId}:${row.subjectId}`;
}

export function TeacherSubjectsTable({
  allRowsCount,
  rows,
  subjectOptions,
  isAddingRow,
  hasActiveFilters,
  onCreateSubject,
  onUpdateSubject,
  onDeleteRequest,
  onCancelAddRow,
  onCreateFirst,
  onResetFilters,
}: TeacherSubjectsTableProps) {
  const hasRows = rows.length > 0;

  const createResultRef = useRef(false);

  const createSubjectForm = useForm({
    defaultValues: {
      subjectId: "",
      minGrade: 1,
      maxGrade: 11,
    } as z.input<typeof subjectGradeRangeSchema>,
    validators: {
      onChange: subjectGradeRangeSchema,
      onSubmit: subjectGradeRangeSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = subjectGradeRangeSchema.parse(value);
      createResultRef.current = await onCreateSubject(parsed as CreateTeacherSubjectFormInput);
    },
  });

  const handleCreateSubjectWithTableValidation = async (payload: CreateTeacherSubjectFormInput) => {
    createResultRef.current = false;
    createSubjectForm.reset(payload as z.input<typeof subjectGradeRangeSchema>);
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
                  hasFilters={hasActiveFilters && allRowsCount > 0}
                  onResetFilters={onResetFilters}
                  onCreateFirst={onCreateFirst}
                  emptyTitle="У преподавателя пока не назначено ни одного предмета"
                  emptyDescription="Добавьте предметы и диапазоны классов, чтобы система могла учитывать этого преподавателя в учебном плане и расписании."
                  createFirstLabel="+ Добавить первый предмет"
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
