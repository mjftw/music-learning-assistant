// Reports when the page is hidden — practice.session/REQ-009, so the
// session can stop playback rather than run unseen.
export interface VisibilityPort {
  onHidden(listener: () => void): () => void;
}
