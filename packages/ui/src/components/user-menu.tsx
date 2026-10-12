// Account menu: who you are, settings, sign out. Navigation comes in as callbacks (portable).
import { GearSixIcon, SignOutIcon, TrashIcon } from "@phosphor-icons/react";

import { PRESS_ACTIVE, RAISED_LIGHT } from "../lib/tactile.ts";
import { cn } from "../lib/utils.ts";
import { MenuContent, type MenuContainer, MenuGroup, MenuGroupLabel, MenuItem, MenuRoot, MenuSeparator, MenuTrigger } from "./menu.tsx";

type UserMenuProps = {
  email: string;
  onTrash: () => void;
  onSettings: () => void;
  onSignOut: () => void;
  container?: MenuContainer;
};

export function UserMenu({ email, onTrash, onSettings, onSignOut, container }: UserMenuProps) {
  return (
    <MenuRoot>
      <MenuTrigger
        aria-label={`Account: ${email}`}
        className={cn(
          "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-sky font-heading text-sm font-bold text-ink uppercase outline-hidden select-none",
          "transition-[box-shadow,transform] duration-200 ease-tactile motion-reduce:transition-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring",
          RAISED_LIGHT,
          PRESS_ACTIVE,
        )}
      >
        {email.charAt(0)}
      </MenuTrigger>
      <MenuContent align="start" container={container}>
        <MenuGroup>
          <MenuGroupLabel>
            Signed in as
            <span className="block truncate text-sm font-medium text-foreground">{email}</span>
          </MenuGroupLabel>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem onClick={onTrash}>
          <TrashIcon weight="bold" aria-hidden />
          Trash
        </MenuItem>
        <MenuItem onClick={onSettings}>
          <GearSixIcon weight="bold" aria-hidden />
          Settings
        </MenuItem>
        <MenuItem onClick={onSignOut}>
          <SignOutIcon weight="bold" aria-hidden />
          Sign out
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  );
}
