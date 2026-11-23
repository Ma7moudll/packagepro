import { randomBytes, createHash } from "crypto";
import { prisma } from "../../lib/prisma";
export const hashApprovalToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
// Call only inside request finalization, alongside the durable request state.
export function newApprovalToken(): string {
  return randomBytes(32).toString("hex");
}
export async function verifyApprovalToken(
  token: string,
): Promise<{ orderId: string; requestId: string } | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await prisma.orderApprovalToken.findUnique({
    where: { tokenHash: hashApprovalToken(token) },
    include: { request: true },
  });
  return row &&
    row.requestId &&
    row.request?.status === "pending" &&
    !row.consumedAt &&
    row.expiresAt > new Date()
    ? { orderId: row.orderId, requestId: row.requestId }
    : null;
}
