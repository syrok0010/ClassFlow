"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { upsertRequirementAction } from "../_actions/requirement-actions";
import { RequirementsMatrixTable } from "./requirements-matrix-table";
import { RequirementsToolbar } from "./requirements-toolbar";
import { flattenRequirementRows, getRootRowIds } from "../_lib/utils";
import type {
  RequirementEntry,
  RequirementGroupNode,
  RequirementsMatrixData,
  SubjectColumnGroupKey,
} from "../_lib/types";

type MatrixRegion = "core" | "elective";

export function RequirementsMatrixClient({
  initialData,
}: {
  initialData: RequirementsMatrixData;
}) {
  const [activeRegionQuery, setActiveRegionQuery] = useQueryState("region", {
    defaultValue: "core",
    shallow: true,
  });
  const [quickInputModeQuery, setQuickInputModeQuery] = useQueryState("quick", {
    defaultValue: "1",
    shallow: true,
  });

  const activeRegion: MatrixRegion =
    activeRegionQuery === "elective" ? "elective" : "core";
  const quickInputMode = quickInputModeQuery !== "0";

  const [collapsedCoreColumnGroups, setCollapsedCoreColumnGroups] =
    useState<Set<SubjectColumnGroupKey>>(new Set());
  const [collapsedElectiveColumnGroups, setCollapsedElectiveColumnGroups] =
    useState<Set<SubjectColumnGroupKey>>(new Set());
  const [requirements, setRequirements] = useState<RequirementEntry[]>(
    initialData.requirements
  );

  const coreGroups = useMemo(
    () =>
      initialData.groups
        .filter((group) => group.type === "CLASS")
        .map((group) => ({ ...group, subGroups: [] })),
    [initialData.groups]
  );

  const electiveGroups = useMemo(
    () =>
      initialData.groups
        .filter((group) => group.type === "ELECTIVE_GROUP")
        .map((group) => ({ ...group, subGroups: [] })),
    [initialData.groups]
  );

  const coreRows = useMemo(
    () => flattenRequirementRows(coreGroups, new Set(getRootRowIds(coreGroups))),
    [coreGroups]
  );

  const electiveRows = useMemo(
    () =>
      flattenRequirementRows(
        electiveGroups,
        new Set(getRootRowIds(electiveGroups))
      ),
    [electiveGroups]
  );

  const coreSubjects = useMemo(
    () =>
      initialData.subjects.filter(
        (subject) => subject.type !== "ELECTIVE_OPTIONAL"
      ),
    [initialData.subjects]
  );

  const electiveSubjects = useMemo(
    () =>
      initialData.subjects.filter(
        (subject) => subject.type === "ELECTIVE_OPTIONAL"
      ),
    [initialData.subjects]
  );

  const groupsById = useMemo(() => {
    const map = new Map<string, RequirementGroupNode>();

    const walk = (nodes: RequirementGroupNode[]) => {
      for (const node of nodes) {
        map.set(node.id, node);
        walk(node.subGroups);
      }
    };

    walk(initialData.groups);
    return map;
  }, [initialData.groups]);

  const getTargetGroupIds = (groupId: string, subjectId: string): string[] => {
    const base = groupsById.get(groupId);
    if (!base) {
      return [groupId];
    }

    if (base.type !== "CLASS") {
      return [groupId];
    }

    const subgroupIds = base.subGroups
      .filter(
        (subgroup) =>
          subgroup.type === "SUBJECT_SUBGROUP" && subgroup.subjectId === subjectId
      )
      .map((subgroup) => subgroup.id);

    return [groupId, ...subgroupIds];
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      rowId: string;
      subjectId: string;
      lessonsPerWeek: number;
      durationInMinutes: number;
      breakDuration: number;
    }) => {
      const response = await upsertRequirementAction({
        groupId: payload.rowId,
        subjectId: payload.subjectId,
        lessonsPerWeek: payload.lessonsPerWeek,
        durationInMinutes: payload.durationInMinutes,
        breakDuration: payload.breakDuration,
      });

      if (response.error || !response.result) {
        throw new Error(response.error ?? "Не удалось сохранить требование");
      }

      return response.result;
    },
    onMutate: async (payload) => {
      const previous = requirements;
      const targetGroupIds = getTargetGroupIds(payload.rowId, payload.subjectId);

      if (payload.lessonsPerWeek === 0) {
        setRequirements((prev) =>
          prev.filter(
            (entry) =>
              !(
                entry.subjectId === payload.subjectId &&
                targetGroupIds.includes(entry.groupId)
              )
          )
        );
      } else {
        setRequirements((prev) => {
          const map = new Map(
            prev.map((entry) => [`${entry.groupId}:${entry.subjectId}`, entry])
          );

          for (const gid of targetGroupIds) {
            map.set(`${gid}:${payload.subjectId}`, {
              groupId: gid,
              subjectId: payload.subjectId,
              lessonsPerWeek: payload.lessonsPerWeek,
              durationInMinutes: payload.durationInMinutes,
              breakDuration: payload.breakDuration,
            });
          }

          return Array.from(map.values());
        });
      }

      return { previous };
    },
    onError: (error, _payload, context) => {
      if (context?.previous) {
        setRequirements(context.previous);
      }

      toast.error(error.message || "Не удалось сохранить требование");
    },
    onSuccess: () => {
      toast.success("Требование сохранено");
    },
  });

  const toggleColumnGroup = (
    region: MatrixRegion,
    groupKey: SubjectColumnGroupKey
  ) => {
    const setter =
      region === "core"
        ? setCollapsedCoreColumnGroups
        : setCollapsedElectiveColumnGroups;

    setter((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }

      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <RequirementsToolbar
        activeRegion={activeRegion}
        onActiveRegionChange={(value) => {
          void setActiveRegionQuery(value === "core" ? null : value);
        }}
        quickInputMode={quickInputMode}
        onQuickInputModeChange={(value) => {
          void setQuickInputModeQuery(value ? null : "0");
        }}
      />

      {activeRegion === "core" ? (
        <RequirementsMatrixTable
          key="core-table"
          rows={coreRows}
          subjects={coreSubjects}
          requirements={requirements}
          quickInputMode={quickInputMode}
          collapsedColumnGroups={collapsedCoreColumnGroups}
          onToggleColumnGroup={(groupKey) => toggleColumnGroup("core", groupKey)}
          onSaveCell={async (payload) => {
            await saveMutation.mutateAsync(payload);
          }}
        />
      ) : (
        <RequirementsMatrixTable
          key="elective-table"
          rows={electiveRows}
          subjects={electiveSubjects}
          requirements={requirements}
          quickInputMode={quickInputMode}
          collapsedColumnGroups={collapsedElectiveColumnGroups}
          onToggleColumnGroup={(groupKey) =>
            toggleColumnGroup("elective", groupKey)
          }
          onSaveCell={async (payload) => {
            await saveMutation.mutateAsync(payload);
          }}
        />
      )}
    </div>
  );
}
