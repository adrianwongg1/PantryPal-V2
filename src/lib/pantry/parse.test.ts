import { describe, expect, it } from "vitest";
import { parsePantryEntry } from "./parse";

describe("parsePantryEntry", () => {
  it("parses a plain integer quantity with no unit (design canvas 1a: '2 limes')", () => {
    expect(parsePantryEntry("2 limes")).toEqual({
      quantity: 2,
      unit: null,
      name: "limes",
    });
  });

  it("parses 'half a bag of rice' (design canvas 1d placeholder)", () => {
    expect(parsePantryEntry("half a bag of rice")).toEqual({
      quantity: 0.5,
      unit: "bag",
      name: "rice",
    });
  });

  it("parses 'a handful of coriander' (design canvas 7c 'Type a handful of coriander')", () => {
    expect(parsePantryEntry("a handful of coriander")).toEqual({
      quantity: 1,
      unit: "handful",
      name: "coriander",
    });
  });

  it("parses a number glued to its unit ('400g rice')", () => {
    expect(parsePantryEntry("400g rice")).toEqual({
      quantity: 400,
      unit: "g",
      name: "rice",
    });
  });

  it("parses a spelled-out unit quantity ('3 tbsp sriracha')", () => {
    expect(parsePantryEntry("3 tbsp sriracha")).toEqual({
      quantity: 3,
      unit: "tbsp",
      name: "sriracha",
    });
  });

  it("parses a decimal quantity ('1.5kg chicken')", () => {
    expect(parsePantryEntry("1.5kg chicken")).toEqual({
      quantity: 1.5,
      unit: "kg",
      name: "chicken",
    });
  });

  it("parses an ASCII fraction quantity ('1/2 cup rice')", () => {
    expect(parsePantryEntry("1/2 cup rice")).toEqual({
      quantity: 0.5,
      unit: "cup",
      name: "rice",
    });
  });

  it("parses a vulgar fraction character ('½ cup rice')", () => {
    expect(parsePantryEntry("½ cup rice")).toEqual({
      quantity: 0.5,
      unit: "cup",
      name: "rice",
    });
  });

  it("parses a plain name with no quantity or unit ('eggs')", () => {
    expect(parsePantryEntry("eggs")).toEqual({
      quantity: null,
      unit: null,
      name: "eggs",
    });
  });

  it("parses 'a' as quantity 1 with no unit word ('a lime')", () => {
    expect(parsePantryEntry("a lime")).toEqual({
      quantity: 1,
      unit: null,
      name: "lime",
    });
  });

  it("parses multi-word names after the unit ('2 cloves garlic, minced')", () => {
    expect(parsePantryEntry("2 cloves garlic, minced")).toEqual({
      quantity: 2,
      unit: "cloves",
      name: "garlic, minced",
    });
  });

  it("is whitespace- and case-insensitive on input", () => {
    expect(parsePantryEntry("  2   LIMES  ")).toEqual({
      quantity: 2,
      unit: null,
      name: "limes",
    });
  });

  it("returns an empty name for empty input rather than throwing", () => {
    expect(parsePantryEntry("")).toEqual({ quantity: null, unit: null, name: "" });
    expect(parsePantryEntry("   ")).toEqual({ quantity: null, unit: null, name: "" });
  });
});
