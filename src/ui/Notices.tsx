import type { JSX } from "react";
import type { CatalogueNotice } from "../theory/published";

// Article VI: the notice never interrupts — no dialog, no dismiss button,
// no focus steal, and rendering nothing when there's nothing to say.
export function Notices(props: {
  readonly notices: readonly CatalogueNotice[];
}): JSX.Element {
  const { notices } = props;
  if (notices.length === 0) return <></>;

  return (
    <div role="status">
      {notices.map((notice) => (
        <p key={notice.source}>{`⚠ ${notice.source} — ${notice.problem}`}</p>
      ))}
    </div>
  );
}
