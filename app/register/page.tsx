// app/register/page.tsx
// Dùng LoginForm (chuẩn) thay CustomerRegisterForm (cũ)
// LoginForm tự detect ?ref= và chuyển sang mode="register" + hiện referral badge

import { Suspense } from "react";
import LoginForm from "@/components/login-form";

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-[calc(100svh-92px-86px)] w-full max-w-full items-center justify-center overflow-x-hidden bg-[#080704] px-4 py-6 text-white md:min-h-[calc(100svh-96px-86px)] md:px-6 md:py-8">
      <div className="pointer-events-none absolute inset-0 max-w-full overflow-hidden">
        <div className="absolute -left-24 -top-24 h-[220px] w-[220px] rounded-full bg-amber-500/20 blur-3xl sm:-left-40 sm:-top-40 sm:h-[420px] sm:w-[420px]" />
        <div className="absolute right-0 top-20 h-[240px] w-[240px] rounded-full bg-orange-700/20 blur-3xl sm:h-[460px] sm:w-[460px]" />
        <div className="absolute bottom-[-120px] left-1/2 h-[220px] w-[220px] -translate-x-1/2 rounded-full bg-yellow-300/10 blur-3xl sm:h-[420px] sm:w-[420px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.1)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <div className="relative z-10 flex w-full items-center justify-center overflow-x-hidden">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
