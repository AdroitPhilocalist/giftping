"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { saveBannerAction } from "@/lib/admin/banner-actions";
import { bannerSchema } from "@/lib/validation/banner.schema";

export interface BannerFormValues {
  id?: string;
  headline: string;
  subheading: string;
  ctaText: string;
  ctaUrl: string;
  altText: string;
  audience: "all" | "customer" | "vendor";
  startsOn: string;
  endsOn: string;
  isActive: boolean;
  /** the image already saved on this banner (edit) */
  imageUrl?: string;
}

const EMPTY: BannerFormValues = { headline: "", subheading: "", ctaText: "", ctaUrl: "", altText: "", audience: "all", startsOn: "", endsOn: "", isActive: true };
const MAX_BYTES = 4 * 1024 * 1024;

export function BannerDialog({ initial }: { initial?: BannerFormValues }) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BannerFormValues>(initial ?? EMPTY);
  const [imagePath, setImagePath] = useState<string | null>(null); // a NEW upload, waiting to be saved
  const [preview, setPreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof BannerFormValues>(k: K, v: BannerFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) return setError("That image is larger than 4MB — export it a little smaller.");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload-banner", { method: "POST", body });
      const json = (await response.json().catch(() => ({}))) as { path?: string; previewUrl?: string; error?: string };
      if (!response.ok || !json.path) return setError(json.error ?? "Upload failed.");
      setImagePath(json.path);
      setPreview(json.previewUrl ?? null);
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editing && !imagePath) return setError("Add an image.");
    const { id: _id, imageUrl: _imageUrl, ...rest } = form;
    void _id; void _imageUrl;
    const payload = { ...rest, imagePath };
    const parsed = bannerSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the details.");
    startTransition(async () => {
      const result = await saveBannerAction(payload, form.id);
      if (result.error) return setError(result.error);
      toast.success(editing ? "Banner saved." : "Banner created.");
      setOpen(false);
      if (!editing) { setForm(EMPTY); setImagePath(null); setPreview(null); }
      else setImagePath(null);
      router.refresh();
    });
  }

  const field = (label: string, id: string, node: React.ReactNode, hint?: string) => (
    <div><Label htmlFor={id}>{label}</Label>{node}{hint ? <p className="mt-1 text-xs text-brand-dark/50">{hint}</p> : null}</div>
  );

  return (
    <>
      {editing ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs text-brand-primary underline">Edit</button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New banner</Button>
      )}
      <Modal open={open} onOpenChange={setOpen} title={editing ? "Edit banner" : "New banner"} className="max-w-lg">
        <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <Label htmlFor="bn-file">Image</Label>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="mt-1 flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-brand-dark/25 bg-brand-accent/40 text-sm text-brand-dark/60 hover:bg-brand-accent"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- an admin-side preview of a just-uploaded file
                <img src={preview} alt="Banner preview" className="h-full w-full object-cover" />
              ) : (
                <span className="flex items-center gap-2"><ImagePlus className="h-5 w-5" /> {uploading ? "Uploading…" : "Choose an image"}</span>
              )}
            </button>
            <input ref={fileInput} id="bn-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            <p className="mt-1 text-xs text-brand-dark/50">{uploading ? "Uploading…" : "Wide image, about 16:7 (1920×840 is ideal), JPEG/PNG/WebP up to 4MB. Click the picture to change it."}</p>
          </div>
          {field("Headline", "bn-head", <Input id="bn-head" value={form.headline} maxLength={80} onChange={(e) => set("headline", e.target.value)} placeholder="Festive gifting is here" />, "Shown over the image. Leave blank if the image already says it.")}
          {field("Sub-heading", "bn-sub", <Textarea id="bn-sub" value={form.subheading} maxLength={200} onChange={(e) => set("subheading", e.target.value)} />)}
          <div className="grid grid-cols-2 gap-3">
            {field("Button text", "bn-cta", <Input id="bn-cta" value={form.ctaText} maxLength={30} onChange={(e) => set("ctaText", e.target.value)} placeholder="Shop now" />)}
            {field("Link", "bn-url", <Input id="bn-url" value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/categories/birthday" />, "A page on this site or an https:// link. The whole banner links there.")}
          </div>
          {field("Picture description (for screen readers)", "bn-alt", <Input id="bn-alt" value={form.altText} maxLength={160} onChange={(e) => set("altText", e.target.value)} placeholder="Describe what's in the picture" />, "Blank uses the headline.")}
          <div className="grid grid-cols-2 gap-3">
            {field("Shown to", "bn-aud", <Select id="bn-aud" value={form.audience} onChange={(e) => set("audience", e.target.value as BannerFormValues["audience"])}><option value="all">Everyone</option><option value="customer">Shoppers</option><option value="vendor">Vendors only</option></Select>)}
            <span />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Starts", "bn-from", <Input id="bn-from" type="date" value={form.startsOn} onChange={(e) => set("startsOn", e.target.value)} />, "Blank = right away.")}
            {field("Ends (inclusive)", "bn-until", <Input id="bn-until" type="date" value={form.endsOn} onChange={(e) => set("endsOn", e.target.value)} />, "Blank = until you pause it.")}
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-dark/70"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-brand-primary" /> Active</label>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" size="sm" disabled={pending || uploading}>{pending ? "Saving…" : editing ? "Save" : "Create banner"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
