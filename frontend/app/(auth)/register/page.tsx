"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authAPI } from "@/lib/api";
import { signIn } from "next-auth/react";
import { Button, Input } from "@/app/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    role: "landlord", // Default to landlord for onboarding flow
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      await authAPI.register(formData);

      // After successful registration, sign in the user
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Registration successful but login failed. Please try logging in.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === "object") {
          const messages = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
            .join(". ");
          setError(messages);
        } else {
          setError("Registration failed. Please try again.");
        }
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            style={{ objectFit: 'cover', opacity: 0.5 }}
            priority
            quality={85}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-slate-900/60 to-blue-950/80"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl font-bold mb-6">
            Energy Contract Management
          </h1>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Streamline your household energy contracts with our comprehensive management platform.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-lg">Multi-Household Management</h3>
                <p className="text-blue-100">Manage multiple properties and tenants from one dashboard</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-lg">Role-Based Access</h3>
                <p className="text-blue-100">Secure access control for landlords and tenants</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-lg">Real-time Updates</h3>
                <p className="text-blue-100">Stay informed with instant notifications and updates</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white py-12">
        <div className="max-w-lg w-full space-y-10">
          <div>
            <h2 className="text-5xl font-semibold text-text-primary mb-4">
              Create your account
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary-dark transition-colors duration-200"
              >
                Sign in
              </Link>
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
            label="Email address *"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
          />
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-text-primary mb-2">
              I am a *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            >
              <option value="landlord">Landlord / Property Manager</option>
              <option value="tenant">Tenant</option>
            </select>
          </div>
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
            label="Phone number"
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
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>
          </div>

          <p className="text-center text-sm text-text-secondary">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:text-primary-dark">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:text-primary-dark">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
