/**
 * Script-tag entry for the extension chunk. Built to public/t-x.js; reads the
 * context the core stashed on window.__ws and starts the shared implementation.
 */
import { startExtension, type ExtensionCtx } from "./x";

startExtension((window as unknown as { __ws?: ExtensionCtx }).__ws);
