import { supabase } from "../../utils/supabase";
import { generateToken } from "../../utils/jwt";

export async function login(username: string, pin: string) {
  const { data, error } = await supabase
    .from("scanner_users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) {
    throw new Error("Invalid username or pin");
  }

  if (data.pin !== pin) {
    throw new Error("Invalid username or pin");
  }

  const token = generateToken({ id: data.id, username: data.username });

  return {
    success: true,
    scanner_id: data.id,
    name: data.name,
    token
  };
}