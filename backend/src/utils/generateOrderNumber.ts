import crypto from "crypto";

export const generateOrderNumber = (): string => {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const random = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();
  return `ORD-${date}-${random}`;
};
