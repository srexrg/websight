/**
 * Tree-shakeable icon map for landing page icons.
 * Imports ONLY the icons needed - do NOT `import * as` Phosphor.
 * Each key matches the short name used in content.ts (e.g. "broadcast").
 */

import { Broadcast } from "@phosphor-icons/react/dist/ssr/Broadcast";
import { GlobeHemisphereWest } from "@phosphor-icons/react/dist/ssr/GlobeHemisphereWest";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { Feather } from "@phosphor-icons/react/dist/ssr/Feather";
import { Target } from "@phosphor-icons/react/dist/ssr/Target";
import { FunnelSimple } from "@phosphor-icons/react/dist/ssr/FunnelSimple";
import { Cube } from "@phosphor-icons/react/dist/ssr/Cube";
import { Stack } from "@phosphor-icons/react/dist/ssr/Stack";
import { Cloud } from "@phosphor-icons/react/dist/ssr/Cloud";
import { AnchorSimple } from "@phosphor-icons/react/dist/ssr/AnchorSimple";
import { Infinity } from "@phosphor-icons/react/dist/ssr/Infinity";
import { Leaf } from "@phosphor-icons/react/dist/ssr/Leaf";
import { CursorClick } from "@phosphor-icons/react/dist/ssr/CursorClick";

export type IconKey =
  | "broadcast"
  | "globe-hemisphere-west"
  | "shield-check"
  | "feather"
  | "target"
  | "funnel-simple"
  | "cube"
  | "stack"
  | "cloud"
  | "anchor-simple"
  | "infinity"
  | "leaf"
  | "cursor-click";

export const iconMap: Record<IconKey, React.ElementType> = {
  "broadcast": Broadcast,
  "globe-hemisphere-west": GlobeHemisphereWest,
  "shield-check": ShieldCheck,
  "feather": Feather,
  "target": Target,
  "funnel-simple": FunnelSimple,
  "cube": Cube,
  "stack": Stack,
  "cloud": Cloud,
  "anchor-simple": AnchorSimple,
  "infinity": Infinity,
  "leaf": Leaf,
  "cursor-click": CursorClick,
};
