import { DoraEvent } from "../types";
export type DoraEventInput = Omit<DoraEvent, "timestamp">;
export declare function createDoraEvent(input: DoraEventInput): DoraEvent;
export declare function emitDoraEvent(event: DoraEvent): void;
export declare function createAndEmitDoraEvent(input: DoraEventInput): DoraEvent;
export declare function calculateLeadTime(startedAt: string, completedAt?: string): number;
export declare function calculateChangeFailureRate(totalDeploys: number, failedDeploys: number): number;
