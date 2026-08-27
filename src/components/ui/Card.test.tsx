import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardBody, CardKicker, CardMeta, CardTitle } from "./Card";

describe("Card", () => {
  it("renders the base .card class with no elevation by default", () => {
    render(<Card data-testid="card">content</Card>);
    const el = screen.getByTestId("card");
    expect(el).toHaveClass("card");
    expect(el.className).not.toMatch(/elev-/);
  });

  it("applies an elevation class when given", () => {
    render(
      <Card data-testid="card" elevation="sm">
        content
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveClass("elev-sm");
  });

  it("renders the sub-components with their own classes", () => {
    render(
      <Card>
        <CardKicker>Dinner</CardKicker>
        <CardTitle>Charred Lime Chicken</CardTitle>
        <CardBody>Crisped hard, woken up with lime.</CardBody>
        <CardMeta>22 min</CardMeta>
      </Card>,
    );
    expect(screen.getByText("Dinner")).toHaveClass("card-kicker");
    expect(screen.getByText("Charred Lime Chicken")).toHaveClass("card-title");
    expect(screen.getByText("Crisped hard, woken up with lime.")).toHaveClass(
      "card-body",
    );
    expect(screen.getByText("22 min")).toHaveClass("card-meta");
  });
});
