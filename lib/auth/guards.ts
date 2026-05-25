import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export type AppRole = "admin" | "supplier" | "agent" | "customer";

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function getUserRole(userId: string, fallbackRole?: string | null) {
  if (
    fallbackRole === "admin" ||
    fallbackRole === "supplier" ||
    fallbackRole === "agent" ||
    fallbackRole === "customer"
  ) {
    return fallbackRole;
  }

  const [{ data: profile }, { data: userRow }] = await Promise.all([
    adminClient.from("profiles").select("role").eq("id", userId).maybeSingle(),
    adminClient.from("users").select("role").eq("id", userId).maybeSingle(),
  ]);

  return (
    profile?.role ||
    userRow?.role ||
    fallbackRole ||
    "customer"
  ) as AppRole;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const user = await requireUser();
  const role = await getUserRole(user.id, user.user_metadata?.role);

  if (!allowedRoles.includes(role)) {
    throw new Error("FORBIDDEN");
  }

  return {
    user,
    role,
  };
}

export async function requirePageRole(allowedRoles: AppRole[]) {
  try {
    return await requireRole(allowedRoles);
  } catch {
    redirect("/login");
  }
}