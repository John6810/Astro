/// <reference types="astro/client" />

// Fontsource ships CSS-only side-effect imports without type declarations.
// TS 6.0 + bundler module resolution requires this shim.
declare module "@fontsource-variable/*";
declare module "@fontsource/*";
