"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from "@/components/ui/Dropdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Tooltip } from "@/components/ui/Tooltip";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";

export default function KitchenSinkPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl text-brand-dark">Component Library</h1>

      <Card className="space-y-3">
        <h2 className="font-heading text-lg">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="gold">Gold</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-heading text-lg">Form fields</h2>
        <div>
          <Label htmlFor="name">Recipient name</Label>
          <Input id="name" placeholder="Enter name" />
        </div>
        <div>
          <Label htmlFor="occasion">Occasion</Label>
          <Select id="occasion" defaultValue="">
            <option value="" disabled>
              Choose an occasion
            </option>
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="message">Gift message</Label>
          <Textarea id="message" placeholder="Write your message here..." />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-heading text-lg">Badges</h2>
        <div className="flex gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="gold">18% OFF</Badge>
          <Badge variant="primary">GiftPing Originals</Badge>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-heading text-lg">Tabs</h2>
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="history">Gift History</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">Upcoming occasions content.</TabsContent>
          <TabsContent value="history">Gift history content.</TabsContent>
          <TabsContent value="wishlist">Wishlist content.</TabsContent>
        </Tabs>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-heading text-lg">Overlays</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Add a Personal Note"
            description="This is the Stage 0 Modal primitive."
          >
            <Textarea placeholder="Write your message here..." />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setModalOpen(false)}>Save</Button>
            </div>
          </Modal>

          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="secondary">Open Dropdown</Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem>Edit Profile</DropdownItem>
              <DropdownItem>Settings</DropdownItem>
              <DropdownItem>Sign Out</DropdownItem>
            </DropdownContent>
          </Dropdown>

          <Tooltip label="This is a tooltip">
            <Button variant="ghost">Hover me</Button>
          </Tooltip>

          <Button variant="secondary" onClick={() => toast("Saved to your Gifting Diary")}>
            Fire Toast
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-heading text-lg">Loading states</h2>
        <div className="flex items-center gap-4">
          <Spinner />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Card>
    </div>
  );
}
