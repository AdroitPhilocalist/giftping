"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { confirmPaymentAction, startPaymentAction } from "@/lib/commerce/payment-actions";
import { formatCurrency } from "@/lib/utils/format";

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", cb: (r: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(true));
    script.addEventListener("error", () => resolve(false));
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

/**
 * The amount charged is whatever the SERVER stored on the order when it was placed — this component only ever
 * sends an order id. The webhook is what actually completes the order; this button's callback is a fast path,
 * so after a successful payment it also polls the page a few times in case the webhook lands first or a little later.
 */
export function PayNowButton({ orderId, total, enabled }: { orderId: string; total: number; enabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const polls = useRef(0);

  useEffect(() => {
    if (!confirming) return;
    const timer = setInterval(() => {
      polls.current += 1;
      router.refresh();
      if (polls.current >= 10) {
        clearInterval(timer);
        setConfirming(false);
        toast("Still confirming your payment — this page will update once it's done. You won't be charged twice.");
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [confirming, router]);

  function pay() {
    startTransition(async () => {
      const started = await startPaymentAction(orderId);
      if (!started.ok) {
        toast.error(started.error);
        router.refresh();
        return;
      }
      if (!(await loadRazorpayScript()) || !window.Razorpay) {
        toast.error("Couldn't load the payment window. Check your connection and try again.");
        return;
      }

      const checkout = new window.Razorpay({
        key: started.keyId,
        order_id: started.razorpayOrderId,
        amount: started.amountPaise,
        currency: "INR",
        name: "GiftPing",
        description: `Order ${started.orderNumber}`,
        prefill: { name: started.name, email: started.email },
        // the payment window is a third-party page, so it needs a literal colour: read the ACTIVE theme's primary colour
        theme: { color: getComputedStyle(document.documentElement).getPropertyValue("--gp-primary").trim() || "#0c2a1d" }, // theme-safe: fallback only
        handler: async (response: RazorpaySuccess) => {
          setConfirming(true);
          const result = await confirmPaymentAction({
            orderId,
            razorpayOrderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
          if (!result.ok) {
            toast.error(result.error);
            return; // keep polling: the webhook may still confirm it
          }
          if (result.status === "pending") return; // polling continues until the webhook/callback lands
          setConfirming(false);
          router.refresh();
        },
        modal: { ondismiss: () => toast("Payment window closed — you haven't been charged.") },
      });
      checkout.on("payment.failed", (r) => toast.error(r.error?.description ?? "Payment failed. You can try again."));
      checkout.open();
    });
  }

  if (confirming) {
    return (
      <p role="status" className="rounded-xl bg-brand-primary/5 p-4 text-sm text-brand-primary">
        Confirming your payment… please don&apos;t close this page.
      </p>
    );
  }

  return (
    <div>
      <Button className="w-full sm:w-auto" size="lg" disabled={!enabled || isPending} onClick={pay}>
        <Lock className="h-4 w-4" />
        {isPending ? "Opening secure payment…" : `Pay ${formatCurrency(total)}`}
      </Button>
      {enabled ? (
        <p className="mt-2 text-xs text-brand-dark/50">Secure payment by Razorpay — UPI, cards, netbanking and wallets.</p>
      ) : (
        <p className="mt-2 text-xs text-brand-dark/60">Online payments aren&apos;t switched on yet. Your order is saved.</p>
      )}
    </div>
  );
}
