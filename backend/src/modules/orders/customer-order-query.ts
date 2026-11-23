import { OrderStatus } from "../../types";
import { ValidationError } from "../../utils/errors";

const MAX_DATABASE_OFFSET = 2147483647;
/** Server list budget, not a price or business workflow rule. */
export function validateCustomerOrderQuery(
  page: number,
  limit: number,
  status?: OrderStatus,
) {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new ValidationError(
      "page must be a positive integer and limit must be between 1 and 100",
    );
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip) || skip > MAX_DATABASE_OFFSET)
    throw new ValidationError(
      "Requested page exceeds the supported database offset",
    );
  if (status !== undefined && !Object.values(OrderStatus).includes(status))
    throw new ValidationError("Unknown order status");
  return { page, limit, status, skip };
}
export function parseCustomerOrderQuery(query: {
  page?: unknown;
  limit?: unknown;
  status?: unknown;
}) {
  const integer = (value: unknown, fallback: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value))
      throw new ValidationError(
        "page and limit must be positive decimal integers",
      );
    return Number(value);
  };
  if (query.status !== undefined && typeof query.status !== "string")
    throw new ValidationError("status must be one order status");
  return validateCustomerOrderQuery(
    integer(query.page, 1),
    integer(query.limit, 20),
    query.status as OrderStatus | undefined,
  );
}
