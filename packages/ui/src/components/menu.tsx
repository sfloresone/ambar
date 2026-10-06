// The one menu look for every platform: thin wrappers over Base UI Menu (roles, arrow keys, typeahead,
// focus return, collision-aware positioning, portal). Surface matches the header pill: cloud glass,
// hairline, short shadow. Build menus from these, never from scratch.
import { Menu } from "@base-ui/react/menu";
import type { ComponentProps, ReactNode, RefObject } from "react";

import { cn } from "../lib/utils.ts";

export const MenuRoot = Menu.Root;

export const MenuTrigger = Menu.Trigger;

export const MenuGroup = Menu.Group;

/** Where the popup mounts. Pass the landmark the trigger lives in (e.g. the header), so the open menu
 * stays inside it for assistive tech; without it, the popup mounts on <body>. */
export type MenuContainer = RefObject<HTMLElement | null>;

type MenuContentProps = {
  children: ReactNode;
  container?: MenuContainer;
  align?: "start" | "center" | "end";
  className?: string;
};

export function MenuContent({ children, container, align = "start", className }: MenuContentProps) {
  return (
    <Menu.Portal container={container}>
      <Menu.Positioner sideOffset={10} align={align} collisionPadding={12} className="z-50 outline-hidden">
        <Menu.Popup
          className={cn(
            "min-w-60 origin-(--transform-origin) rounded-2xl border border-ink/5 bg-cloud/95 p-1.5 text-foreground outline-hidden",
            "shadow-[0_0_0_1px_rgb(20_20_20/0.03),0_2px_4px_rgb(20_20_20/0.06),0_12px_32px_rgb(20_20_20/0.1)]",
            "supports-[backdrop-filter]:bg-cloud/85 supports-[backdrop-filter]:backdrop-blur-xl",
            "transition-[opacity,scale] duration-150 ease-out-soft motion-reduce:transition-none",
            "data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className,
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

const ITEM =
  "flex cursor-default items-center gap-3 rounded-xl px-3 py-2 text-sm outline-hidden select-none data-highlighted:bg-ink/5 data-disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0";

export function MenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return <Menu.Item className={cn(ITEM, className)} {...props} />;
}

export function MenuLinkItem({ className, ...props }: ComponentProps<typeof Menu.LinkItem>) {
  return <Menu.LinkItem className={cn(ITEM, className)} {...props} />;
}

export function MenuGroupLabel({ className, ...props }: ComponentProps<typeof Menu.GroupLabel>) {
  return <Menu.GroupLabel className={cn("px-3 pt-2 pb-1 text-xs text-muted-foreground", className)} {...props} />;
}

export function MenuSeparator({ className }: { className?: string }) {
  return <Menu.Separator className={cn("mx-2 my-1.5 h-px bg-ink/8", className)} />;
}
