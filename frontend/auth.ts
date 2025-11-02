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
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (account && user) {
        const appUser = user as unknown as User & { accessToken?: string; refreshToken?: string };
        return {
          ...token,
          accessToken: appUser.accessToken!,
          refreshToken: appUser.refreshToken!,
          accessTokenExpiry: Date.now() + 15 * 60 * 1000, // 15 minutes from now
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

      // Handle manual session updates (e.g., after profile update)
      if (trigger === "update" && session?.user) {
        return {
          ...token,
          user: {
            ...token.user,
            ...session.user,
          },
        };
      }

      // Check if access token has expired (with 1 minute buffer)
      const accessTokenExpiry = token.accessTokenExpiry as number;
      if (accessTokenExpiry && Date.now() < accessTokenExpiry - 60 * 1000) {
        // Token still valid
        return token;
      }

      // If no expiry is set (legacy sessions), try to refresh
      if (!accessTokenExpiry) {
        console.log("No access token expiry found, attempting refresh...");
      }

      // Access token has expired, try to refresh it
      try {
        const refreshToken = token.refreshToken as string;
        const response = await authAPI.refreshToken(refreshToken);

        return {
          ...token,
          accessToken: response.access,
          refreshToken: response.refresh,
          accessTokenExpiry: Date.now() + 15 * 60 * 1000, // 15 minutes from now
        };
      } catch (error) {
        console.error("Failed to refresh access token:", error);
        // Return token with error flag to trigger re-authentication
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async session({ session, token }) {
      // If token refresh failed, force re-authentication
      if (token.error) {
        return {
          ...session,
          error: token.error,
        } as any;
      }

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
