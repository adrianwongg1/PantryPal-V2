import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sheet } from "./Sheet";

describe("Sheet", () => {
  it("is closed (not in the accessibility tree as a dialog) when open=false", () => {
    render(
      <Sheet open={false} onClose={() => {}} title="Add to the list?">
        Content
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a modal dialog when open=true", () => {
    render(
      <Sheet open={true} onClose={() => {}} title="Add to the list?">
        Content
      </Sheet>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add to the list?")).toHaveClass("dialog-title");
  });

  it("renders title, body, and actions in their own classed regions", () => {
    render(
      <Sheet
        open
        onClose={() => {}}
        title="Add to the list?"
        actions={<button type="button">Add 2 things</button>}
      >
        They&rsquo;ll show up under Need.
      </Sheet>,
    );
    expect(screen.getByText("They’ll show up under Need.")).toHaveClass(
      "dialog-body",
    );
    expect(screen.getByRole("button", { name: "Add 2 things" }).parentElement).toHaveClass(
      "dialog-actions",
    );
  });

  it("calls onClose when the dialog fires its native close event (Escape)", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Add to the list?">
        Content
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog");
    dialog.dispatchEvent(new Event("close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on a click that lands on the dialog element itself (the backdrop area)", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Sheet open onClose={onClose} title="Add to the list?">
        Content
      </Sheet>,
    );
    await user.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when clicking inside the dialog's own content", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Sheet open onClose={onClose} title="Add to the list?">
        Content
      </Sheet>,
    );
    await user.click(screen.getByText("Content"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
