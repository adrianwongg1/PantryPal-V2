// Global Vitest setup.
import "@testing-library/jest-dom/vitest";

// jsdom (30.x, as pinned in package.json) doesn't implement
// HTMLDialogElement.showModal/close at all — see
// https://github.com/jsdom/jsdom/issues/3294. Every real target browser
// (Safari 16.4+, every evergreen browser) supports both natively; this
// polyfill exists only so components built on <dialog>
// (src/components/ui/Sheet.tsx) are testable under Vitest + jsdom. `.open`
// itself already reflects the `open` attribute correctly in jsdom, so the
// polyfill only needs to toggle that attribute and fire `close`.
if (
  typeof HTMLDialogElement !== "undefined" &&
  !HTMLDialogElement.prototype.showModal
) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
