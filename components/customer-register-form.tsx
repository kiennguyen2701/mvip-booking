"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

export default function CustomerRegisterForm({
  initialRefCode,
}: {
  initialRefCode?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [pending, startTransition] = useTransition();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    whatsapp: "",
    refCode: initialRefCode || "",
  });

  useEffect(() => {
    if (initialRefCode) {
      saveRefCode(initialRefCode);

      setForm((prev) => ({
        ...prev,
        refCode: initialRefCode,
      }));
    }
  }, [initialRefCode]);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function saveRefCode(refCode: string) {
    const cleanRef = refCode.trim().toUpperCase();

    if (!cleanRef) return;

    try {
      localStorage.setItem("agent_ref", cleanRef);
      sessionStorage.setItem("agent_ref", cleanRef);

      document.cookie = `mvip_ref_code=${encodeURIComponent(
        cleanRef,
      )}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

      document.cookie = `ref_code=${encodeURIComponent(
        cleanRef,
      )}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    } catch (error) {
      console.error("SAVE_REF_ERROR:", error);
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        if (form.refCode) {
          saveRefCode(form.refCode);
        }

        const response = await fetch("/api/customer-register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Registration failed.");
          return;
        }

        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
          });

        if (loginError) {
          console.error("AUTO_LOGIN_ERROR:", loginError);

          setSuccess(
            "Account created successfully. Please login to continue.",
          );

          router.replace(
            `/login?registered=1&email=${encodeURIComponent(
              form.email,
            )}`,
          );

          router.refresh();
          return;
        }

        setSuccess(
          "Account created successfully. Redirecting...",
        );

        router.replace("/dashboard/customer");
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Registration failed.");
      }
    });
  }

  return (
    <section className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-7">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-300 to-yellow-600 text-2xl text-slate-950 shadow-xl shadow-amber-950/30">
          ♛
        </div>

        <h1 className="mt-5 text-4xl font-black text-white">
          Create Customer Account
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Register to book premium restaurants with Mvip
          benefits.
        </p>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
          {success}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          value={form.fullName}
          onChange={(event) =>
            updateField("fullName", event.target.value)
          }
          placeholder="Full name"
          required
          className="h-16 w-full rounded-3xl border border-white/10 bg-white/[0.08] px-5 text-base font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
        />

        <input
          value={form.email}
          onChange={(event) =>
            updateField("email", event.target.value)
          }
          type="email"
          placeholder="Email address"
          required
          className="h-16 w-full rounded-3xl border border-white/10 bg-white/[0.08] px-5 text-base font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
        />

        <input
          value={form.password}
          onChange={(event) =>
            updateField("password", event.target.value)
          }
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="h-16 w-full rounded-3xl border border-white/10 bg-white/[0.08] px-5 text-base font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
        />

        <input
          value={form.phone}
          onChange={(event) =>
            updateField("phone", event.target.value)
          }
          placeholder="Phone number"
          className="h-16 w-full rounded-3xl border border-white/10 bg-white/[0.08] px-5 text-base font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
        />

        <input
          value={form.whatsapp}
          onChange={(event) =>
            updateField("whatsapp", event.target.value)
          }
          placeholder="WhatsApp"
          className="h-16 w-full rounded-3xl border border-white/10 bg-white/[0.08] px-5 text-base font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
        />

        {/* REF CODE HIDDEN */}
        <input
          type="hidden"
          name="refCode"
          value={form.refCode}
        />

        <button
          type="submit"
          disabled={pending}
          className="flex h-16 w-full items-center justify-center rounded-3xl bg-gradient-to-r from-amber-300 to-yellow-500 text-lg font-black text-slate-950 shadow-2xl shadow-yellow-900/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Creating account..."
            : "Create account"}
        </button>
      </form>
    </section>
  );
}