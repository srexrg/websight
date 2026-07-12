/**
 * Script-tag entry for the replay chunk. Built to public/t-r.js; reads the
 * boot config the core stashed on window.__wsr and starts the recorder.
 */
import { startReplay, type ReplayBoot } from "./replay";

startReplay((window as unknown as { __wsr?: ReplayBoot }).__wsr);
