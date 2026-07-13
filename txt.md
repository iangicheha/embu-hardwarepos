2026-07-13T16:57:53.565015868Z ==> Downloading cache...
2026-07-13T16:57:53.603227354Z ==> Cloning from https://github.com/iangicheha/embu-hardwarepos
2026-07-13T16:58:00.860626474Z ==> Checking out commit ed7f567109b80c6f889837aa93d2bce6a2d3c7ce in branch main
2026-07-13T16:58:09.856026017Z ==> Downloaded 303MB in 3s. Extraction took 7s.
2026-07-13T16:58:21.093826763Z ==> Using Node.js version 24.14.1 (default)
2026-07-13T16:58:21.093843744Z ==> Docs on specifying a Node.js version: https://render.com/docs/node-version
2026-07-13T16:58:21.183405403Z ==> Running build command 'npm install && npm run build && npx prisma generate'...
2026-07-13T16:58:22.879755593Z 
2026-07-13T16:58:22.879783685Z up to date, audited 597 packages in 2s
2026-07-13T16:58:22.879794175Z 
2026-07-13T16:58:22.879868449Z 88 packages are looking for funding
2026-07-13T16:58:22.879922182Z   run `npm fund` for details
2026-07-13T16:58:22.881181637Z 
2026-07-13T16:58:22.881194938Z found 0 vulnerabilities
2026-07-13T16:58:23.05961805Z 
2026-07-13T16:58:23.059638561Z > hardware-store-backend@1.0.0 build
2026-07-13T16:58:23.059643222Z > tsc
2026-07-13T16:58:23.059646592Z 
2026-07-13T16:58:36.201587184Z warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
2026-07-13T16:58:36.201612395Z For more information, see: https://pris.ly/prisma-config
2026-07-13T16:58:36.201617105Z 
2026-07-13T16:58:38.182780283Z Prisma schema loaded from prisma/schema.prisma
2026-07-13T16:58:39.867978338Z 
2026-07-13T16:58:39.980984372Z ✔ Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 1.10s
2026-07-13T16:58:39.981002523Z 
2026-07-13T16:58:39.981008533Z Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
2026-07-13T16:58:39.981013804Z 
2026-07-13T16:58:39.981021834Z Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
2026-07-13T16:58:39.981030815Z 
2026-07-13T16:59:22.615317666Z ==> Uploading build...
2026-07-13T17:02:59.022011942Z ==> Uploaded in 11.5s. Compression took 204.9s
2026-07-13T17:02:59.087177436Z ==> Build successful 🎉
2026-07-13T17:03:13.685949593Z ==> Deploying...
2026-07-13T17:03:13.767819742Z ==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
2026-07-13T17:03:36.577203692Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
2026-07-13T17:03:36.577207702Z     at Module.require (node:internal/modules/cjs/loader:1556:12)
2026-07-13T17:03:36.577211772Z     at require (node:internal/modules/helpers:152:16)
2026-07-13T17:03:36.577215922Z     at Object.<anonymous> (/opt/render/project/src/backend/dist/database/prisma.js:4:15)
2026-07-13T17:03:36.577220942Z 
2026-07-13T17:03:36.577225092Z Node.js v24.14.1
2026-07-13T17:03:42.453647126Z ==> Running 'node dist/server.js'
2026-07-13T17:03:43.859886099Z ◇ injected env (0) from .env // tip: ◈ encrypted .env [www.dotenvx.com]
2026-07-13T17:03:43.860787113Z /opt/render/project/src/backend/dist/config/env.js:13
2026-07-13T17:03:43.860798403Z         throw new Error(`Environment variable ${key} is required`);
2026-07-13T17:03:43.860801183Z         ^
2026-07-13T17:03:43.860803174Z 
2026-07-13T17:03:43.860805214Z Error: Environment variable FRONTEND_URL is required
2026-07-13T17:03:43.860807174Z     at requiredEnv (/opt/render/project/src/backend/dist/config/env.js:13:15)
2026-07-13T17:03:43.860809884Z     at Object.<anonymous> (/opt/render/project/src/backend/dist/config/env.js:47:7)
2026-07-13T17:03:43.860811734Z     at Module._compile (node:internal/modules/cjs/loader:1812:14)
2026-07-13T17:03:43.860813644Z     at Object..js (node:internal/modules/cjs/loader:1943:10)
2026-07-13T17:03:43.860815504Z     at Module.load (node:internal/modules/cjs/loader:1533:32)
2026-07-13T17:03:43.860817394Z     at Module._load (node:internal/modules/cjs/loader:1335:12)
2026-07-13T17:03:43.860822284Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
2026-07-13T17:03:43.860824244Z     at Module.require (node:internal/modules/cjs/loader:1556:12)
2026-07-13T17:03:43.860826204Z     at require (node:internal/modules/helpers:152:16)
2026-07-13T17:03:43.860830314Z     at Object.<anonymous> (/opt/render/project/src/backend/dist/database/prisma.js:4:15)
2026-07-13T17:03:43.860832894Z 
2026-07-13T17:03:43.860834864Z Node.js v24.14.1
2026-07-13T17:03:45.678110693Z ==> Exited with status 1
2026-07-13T17:03:45.685105403Z ==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
2026-07-13T17:03:59.72217265Z ==> Running 'node dist/server.js'
2026-07-13T17:04:00.928025585Z ◇ injected env (0) from .env // tip: ⌘ suppress logs { quiet: true }
2026-07-13T17:04:00.928829126Z /opt/render/project/src/backend/dist/config/env.js:13
2026-07-13T17:04:00.928840997Z         throw new Error(`Environment variable ${key} is required`);
2026-07-13T17:04:00.928844087Z         ^
2026-07-13T17:04:00.928846397Z 
2026-07-13T17:04:00.928848667Z Error: Environment variable FRONTEND_URL is required
2026-07-13T17:04:00.928851237Z     at requiredEnv (/opt/render/project/src/backend/dist/config/env.js:13:15)
2026-07-13T17:04:00.928854207Z     at Object.<anonymous> (/opt/render/project/src/backend/dist/config/env.js:47:7)
2026-07-13T17:04:00.928856657Z     at Module._compile (node:internal/modules/cjs/loader:1812:14)
2026-07-13T17:04:00.928858947Z     at Object..js (node:internal/modules/cjs/loader:1943:10)
2026-07-13T17:04:00.928861607Z     at Module.load (node:internal/modules/cjs/loader:1533:32)
2026-07-13T17:04:00.928863977Z     at Module._load (node:internal/modules/cjs/loader:1335:12)
2026-07-13T17:04:00.928866207Z     at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
2026-07-13T17:04:00.928868397Z     at Module.require (node:internal/modules/cjs/loader:1556:12)
2026-07-13T17:04:00.928870708Z     at require (node:internal/modules/helpers:152:16)
2026-07-13T17:04:00.928872957Z     at Object.<anonymous> (/opt/render/project/src/backend/dist/database/prisma.js:4:15)
2026-07-13T17:04:00.928876097Z 
2026-07-13T17:04:00.928878518Z Node.js v24.14.1