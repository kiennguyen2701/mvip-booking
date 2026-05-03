"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  roles: Array<"admin" | "supplier" | "agent" | "customer">;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin", "supplier", "agent", "customer"],
  },
  {
    label: "Suppliers",
    href: "/dashboard/admin/suppliers",
    roles: ["admin"],
  },
  {
    label: "Agents",
    href: "/dashboard/admin/agents",
    roles: ["admin"],
  },
  {
    label: "Bookings",
    href: "/dashboard/admin/bookings",
    roles: ["admin"],
  },
  {
    label: "Commissions",
    href: "/dashboard/admin/commissions",
    roles: ["admin"],
  },
  {
    label: "My Profile",
    href: "/dashboard/supplier/profile",
    roles: ["supplier"],
  },
  {
    label: "My Restaurants",
    href: "/dashboard/supplier/restaurants",
    roles: ["supplier"],
  },
  {
    label: "Bookings",
    href: "/dashboard/supplier/bookings",
    roles: ["supplier"],
  },
  {
    label: "Agent Dashboard",
    href: "/dashboard/agent",
    roles: ["agent"],
  },
  {
    label: "My Bookings",
    href: "/dashboard/customer",
    roles: ["customer"],
  },
];

type DashboardNavProps = {
  role?: "admin" | "supplier" | "agent" | "customer" | string | null;
};

export default function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();

  const normalizedRole =
    role === "admin" ||
    role === "supplier" ||
    role === "agent" ||
    role === "customer"
      ? role
      : "customer";

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(normalizedRole)
  );

  return (
    <nav className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 md:px-6">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  : "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}