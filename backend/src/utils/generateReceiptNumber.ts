import crypto from "crypto";

export const generateReceiptNumber = (): string => {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const random = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();
  return `RCP-${date}-${random}`;
};
