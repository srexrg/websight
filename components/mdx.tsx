import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tabs, Tab } from "fumadocs-ui/components/tabs";
import { Steps, Step } from "fumadocs-ui/components/steps";
import { Callout } from "fumadocs-ui/components/callout";
import { Cards, Card } from "fumadocs-ui/components/card";
import { Accordions, Accordion } from "fumadocs-ui/components/accordion";
import type { ImgHTMLAttributes } from "react";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tabs,
    Tab,
    Steps,
    Step,
    Callout,
    Cards,
    Card,
    Accordions,
    Accordion,
    // Screenshots live in public/ without known dimensions, so use a plain
    // <img> instead of next/image.
    img: (props: ImgHTMLAttributes<HTMLImageElement>) => (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- screenshots have no known dimensions for next/image; alt comes from MDX props
      <img
        loading="lazy"
        className="rounded-xl border border-fd-border"
        {...props}
      />
    ),
    ...components,
    // Cast: @types/mdx v2 + React 19 make defaultMdxComponents structurally
    // incompatible with MDXComponents (Component<never> on the index signature).
    // The runtime shape is correct; this only silences that bivariance mismatch.
  } as MDXComponents;
}

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return getMDXComponents(components);
}

declare global {
  type MDXProvidedComponents = MDXComponents;
}
