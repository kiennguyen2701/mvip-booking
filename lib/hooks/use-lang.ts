// lib/hooks/use-lang.ts
// Hook đọc cookie mvip_lang phía client.
// Dùng useState + useEffect để tránh hydration mismatch:
//   - Server render: trả về "en" (default, khớp với ISR cache)
//   - Client mount: đọc cookie thật → cập nhật ngôn ngữ đúng
//
// Cách dùng:
//   const lang = useLang(); // "en" | "zh"

"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "zh";

function readLangCookie(): Lang {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)mvip_lang=([^;]*)/);
  const value = match?.[1];
  return value === "zh" ? "zh" : "en";
}

export function useLang(): Lang {
  // Khởi tạo với "en" để SSR/ISR HTML khớp với client render đầu tiên,
  // tránh React hydration warning.
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    // Chạy sau khi hydrate — lúc này document.cookie đã có.
    setLang(readLangCookie());
  }, []);

  return lang;
}
