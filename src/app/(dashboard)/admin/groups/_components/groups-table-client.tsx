"use client";

import { useState, useCallback } from "react";
import { useQueryState } from "nuqs";
import type { GroupWithDetails, StudentForAssignment, SubjectOption } from "../_lib/types";
import { GroupsToolbar } from "./groups-toolbar";
import { GroupsTreeTable } from "./groups-tree-table";
import { StudentAssignmentDialog } from "./student-assignment-dialog";
import { SplitterDialog } from "./splitter-dialog";
import { useGroupsCrud } from "../_hooks/use-groups-crud";
import { toast } from "sonner";

interface GroupsTableClientProps {
  initialGroups: GroupWithDetails[];
  subjects: SubjectOption[];
}

export function GroupsTableClient({ initialGroups, subjects }: GroupsTableClientProps) {
  const {
    groups,
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleTransferSave,
    loadStudentsForAssignment,
    loadGroupStudents,
    handleSplitterSave,
  } = useGroupsCrud(initialGroups);

  const [searchQuery, setSearchQuery] = useQueryState("search", {
    defaultValue: "",
    shallow: false,
  });
  const [filterType, setFilterType] = useQueryState("type", {
    defaultValue: "all",
    shallow: false,
  });
  const [isAddingRow, setIsAddingRow] = useState(false);

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferGroup, setTransferGroup] = useState<GroupWithDetails | null>(null);
  const [transferStudents, setTransferStudents] = useState<{
    assigned: StudentForAssignment[];
    available: StudentForAssignment[];
  } | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const [splitterOpen, setSplitterOpen] = useState(false);
  const [splitterGroup, setSplitterGroup] = useState<GroupWithDetails | null>(null);
  const [splitterStudents, setSplitterStudents] = useState<StudentForAssignment[]>([]);

  const handleOpenTransferList = useCallback(
    async (group: GroupWithDetails) => {
      setTransferLoading(true);
      setTransferGroup(group);
      setTransferDialogOpen(true);
      try {
        const data = await loadStudentsForAssignment(group.id, group.type);
        setTransferStudents(data);
      } catch {
        toast.error("Ошибка загрузки учеников");
      } finally {
        setTransferLoading(false);
      }
    },
    [loadStudentsForAssignment]
  );

  const onTransferSave = useCallback(
    async (toAssign: string[], toRemove: string[]) => {
      if (!transferGroup || !transferStudents) return;
      const currentCount = transferStudents.assigned.length;
      await handleTransferSave(transferGroup, currentCount, toAssign, toRemove);
      setTransferDialogOpen(false);
    },
    [transferGroup, transferStudents, handleTransferSave]
  );

  const handleOpenSplitter = useCallback(
    async (group: GroupWithDetails) => {
      setSplitterGroup(group);
      setSplitterOpen(true);
      try {
        const students = await loadGroupStudents(group.id);
        setSplitterStudents(students);
      } catch {
        toast.error("Ошибка загрузки учеников");
      }
    },
    [loadGroupStudents]
  );

  const onSplitterSave = useCallback(
    async (data: {
      parentGroupId: string;
      subjectId: string;
      subgroups: { name: string; studentIds: string[] }[];
    }) => {
      await handleSplitterSave(data);
      setSplitterOpen(false);
    },
    [handleSplitterSave]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Справочник групп и классов
        </h1>
      </div>

      <GroupsToolbar
        filterType={filterType === "CLASS" || filterType === "ELECTIVE_GROUP" ? filterType : "all"}
        onFilterTypeChange={(value) => {
          void setFilterType(value === "all" ? null : value);
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={(value) => {
          void setSearchQuery(value || null);
        }}
        onAddGroup={() => setIsAddingRow(true)}
        isAddingRow={isAddingRow}
      />

      <GroupsTreeTable
        groups={groups}
        isAddingRow={isAddingRow}
        onCancelAddRow={() => setIsAddingRow(false)}
        onCreateGroup={handleCreateGroup}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
        onOpenTransferList={handleOpenTransferList}
        onOpenSplitter={handleOpenSplitter}
      />

      <StudentAssignmentDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        group={transferGroup}
        students={transferStudents}
        loading={transferLoading}
        onSave={onTransferSave}
      />

      <SplitterDialog
        open={splitterOpen}
        onOpenChange={setSplitterOpen}
        group={splitterGroup}
        students={splitterStudents}
        subjects={subjects}
        onSave={onSplitterSave}
      />
    </div>
  );
}
