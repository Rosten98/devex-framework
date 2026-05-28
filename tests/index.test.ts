import { describe, it, expect } from "vitest";
import { FRAMEWORK_VERSION } from "../src/index";
import type { DoraEvent, PipelineConfig } from "../src/index";

describe("framework", () => {
  it("tiene una versión definida", () => {
    expect(FRAMEWORK_VERSION).toBe("0.1.0");
  });

  it("acepta un DoraEvent válido", () => {
    const event: DoraEvent = {
      work_id: "FIN-123",
      service: "transactionify",
      language: "python",
      event_type: "deploy",
      timestamp: new Date().toISOString(),
      environment: "sandbox",
      commit_sha: "abc123",
    };
    expect(event.work_id).toBe("FIN-123");
    expect(event.language).toBe("python");
  });

  it("acepta un PipelineConfig válido", () => {
    const config: PipelineConfig = {
      service: "transactionify",
      language: "python",
      workIdPattern: /[A-Z]+-\d+/,
      environments: ["sandbox", "staging", "production"],
      testCommand: "pytest tests/ -v",
    };
    expect(config.environments).toHaveLength(3);
  });
});