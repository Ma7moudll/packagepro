import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth/config"

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authOptions,
  session: { strategy: "jwt" }, // Ensure correct config mapping
} as any)
