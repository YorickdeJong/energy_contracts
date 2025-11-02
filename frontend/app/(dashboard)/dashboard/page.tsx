"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { householdsAPI } from "@/lib/api";
import {
  Card,
  Button,
  LoadingSpinner,
  EmptyState,
  Badge,
} from "@/app/components/ui";
import { BuildingOfficeIcon, UserGroupIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { Household } from "@/types/household";

interface TenantRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  household_name: string;
  household_id: number;
  is_active: boolean;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Fetch all households for the landlord
      const response = await householdsAPI.list();
      const householdsData = response.results || [];
      setHouseholds(householdsData);

      // Extract all tenants from households
      const allTenants: TenantRow[] = [];
      for (const household of householdsData) {
        if (household.members) {
          household.members.forEach((membership) => {
            if (membership.tenant) {
              allTenants.push({
                id: membership.tenant.id,
                first_name: membership.tenant.first_name,
                last_name: membership.tenant.last_name,
                email: membership.tenant.email,
                phone_number: membership.tenant.phone_number,
                household_name: household.name,
                household_id: household.id,
                is_active: membership.is_active,
              });
            }
          });
        }
      }
      setTenants(allTenants);
    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHousehold = () => {
    router.push("/onboarding");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-text-primary">
                Welcome back, {session?.user?.first_name || "User"}!
              </h1>
              <p className="mt-2 text-lg text-text-secondary">
                Manage your properties and tenants
              </p>
            </div>
            <Button
              onClick={handleAddHousehold}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add New Household</span>
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <BuildingOfficeIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Total Households</p>
                  <p className="text-3xl font-semibold text-text-primary">
                    {households.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-2xl">
                  <UserGroupIcon className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Total Tenants</p>
                  <p className="text-3xl font-semibold text-text-primary">
                    {tenants.length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">
                  All Tenants
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  View and manage all tenants across your properties
                </p>
              </div>
              <Link href="/households">
                <Button variant="secondary">View All Households</Button>
              </Link>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-error/10 border-b border-error/20">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {tenants.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={UserGroupIcon}
                title="No tenants yet"
                description="Add your first household to start managing tenants"
                actionLabel="Add Your First Household"
                onAction={handleAddHousehold}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-secondary">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                      Household
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr
                      key={`${tenant.household_id}-${tenant.id}`}
                      className="hover:bg-background-secondary transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {tenant.first_name[0]}
                              {tenant.last_name[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-text-primary">
                              {tenant.first_name} {tenant.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text-primary">{tenant.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text-secondary">
                          {tenant.phone_number || "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/households/${tenant.household_id}`}>
                          <span className="text-sm text-primary hover:text-primary-dark hover:underline cursor-pointer">
                            {tenant.household_name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={tenant.is_active ? "success" : "secondary"}
                        >
                          {tenant.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/households/${tenant.household_id}`}>
                          <Button variant="secondary" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <BuildingOfficeIcon className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Manage Households
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              View all your properties and manage household details
            </p>
            <Link href="/households">
              <Button variant="secondary" fullWidth>
                Go to Households
              </Button>
            </Link>
          </Card>

          <Card className="p-6">
            <UserGroupIcon className="w-8 h-8 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Add New Household
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Set up a new property and add tenants with AI-powered extraction
            </p>
            <Button onClick={handleAddHousehold} fullWidth>
              Start Onboarding
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
