import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080704] px-4 py-10 text-white md:px-6">
      {/* Background luxury */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute right-[-140px] top-20 h-[520px] w-[520px] rounded-full bg-orange-700/20 blur-3xl" />
        <div className="absolute bottom-[-160px] left-1/3 h-[460px] w-[460px] rounded-full bg-yellow-300/10 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,214,140,0.1)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      {/* Center form */}
      <div className="relative mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
        <LoginForm />
      </div>
    </main>
  );
}