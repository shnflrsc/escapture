"use client";

import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/client-api";

type Errors = { name?: string; email?: string; password?: string; form?: string };

/** The administrator's "Create a reviewer account" panel. */
export function ReviewerForm() {
  const router = useRouter();
  const toast = useToast();
  const id = useId();
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const body = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    };
    if (body.password.length < 8) return setErrors({ password: "Use at least 8 characters." });
    setLoading(true);
    setErrors({});
    try {
      await api("/api/admin/reviewers", { body });
      form.reset();
      setShow(false);
      toast("Reviewer account created");
      router.refresh();
    } catch (err) {
      const message = errorMessage(err);
      // The server says which field is wrong; put the sentence under it.
      const field = /^(name|email|password): /.exec(message)?.[1] as keyof Errors | undefined;
      if (err instanceof ApiError && err.status === 409) setErrors({ email: message });
      else if (field) setErrors({ [field]: message.replace(/^\w+: /, "") });
      else setErrors({ form: message });
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {errors.form && <Banner tone="attention">{errors.form}</Banner>}
      <Input label="Full name" name="name" autoComplete="off" required maxLength={80} error={errors.name} />
      <Input
        label="University email"
        name="email"
        type="email"
        autoComplete="off"
        required
        error={errors.email}
        hint="Use the reviewer's bulsu.edu.ph address."
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm leading-5 font-semibold text-ink">
          Temporary password
        </label>
        <div className="relative">
          <input
            id={id}
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={`${id}-note`}
            className={`h-[var(--control-h)] w-full rounded-md border bg-card pr-12 pl-3 text-base text-ink ${errors.password ? "border-danger-fg" : "border-border-strong"}`}
          />
          <button
            type="button"
            aria-label={show ? "Hide the password" : "Show the password"}
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-brand-50 hover:text-brand-800"
          >
            {show ? <EyeOff size={18} strokeWidth={1.75} aria-hidden /> : <Eye size={18} strokeWidth={1.75} aria-hidden />}
          </button>
        </div>
        {errors.password ? (
          <p id={`${id}-note`} role="alert" className="flex items-start gap-1 text-[13px] leading-[18px] text-danger-fg">
            <CircleAlert size={16} strokeWidth={1.75} aria-hidden className="mt-px shrink-0" />
            {errors.password}
          </p>
        ) : (
          <p id={`${id}-note`} className="text-[13px] leading-[18px] text-muted">
            At least 8 characters. Share the temporary password with the reviewer in person or through your
            office&apos;s usual channel.
          </p>
        )}
      </div>
      <p className="rounded-xl bg-brand-50 p-4 text-sm leading-[22px]">
        Reviewers can see every escalated case on the shared Review Board, including who reported it and every
        collaborator.
      </p>
      <Button type="submit" loading={loading}>
        Create reviewer account
      </Button>
    </form>
  );
}
