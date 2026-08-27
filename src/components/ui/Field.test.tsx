import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field";
import { Input } from "./Input";

describe("Field", () => {
  it("associates the label with its input via htmlFor", () => {
    render(
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" />
      </Field>
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders the .field wrapper class", () => {
    const { container } = render(
      <Field label="Password" htmlFor="pw">
        <Input id="pw" type="password" />
      </Field>
    );
    expect(container.querySelector(".field")).toBeInTheDocument();
  });
});
