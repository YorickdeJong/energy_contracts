import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authAPI } from "@/lib/api";
import type { User } from "@/types/auth";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await authAPI.login({
            email: credentials.email as string,
            password: credentials.password as string,
          });

          if (response.user && response.access) {
            return {
              ...response.user,
              id: response.user.id.toString(),
              accessToken: response.access,
              refreshToken: response.refresh,
            };
          }

          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        const appUser = user as unknown as User & { accessToken?: string; refreshToken?: string };
        return {
          ...token,
          accessToken: appUser.accessToken!,
          refreshToken: appUser.refreshToken!,
          user: {
            id: Number(appUser.id),
            email: appUser.email,
            first_name: appUser.first_name,
            last_name: appUser.last_name,
            phone_number: appUser.phone_number,
            profile_picture: appUser.profile_picture,
            role: appUser.role,
            is_active: appUser.is_active,
            is_verified: appUser.is_verified,
            is_onboarded: appUser.is_onboarded,
            onboarding_step: appUser.onboarding_step,
            date_joined: appUser.date_joined,
          },
        };
      }

      // Return previous token if not expired
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string,
        user: token.user as User,
      } as any;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
