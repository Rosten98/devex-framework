import { DoraEvent, DoraEventType, Environment, Language } from "../types";

export type DoraEventInput = Omit<DoraEvent, "timestamp">;

export function createDoraEvent(input: DoraEventInput): DoraEvent {
  return {
    ...input,
    timestamp: new Date().toISOString(),
  };
}

export function emitDoraEvent(event: DoraEvent): void {
  console.log(JSON.stringify({ dora: event }));
}

export function createAndEmitDoraEvent(input: DoraEventInput): DoraEvent {
  const event = createDoraEvent(input);
  emitDoraEvent(event);
  return event;
}

export function calculateLeadTime(
  startedAt: string,
  completedAt: string = new Date().toISOString()
): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  return Math.floor((end - start) / 1000);
}

export function calculateChangeFailureRate(
  totalDeploys: number,
  failedDeploys: number
): number {
  if (totalDeploys === 0) return 0;
  return failedDeploys / totalDeploys;
}