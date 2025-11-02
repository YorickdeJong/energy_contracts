"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, Button, EmptyState, Modal, Input } from "@/app/components/ui";
import { householdsAPI } from "@/lib/api";
import type { Household, CreateHouseholdData } from "@/types/household";
import { BuildingOfficeIcon, PlusIcon, UsersIcon } from "@heroicons/react/24/outline";

export default function HouseholdsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) {
      loadHouseholds();
    }
  }, [session]);

  const loadHouseholds = async () => {
    try {
      setIsLoading(true);
      const accessToken = (session as any)?.accessToken;
      if (!accessToken) {
        setError("No access token found. Please log in again.");
        return;
      }

      const data = await householdsAPI.list(accessToken);
      setHouseholds(data.results);
    } catch (error) {
      setError("Failed to load households");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateHousehold = async (data: CreateHouseholdData) => {
    try {
      const accessToken = (session as any)?.accessToken;
      if (!accessToken) {
        setError("No access token found. Please log in again.");
        return;
      }

      await householdsAPI.create(data, accessToken);
      setIsCreateModalOpen(false);
      loadHouseholds();
    } catch (error: any) {
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-text-primary">
            My Households
          </h1>
          <p className="mt-2 text-text-secondary">
            Manage your properties and tenants
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Household
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-error/10 p-4 border border-error/20">
          <div className="text-sm text-error">{error}</div>
        </div>
      )}

      {households.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={BuildingOfficeIcon}
            title="No households yet"
            description="Get started by creating your first household to manage tenants and energy contracts."
            actionLabel="Create Household"
            onAction={() => setIsCreateModalOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {households.map((household) => (
            <Card
              key={household.id}
              className="p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => router.push(`/households/${household.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-text-primary">
                    {household.name}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                    {household.address}
                  </p>
                </div>
                <div className="ml-4 flex items-center text-text-secondary">
                  <UsersIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm">{household.member_count}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-text-tertiary">
                <span>Created {new Date(household.created_at).toLocaleDateString()}</span>
                <span className={`px-2 py-1 rounded-full ${household.is_active ? 'bg-success/10 text-success' : 'bg-text-tertiary/10'}`}>
                  {household.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateHouseholdModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateHousehold}
      />
    </div>
  );
}

function CreateHouseholdModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateHouseholdData) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CreateHouseholdData>({
    name: "",
    address: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await onSubmit(formData);
      setFormData({ name: "", address: "" });
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to create household");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Household">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error/10 p-4 border border-error/20">
            <div className="text-sm text-error">{error}</div>
          </div>
        )}

        <Input
          label="Property Name *"
          id="name"
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., 123 Main Street Apt 2"
        />

        <Input
          label="Address *"
          id="address"
          name="address"
          type="text"
          required
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Full address including city and postal code"
        />

        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
          >
            Create Household
          </Button>
        </div>
      </form>
    </Modal>
  );
}
