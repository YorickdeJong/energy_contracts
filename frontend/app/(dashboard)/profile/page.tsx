"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, Button, Input, Badge } from "@/app/components/ui";
import { UserIcon, ShieldCheckIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { authAPI } from "@/lib/api";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user as any;

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone_number: user?.phone_number || "",
    profile_picture: user?.profile_picture || "",
  });

  // Update form data when user session changes
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone_number: user.phone_number || "",
        profile_picture: user.profile_picture || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const accessToken = (session as any)?.accessToken;
      if (!accessToken) {
        throw new Error("No access token available");
      }

      // Call API to update profile
      const updatedUser = await authAPI.updateProfile(accessToken, formData);

      // Update the session with new user data
      await update({
        ...session,
        user: {
          ...session?.user,
          ...updatedUser,
        },
      });

      setSuccess("Profile updated successfully!");
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.phone_number?.[0] ||
        "Failed to update profile. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to current user values
    setFormData({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone_number: user?.phone_number || "",
      profile_picture: user?.profile_picture || "",
    });
    setError(null);
    setIsEditing(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error' as const;
      case 'landlord':
        return 'warning' as const;
      case 'tenant':
        return 'primary' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-4xl font-semibold text-text-primary">
          Profile Settings
        </h1>
        <p className="mt-2 text-text-secondary">
          Manage your account information and preferences
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-success mr-3 flex-shrink-0" />
          <p className="text-success text-sm">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center">
          <ExclamationCircleIcon className="h-5 w-5 text-error mr-3 flex-shrink-0" />
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Profile Information Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <UserIcon className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-xl font-medium text-text-primary">
              Personal Information
            </h2>
          </div>
          {!isEditing && (
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              disabled={!isEditing || isLoading}
              required
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              disabled={!isEditing || isLoading}
              required
            />
          </div>

          <Input
            label="Email"
            value={user?.email || ""}
            disabled
            helperText="Email address cannot be changed"
          />

          <Input
            label="Phone Number"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            disabled={!isEditing || isLoading}
            placeholder="+31612345678"
            helperText="Format: +31612345678"
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Account Role
            </label>
            <Badge variant={getRoleBadgeVariant(user?.role || 'user')}>
              {getRoleDisplayName(user?.role || 'user')}
            </Badge>
            <p className="text-xs text-text-secondary mt-1">
              Your role determines your access level in the system
            </p>
          </div>

          {isEditing && (
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Account Security Card */}
      <Card className="p-6">
        <div className="flex items-center mb-6">
          <ShieldCheckIcon className="h-6 w-6 text-primary mr-2" />
          <h2 className="text-xl font-medium text-text-primary">
            Account Security
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-2">
              Password
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Last changed: Never
            </p>
            <Button variant="secondary">Change Password</Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-error/20">
        <h2 className="text-xl font-medium text-error mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button variant="danger">Delete Account</Button>
      </Card>
    </div>
  );
}
