import { expect, test } from "vitest";
import { circleOfFifths, signatureOf } from "../../../src/theory/published";
const signedCount = (key: Parameters<typeof signatureOf>[0]) => {
  const signature = signatureOf(key);
  return signature.kind === "flats" ? -signature.count : signature.count;
};
test("theory.circle-of-fifths/REQ-006/S1 — every neighbouring pair differs by exactly one accidental", () => {
  const positions = circleOfFifths();
  for (let index = 0; index < 12; index += 1) {
    const current = positions[index]!.majors.map(signedCount);
    const next = positions[(index + 1) % 12]!.majors.map(signedCount);
    const differences = current.flatMap((a) =>
      next.map((b) => Math.abs(a - b)),
    );
    expect(differences, `positions ${index}→${(index + 1) % 12}`).toContain(1);
  }
});
