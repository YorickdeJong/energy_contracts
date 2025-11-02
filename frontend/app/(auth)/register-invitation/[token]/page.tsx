"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { invitationsAPI } from "@/lib/api";
import { signIn } from "next-auth/react";
import { Button, Input } from "@/app/components/ui";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";

export default function RegisterInvitationPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [isVerifying, setIsVerifying] = useState(true);
  const [invitationData, setInvitationData] = useState<{
    email: string;
    household_name: string;
    invited_by: string;
  } | null>(null);
  const [verificationError, setVerificationError] = useState("");

  const [formData, setFormData] = useState({
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Verify invitation on mount
  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        const data = await invitationsAPI.verify(token);
        setInvitationData({
          email: data.email,
          household_name: data.household_name,
          invited_by: data.invited_by,
        });
      } catch (err: any) {
        setVerificationError(
          err.response?.data?.error || "This invitation is invalid or has expired."
        );
      } finally {
        setIsVerifying(false);
      }
    };

    verifyInvitation();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.password_confirm) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await invitationsAPI.accept({
        token,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
      });

      // After successful acceptance, sign in the user
      const result = await signIn("credentials", {
        email: invitationData?.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but login failed. Please try logging in.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("Failed to accept invitation. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-secondary">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-text-primary mb-2">
              Invalid Invitation
            </h1>
            <p className="text-text-secondary mb-6">{verificationError}</p>
            <Link href="/login">
              <Button fullWidth>Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-blue-900">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/Wind_Energy_Companies.webp"
            alt="Wind Energy"
            fill
            style={{ objectFit: "cover", opacity: 0.5 }}
            priority
            quality={85}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-slate-900/60 to-blue-950/80"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl font-bold mb-6">
            You've Been Invited!
          </h1>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            {invitationData?.invited_by} has invited you to join{" "}
            <strong>{invitationData?.household_name}</strong> on Energy
            Contracts Manager.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <svg
                className="w-6 h-6 mt-1 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-lg">Manage Energy Contracts</h3>
                <p className="text-blue-100">
                  View and manage your household's energy contracts
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <svg
                className="w-6 h-6 mt-1 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-lg">Track Usage</h3>
                <p className="text-blue-100">
                  Monitor energy consumption and costs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white py-12">
        <div className="max-w-lg w-full space-y-10">
          <div>
            <h2 className="text-5xl font-semibold text-text-primary mb-4">
              Create your account
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Complete your profile to join {invitationData?.household_name}
            </p>
          </div>

          <div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg bg-error/10 p-4 border border-error/20">
                  <div className="text-sm text-error">{error}</div>
                </div>
              )}

              <Input
                label="Email address"
                id="email"
                name="email"
                type="email"
                value={invitationData?.email || ""}
                disabled
                readOnly
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  fullWidth={false}
                />
                <Input
                  label="Last name"
                  id="last_name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  fullWidth={false}
                />
              </div>

              <Input
                label="Phone number (optional)"
                id="phone_number"
                name="phone_number"
                type="tel"
                autoComplete="tel"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+31612345678"
              />

              <Input
                label="Password *"
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
              />

              <Input
                label="Confirm password *"
                id="password_confirm"
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password_confirm}
                onChange={handleChange}
                placeholder="••••••••"
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
              >
                {isLoading ? "Creating account..." : "Accept Invitation & Create Account"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary-dark transition-colors duration-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
