import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup } from "./Radio";

const OPTIONS = [
  { value: "private", label: "Private" },
  { value: "unlisted", label: "Unlisted" },
  { value: "public", label: "Public" },
] as const;

describe("RadioGroup", () => {
  it("renders one real radio input per option, grouped by name", () => {
    render(<RadioGroup name="visibility" value="private" options={OPTIONS} onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    for (const radio of radios) {
      expect(radio).toHaveAttribute("name", "visibility");
    }
  });

  it("checks only the option matching value", () => {
    render(<RadioGroup name="visibility" value="unlisted" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Private" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Unlisted" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Public" })).not.toBeChecked();
  });

  it("calls onChange with the clicked option's value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RadioGroup name="visibility" value="private" options={OPTIONS} onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "Public" }));
    expect(onChange).toHaveBeenCalledWith("public");
  });
});
