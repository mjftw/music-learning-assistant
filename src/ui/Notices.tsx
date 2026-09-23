import type { JSX } from "react";
import type { CatalogueNotice } from "../theory/published";

const SOUND_UNAVAILABLE_TEXT =
  "Sound unavailable — the run still shows; tap ▶ to try again";

// Article VI: the notice never interrupts — no dialog, no dismiss button,
// no focus steal, and rendering nothing when there's nothing to say.
export function Notices(props: {
  readonly notices: readonly CatalogueNotice[];
  readonly soundUnavailable: boolean;
}): JSX.Element {
  const { notices, soundUnavailable } = props;
  if (notices.length === 0 && !soundUnavailable) return <></>;

  return (
    <div role="status">
      {notices.map((notice) => (
        <p key={notice.source}>{`⚠ ${notice.source} — ${notice.problem}`}</p>
      ))}
      {soundUnavailable && <p>{SOUND_UNAVAILABLE_TEXT}</p>}
    </div>
  );
}
