import { Button } from "@/components/ui/button";
import { googleLoginAction } from "@/lib/auth-actions";

export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={googleLoginAction}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button type="submit" variant="outline" size="lg" className="w-full">
        <GoogleIcon /> Continue with Google
      </Button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.5-4.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13.5 24 13.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5c-7.7 0-14.4 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 45.5c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.4c-2 1.4-4.6 2.4-7.7 2.4-5.3 0-9.7-3.4-11.3-8L6 33.7c3.2 6.7 9.9 11.8 18 11.8z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.6 5.4c-.5.4 7-5.1 7-15.5 0-1.5-.2-3-.5-4.5z" />
    </svg>
  );
}
