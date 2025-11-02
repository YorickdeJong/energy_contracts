"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, Button, Input, Badge } from "@/app/components/ui";
import { UserIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user as any;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone_number: user?.phone_number || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement profile update API call
    setIsEditing(false);
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
              disabled={!isEditing}
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <Input
            label="Email"
            value={user?.email || ""}
            disabled
          />

          <Input
            label="Phone Number"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            disabled={!isEditing}
            placeholder="+31612345678"
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Account Role
            </label>
            <Badge variant="primary" className="capitalize">
              {user?.role || "User"}
            </Badge>
          </div>

          {isEditing && (
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
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
