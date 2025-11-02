"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authAPI } from "@/lib/api";
import { signIn } from "next-auth/react";
import { Button, Card, Input } from "@/app/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-background-secondary py-12 px-4">
      <Card className="max-w-md w-full space-y-6">
        <div>
          <h2 className="text-center text-4xl font-semibold text-text-primary">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary-dark transition-colors duration-200"
            >
              sign in to your account
            </Link>
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
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
      </Card>
    </div>
  );
}
