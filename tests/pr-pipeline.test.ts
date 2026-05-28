import { describe, it, expect } from "vitest";
import { generatePrPipeline } from "../src/index";

describe("generatePrPipeline", () => {
  it("genera un workflow con el nombre correcto del servicio", () => {
    const result = generatePrPipeline({
      service: "transactionify",
      language: "python",
      workIdPattern: /[A-Z]+-\d+/,
      environments: ["sandbox"],
      testCommand: "pytest tests/ -v",
    });

    expect(result).toContain("transactionify");
  });

  it("incluye el setup de Python para servicios Python", () => {
    const result = generatePrPipeline({
      service: "transactionify",
      language: "python",
      workIdPattern: /[A-Z]+-\d+/,
      environments: ["sandbox"],
      testCommand: "pytest tests/ -v",
    });

    expect(result).toContain("setup-python");
    expect(result).toContain("pytest tests/ -v");
  });

  it("incluye el setup de Go para servicios Go", () => {
    const result = generatePrPipeline({
      service: "payments-service",
      language: "go",
      workIdPattern: /[A-Z]+-\d+/,
      environments: ["sandbox"],
      testCommand: "go test ./...",
    });

    expect(result).toContain("setup-go");
    expect(result).toContain("go test ./...");
  });

  it("incluye validación de Work ID en el pipeline", () => {
    const result = generatePrPipeline({
      service: "transactionify",
      language: "python",
      workIdPattern: /[A-Z]+-\d+/,
      environments: ["sandbox"],
      testCommand: "pytest tests/ -v",
    });

    expect(result).toContain("Work ID");
  });
});