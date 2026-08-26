import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MealTag, Tag } from "./Tag";

describe("Tag", () => {
  it("defaults to the neutral variant", () => {
    render(<Tag>Newest first</Tag>);
    expect(screen.getByText("Newest first")).toHaveClass("tag", "tag-neutral");
  });

  it("applies each generic variant", () => {
    render(<Tag variant="accent">Dinner</Tag>);
    expect(screen.getByText("Dinner")).toHaveClass("tag-accent");
    render(<Tag variant="accent-2">Thai</Tag>);
    expect(screen.getByText("Thai")).toHaveClass("tag-accent-2");
    render(<Tag variant="outline">+ add</Tag>);
    expect(screen.getByText("+ add")).toHaveClass("tag-outline");
  });

  it("applies the meal-type class and ignores variant when mealType is given", () => {
    render(
      <Tag mealType="dinner" variant="accent">
        Dinner
      </Tag>,
    );
    const el = screen.getByText("Dinner");
    expect(el).toHaveClass("tag-dinner");
    expect(el).not.toHaveClass("tag-accent");
  });

  it("maps every meal type to its own class", () => {
    for (const mealType of ["breakfast", "lunch", "dinner", "snack", "dessert"] as const) {
      render(<Tag mealType={mealType}>{mealType}</Tag>);
      expect(screen.getByText(mealType)).toHaveClass(`tag-${mealType}`);
    }
  });
});

describe("MealTag", () => {
  it("is equivalent to Tag with the given mealType", () => {
    render(<MealTag mealType="breakfast">Breakfast</MealTag>);
    expect(screen.getByText("Breakfast")).toHaveClass("tag", "tag-breakfast");
  });
});
