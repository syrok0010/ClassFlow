"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useAvailabilityMutationRunner() {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);

  const mutate = useCallback(
    async (callback: () => Promise<{ error: string | null }>, successMessage: string) => {
      setIsMutating(true);
      const response = await callback();
      setIsMutating(false);

      if (response.error) {
        toast.error(response.error);
        return false;
      }

      router.refresh();
      toast.success(successMessage);
      return true;
    },
    [router],
  );

  return { isMutating, mutate };
}
