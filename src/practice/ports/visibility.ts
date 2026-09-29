// Reports when the page is hidden — practice.session/REQ-009, so the
// session can stop playback rather than run unseen — and when it is shown
// again — practice.tuner/REQ-008, so the tuner can resume listening without
// a new request.
export interface VisibilityPort {
  onHidden(listener: () => void): () => void;
  onShown(listener: () => void): () => void;
}
