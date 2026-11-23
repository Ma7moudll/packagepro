import { OrderStatus, SampleStatus } from "../../types";
import { ValidationError } from "../../utils/errors";
export function parseAdminListQuery(
  raw: unknown,
  kind: "orders" | "vendors" | "customers" | "samples",
) {
  const query = raw as Record<string, unknown>;
  const integer = (v: unknown, defaultValue: number) => {
    if (v === undefined) return defaultValue;
    if (typeof v !== "string" || !/^\d+$/.test(v))
      throw new ValidationError(
        "page and limit must be positive decimal integers",
      );
    return Number(v);
  };
  const page = integer(query.page, 1),
    limit = integer(query.limit, 20),
    skip = (page - 1) * limit;
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isSafeInteger(skip) ||
    skip > 2147483647
  )
    throw new ValidationError(
      "Invalid page or limit: limit must be 1 to 100 and offset within supported range",
    );
  let status: string | undefined,
    active: "true" | "false" | undefined,
    search: string | undefined;
  if ((kind === "orders" || kind === "samples") && query.status !== undefined) {
    const values: string[] =
      kind === "orders"
        ? Object.values(OrderStatus)
        : Object.values(SampleStatus);
    if (typeof query.status !== "string" || !values.includes(query.status))
      throw new ValidationError("Unknown list status");
    status = query.status;
  }
  if (kind === "vendors" && query.active !== undefined) {
    if (query.active !== "true" && query.active !== "false")
      throw new ValidationError("active must be true or false");
    active = query.active;
  }
  if (
    (kind === "orders" || kind === "customers") &&
    query.search !== undefined
  ) {
    if (typeof query.search !== "string" || query.search.length > 200)
      throw new ValidationError(
        "search must be one string up to 200 characters",
      );
    search = query.search.trim() || undefined;
  }
  return { page, limit, skip, status, active, search };
}
