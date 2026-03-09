"use client";

import { useState, useCallback } from "react";
import type { GroupWithDetails, StudentForAssignment, SubjectOption } from "./types";
import { GroupsToolbar } from "./components/groups-toolbar";
import { GroupsTreeTable } from "./components/groups-tree-table";
import { StudentAssignmentDialog } from "./components/student-assignment-dialog";
import { SplitterDialog } from "./components/splitter-dialog";
import { useGroupsCrud } from "./hooks/use-groups-crud";
import { toast } from "sonner";

type Props = {
  initialGroups: GroupWithDetails[];
  subjects: SubjectOption[];
};

export function GroupsClient({ initialGroups, subjects }: Props) {
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

  const [filterType, setFilterType] = useState<"ALL" | "CLASS" | "ELECTIVE_GROUP">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingRow, setIsAddingRow] = useState(false);

  // Transfer list state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferGroup, setTransferGroup] = useState<GroupWithDetails | null>(null);
  const [transferStudents, setTransferStudents] = useState<{
    assigned: StudentForAssignment[];
    available: StudentForAssignment[];
  } | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  // Splitter state
  const [splitterOpen, setSplitterOpen] = useState(false);
  const [splitterGroup, setSplitterGroup] = useState<GroupWithDetails | null>(null);
  const [splitterStudents, setSplitterStudents] = useState<StudentForAssignment[]>([]);

  // ─── Filter groups ──────────────────────────────────────────────────

  const filteredGroups = groups.filter((g) => {
    if (filterType === "CLASS" && g.type !== "CLASS") return false;
    if (filterType === "ELECTIVE_GROUP" && g.type !== "ELECTIVE_GROUP") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = g.name.toLowerCase().includes(q);
      const subMatch = g.subGroups?.some((s) =>
        s.name.toLowerCase().includes(q)
      );
      if (!nameMatch && !subMatch) return false;
    }
    return true;
  });

  // ─── Open Transfer List ────────────────────────────────────────────

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

  // ─── Open Splitter ─────────────────────────────────────────────────

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
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onAddGroup={() => setIsAddingRow(true)}
      />

      <GroupsTreeTable
        groups={filteredGroups}
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
