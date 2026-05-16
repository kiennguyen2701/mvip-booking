import { Suspense } from "react";
import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#080704] px-4 py-10 text-white md:px-6">
      <div className="pointer-events-none absolute inset-0 max-w-full overflow-hidden">
        <div className="absolute -left-24 -top-24 h-[260px] w-[260px] rounded-full bg-amber-500/20 blur-3xl sm:-left-40 sm:-top-40 sm:h-[460px] sm:w-[460px]" />
        <div className="absolute right-0 top-20 h-[280px] w-[280px] rounded-full bg-orange-700/20 blur-3xl sm:h-[520px] sm:w-[520px]" />
        <div className="absolute bottom-[-120px] left-1/2 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-yellow-300/10 blur-3xl sm:h-[460px] sm:w-[460px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.1)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <div className="relative mx-auto flex min-h-[80vh] w-full max-w-xl items-center justify-center overflow-x-hidden">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}