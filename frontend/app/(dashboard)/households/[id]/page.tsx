"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, Button, Modal, Input, Badge, Avatar } from "@/app/components/ui";
import { householdsAPI } from "@/lib/api";
import type { Household, HouseholdMembership } from "@/types/household";
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

export default function HouseholdDetailPage() {
  const router = useRouter();
  const params = useParams();
  const householdId = parseInt(params.id as string);

  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadHousehold();
    loadMembers();
  }, [householdId]);

  const loadHousehold = async () => {
    try {
      const data = await householdsAPI.get(householdId);
      setHousehold(data);
    } catch (error) {
      console.error("Failed to load household", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await householdsAPI.getMembers(householdId);
      setMembers(data);
    } catch (error) {
      console.error("Failed to load members", error);
    }
  };

  const handleAddMember = async (email: string, firstName?: string, lastName?: string) => {
    await householdsAPI.addMember(householdId, email, firstName, lastName);
    loadMembers();
    setIsAddMemberModalOpen(false);
  };

  const handleRemoveMember = async (userId: number) => {
    if (confirm("Are you sure you want to remove this tenant?")) {
      await householdsAPI.removeMember(householdId, userId);
      loadMembers();
    }
  };

  const handleDelete = async () => {
    await householdsAPI.delete(householdId);
    router.push("/households");
  };

  if (isLoading || !household) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/households")}
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-4xl font-semibold text-text-primary">
              {household.name}
            </h1>
            <p className="mt-1 text-text-secondary">{household.address}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary">
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
            <TrashIcon className="h-5 w-5 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <UsersIcon className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-xl font-medium text-text-primary">
              Tenants ({members.length})
            </h2>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsAddMemberModalOpen(true)}
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Add Tenant
          </Button>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            No tenants yet. Add your first tenant to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between p-4 rounded-lg bg-background-secondary hover:bg-border transition-colors duration-200"
              >
                <div className="flex items-center space-x-4">
                  <Avatar
                    alt={membership.tenant.first_name || membership.tenant.email}
                    fallbackText={membership.tenant.first_name || membership.tenant.email}
                    size="md"
                  />
                  <div>
                    <p className="font-medium text-text-primary">
                      {membership.tenant.first_name} {membership.tenant.last_name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {membership.tenant.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">{membership.role}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(membership.tenant.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSubmit={handleAddMember}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Household"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete this household? This action cannot be undone.
          </p>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AddMemberModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, firstName?: string, lastName?: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(email, firstName, lastName);
      setEmail("");
      setFirstName("");
      setLastName("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Tenant">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email *"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tenant@example.com"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
          />
          <Input
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </div>
        <div className="flex space-x-3 pt-4">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
            Add Tenant
          </Button>
        </div>
      </form>
    </Modal>
  );
}
