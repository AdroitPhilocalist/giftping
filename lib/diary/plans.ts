/**
 * The gift plan for one occasion: Idea → Chosen → Ordered → Wrapped → Given. Pure rules (no I/O, unit-tested); the pages and actions apply them.
 *
 *  - A plan belongs to ONE occurrence of a date ("Mom's birthday, 3 Oct 2026") — the next year gets its own.
 *  - "Ordered" can be reached two ways: the user says so (a gift bought elsewhere), or GiftPing notices a paid order for the chosen product placed
 *    after the plan was made. Noticing never moves a plan backwards and never past "ordered" — wrapping and giving are the person's own acts.
 */
export const PLAN_STEPS = ["idea", "chosen", "ordered", "wrapped", "given"] as const;
export type PlanStatus = (typeof PLAN_STEPS)[number];

export interface DiaryPlanRow {
  id: string;
  contact_id: string;
  event_id: string;
  occasion_date: string;
  product_id: string | null;
  gift_name: string | null;
  note: string | null;
  status: PlanStatus;
  order_id: string | null;
  created_at: string;
}

/** A paid order that contains a plan's chosen product. */
export interface LinkedOrder {
  id: string;
  orderNumber: string | null;
  status: string;
  placedAt: string;
}

export const isPlanStatus = (value: unknown): value is PlanStatus => PLAN_STEPS.includes(value as PlanStatus);
export const stepIndex = (status: PlanStatus): number => PLAN_STEPS.indexOf(status);

/** Statuses that mean the shopper has really placed the order (a draft or a cancelled order doesn't count). */
export const isPlacedOrderStatus = (status: string): boolean => !["created", "payment_initiated", "cancelled", "refunded"].includes(status);

/** What the tracker shows: the saved status, lifted to "ordered" when a real order for the chosen gift exists. Never lowers a status. */
export function effectivePlanStatus(plan: Pick<DiaryPlanRow, "status">, order: LinkedOrder | null): PlanStatus {
  if (order && isPlacedOrderStatus(order.status) && stepIndex(plan.status) < stepIndex("ordered")) return "ordered";
  return plan.status;
}

/** Of the user's orders (newest first), the first paid one containing the plan's product and placed on/after the plan was made. */
export function findLinkedOrder(plan: Pick<DiaryPlanRow, "product_id" | "created_at">, orders: { order: LinkedOrder; productIds: string[] }[]): LinkedOrder | null {
  if (!plan.product_id) return null;
  const madeAt = plan.created_at;
  for (const o of orders) {
    if (isPlacedOrderStatus(o.order.status) && o.productIds.includes(plan.product_id) && o.order.placedAt >= madeAt) return o.order;
  }
  return null;
}

export interface PlanStepCopy {
  title: string;
  /** shown when the step hasn't been reached yet */
  todo: string;
  /** the label of the button that moves the plan INTO this step */
  action: string;
}
export const PLAN_COPY: Record<PlanStatus, PlanStepCopy> = {
  idea: { title: "Idea", todo: "Find the perfect gift", action: "Start a plan" },
  chosen: { title: "Chosen", todo: "Pick what to give", action: "I've chosen it" },
  ordered: { title: "Ordered", todo: "Order it in time", action: "I've ordered it" },
  wrapped: { title: "Wrapped", todo: "Wrap it with love", action: "It's wrapped" },
  given: { title: "Given", todo: "Make their day special", action: "I gave it" },
};

/** The next status the person can move to from here, or null at the end. */
export const nextStatus = (status: PlanStatus): PlanStatus | null => PLAN_STEPS[stepIndex(status) + 1] ?? null;

/** The plan for a specific occurrence of a date, if one has been started. */
export function planFor(plans: DiaryPlanRow[], eventId: string, occasionDate: string): DiaryPlanRow | null {
  return plans.find((p) => p.event_id === eventId && p.occasion_date === occasionDate) ?? null;
}
