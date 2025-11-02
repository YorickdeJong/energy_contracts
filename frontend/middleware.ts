import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const isAuth = !!req.auth;
  const user = req.auth?.user;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
                     req.nextUrl.pathname.startsWith("/register");
  const isOnboardingPage = req.nextUrl.pathname.startsWith("/onboarding");

  // Redirect authenticated users away from login/register
  if (isAuthPage) {
    if (isAuth) {
      // Check if landlord needs onboarding
      if (user?.role === 'landlord' && !user?.is_onboarded) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes except public ones
  const isPublicPath = req.nextUrl.pathname === "/" ||
                       req.nextUrl.pathname.startsWith("/api/auth");

  if (!isAuth && !isPublicPath) {
    let from = req.nextUrl.pathname;
    if (req.nextUrl.search) {
      from += req.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
    );
  }

  // Onboarding flow logic for landlords
  if (isAuth && user?.role === 'landlord') {
    const needsOnboarding = !user?.is_onboarded;

    // If landlord not onboarded, redirect to onboarding (unless already there)
    if (needsOnboarding && !isOnboardingPage && !isPublicPath) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // If landlord is onboarded, don't allow access to onboarding
    if (!needsOnboarding && isOnboardingPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Non-landlords shouldn't access onboarding
  if (isAuth && user?.role !== 'landlord' && isOnboardingPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|webp|svg|gif)).*)"],
};
