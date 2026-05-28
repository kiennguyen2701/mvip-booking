// app/page.tsx
//
// FIX redirect loop:
//
// BUG CŨ: redirect("/dashboard/customer")
//   → proxy thấy chưa login → redirect /login?next=/dashboard/customer
//   → login page thấy đã login → redirect /dashboard/customer
//   → ERR_TOO_MANY_REDIRECTS
//
// FIX: "/" đã có trong PUBLIC_ROUTES của proxy.ts nên luôn accessible.
// Redirect sang /restaurants thay vì /dashboard — trang này cũng public,
// không bao giờ gây loop dù login hay chưa.

import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/restaurants");
}
