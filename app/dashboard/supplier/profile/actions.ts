"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SupplierProfileFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

export async function updateSupplierProfile(
  _prevState: SupplierProfileFormState,
  formData: FormData,
): Promise<SupplierProfileFormState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Bạn chưa đăng nhập hoặc session đã hết hạn.",
    };
  }

  const companyName = String(formData.get("company_name") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const errors: Record<string, string> = {};

  if (!companyName) errors.company_name = "Vui lòng nhập tên nhà hàng.";
  if (!contactName) errors.contact_name = "Vui lòng nhập người liên hệ.";
  if (!phone) errors.phone = "Vui lòng nhập số điện thoại.";

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Dữ liệu chưa hợp lệ.",
      errors,
    };
  }

  const { data: supplierRow, error: supplierError } = await supabase
    .from("suppliers")
    .select("id, user_id, email")
    .eq("user_id", user.id)
    .single();

  if (supplierError || !supplierRow) {
    return {
      success: false,
      message: `Không tìm thấy supplier row cho user hiện tại. auth.uid=${user.id}`,
    };
  }

  const { error: updateError } = await supabase
    .from("suppliers")
    .update({
      company_name: companyName,
      contact_name: contactName,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", supplierRow.id);

  if (updateError) {
    return {
      success: false,
      message: `Update thất bại: ${updateError.message}`,
    };
  }

  revalidatePath("/dashboard/supplier");
  revalidatePath("/dashboard/supplier/profile");

  return {
    success: true,
    message: "Đã cập nhật thông tin cơ bản thành công.",
  };
}