# Fix Summary

## Issue 1: Orders API returns "Order must have at least one item" (400 Bad Request)

**Root Cause**: Mismatch between frontend and backend data formats:
- Frontend sends: `{ items: [{ productId: "...", quantity: 2 }, ...] }` (flat array)
- Backend expected: `{ items: { create: [{ productId: "...", quantity: 2 }, ...] } }` (Prisma nested format)

**Fix Applied**: Modified `/backend/src/modules/orders/orders.service.ts` in the `createOrder` method to handle both formats:
- Lines 55-63: Added logic to detect whether `payload.items` is a flat array (frontend format) or has a `create` property (Prisma format)
- This maintains backward compatibility while fixing the frontend integration

## Issue 2: Settings API returns 413 Payload Too Large

**Root Cause**: Express body parser limit was too small (1MB) for base64-encoded logo images:
- Frontend allows logo uploads up to 2MB
- Base64 encoding increases size by ~33%, resulting in ~2.66MB payload
- Express JSON parser limit of 1MB was exceeded

**Fix Applied**: Modified `/backend/src/app.ts` to increase body limits:
- Line 44-45: Changed from `limit: "1mb"` to `limit: "5mb"` for both JSON and URL-encoded parsers
- This provides sufficient headroom for logo images plus other form data

## Files Modified

1. `/backend/src/modules/orders/orders.service.ts` - Fixed order item format handling
2. `/backend/src/app.ts` - Increased Express body parser limits

## Verification

Both fixes address the root causes described in the issue:
- Orders API will now accept the format sent by the POS frontend
- Settings API will now accept payloads up to 5MB, accommodating base64-encoded logo images