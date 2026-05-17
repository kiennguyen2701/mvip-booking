"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register" | "reset";
type PreferredLanguage = "en" | "zh";

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
  const [preferredLanguage, setPreferredLanguage] =
    useState<PreferredLanguage>("en");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (refCode || urlMode === "register") {
      setMode("register");
      return;
    }

    setMode("login");
  }, [refCode, urlMode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanFullName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanWhatsapp = whatsapp.trim();
    const cleanPreferredLanguage: PreferredLanguage =
      preferredLanguage === "zh" ? "zh" : "en";

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
            preferredLanguage: cleanPreferredLanguage,
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

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (signInError) {
        setError(getFriendlyError(signInError.message));
        return;
      }

      router.push("/dashboard/customer");
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[560px] overflow-hidden rounded-[32px] border border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="bg-gradient-to-br from-yellow-500/20 via-transparent to-orange-500/20 p-6 sm:p-10">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-[0_0_40px_rgba(250,204,21,0.35)]">
          ♛
        </div>

        <div className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-yellow-400">
          MVIP BOOKING
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          {mode === "register"
            ? "Create Account"
            : mode === "reset"
              ? "Reset Password"
              : "Welcome Back"}
        </h1>

        <p className="mt-4 text-base leading-8 text-white/60 sm:text-lg">
          {mode === "register"
            ? "Create your premium customer account and enjoy exclusive booking benefits."
            : mode === "reset"
              ? "Enter your email address and we will send you a reset link."
              : "Sign in to access the correct dashboard for your account role."}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-5"
        >
          {mode === "register" && (
            <>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                required
                className="h-16 w-full rounded-3xl border border-white/10 bg-white/5 px-6 text-lg text-white outline-none transition-all placeholder:text-white/30 focus:border-yellow-400/60 focus:bg-white/10"
              />

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                required
                className="h-16 w-full rounded-3xl border border-white/10 bg-white/5 px-6 text-lg text-white outline-none transition-all placeholder:text-white/30 focus:border-yellow-400/60 focus:bg-white/10"
              />

              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp (optional)"
                className="h-16 w-full rounded-3xl border border-white/10 bg-white/5 px-6 text-lg text-white outline-none transition-all placeholder:text-white/30 focus:border-yellow-400/60 focus:bg-white/10"
              />

              <div>
                <label className="mb-3 block text-sm font-bold uppercase tracking-[0.2em] text-yellow-400">
                  Preferred Language
                </label>

                <select
                  value={preferredLanguage}
                  onChange={(e) =>
                    setPreferredLanguage(
                      e.target.value === "zh" ? "zh" : "en"
                    )
                  }
                  className="h-16 w-full rounded-3xl border border-white/10 bg-white/5 px-6 text-lg text-white outline-none transition-all focus:border-yellow-400/60 focus:bg-white/10"
                >
                  <option value="en" className="text-black">
                    English
                  </option>

                  <option value="zh" className="text-black">
                    中文 Chinese
                  </option>
                </select>
              </div>
            </>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="h-16 w-full rounded-3xl border border-white/10 bg-white/5 px-6 text-lg text-white outline-none transition-all placeholder:text-white/30 focus:border-yellow-400/60 focus:bg-white/10"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required={mode !== "reset"}
            className="h-16 w-full rounded-3xl border border-white/10 bg-white/5 px-6 text-lg text-white outline-none transition-all placeholder:text-white/30 focus:border-yellow-400/60 focus:bg-white/10"
          />

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-medium text-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-medium text-emerald-200">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-16 w-full rounded-3xl bg-yellow-400 text-xl font-black text-black transition-all hover:scale-[1.01] hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "register"
                ? "Create Account"
                : mode === "reset"
                  ? "Send Reset Link"
                  : "Sign In"}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          {mode !== "reset" && (
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="text-lg font-bold text-white/60 transition hover:text-white"
            >
              Forgot password?
            </button>
          )}

          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setMode("register");
                router.push(refCode ? `/login?mode=register&ref=${refCode}` : "/login?mode=register");
              }}
              className="text-xl font-black text-yellow-400 transition hover:text-yellow-300"
            >
              New customer? Create an account
            </button>
          )}

          {mode === "register" && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                router.push(refCode ? `/login?ref=${refCode}` : "/login");
              }}
              className="text-xl font-black text-yellow-400 transition hover:text-yellow-300"
            >
              Already have an account? Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
