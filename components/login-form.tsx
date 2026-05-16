"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register" | "reset";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function getFriendlyError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (lowerMessage.includes("rate limit")) {
    return "Too many requests. Please wait a few minutes and try again.";
  }

  if (lowerMessage.includes("already registered")) {
    return "This email is already registered. Please sign in instead.";
  }

  return message;
}

function resetMobileViewport() {
  if (typeof window === "undefined") return;

  window.scrollTo({ left: 0 });
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
}

const inputClassName =
  "w-full min-w-0 max-w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-4 text-[16px] leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/40 focus:ring-4 focus:ring-amber-300/10";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const refCode = searchParams.get("ref");
  const urlMode = searchParams.get("mode");

  const [mode, setMode] = useState<AuthMode>("login");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    resetMobileViewport();

    if (refCode || urlMode === "register") {
      setMode("register");
      return;
    }

    setMode("login");
  }, [refCode, urlMode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMobileViewport();

    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanFullName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanWhatsapp = whatsapp.trim();

    if (!isValidEmail(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "reset") {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: `${window.location.origin}/login`,
          });

        if (resetError) {
          setError(getFriendlyError(resetError.message));
          return;
        }

        setMessage("Password reset email has been sent.");
        return;
      }

      if (cleanPassword.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (refCode) {
        localStorage.setItem("agent_ref", refCode);
        sessionStorage.setItem("agent_ref", refCode);
      }

      if (mode === "register") {
        const registerResponse = await fetch("/api/customer-register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: cleanFullName,
            phone: cleanPhone,
            whatsapp: cleanWhatsapp,
            email: cleanEmail,
            password: cleanPassword,
            refCode,
          }),
        });

        const registerResult = await registerResponse.json();

        if (!registerResponse.ok) {
          setError(registerResult.error || "Unable to register customer.");
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (loginError) {
          setError(getFriendlyError(loginError.message));
          return;
        }

        router.push("/dashboard/customer");
        router.refresh();
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (loginError) {
        setError(getFriendlyError(loginError.message));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:rounded-[36px] sm:p-6 md:p-8">
      <div className="mb-7 min-w-0">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-xl text-slate-950 shadow-lg shadow-amber-900/20">
          ♛
        </div>

        <p className="break-words text-xs font-black uppercase tracking-[0.3em] text-amber-300">
          Mvip Booking
        </p>

        <h1 className="mt-3 break-words text-4xl font-black tracking-tight text-white">
          {mode === "login" && "Welcome Back"}
          {mode === "register" && "Create Customer Account"}
          {mode === "reset" && "Reset Password"}
        </h1>

        <p className="mt-3 break-words text-sm leading-6 text-slate-400">
          {mode === "login" &&
            "Sign in to access the correct dashboard for your account role."}
          {mode === "register" &&
            "Join Mvip Booking to discover premium dining and booking offers."}
          {mode === "reset" &&
            "Enter your email address and we will send you a password reset link."}
        </p>

        {refCode && mode === "register" && (
          <div className="mt-4 break-words rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
            Referral code applied: {refCode}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
        {mode === "register" && (
          <>
            <input
              placeholder="Full name"
              className={inputClassName}
              value={fullName}
              onFocus={resetMobileViewport}
              onBlur={resetMobileViewport}
              onChange={(event) => setFullName(event.target.value)}
              required
            />

            <input
              placeholder="Phone number"
              inputMode="tel"
              autoComplete="tel"
              className={inputClassName}
              value={phone}
              onFocus={resetMobileViewport}
              onBlur={resetMobileViewport}
              onChange={(event) => setPhone(event.target.value)}
            />

            <input
              placeholder="WhatsApp (optional)"
              inputMode="tel"
              autoComplete="tel"
              className={inputClassName}
              value={whatsapp}
              onFocus={resetMobileViewport}
              onBlur={resetMobileViewport}
              onChange={(event) => setWhatsapp(event.target.value)}
            />
          </>
        )}

        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email address"
          className={inputClassName}
          value={email}
          onFocus={resetMobileViewport}
          onBlur={resetMobileViewport}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        {mode !== "reset" && (
          <input
            type="password"
            placeholder="Password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className={inputClassName}
            value={password}
            onFocus={resetMobileViewport}
            onBlur={resetMobileViewport}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        )}

        {error && (
          <div className="break-words rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="break-words rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">
            {message}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-amber-300 py-4 text-[16px] font-black text-slate-950 shadow-xl shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Processing..."
            : mode === "login"
              ? "Sign In"
              : mode === "register"
                ? "Create Account"
                : "Send Reset Link"}
        </button>
      </form>

      <div className="mt-6 space-y-3 text-center">
        {mode === "login" && (
          <>
            <button
              type="button"
              onClick={() => {
                resetMobileViewport();
                setError("");
                setMessage("");
                setMode("reset");
              }}
              className="block w-full text-sm font-bold text-slate-400 transition hover:text-white"
            >
              Forgot password?
            </button>

            <button
              type="button"
              onClick={() => {
                resetMobileViewport();
                setError("");
                setMessage("");
                setMode("register");
              }}
              className="block w-full text-sm font-black text-amber-300 transition hover:text-amber-200"
            >
              New customer? Create an account
            </button>
          </>
        )}

        {mode === "register" && (
          <button
            type="button"
            onClick={() => {
              resetMobileViewport();
              setError("");
              setMessage("");
              setMode("login");
            }}
            className="w-full text-sm font-black text-amber-300 transition hover:text-amber-200"
          >
            Already have an account? Sign in
          </button>
        )}

        {mode === "reset" && (
          <button
            type="button"
            onClick={() => {
              resetMobileViewport();
              setError("");
              setMessage("");
              setMode("login");
            }}
            className="w-full text-sm font-black text-amber-300 transition hover:text-amber-200"
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}