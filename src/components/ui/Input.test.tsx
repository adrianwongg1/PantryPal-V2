import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input, Textarea } from "./Input";

describe("Input", () => {
  it("applies the .input class alongside a caller className", () => {
    render(<Input placeholder="Search" className="w-full" />);
    expect(screen.getByPlaceholderText("Search")).toHaveClass("input", "w-full");
  });

  it("forwards a ref to the underlying element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("accepts typed input", async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Add anything" />);
    const el = screen.getByPlaceholderText("Add anything");
    await user.type(el, "2 limes");
    expect(el).toHaveValue("2 limes");
  });
});

describe("Textarea", () => {
  it("applies the .input class", () => {
    render(<Textarea placeholder="half a rotisserie chicken…" />);
    expect(screen.getByPlaceholderText(/half a rotisserie chicken/)).toHaveClass("input");
  });

  it("forwards a ref to the underlying element", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
