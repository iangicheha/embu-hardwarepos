My app's brand color is red, defined as the `--primary` CSS variable in 
frontend/app/globals.css (currently `--primary: 0 72% 51%` — a red, labeled 
"TRIPPLE 5 RED THEME"). The login page correctly uses this red (via 
bg-red-600, text-red-600, border-red-500, etc. and/or bg-primary), but the 
rest of the app (dashboard, sidebar, and other pages) has hardcoded blue 
classes instead (e.g. bg-blue-600, text-blue-600, border-blue-500, 
ring-blue-*, blue-50/100 backgrounds used as accents).

Task: Do a full sweep of the frontend codebase (app/, components/, and any 
other directories with .tsx/.jsx files) and replace every hardcoded blue 
accent class that represents brand/interactive color with the theme's 
primary token instead, so the whole app is visually consistent with the 
red login page. Specifically:

1. Search for all Tailwind classes matching patterns like: bg-blue-*, 
   text-blue-*, border-blue-*, ring-blue-*, from-blue-*, to-blue-*, 
   hover:bg-blue-*, hover:text-blue-*, focus:ring-blue-*, dark:bg-blue-*, 
   dark:text-blue-*, and any inline hex/rgb colors that resemble blue used 
   as an accent (not in illustrative icons or unrelated content like status 
   badges for "info" states — use judgment: sidebar active states, primary 
   buttons, links, focus rings, logo badges, avatar rings, and selected/ 
   active UI states should become red; leave genuinely semantic colors 
   alone, e.g. green for success, amber for warning, red for destructive/ 
   error should stay as-is and not be touched just because red already 
   matches).

2. Replace matched brand-accent classes with the equivalent using the 
   existing shadcn/tailwind theme tokens already defined in globals.css 
   (bg-primary, text-primary, border-primary, ring-primary, 
   text-primary-foreground, bg-primary/10, etc.) rather than hardcoding 
   bg-red-600 directly, so future theme changes only require editing 
   globals.css. Use the appropriate opacity/shade variants (e.g. 
   bg-primary/10 for light tinted backgrounds that were previously 
   bg-blue-50, bg-primary for solid buttons/active states that were 
   bg-blue-600).

3. Check the dashboard sidebar/nav specifically — the active nav item 
   background, the logo icon badge (currently a blue wrench icon badge), 
   notification bell badge, and the user avatar background/ring should all 
   move from blue to the primary red token.

4. After making changes, grep the codebase again for any remaining 
   blue-* classes used as brand/accent color to confirm nothing was missed, 
   and list any ambiguous cases you left alone with a one-line reason (e.g. 
   "kept blue-500 in InfoBanner.tsx — semantic 'info' color, not a brand 
   accent").

5. Do not touch: chart/graph color palettes if they use blue for 
   multi-series differentiation, favicon/logo image assets, or any 
   third-party component defaults that aren't part of our design system.

Show me a summary of every file changed and a brief diff-style list of what 
was swapped in each, so I can review before testing.