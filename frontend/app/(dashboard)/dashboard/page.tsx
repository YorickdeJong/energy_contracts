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
import { BuildingOfficeIcon, UserGroupIcon, PlusIcon, XMarkIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
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
  const user = (session?.user as any);
  const userRole = user?.role || 'tenant';
  const [households, setHouseholds] = useState<Household[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);

  useEffect(() => {
    if (session) {
      loadDashboardData();
    }
  }, [session]);

  // Check if onboarding banner should be shown
  useEffect(() => {
    if (user?.role === 'landlord' && !user?.is_onboarded) {
      const dismissed = localStorage.getItem('onboarding_banner_dismissed');
      if (!dismissed || dismissed === 'temporary') {
        setShowOnboardingBanner(true);
      }
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError("");

      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        setError("No access token found. Please log in again.");
        return;
      }

      // Fetch all households for the landlord
      const response = await householdsAPI.list(accessToken);
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

  const handleStartOnboarding = () => {
    router.push("/onboarding");
  };

  const handleRemindLater = () => {
    localStorage.setItem('onboarding_banner_dismissed', 'temporary');
    setShowOnboardingBanner(false);
  };

  const handleDismissPermanently = () => {
    localStorage.setItem('onboarding_banner_dismissed', 'permanent');
    setShowOnboardingBanner(false);
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
      <div className="">
        <div className="max-w-7xl mx-auto ">
          <div>
            <h1 className="text-4xl font-semibold text-text-primary">
              Welcome back, {session?.user?.first_name || "User"}!
            </h1>
            <p className="mt-2 text-lg text-text-secondary">
              {userRole === 'tenant'
                ? "View your household and energy usage"
                : "Manage your properties and tenants"}
            </p>
          </div>

          {/* Onboarding Banner */}
          {showOnboardingBanner && (
            <div className="mt-8 relative">
              <div className="bg-gradient-to-r from-blue-50 to-blue-200/70 rounded-xl p-6 shadow-sm">
                <button
                  onClick={handleDismissPermanently}
                  className="absolute top-4 right-4 p-1 rounded-lg hover:bg-blue-300/50 transition-colors"
                  aria-label="Dismiss permanently"
                >
                  <XMarkIcon className="w-5 h-5 text-blue-700" />
                </button>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-blue-300/50 rounded-xl">
                      <RocketLaunchIcon className="w-8 h-8 text-blue-700" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-blue-900 mb-2">
                      Complete Your Setup
                    </h3>
                    <p className="text-blue-800 mb-4">
                      Get started by adding your first household and tenants to unlock all features
                    </p>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="flex-1 bg-blue-300 rounded-full h-2">
                        <div
                          className="bg-blue-700 rounded-full h-2 transition-all duration-300"
                          style={{ width: `${Math.min((households.length / 1) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-blue-800 font-medium">
                        {households.length} household{households.length !== 1 ? 's' : ''} added
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={handleStartOnboarding}
                        variant="primary"
                      >
                        Get Started
                      </Button>
                      <Button
                        onClick={handleRemindLater}
                        variant="secondary"
                        className="text-blue-800 hover:bg-blue-300/20"
                      >
                        Remind Me Later
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <BuildingOfficeIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">
                    {userRole === 'tenant' ? 'Your Household' : 'Total Households'}
                  </p>
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
                  <p className="text-sm text-text-secondary">
                    {userRole === 'tenant' ? 'Household Members' : 'Total Tenants'}
                  </p>
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
      <div className="max-w-7xl mx-auto pt-8">
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">
                  {userRole === 'tenant' ? 'Household Members' : 'All Tenants'}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {userRole === 'tenant'
                    ? 'View all members of your household'
                    : 'View and manage all tenants across your properties'}
                </p>
              </div>
              <Link href="/households">
                <Button variant="secondary">
                  {userRole === 'tenant' ? 'View Household' : 'View All Households'}
                </Button>
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
                title={userRole === 'tenant' ? "No household yet" : "No tenants yet"}
                description={
                  userRole === 'tenant'
                    ? "You haven't been added to a household yet. Please contact your landlord."
                    : "Add your first household to start managing tenants"
                }
                actionLabel={userRole === 'tenant' ? undefined : "Add Your First Household"}
                onAction={userRole === 'tenant' ? undefined : handleAddHousehold}
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
                    {(userRole === 'landlord' || userRole === 'admin') && (
                      <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                        Household
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                      Status
                    </th>
                    {(userRole === 'landlord' || userRole === 'admin') && (
                      <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                        Actions
                      </th>
                    )}
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
                      {(userRole === 'landlord' || userRole === 'admin') && (
                        <td className="px-6 py-4">
                          <Link href={`/households/${tenant.household_id}`}>
                            <span className="text-sm text-primary hover:text-primary-dark hover:underline cursor-pointer">
                              {tenant.household_name}
                            </span>
                          </Link>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <Badge
                          variant={tenant.is_active ? "success" : "secondary"}
                        >
                          {tenant.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      {(userRole === 'landlord' || userRole === 'admin') && (
                        <td className="px-6 py-4">
                          <Link href={`/households/${tenant.household_id}`}>
                            <Button variant="secondary" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </td>
                      )}
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
              {userRole === 'tenant' ? 'My Household' : 'Manage Households'}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {userRole === 'tenant'
                ? 'View your household details and information'
                : 'View all your properties and manage household details'}
            </p>
            <Link href="/households">
              <Button variant="secondary" fullWidth>
                {userRole === 'tenant' ? 'View My Household' : 'Go to Households'}
              </Button>
            </Link>
          </Card>

          {(userRole === 'landlord' || userRole === 'admin') && (
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
          )}
        </div>
      </div>
    </div>
  );
}
