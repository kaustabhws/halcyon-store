"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addAddressAction,
  type AddressFormState,
} from "@/lib/address-actions";

export function AddAddressForm() {
  const [state, action, pending] = useActionState<
    AddressFormState | undefined,
    FormData
  >(addAddressAction, undefined);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Address saved");
      formRef.current?.reset();
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-4 grid gap-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-900 sm:grid-cols-2"
    >
      <Field
        name="fullName"
        label="Full name"
        autoComplete="name"
        required
        className="sm:col-span-2"
        error={state?.fieldErrors?.fullName?.[0]}
      />
      <Field
        name="line1"
        label="Address line 1"
        autoComplete="address-line1"
        required
        className="sm:col-span-2"
        error={state?.fieldErrors?.line1?.[0]}
      />
      <Field
        name="line2"
        label="Address line 2 (optional)"
        autoComplete="address-line2"
        className="sm:col-span-2"
        error={state?.fieldErrors?.line2?.[0]}
      />
      <Field
        name="city"
        label="City"
        autoComplete="address-level2"
        required
        error={state?.fieldErrors?.city?.[0]}
      />
      <Field
        name="state"
        label="State"
        autoComplete="address-level1"
        required
        error={state?.fieldErrors?.state?.[0]}
      />
      <Field
        name="postalCode"
        label="PIN code"
        autoComplete="postal-code"
        inputMode="numeric"
        pattern="\d{6}"
        required
        error={state?.fieldErrors?.postalCode?.[0]}
      />
      <Field
        name="phone"
        label="Phone (optional)"
        autoComplete="tel"
        inputMode="tel"
        error={state?.fieldErrors?.phone?.[0]}
      />
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save address"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  autoComplete,
  inputMode,
  pattern,
  required,
  className,
  error,
}: {
  name: string;
  label: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel";
  pattern?: string;
  required?: boolean;
  className?: string;
  error?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        required={required}
        aria-invalid={Boolean(error)}
        className="mt-1.5"
      />
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
