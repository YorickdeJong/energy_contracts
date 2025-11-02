import "next-auth";
import "next-auth/jwt";
import type { User as AppUser } from "./auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    refreshToken: string;
    user: AppUser;
  }

  interface User extends Omit<AppUser, "id"> {
    id: string;
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    user: AppUser;
  }
}
