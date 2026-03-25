export type Result<T> =
  | {
      result: T;
      error: null;
    }
  | {
      result: null;
      error: string;
    };

export function ok<T>(result: T): Result<T> {
  return { result, error: null };
}

export function err<T = never>(error: string): Result<T> {
  return { result: null, error };
}
