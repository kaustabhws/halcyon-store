"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateProfileAction,
  changePasswordAction,
  type ProfileFormState,
} from "@/lib/profile-actions";

export function ProfileForm({
  defaults,
}: {
  defaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    marketingOptIn: boolean;
  };
}) {
  const [state, action, pending] = useActionState<
    ProfileFormState | undefined,
    FormData
  >(updateProfileAction, undefined);

  React.useEffect(() => {
    if (state?.ok) toast.success("Profile updated");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          name="firstName"
          defaultValue={defaults.firstName}
          autoComplete="given-name"
          error={state?.fieldErrors?.firstName?.[0]}
        />
        <Field
          label="Last name"
          name="lastName"
          defaultValue={defaults.lastName}
          autoComplete="family-name"
          error={state?.fieldErrors?.lastName?.[0]}
        />
      </div>
      <Field
        label="Email"
        name="email"
        type="email"
        defaultValue={defaults.email}
        autoComplete="email"
        disabled
        hint="Email changes need to go through support for now."
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        defaultValue={defaults.phone}
        autoComplete="tel"
        error={state?.fieldErrors?.phone?.[0]}
      />

      <Label className="flex items-start gap-3 rounded-md border p-3 font-normal">
        <Checkbox
          name="marketingOptIn"
          defaultChecked={defaults.marketingOptIn}
          className="mt-0.5"
        />
        <span className="text-sm">
          <span className="font-medium">Marketing emails</span>
          <span className="block text-xs text-muted-foreground">
            New drops, restocks, and sale announcements. No spam.
          </span>
        </span>
      </Label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<
    ProfileFormState | undefined,
    FormData
  >(changePasswordAction, undefined);

  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Password changed");
      formRef.current?.reset();
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.currentPassword?.[0]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state?.fieldErrors?.newPassword?.[0]}
          hint="At least 8 characters, a letter, and a number."
        />
        <Field
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state?.fieldErrors?.confirmPassword?.[0]}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
  required,
  disabled,
  hint,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
      />
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
