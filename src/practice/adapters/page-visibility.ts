import type { VisibilityPort } from "../ports/visibility";

// Reports when the page is hidden — practice.session/REQ-009, so the
// session can stop playback rather than run unseen.
export function pageVisibility(documentLike: Document): VisibilityPort {
  return {
    onHidden(listener: () => void): () => void {
      function handleVisibilityChange(): void {
        if (documentLike.hidden) listener();
      }
      documentLike.addEventListener("visibilitychange", handleVisibilityChange);
      return () =>
        documentLike.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
    },
  };
}
