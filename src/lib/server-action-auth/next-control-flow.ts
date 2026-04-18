import { unstable_rethrow } from "next/navigation";

export function rethrowIfNextControlFlow(error: unknown): void {
  unstable_rethrow(error);
}
