// path: packages/api/src/controllers/auth/signup.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { supabase } from "../../utils/supabase";

export const signupHandler = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert into USERS
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        name,
        email,
        phone,
        role,
        password_hash,
      })
      .select()
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    return res.status(201).json({
      message: "Signup successful",
      user_id: user.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};