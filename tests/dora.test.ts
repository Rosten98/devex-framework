import { describe, it, expect, vi } from "vitest";
import {
  createDoraEvent,
  emitDoraEvent,
  calculateLeadTime,
  calculateChangeFailureRate,
} from "../src/index";

describe("createDoraEvent", () => {
  it("agrega timestamp automáticamente en formato ISO 8601", () => {
    const event = createDoraEvent({
      work_id: "FIN-123",
      service: "transactionify",
      language: "python",
      event_type: "deploy",
      environment: "production",
      commit_sha: "abc123",
    });

    expect(event.timestamp).toBeDefined();
    // Verifica que es un ISO 8601 válido
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  });

  it("preserva todos los campos del input", () => {
    const event = createDoraEvent({
      work_id: "FIN-123",
      service: "transactionify",
      language: "python",
      event_type: "deploy",
      environment: "sandbox",
      commit_sha: "abc123",
    });

    expect(event.work_id).toBe("FIN-123");
    expect(event.service).toBe("transactionify");
    expect(event.language).toBe("python");
    expect(event.environment).toBe("sandbox");
  });
});

describe("emitDoraEvent", () => {
  it("escribe el evento a stdout en formato JSON", () => {
    /*
      vi.spyOn intercepta la llamada a console.log sin ejecutarla.
      Decisión: no queremos que los tests ensucien la consola,
      pero sí queremos verificar qué se habría escrito.
    */
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const event = createDoraEvent({
      work_id: "FIN-123",
      service: "transactionify",
      language: "python",
      event_type: "deploy",
      environment: "production",
      commit_sha: "abc123",
    });

    emitDoraEvent(event);

    expect(spy).toHaveBeenCalledOnce();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.dora).toBeDefined();
    expect(output.dora.work_id).toBe("FIN-123");
    expect(output.dora.event_type).toBe("deploy");

    spy.mockRestore();
  });
});

describe("calculateLeadTime", () => {
  it("calcula correctamente el tiempo en segundos", () => {
    const start = "2024-01-01T10:00:00.000Z";
    const end = "2024-01-01T10:05:00.000Z"; // 5 minutos después

    const result = calculateLeadTime(start, end);
    expect(result).toBe(300); // 5 minutos = 300 segundos
  });

  it("devuelve 0 si los timestamps son iguales", () => {
    const ts = "2024-01-01T10:00:00.000Z";
    expect(calculateLeadTime(ts, ts)).toBe(0);
  });
});

describe("calculateChangeFailureRate", () => {
  it("calcula correctamente el failure rate", () => {
    // 2 de 20 deploys fallaron = 10% = 0.1
    expect(calculateChangeFailureRate(20, 2)).toBe(0.1);
  });

  it("devuelve 0 si no hay deploys", () => {
    expect(calculateChangeFailureRate(0, 0)).toBe(0);
  });

  it("devuelve 1 si todos los deploys fallaron", () => {
    expect(calculateChangeFailureRate(5, 5)).toBe(1);
  });
});