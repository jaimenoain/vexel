"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = { error?: string };

export async function signUp(formData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResult> {
  const supabase = await createClient();
  const { email, password, firstName, lastName } = formData;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login`,
      data: { first_name: firstName, last_name: lastName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && data.user.identities && data.user.identities.length > 0) {
    const { error: insertError } = await supabase.from("users").upsert(
      {
        id: data.user.id,
        email: data.user.email!,
        first_name: firstName,
        last_name: lastName,
        role: "viewer",
      },
      { onConflict: "id" }
    );
    if (insertError) {
      return { error: insertError.message };
    }
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

export async function logIn(formData: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = await createClient();
  const { email, password } = formData;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logOut(): Promise<AuthResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetPassword(formData: {
  email: string;
}): Promise<AuthResult> {
  const supabase = await createClient();
  const { email } = formData;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login`,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return {};
}
