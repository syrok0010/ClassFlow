"use client";

import { useState, useCallback } from "react";
import { useQueryState } from "nuqs";
import type { GroupWithDetails, StudentForAssignment, SubjectOption } from "../_lib/types";
import { GroupsToolbar } from "./groups-toolbar";
import { GroupsTreeTable } from "./groups-tree-table";
import { StudentAssignmentDialog } from "./student-assignment-dialog";
import { SplitterDialog } from "./splitter-dialog";
import { SubgroupEditorDialog } from "./subgroup-editor-dialog";
import { useGroupsCrud } from "../_hooks/use-groups-crud";
import type { SubgroupEditorData } from "../_actions/group-actions";

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
    loadSubgroupEditorData,
    handleSubgroupRedistributionSave,
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
  const hasActiveFilters = Boolean(searchQuery) || filterType !== "all";

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

  const [subgroupEditorOpen, setSubgroupEditorOpen] = useState(false);
  const [subgroupEditorData, setSubgroupEditorData] = useState<SubgroupEditorData | null>(null);
  const [subgroupEditorLoading, setSubgroupEditorLoading] = useState(false);

  const handleOpenTransferList = useCallback(
    async (group: GroupWithDetails) => {
      setTransferLoading(true);
      setTransferGroup(group);
      setTransferDialogOpen(true);
      const data = await loadStudentsForAssignment(group.id, group.type);
      if (data) {
        setTransferStudents(data);
      }
      setTransferLoading(false);
    },
    [loadStudentsForAssignment]
  );

  const onTransferSave = useCallback(
    async (toAssign: string[], toRemove: string[]) => {
      if (!transferGroup || !transferStudents) return;
      await handleTransferSave(transferGroup, toAssign, toRemove);
      setTransferDialogOpen(false);
    },
    [transferGroup, transferStudents, handleTransferSave]
  );

  const handleOpenSplitter = useCallback(
    async (group: GroupWithDetails) => {
      setSplitterGroup(group);
      setSplitterOpen(true);
      const students = await loadGroupStudents(group.id);
      if (students) {
        setSplitterStudents(students);
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
      const ok = await handleSplitterSave(data);
      if (ok) {
        setSplitterOpen(false);
      }
    },
    [handleSplitterSave]
  );

  const handleOpenSubgroupEditor = useCallback(
    async (group: GroupWithDetails) => {
      if (group.type !== "SUBJECT_SUBGROUP") {
        return;
      }

      setSubgroupEditorOpen(true);
      setSubgroupEditorLoading(true);

      const data = await loadSubgroupEditorData(group.id);
      if (data) {
        setSubgroupEditorData(data);
      } else {
        setSubgroupEditorOpen(false);
      }
      setSubgroupEditorLoading(false);
    },
    [loadSubgroupEditorData]
  );

  const onSubgroupEditorSave = useCallback(
    async (assignments: Record<string, string[]>) => {
      const ok = await handleSubgroupRedistributionSave(assignments);
      if (ok) {
        setSubgroupEditorOpen(false);
      }
    },
    [handleSubgroupRedistributionSave]
  );

  const resetFilters = useCallback(() => {
    void setSearchQuery(null);
    void setFilterType(null);
  }, [setFilterType, setSearchQuery]);

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
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        onStartAddRow={() => setIsAddingRow(true)}
        onCancelAddRow={() => setIsAddingRow(false)}
        onCreateGroup={handleCreateGroup}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
        onOpenTransferList={handleOpenTransferList}
        onOpenSplitter={handleOpenSplitter}
        onOpenSubgroupEditor={handleOpenSubgroupEditor}
      />

      {(transferDialogOpen || transferGroup || transferLoading) && (
        <StudentAssignmentDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          group={transferGroup}
          students={transferStudents}
          loading={transferLoading}
          onSave={onTransferSave}
        />
      )}

      {(splitterOpen || splitterGroup) && (
        <SplitterDialog
          open={splitterOpen}
          onOpenChange={setSplitterOpen}
          group={splitterGroup}
          students={splitterStudents}
          subjects={subjects}
          onSave={onSplitterSave}
        />
      )}

      {(subgroupEditorOpen || subgroupEditorData || subgroupEditorLoading) && (
        <SubgroupEditorDialog
          open={subgroupEditorOpen}
          onOpenChange={(open) => {
            setSubgroupEditorOpen(open);
            if (!open) {
              setSubgroupEditorData(null);
            }
          }}
          data={subgroupEditorData}
          loading={subgroupEditorLoading}
          onSave={onSubgroupEditorSave}
        />
      )}
    </div>
  );
}
