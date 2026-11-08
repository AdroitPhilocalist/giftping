"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { BookHeart, LogOut, Package, User } from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/lib/auth/actions";
import { pushLogout } from "@/lib/push/client";
import type { SessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";

const initialOf = (name: string) => (name.trim().charAt(0) || "?").toUpperCase();

/** The row layout every item shares (icon roundel + label) — deliberately just a fragment: the highlight-on-hover background has to live on whichever
 * element actually receives Radix's `data-highlighted` (the Item itself, or — via `asChild` — the Link it wraps), not on a span nested inside it. */
function Row({ icon: Icon, children, roundel = "bg-brand-accent text-brand-secondary-dark" }: { icon: typeof User; children: ReactNode; roundel?: string }) {
  return (
    <>
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", roundel)}>
        <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      </span>
      {children}
    </>
  );
}

const itemClass = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-brand-dark outline-none transition-colors data-[highlighted]:bg-brand-accent/70";

/**
 * The account avatar's dropdown: who you are (an initial roundel, name, email), the places you go most, and sign out set apart at the bottom. A bespoke
 * Radix menu (not the generic ui/Dropdown — this one deserves its own presence, the same way the notification bell already has its own) so the header's one
 * truly personal menu doesn't read as an afterthought copied from an admin table's row actions.
 */
export function AccountMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Account menu"
          className="group flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-brand-on-primary/85 transition-colors hover:bg-brand-on-primary/12 hover:text-brand-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-light"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-on-primary/15 text-xs font-semibold text-brand-on-primary ring-1 ring-inset ring-brand-on-primary/25 transition-colors group-hover:bg-brand-secondary group-hover:text-brand-on-secondary group-hover:ring-brand-secondary">
            {initialOf(user.fullName)}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={12} className="gp-menu-pop z-50 w-64 rounded-[1.4rem] border border-brand-dark/[0.07] bg-brand-surface p-2 shadow-lift focus:outline-none">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-secondary text-sm font-semibold text-brand-on-secondary">
              {initialOf(user.fullName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-brand-dark">{user.fullName}</span>
              <span className="block truncate text-xs text-brand-dark/50">{user.email}</span>
            </span>
          </div>

          <div className="my-1.5 h-px bg-brand-dark/[0.07]" />

          <DropdownMenu.Item asChild><Link href="/account" className={itemClass}><Row icon={User}>My Account</Row></Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild><Link href="/orders" className={itemClass}><Row icon={Package}>My Orders</Row></Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild><Link href="/diary" className={itemClass}><Row icon={BookHeart}>My Diary</Row></Link></DropdownMenu.Item>

          <div className="my-1.5 h-px bg-brand-dark/[0.07]" />

          {/*
            Deliberately not a <button type="submit"> inside a <form>: Radix's DropdownMenu.Item
            intercepts the click for its own selection/close handling and never lets it reach a
            nested form's native submit — confirmed by hand-testing (the cookie survived the
            click). onSelect calling the server action directly is the correct pattern here.
          */}
          <DropdownMenu.Item
            className={cn(itemClass, "cursor-pointer text-red-700 data-[highlighted]:bg-red-50")}
            onSelect={async () => {
              await pushLogout(); // unlink this browser from the user before the session ends
              await signOutAction();
            }}
          >
            <Row icon={LogOut} roundel="bg-red-50 text-red-600">Sign Out</Row>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
