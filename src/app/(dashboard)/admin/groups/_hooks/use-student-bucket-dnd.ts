import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { StudentBucketMap } from "../_lib/utils";

export type { StudentBucketMap };

type MoveStudentContext = {
  buckets: StudentBucketMap;
  sourceBucket: string | null;
  studentId: string;
  targetBucket: string;
};

type UseStudentBucketDndOptions = {
  buckets: StudentBucketMap;
  bucketIds: string[];
  canMove?: (context: MoveStudentContext) => boolean;
  setBuckets: Dispatch<SetStateAction<StudentBucketMap>>;
};

function findBucketOfStudent(
  buckets: StudentBucketMap,
  studentId: string
): string | null {
  for (const [bucketId, studentIds] of Object.entries(buckets)) {
    if (studentIds.includes(studentId)) {
      return bucketId;
    }
  }

  return null;
}

function moveStudentToBucket(
  buckets: StudentBucketMap,
  studentId: string,
  sourceBucket: string | null,
  targetBucket: string
): StudentBucketMap {
  if (sourceBucket === targetBucket) {
    return buckets;
  }

  const next = { ...buckets };

  if (sourceBucket) {
    next[sourceBucket] = (next[sourceBucket] ?? []).filter(
      (id) => id !== studentId
    );
  }

  const targetStudentIds = next[targetBucket] ?? [];
  if (!targetStudentIds.includes(studentId)) {
    next[targetBucket] = [...targetStudentIds, studentId];
  }

  return next;
}

export function useStudentBucketDnd({
  buckets,
  bucketIds,
  canMove,
  setBuckets,
}: UseStudentBucketDndOptions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) {
        return;
      }

      const studentId = String(active.id);
      const targetBucket =
        (over.data.current?.bucketId as string | undefined) ?? String(over.id);

      if (!bucketIds.includes(targetBucket)) {
        return;
      }

      const sourceBucket = findBucketOfStudent(buckets, studentId);

      if (
        canMove &&
        !canMove({ buckets, sourceBucket, studentId, targetBucket })
      ) {
        return;
      }

      setBuckets((current) =>
        moveStudentToBucket(current, studentId, sourceBucket, targetBucket)
      );
    },
    [bucketIds, buckets, canMove, setBuckets]
  );

  return {
    activeId,
    handleDragEnd,
    handleDragStart,
    sensors,
  };
}
