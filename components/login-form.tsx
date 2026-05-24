"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register" | "reset";
type PreferredLanguage = "en" | "zh";

const COPY = {
  en: {
    brand: "Mvip Booking",
    loginTitle: "Welcome Back",
    registerTitle: "Create Account",
    resetTitle: "Reset Password",
    loginSubtitle: "Sign in to access your dashboard.",
    registerSubtitle: "Create your account to unlock premium dining benefits.",
    resetSubtitle: "Enter your email to receive a reset link.",
    referralApplied: "Referral applied",
    fullName: "Full name",
    phone: "Phone number",
    whatsapp: "WhatsApp (optional)",
    email: "Email address",
    password: "Password",
    processing: "Processing...",
    signIn: "Sign In",
    createAccount: "Create Account",
    sendReset: "Send Reset Link",
    forgotPassword: "Forgot password?",
    newCustomer: "New customer? Create account",
    alreadyHaveAccount: "Already have an account? Sign in",
    backToSignIn: "Back to sign in",
    invalidEmail: "Please enter a valid email address.",
    minPassword: "Password must be at least 6 characters.",
    resetSent: "Password reset email has been sent.",
    registerFailed: "Unable to register customer.",
    genericError: "Something went wrong. Please try again.",
    invalidLogin: "Email or password is incorrect.",
    rateLimit: "Too many requests. Please wait and try again.",
    alreadyRegistered: "This email is already registered. Please sign in.",
  },
  zh: {
    brand: "Mvip Booking",
    loginTitle: "欢迎回来",
    registerTitle: "创建账户",
    resetTitle: "重置密码",
    loginSubtitle: "登录后进入您的专属后台。",
    registerSubtitle: "创建账户，解锁高端餐饮会员权益。",
    resetSubtitle: "请输入邮箱，我们会发送重置链接。",
    referralApplied: "已应用推荐码",
    fullName: "姓名",
    phone: "电话号码",
    whatsapp: "WhatsApp（可选）",
    email: "邮箱地址",
    password: "密码",
    processing: "处理中...",
    signIn: "登录",
    createAccount: "创建账户",
    sendReset: "发送重置链接",
    forgotPassword: "忘记密码？",
    newCustomer: "新客户？创建账户",
    alreadyHaveAccount: "已有账户？登录",
    backToSignIn: "返回登录",
    invalidEmail: "请输入有效邮箱。",
    minPassword: "密码至少 6 位。",
    resetSent: "密码重置邮件已发送。",
    registerFailed: "无法创建客户账户。",
    genericError: "发生错误，请重试。",
    invalidLogin: "邮箱或密码不正确。",
    rateLimit: "请求过多，请稍后再试。",
    alreadyRegistered: "该邮箱已注册，请直接登录。",
  },
} as const;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function getStoredLanguage(): PreferredLanguage {
  if (typeof window === "undefined") return "en";

  const localValue = window.localStorage.getItem("preferred_language");
  if (localValue === "zh") return "zh";

  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith("preferred_language="))
    ?.split("=")[1];

  return cookieValue === "zh" ? "zh" : "en";
}

function persistLanguage(language: PreferredLanguage) {
  window.localStorage.setItem("preferred_language", language);
  document.cookie = `preferred_language=${language}; path=/; max-age=31536000; SameSite=Lax`;
}

function getFriendlyError(message: string, language: PreferredLanguage) {
  const lowerMessage = message.toLowerCase();
  const t = COPY[language];

  if (lowerMessage.includes("invalid login credentials")) return t.invalidLogin;
  if (lowerMessage.includes("rate limit")) return t.rateLimit;
  if (lowerMessage.includes("already registered")) return t.alreadyRegistered;

  return message;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const refCode = searchParams.get("ref");
  const urlMode = searchParams.get("mode");

  const [mode, setMode] = useState<AuthMode>("login");
  const [preferredLanguage, setPreferredLanguage] =
    useState<PreferredLanguage>("en");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = COPY[preferredLanguage];

  useEffect(() => {
    setPreferredLanguage(getStoredLanguage());
  }, []);

  useEffect(() => {
    if (refCode || urlMode === "register") {
      setMode("register");
      return;
    }

    setMode("login");
  }, [refCode, urlMode]);

  function updateLanguage(language: PreferredLanguage) {
    setPreferredLanguage(language);
    persistLanguage(language);
  }

  function switchMode(nextMode: AuthMode) {
    setError("");
    setMessage("");
    setMode(nextMode);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanPreferredLanguage: PreferredLanguage =
      preferredLanguage === "zh" ? "zh" : "en";

    if (!isValidEmail(cleanEmail)) {
      setError(t.invalidEmail);
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
          setError(getFriendlyError(resetError.message, preferredLanguage));
          return;
        }

        setMessage(t.resetSent);
        return;
      }

      if (cleanPassword.length < 6) {
        setError(t.minPassword);
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
            fullName: fullName.trim(),
            phone: phone.trim(),
            whatsapp: whatsapp.trim(),
            email: cleanEmail,
            password: cleanPassword,
            refCode,
            preferredLanguage: cleanPreferredLanguage,
          }),
        });

        const registerResult = await registerResponse.json();

        if (!registerResponse.ok) {
          setError(registerResult.error || t.registerFailed);
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (loginError) {
          setError(getFriendlyError(loginError.message, preferredLanguage));
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
        setError(getFriendlyError(loginError.message, preferredLanguage));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t.genericError);
    } finally {
      setLoading(false);
    }
  }

  const cardTitle =
    mode === "login"
      ? t.loginTitle
      : mode === "register"
        ? t.registerTitle
        : t.resetTitle;

  const cardSubtitle =
    mode === "login"
      ? t.loginSubtitle
      : mode === "register"
        ? t.registerSubtitle
        : t.resetSubtitle;

  return (
    <>
      <div className="fixed right-4 top-[104px] z-[70] md:right-10 md:top-[112px]">
        <select
          value={preferredLanguage}
          onChange={(event) =>
            updateLanguage(event.target.value === "zh" ? "zh" : "en")
          }
          className="h-12 rounded-2xl border border-amber-300/60 bg-[#11100c]/95 px-4 text-sm font-black text-white shadow-xl shadow-black/30 outline-none backdrop-blur-xl transition focus:border-amber-300"
          aria-label="Select language"
        >
          <option value="en" className="text-slate-950">
            English
          </option>
          <option value="zh" className="text-slate-950">
            中文
          </option>
        </select>
      </div>

      <div className="w-full max-w-[500px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/30 backdrop-blur-xl md:rounded-[32px]">
        <div className="bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/10 p-5 md:p-6">
          <div className="mb-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-[15px] text-slate-950 shadow-lg shadow-amber-900/20">
              ♛
            </div>

            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-300">
              {t.brand}
            </p>

            <h1 className="mt-2 text-[2rem] font-black leading-[1.05] tracking-tight text-white md:text-[2.45rem]">
              {cardTitle}
            </h1>

            <p className="mt-2 text-sm leading-5 text-slate-400">
              {cardSubtitle}
            </p>

            {refCode && mode === "register" && (
              <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-2.5 text-xs font-bold text-amber-100">
                {t.referralApplied}: {refCode}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === "register" && (
              <>
                <input
                  placeholder={t.fullName}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/40 focus:ring-4 focus:ring-amber-300/10"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />

                <input
                  placeholder={t.phone}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/40 focus:ring-4 focus:ring-amber-300/10"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />

                <input
                  placeholder={t.whatsapp}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/40 focus:ring-4 focus:ring-amber-300/10"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                />
              </>
            )}

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t.email}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/40 focus:ring-4 focus:ring-amber-300/10"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            {mode !== "reset" && (
              <input
                type="password"
                placeholder={t.password}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/40 focus:ring-4 focus:ring-amber-300/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            )}

            {error && (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-200">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-200">
                {message}
              </div>
            )}

            <button
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-amber-300 text-[17px] font-black text-slate-950 shadow-xl shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? t.processing
                : mode === "login"
                  ? t.signIn
                  : mode === "register"
                    ? t.createAccount
                    : t.sendReset}
            </button>
          </form>

          <div className="mt-4 space-y-1.5 text-center">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="block w-full text-sm font-bold text-slate-400 transition hover:text-white"
                >
                  {t.forgotPassword}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="block w-full text-sm font-black text-amber-300 transition hover:text-amber-200"
                >
                  {t.newCustomer}
                </button>
              </>
            )}

            {mode === "register" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full text-sm font-black text-amber-300 transition hover:text-amber-200"
              >
                {t.alreadyHaveAccount}
              </button>
            )}

            {mode === "reset" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full text-sm font-black text-amber-300 transition hover:text-amber-200"
              >
                {t.backToSignIn}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}