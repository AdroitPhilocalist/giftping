"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from "@/components/ui/Dropdown";
import { signOutAction } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/session";

export function AccountMenu({ user }: { user: SessionUser }) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-full p-2 text-brand-dark/70 hover:bg-brand-dark/5"
        >
          <User className="h-5 w-5" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="end">
        <div className="px-3 py-2 text-sm">
          <p className="font-medium text-brand-dark">{user.fullName}</p>
          <p className="truncate text-brand-dark/50">{user.email}</p>
        </div>
        <DropdownItem asChild>
          <Link href="/account">My Account</Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/diary">My Diary</Link>
        </DropdownItem>
        {user.role === "vendor" ? (
          <DropdownItem asChild>
            <Link href="/vendor/dashboard">Vendor Dashboard</Link>
          </DropdownItem>
        ) : null}
        {user.role === "admin" ? (
          <DropdownItem asChild>
            <Link href="/admin/dashboard">Admin Dashboard</Link>
          </DropdownItem>
        ) : null}
        {/*
          Deliberately not a <button type="submit"> inside a <form>: Radix's DropdownMenu.Item
          intercepts the click for its own selection/close handling and never lets it reach a
          nested form's native submit — confirmed by hand-testing (the cookie survived the
          click). onSelect calling the server action directly is the correct pattern here.
        */}
        <DropdownItem onSelect={() => signOutAction()}>Sign Out</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
