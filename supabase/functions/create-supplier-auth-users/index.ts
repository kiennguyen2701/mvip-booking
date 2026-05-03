import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_PASSWORD = "Mvip@123456";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json(
        { success: false, message: "Method not allowed" },
        { status: 405 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: suppliers, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, company_name, contact_name, email, phone, address, user_id")
      .is("user_id", null)
      .not("email", "is", null)
      .order("created_at", { ascending: true });

    if (supplierError) {
      throw supplierError;
    }

    if (!suppliers || suppliers.length === 0) {
      return Response.json({
        success: true,
        message: "No suppliers need auth creation.",
        created: 0,
        skipped: 0,
        failed: 0,
      });
    }

    const results: Array<{
      supplier_id: string;
      email: string;
      status: "created" | "skipped" | "failed";
      user_id?: string;
      error?: string;
    }> = [];

    for (const supplier of suppliers) {
      const email = String(supplier.email || "").trim().toLowerCase();

      if (!email) {
        results.push({
          supplier_id: supplier.id,
          email,
          status: "skipped",
          error: "Missing email",
        });
        continue;
      }

      const { data: createdUser, error: createUserError } =
        await supabase.auth.admin.createUser({
          email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            role: "supplier",
            supplier_id: supplier.id,
            company_name: supplier.company_name,
            contact_name: supplier.contact_name,
            phone: supplier.phone,
            address: supplier.address,
          },
          app_metadata: {
            role: "supplier",
            supplier_id: supplier.id,
          },
        });

      if (createUserError) {
        results.push({
          supplier_id: supplier.id,
          email,
          status: "failed",
          error: createUserError.message,
        });
        continue;
      }

      const userId = createdUser.user?.id;

      if (!userId) {
        results.push({
          supplier_id: supplier.id,
          email,
          status: "failed",
          error: "User created but missing user id",
        });
        continue;
      }

      const { error: updateSupplierError } = await supabase
        .from("suppliers")
        .update({
          user_id: userId,
          login_email: email,
          default_password: DEFAULT_PASSWORD,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplier.id);

      if (updateSupplierError) {
        results.push({
          supplier_id: supplier.id,
          email,
          status: "failed",
          user_id: userId,
          error: updateSupplierError.message,
        });
        continue;
      }

      const { error: updateRestaurantError } = await supabase
        .from("restaurants")
        .update({
          supplier_id: supplier.id,
          owner_supplier_id: supplier.id,
          updated_at: new Date().toISOString(),
        })
        .eq("supplier_id", supplier.id);

      if (updateRestaurantError) {
        results.push({
          supplier_id: supplier.id,
          email,
          status: "failed",
          user_id: userId,
          error: updateRestaurantError.message,
        });
        continue;
      }

      results.push({
        supplier_id: supplier.id,
        email,
        status: "created",
        user_id: userId,
      });
    }

    const created = results.filter((item) => item.status === "created").length;
    const skipped = results.filter((item) => item.status === "skipped").length;
    const failed = results.filter((item) => item.status === "failed").length;

    return Response.json({
      success: failed === 0,
      message: "Supplier auth creation completed.",
      default_password: DEFAULT_PASSWORD,
      total: results.length,
      created,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});