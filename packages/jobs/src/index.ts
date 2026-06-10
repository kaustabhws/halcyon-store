export type JobName =
  | "search.index"
  | "outbox.dispatch"
  | "shipment.progress"
  | "email.send"
  | "image.process"
  | "analytics.rollup";

export interface JobPayload<T = Record<string, unknown>> {
  name: JobName;
  data: T;
  idempotencyKey?: string;
  delayMs?: number;
}

export interface IJobQueue {
  enqueue<T = Record<string, unknown>>(job: JobPayload<T>): Promise<{ id: string }>;
}

export interface JobHandlerContext<T = Record<string, unknown>> {
  data: T;
  attempt: number;
}

export type JobHandler<T = Record<string, unknown>> = (
  ctx: JobHandlerContext<T>,
) => Promise<void>;
