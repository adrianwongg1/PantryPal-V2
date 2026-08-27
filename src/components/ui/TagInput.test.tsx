import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "./TagInput";

function hiddenValue(container: HTMLElement, name: string): string[] {
  const input = container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
  return JSON.parse(input?.value ?? "[]");
}

describe("TagInput", () => {
  it("starts with a hidden field reflecting defaultValue", () => {
    const { container } = render(<TagInput name="allergies" defaultValue={["peanuts"]} />);
    expect(hiddenValue(container, "allergies")).toEqual(["peanuts"]);
    expect(screen.getByText("peanuts")).toBeInTheDocument();
  });

  it("adds an item on Enter and clears the draft", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput name="allergies" placeholder="Add one" />);
    const draft = screen.getByPlaceholderText("Add one");
    await user.type(draft, "shellfish{Enter}");
    expect(hiddenValue(container, "allergies")).toEqual(["shellfish"]);
    expect(draft).toHaveValue("");
  });

  it("adds the in-progress draft on blur", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <TagInput name="allergies" placeholder="Add one" />
        <button type="button">elsewhere</button>
      </>,
    );
    await user.type(screen.getByPlaceholderText("Add one"), "peanuts");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(hiddenValue(container, "allergies")).toEqual(["peanuts"]);
  });

  it("removes an item via its × button", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput name="allergies" defaultValue={["peanuts", "shellfish"]} />);
    await user.click(screen.getByRole("button", { name: "Remove peanuts" }));
    expect(hiddenValue(container, "allergies")).toEqual(["shellfish"]);
    expect(screen.queryByText("peanuts")).not.toBeInTheDocument();
  });

  it("does not add a duplicate or an empty item", async () => {
    const user = userEvent.setup();
    const { container } = render(<TagInput name="allergies" defaultValue={["peanuts"]} />);
    const draft = screen.getByRole("textbox");
    await user.type(draft, "peanuts{Enter}");
    expect(hiddenValue(container, "allergies")).toEqual(["peanuts"]);
    await user.type(draft, "   {Enter}");
    expect(hiddenValue(container, "allergies")).toEqual(["peanuts"]);
  });

  it("stops accepting new items once maxItems is reached", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TagInput name="allergies" defaultValue={["a", "b"]} maxItems={2} />,
    );
    await user.type(screen.getByRole("textbox"), "c{Enter}");
    expect(hiddenValue(container, "allergies")).toEqual(["a", "b"]);
  });
});
