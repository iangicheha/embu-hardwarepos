This Next.js + TypeScript frontend fails `npm run build` with type errors. 
Run `npm run build` yourself, then fix every TypeScript compile error and 
ESLint error that blocks the build — do NOT just silence errors with 
`@ts-ignore`, `any`, or by disabling ESLint rules.

Known issue to start with:
In app/(dashboard)/dashboard/page.tsx, code does 
`ordersRes?.data?.items` and `restocksRes?.data?.items`, but the actual 
API response type is `{ orders: Order[]; pagination: Pagination }` — 
there is no `items` field. Check the real shape returned by each API 
function (in lib/api.ts or wherever these are defined) and fix every 
place in the codebase that references the wrong field name to match 
the actual response type.

After fixing that, keep running `npm run build` and fixing whatever 
error appears next, repeating until the build completes successfully 
with `✓ Compiled successfully` and no type errors. Do not skip or 
downgrade type-checking to make errors disappear — fix the actual 
mismatch between the code and the real data types/API shapes.

Also fix the ESLint warning in app/login/page.tsx about using `<img>` 
instead of `<Image />` from next/image, if it's quick to do safely 
without breaking styling.

Once the build passes locally, list every file you changed and a 
one-line summary of what was wrong in each.