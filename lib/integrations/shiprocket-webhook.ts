import { mapShiprocketStatus, normaliseRawStatus, type ShipmentStatus } from "./shiprocket-status";

/**
 * Turns Shiprocket's tracking webhook body into what apply_shipment_update() needs. Pure and unit-tested; the payload
 * field names come from Shiprocket's public docs (awb, current_status, current_timestamp, etd, scans[]) and must be
 * confirmed against a real delivery — see the Stage 8 "First real test".
 */
export interface TrackingEvent {
  occurred_at: string; // ISO-8601 with offset
  raw_status: string;
  activity: string | null;
  location: string | null;
}

export interface ParsedTracking {
  awb: string;
  status: ShipmentStatus | null;
  rawStatus: string;
  etd: string | null; // YYYY-MM-DD
  events: TrackingEvent[];
  /** Stable id for de-duplicating a delivery (Shiprocket sends no event id). */
  dedupeKey: string;
}

/**
 * Shiprocket timestamps are IST wall-clock with no zone ("2026-09-20 10:11:12"); anything already carrying an
 * offset / "Z" is taken as-is. Returns null if it can't be read.
 */
export function parseCourierTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = value.trim();
  const plain = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (plain) {
    const [, y, mo, d, h, mi, s] = plain;
    return `${y}-${mo}-${d}T${h}:${mi}:${s ?? "00"}+05:30`;
  }
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function toDate(value: unknown): string | null {
  const iso = parseCourierTimestamp(value);
  if (!iso) return null;
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

const str = (v: unknown, max = 500): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function parseTrackingPayload(body: unknown): ParsedTracking | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const awb = str(b.awb, 64);
  if (!awb) return null;

  const rawStatus = normaliseRawStatus(b.current_status ?? b.shipment_status);
  const events: TrackingEvent[] = [];

  const scans = Array.isArray(b.scans) ? (b.scans as Record<string, unknown>[]) : [];
  for (const scan of scans.slice(0, 200)) {
    if (!scan || typeof scan !== "object") continue;
    const at = parseCourierTimestamp(scan.date);
    const raw = normaliseRawStatus(scan["sr-status-label"] ?? scan["sr-status"] ?? scan.status);
    if (at && raw) events.push({ occurred_at: at, raw_status: raw, activity: str(scan.activity), location: str(scan.location, 200) });
  }

  const currentAt = parseCourierTimestamp(b.current_timestamp);
  if (currentAt && rawStatus) {
    events.push({ occurred_at: currentAt, raw_status: rawStatus, activity: null, location: null });
  }

  return {
    awb,
    status: mapShiprocketStatus(rawStatus),
    rawStatus,
    etd: toDate(b.etd),
    events,
    dedupeKey: `${awb}|${rawStatus}|${currentAt ?? ""}`,
  };
}
