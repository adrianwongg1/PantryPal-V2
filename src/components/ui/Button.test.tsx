import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, buttonClassName } from "./Button";

describe("buttonClassName", () => {
  it("defaults to the primary variant", () => {
    expect(buttonClassName()).toBe("btn btn-primary");
  });

  it("maps every variant to its class", () => {
    expect(buttonClassName({ variant: "secondary" })).toBe("btn btn-secondary");
    expect(buttonClassName({ variant: "ghost" })).toBe("btn btn-ghost");
    expect(buttonClassName({ variant: "icon" })).toBe("btn btn-icon");
  });

  it("appends btn-block only when block is true", () => {
    expect(buttonClassName({ block: true })).toBe("btn btn-primary btn-block");
    expect(buttonClassName({ block: false })).toBe("btn btn-primary");
  });

  it("appends an extra className", () => {
    expect(buttonClassName({}, "w-full")).toBe("btn btn-primary w-full");
  });
});

describe("Button", () => {
  it("defaults to type=button so it never silently submits a form", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("respects an explicit type override", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("applies the variant class", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button", { name: "Ghost" })).toHaveClass(
      "btn",
      "btn-ghost",
    );
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("respects disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });
});
