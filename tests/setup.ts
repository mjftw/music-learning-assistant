// jsdom has no canvas backing, so VexFlow's text-measurement canvas
// (Element.getTextMeasurementCanvas) can't get a 2D context; VexFlow copes
// (falls back to zeroed metrics) but jsdom logs a "not implemented" error
// per call, which is noisy rather than a real failure. This is the minimal
// stand-in the rendered stave needs to lay out text without that noise.
// Shared across every UI test file via Vitest's `test.setupFiles`.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() => ({
    measureText: (text: string) => ({
      width: text.length * 8,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
    }),
    // Unchecked cast: this stand-in only implements the one method VexFlow's
    // text measurement actually calls, not the full CanvasRenderingContext2D
    // surface `getContext`'s real type promises.
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
