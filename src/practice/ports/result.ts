// A typed outcome for operations that can fail in an expected way — no
// exceptions for control flow (docs/engineering.md §4).
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
