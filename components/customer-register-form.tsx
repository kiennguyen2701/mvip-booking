"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

type PreferredLanguage = "en" | "zh";

const COPY = {
  en: {
    title: "Create Customer Account",
    subtitle:
      "Join Mvip Booking to discover premium dining and booking offers.",
    fullName: "Full name",
    phone: "Phone number",
    whatsapp: "WhatsApp (optional)",
    email: "Email address",
    password: "Password",
    register: "Create account",
    login: "Already have an account?",
    loginButton: "Login",
  },
  zh: {
    title: "创建客户账户",
    subtitle: "加入 Mvip Booking，探索高端餐厅与专属优惠。",
    fullName: "姓名",
    phone: "电话号码",
    whatsapp: "WhatsApp（可选）",
    email: "邮箱地址",
    password: "密码",
    register: "创建账户",
    login: "已有账号？",
    loginButton: "登录",
  },
};

export default function CustomerRegisterForm({
  initialRefCode,
}: {
  initialRefCode?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [pending, startTransition] = useTransition();

  const [language, setLanguage] =
    useState<PreferredLanguage>("en");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    whatsapp: "",
    refCode: initialRefCode || "",
    preferredLanguage: "en" as PreferredLanguage,
  });

  const t = COPY[language];

  useEffect(() => {
    const saved =
      localStorage.getItem("preferred_language") ||
      document.cookie
        .split("; ")
        .find((row) =>
          row.startsWith("preferred_language="),
        )
        ?.split("=")[1];

    if (saved === "zh") {
      setLanguage("zh");

      setForm((prev) => ({
        ...prev,
        preferredLanguage: "zh",
      }));
    }
  }, []);

  useEffect(() => {
    if (initialRefCode) {
      saveRefCode(initialRefCode);

      setForm((prev) => ({
        ...prev,
        refCode: initialRefCode,
      }));
    }
  }, [initialRefCode]);

  function updateLanguage(value: PreferredLanguage) {
    setLanguage(value);

    localStorage.setItem("preferred_language", value);

    document.cookie = `preferred_language=${value}; path=/; max-age=31536000`;

    setForm((prev) => ({
      ...prev,
      preferredLanguage: value,
    }));
  }

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
    } catch {}
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/customer-register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(form),
          },
        );

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Register failed");
          return;
        }

        setSuccess("Success");

        router.push("/dashboard/customer");
      } catch (error) {
        console.error(error);
        setError("Something went wrong");
      }
    });
  }

  return (
    <div className="relative w-full overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-2xl">
      <div className="absolute right-5 top-5 z-20">
        <select
          value={language}
          onChange={(e) =>
            updateLanguage(
              e.target.value as PreferredLanguage,
            )
          }
          className="rounded-xl border border-amber-300/20 bg-black/50 px-3 py-2 text-sm font-bold text-white outline-none backdrop-blur"
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </div>

      <div className="mb-8">
        <h1 className="text-5xl font-black leading-none text-white">
          {t.title}
        </h1>

        <p className="mt-4 text-sm text-slate-300">
          {t.subtitle}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          type="hidden"
          name="preferred_language"
          value={language}
        />

        <input
          value={form.fullName}
          onChange={(e) =>
            updateField("fullName", e.target.value)
          }
          placeholder={t.fullName}
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-white outline-none"
        />

        <input
          value={form.phone}
          onChange={(e) =>
            updateField("phone", e.target.value)
          }
          placeholder={t.phone}
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-white outline-none"
        />

        <input
          value={form.whatsapp}
          onChange={(e) =>
            updateField("whatsapp", e.target.value)
          }
          placeholder={t.whatsapp}
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-white outline-none"
        />

        <input
          value={form.email}
          onChange={(e) =>
            updateField("email", e.target.value)
          }
          placeholder={t.email}
          type="email"
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-white outline-none"
        />

        <input
          value={form.password}
          onChange={(e) =>
            updateField("password", e.target.value)
          }
          placeholder={t.password}
          type="password"
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-white outline-none"
        />

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
            {success}
          </div>
        )}

        <button
          disabled={pending}
          className="h-14 w-full rounded-2xl bg-amber-300 text-lg font-black text-black transition active:scale-[0.99]"
        >
          {pending ? "..." : t.register}
        </button>

        <div className="pt-2 text-center text-sm text-slate-400">
          {t.login}

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="ml-2 font-bold text-amber-300"
          >
            {t.loginButton}
          </button>
        </div>
      </form>
    </div>
  );
}