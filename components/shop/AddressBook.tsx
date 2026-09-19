"use client";

import { useState, useTransition } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { AddressForm } from "@/components/shop/AddressForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { deleteAddressAction, setDefaultAddressAction } from "@/lib/account/address-actions";
import type { SavedAddress } from "@/lib/db/addresses";
import { cn } from "@/lib/utils/cn";

/**
 * Lists saved addresses with add / edit / delete / set-default. With `selectedId` + `onSelect` it doubles as
 * the delivery-address picker on checkout; without them it's the plain manager on /account/addresses.
 */
export function AddressBook({
  addresses,
  selectedId,
  onSelect,
}: {
  addresses: SavedAddress[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length === 0 ? "new" : null);
  const [isPending, startTransition] = useTransition();
  const selectable = Boolean(onSelect);

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteAddressAction(id);
      if (result.error) toast.error(result.error);
    });
  }

  function makeDefault(id: string) {
    startTransition(async () => {
      const result = await setDefaultAddressAction(id);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {addresses.map((address) => {
        const isSelected = selectable && selectedId === address.id;
        if (editing === address.id) {
          return (
            <AddressForm
              key={address.id}
              address={address}
              onSaved={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          );
        }
        return (
          <div
            key={address.id}
            className={cn(
              "flex gap-3 rounded-2xl border p-4",
              isSelected ? "border-brand-primary bg-brand-primary/5" : "border-brand-dark/10 bg-white",
              isPending && "opacity-60",
            )}
          >
            {selectable ? (
              <input
                type="radio"
                name="deliveryAddress"
                aria-label={`Deliver to ${address.recipient_name}, ${address.address_line1}`}
                checked={isSelected}
                onChange={() => onSelect?.(address.id)}
                className="mt-1 h-4 w-4 accent-brand-primary"
              />
            ) : (
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-dark" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-brand-dark">{address.recipient_name}</span>
                {address.label ? <Badge>{address.label}</Badge> : null}
                {address.is_default ? <Badge variant="gold">Default</Badge> : null}
              </div>
              <p className="mt-1 text-brand-dark/70">
                {[address.address_line1, address.address_line2, address.landmark].filter(Boolean).join(", ")}
              </p>
              <p className="text-brand-dark/70">
                {address.city}, {address.state} — {address.pincode}
              </p>
              <p className="text-brand-dark/60">Mobile: {address.phone}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <button type="button" onClick={() => setEditing(address.id)} className="flex items-center gap-1 text-brand-dark/60 hover:text-brand-primary">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                {address.is_default ? null : (
                  <button type="button" onClick={() => makeDefault(address.id)} className="text-brand-dark/60 hover:text-brand-primary">
                    Make default
                  </button>
                )}
                <button type="button" onClick={() => remove(address.id)} className="flex items-center gap-1 text-brand-dark/50 hover:text-red-700">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {editing === "new" ? (
        <AddressForm
          isFirst={addresses.length === 0}
          onSaved={(id) => {
            setEditing(null);
            onSelect?.(id);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          Add a new address
        </Button>
      )}
    </div>
  );
}
