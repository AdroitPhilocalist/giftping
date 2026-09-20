import { signInWithGoogleAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";

// theme-safe: the four Google brand colours are fixed by Google's branding guidelines and must not follow a theme
const GOOGLE = { blue: "#4285F4", green: "#34A853", yellow: "#FBBC05", red: "#EA4335" }; // theme-safe: same reason

export function GoogleButton() {
  return (
    <form action={signInWithGoogleAction}>
      <Button type="submit" variant="secondary" className="w-full">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill={GOOGLE.blue}
            d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
          />
          <path
            fill={GOOGLE.green}
            d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
          />
          <path fill={GOOGLE.yellow} d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1Z" />
          <path
            fill={GOOGLE.red}
            d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
          />
        </svg>
        Continue with Google
      </Button>
    </form>
  );
}
