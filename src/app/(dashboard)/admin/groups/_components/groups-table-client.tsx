"use client";

import { useState, useCallback, useMemo } from "react";
import { useQueryState } from "nuqs";
import { useDebouncedQueryState } from "@/hooks/use-debounced-query-state";
import type { GroupWithDetails, StudentForAssignment, SubjectOption } from "../_lib/types";
import { GroupsToolbar } from "./groups-toolbar";
import { GroupsTreeTable } from "./groups-tree-table";
import { StudentAssignmentDialog } from "./student-assignment-dialog";
import { SplitterDialog } from "./splitter-dialog";
import { SubgroupEditorDialog } from "./subgroup-editor-dialog";
import { useGroupsCrud } from "../_hooks/use-groups-crud";
import type { SubgroupEditorData } from "../_actions/group-actions";
import type { ClassGroupOption } from "./class-groups-multi-select";

interface GroupsTableClientProps {
  initialGroups: GroupWithDetails[];
  subjects: SubjectOption[];
}

function getTransferDialogKey(
  group: GroupWithDetails | null,
  students: {
    assigned: StudentForAssignment[];
    available: StudentForAssignment[];
  } | null
) {
  if (!group) {
    return "transfer-empty";
  }

  if (!students) {
    return `transfer-${group.id}-loading`;
  }

  const assignedIds = students.assigned.map((student) => student.id).join("|");
  const availableIds = students.available.map((student) => student.id).join("|");

  return `transfer-${group.id}-${assignedIds}-${availableIds}`;
}

function getSubgroupEditorDialogKey(data: SubgroupEditorData | null) {
  if (!data) {
    return "subgroup-editor-empty";
  }

  return data.sibling
    .map((sibling) => `${sibling.id}:${sibling.studentIds.join("|")}`)
    .join(";");
}

export function GroupsTableClient({ initialGroups, subjects }: GroupsTableClientProps) {
  const {
    groups,
    commands,
    loadStudentsForAssignment,
    loadGroupStudents,
    loadSubgroupEditorData,
  } = useGroupsCrud(initialGroups);

  const [searchQuery, setSearchQuery] = useQueryState("search", {
    defaultValue: "",
    shallow: false,
  });
  const [searchInput, setSearchInput] = useDebouncedQueryState(searchQuery, setSearchQuery);
  const [filterType, setFilterType] = useQueryState("type", {
    defaultValue: "all",
    shallow: false,
  });
  const [isAddingRow, setIsAddingRow] = useState(false);
  const hasActiveFilters = Boolean(searchQuery) || filterType !== "all";
  const classOptions = useMemo<ClassGroupOption[]>(
    () =>
      groups
        .filter((group) => group.type === "CLASS" && group.parentId === null)
        .sort((left, right) => {
          const gradeDelta =
            (left.grade ?? Number.MAX_SAFE_INTEGER) -
            (right.grade ?? Number.MAX_SAFE_INTEGER);
          if (gradeDelta !== 0) {
            return gradeDelta;
          }

          return left.name.localeCompare(right.name, "ru");
        })
        .map((group) => ({
          id: group.id,
          label: group.name,
        })),
    [groups]
  );
  const electiveSubjects = useMemo(
    () => subjects.filter((subject) => subject.type === "ELECTIVE_OPTIONAL"),
    [subjects]
  );

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

  const handleTransferDialogOpenChange = useCallback((open: boolean) => {
    setTransferDialogOpen(open);
    if (!open) {
      setTransferGroup(null);
      setTransferStudents(null);
      setTransferLoading(false);
    }
  }, []);

  const handleSplitterOpenChange = useCallback((open: boolean) => {
    setSplitterOpen(open);
    if (!open) {
      setSplitterGroup(null);
      setSplitterStudents([]);
    }
  }, []);

  const handleSubgroupEditorOpenChange = useCallback((open: boolean) => {
    setSubgroupEditorOpen(open);
    if (!open) {
      setSubgroupEditorData(null);
      setSubgroupEditorLoading(false);
    }
  }, []);

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
        searchQuery={searchInput}
        onSearchQueryChange={setSearchInput}
        onAddGroup={() => setIsAddingRow(true)}
        isAddingRow={isAddingRow}
      />

      <GroupsTreeTable
        groups={groups}
        classOptions={classOptions}
        electiveSubjects={electiveSubjects}
        isAddingRow={isAddingRow}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        onStartAddRow={() => setIsAddingRow(true)}
        onCancelAddRow={() => setIsAddingRow(false)}
        commands={commands}
        onOpenTransferList={handleOpenTransferList}
        onOpenSplitter={handleOpenSplitter}
        onOpenSubgroupEditor={handleOpenSubgroupEditor}
      />

      {(transferDialogOpen || transferGroup || transferLoading) && (
        <StudentAssignmentDialog
          key={getTransferDialogKey(transferGroup, transferStudents)}
          open={transferDialogOpen}
          onOpenChange={handleTransferDialogOpenChange}
          group={transferGroup}
          students={transferStudents}
          loading={transferLoading}
          command={commands.transferStudents}
        />
      )}

      {(splitterOpen || splitterGroup) && (
        <SplitterDialog
          key={splitterGroup?.id ?? "splitter-empty"}
          open={splitterOpen}
          onOpenChange={handleSplitterOpenChange}
          group={splitterGroup}
          students={splitterStudents}
          subjects={subjects}
          command={commands.splitGroup}
        />
      )}

      {(subgroupEditorOpen || subgroupEditorData || subgroupEditorLoading) && (
        <SubgroupEditorDialog
          key={getSubgroupEditorDialogKey(subgroupEditorData)}
          open={subgroupEditorOpen}
          onOpenChange={handleSubgroupEditorOpenChange}
          data={subgroupEditorData}
          loading={subgroupEditorLoading}
          command={commands.redistributeSubgroups}
        />
      )}
    </div>
  );
}
