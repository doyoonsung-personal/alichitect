// Build-time switch for the things that exist only to test and demonstrate the app: window.__ab (the store and
// controller), the ?replay= and ?speed= URL switches, the whole recorded-session library, and the routing log.
// vite.config.ts defines __AB_TOOLS__: true for `vite` (development) and `vite build --mode review` (the screenshot and
// check scripts), false for the production build that the Worker serves (`npm run build`). In production the flag is a
// literal false, so every branch behind it is removed from the bundle. Outside Vite (node --test) there is no define
// and the tools are on.
export const TOOLS: boolean = typeof __AB_TOOLS__ === 'undefined' ? true : __AB_TOOLS__;
