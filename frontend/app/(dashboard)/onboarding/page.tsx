"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Stepper from "@/app/components/ui/Stepper";
import FormSection from "@/app/components/ui/FormSection";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
import FileUpload from "@/app/components/ui/FileUpload";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import { onboardingAPI } from "@/lib/api";
import type {
  HouseholdOnboardingData,
  LandlordUpdateData,
  UploadedFile,
  ExtractedTenantData,
  TenantData,
  TenancyConfirmData,
  RenterExtractedData,
  ExtractedRenterWithId,
} from "@/types/onboarding";
import type { Household } from "@/types/household";
import {
  DocumentTextIcon,
  PhotoIcon,
  TableCellsIcon,
  DocumentIcon,
  PaperClipIcon,
  EyeIcon,
  XMarkIcon,
  TrashIcon,
  CheckCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Modal from "@/app/components/ui/Modal";

const initialOnboardingSteps = [
  { label: "Household", description: "Add your property" },
  { label: "Landlord", description: "Landlord details" },
  { label: "Tenancies", description: "Upload agreements" },
  { label: "Tenants", description: "Review & add" },
];

const addHouseholdSteps = [
  { label: "Property", description: "Add household details" },
  { label: "Tenancies", description: "Upload agreements" },
  { label: "Tenants", description: "Review & add" },
];

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0); // 0 = intro card for existing landlords
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);

  // Detect if this is initial onboarding or adding a new household
  const isOnboarded = (session?.user as any)?.is_onboarded || false;
  const steps = isOnboarded ? addHouseholdSteps : initialOnboardingSteps;

  // Step 1: Household data
  const [householdData, setHouseholdData] = useState<HouseholdOnboardingData>({
    name: "",
    street_address: "",
    city: "",
    postal_code: "",
    country: "",
  });
  const [createdHousehold, setCreatedHousehold] = useState<Household | null>(
    null
  );

  // Step 2: Landlord data
  const [landlordData, setLandlordData] = useState<LandlordUpdateData>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
  });

  // Step 3: Uploaded files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Step 3: Tenancy form data for review and confirmation
  const [tenancyFormData, setTenancyFormData] = useState<{
    [fileId: string]: {
      tenancy_name: string;
      start_date: string;
      end_date: string;
      monthly_rent: string;
      deposit: string;
    };
  }>({});
  const [confirmedTenancies, setConfirmedTenancies] = useState<Set<string>>(new Set());

  // Step 4: Extracted tenants (renters)
  const [extractedTenants, setExtractedTenants] = useState<ExtractedRenterWithId[]>([]);
  const [addedTenantIds, setAddedTenantIds] = useState<Set<string>>(new Set());

  // Initialize step based on onboarding status and restore saved progress
  useEffect(() => {
    if (session?.user) {
      const isOnboarded = (session.user as any).is_onboarded || false;

      // Try to restore saved progress from localStorage
      const savedProgress = localStorage.getItem('onboarding_progress');
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);

          // Restore household if it was created
          if (progress.household) {
            setCreatedHousehold(progress.household);
            setHouseholdData(progress.householdData || {
              name: "",
              street_address: "",
              city: "",
              postal_code: "",
              country: "",
            });
          }

          // Restore current step
          if (progress.currentStep) {
            setCurrentStep(progress.currentStep);
          } else {
            // Default step based on onboarding status
            setCurrentStep(isOnboarded ? 0 : 1);
          }
        } catch (e) {
          console.error('Failed to restore onboarding progress:', e);
          setCurrentStep(isOnboarded ? 0 : 1);
        }
      } else {
        // No saved progress - start fresh
        setCurrentStep(isOnboarded ? 0 : 1);
      }

      setLandlordData({
        first_name: (session.user as any).first_name || "",
        last_name: (session.user as any).last_name || "",
        email: (session.user as any).email || "",
        phone_number: (session.user as any).phone_number || "",
      });
    }
  }, [session]);

  // Auto-save progress whenever household or step changes
  useEffect(() => {
    if (createdHousehold || currentStep > 1) {
      const progress = {
        household: createdHousehold,
        householdData,
        currentStep,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('onboarding_progress', JSON.stringify(progress));
    }
  }, [createdHousehold, currentStep, householdData]);

  // Redirect if not authenticated or token refresh failed
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }

    // Check if token refresh failed
    if (session && (session as any).error === "RefreshAccessTokenError") {
      // Force sign out and redirect to login
      router.push("/login");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const accessToken = (session as any).accessToken;

  // Step 1: Create Household
  const handleCreateHousehold = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const household = await onboardingAPI.createHousehold(
        householdData,
        accessToken
      );
      setCreatedHousehold(household);
      setCurrentStep(2);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to create household. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Update Landlord
  const handleUpdateLandlord = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await onboardingAPI.updateLandlord(landlordData, accessToken);
      setCurrentStep(3);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to update landlord information. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Handle file upload
  const handleFilesUpload = async (files: File[]) => {
    if (!createdHousehold) return;

    const newFiles: UploadedFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading" as const,
      progress: 0,
      url: URL.createObjectURL(file), // Create temporary URL for immediate preview
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Upload each file
    for (const uploadedFile of newFiles) {
      try {
        const agreement = await onboardingAPI.uploadTenancyAgreement(
          createdHousehold.id,
          uploadedFile.file,
          accessToken
        );

        // Update file status and initialize form data if extraction completed
        const fileStatus = agreement.status === 'processed' ? 'processed' : 'uploaded';

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? {
                  ...f,
                  status: fileStatus,
                  progress: 100,
                  agreementId: agreement.id,
                  extractedData: agreement.extracted_data || undefined,
                  url: agreement.file,
                }
              : f
          )
        );

        // Initialize form data if extraction completed
        if (agreement.status === 'processed' && agreement.extracted_data) {
          setTenancyFormData((prev) => ({
            ...prev,
            [uploadedFile.id]: {
              tenancy_name: '',
              start_date: agreement.extracted_data?.start_date || '',
              end_date: agreement.extracted_data?.end_date || '',
              monthly_rent: agreement.extracted_data?.monthly_rent?.toString() || '',
              deposit: agreement.extracted_data?.deposit?.toString() || '',
            },
          }));
        }
      } catch (err: any) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? {
                  ...f,
                  status: "failed" as const,
                  error: err.response?.data?.message || "Upload failed",
                }
              : f
          )
        );
      }
    }
  };

  // Process a file to extract tenant data
  const handleProcessFile = async (fileId: string) => {
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (!file || !file.agreementId) return;

    setUploadedFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "processing" as const } : f
      )
    );

    try {
      const agreement = await onboardingAPI.processTenancyAgreement(
        file.agreementId,
        accessToken
      );

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "processed" as const,
                extractedData: agreement.extracted_data || undefined,
              }
            : f
        )
      );

      // Add renters to extracted tenants if available
      if (agreement.extracted_data?.renters && agreement.extracted_data.renters.length > 0) {
        const newRenters = agreement.extracted_data.renters.map((renter, index) => ({
          ...renter,
          id: `renter-${agreement.id}-${index}`,
        }));
        setExtractedTenants((prev) => [...prev, ...newRenters]);
      }
    } catch (err: any) {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "failed" as const,
                error: err.response?.data?.message || "Processing failed",
              }
            : f
        )
      );
    }
  };

  // Remove a file
  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setTenancyFormData((prev) => {
      const newData = { ...prev };
      delete newData[fileId];
      return newData;
    });
  };

  // Continue to step 4 - confirm all tenancies first
  const handleContinueToStep4 = async () => {
    setError(null);

    // Get all processed files that have form data
    const processedFiles = uploadedFiles.filter(
      (file) => file.status === 'processed' && file.extractedData && tenancyFormData[file.id]
    );

    if (processedFiles.length === 0) {
      setError("Please upload and process at least one tenancy agreement");
      return;
    }

    setIsLoading(true);

    try {
      // Confirm all tenancies
      for (const file of processedFiles) {
        if (!confirmedTenancies.has(file.id) && file.agreementId) {
          const formData = tenancyFormData[file.id];

          // Validate required fields
          if (!formData.tenancy_name.trim()) {
            setError(`Tenancy name is required for ${file.name}`);
            setIsLoading(false);
            return;
          }
          if (!formData.start_date) {
            setError(`Start date is required for ${file.name}`);
            setIsLoading(false);
            return;
          }
          if (!formData.monthly_rent) {
            setError(`Monthly rent is required for ${file.name}`);
            setIsLoading(false);
            return;
          }

          const confirmData: TenancyConfirmData = {
            tenancy_agreement_id: file.agreementId,
            tenancy_name: formData.tenancy_name.trim(),
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            monthly_rent: parseFloat(formData.monthly_rent),
            deposit: parseFloat(formData.deposit) || 0,
          };

          await onboardingAPI.confirmTenancy(confirmData, accessToken);

          // Mark as confirmed
          setConfirmedTenancies((prev) => new Set([...prev, file.id]));

          // Add renters to extracted tenants if available
          if (file.extractedData?.renters && file.extractedData.renters.length > 0) {
            const newTenants = file.extractedData.renters.map((renter, index) => ({
              ...renter,
              id: `tenant-${file.id}-${index}`,
            }));
            setExtractedTenants((prev) => [...prev, ...newTenants]);
          }
        }
      }

      // All confirmations successful, proceed to step 4
      setCurrentStep(4);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to confirm tenancy. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Add a tenant
  const handleAddTenant = async (tenantId: string) => {
    if (!createdHousehold) return;

    const tenant = extractedTenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    // Validate required fields
    if (!tenant.first_name || !tenant.last_name || !tenant.email) {
      setError("Please fill in all required fields (first name, last name, and email)");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const tenantData: TenantData = {
        first_name: tenant.first_name,
        last_name: tenant.last_name,
        email: tenant.email,
        phone_number: tenant.phone_number || undefined,
      };

      await onboardingAPI.addTenant(
        createdHousehold.id,
        tenantData,
        accessToken
      );

      setAddedTenantIds((prev) => new Set([...prev, tenantId]));
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to add tenant. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Update tenant data
  const handleUpdateTenant = (
    tenantId: string,
    field: keyof ExtractedTenantData,
    value: string
  ) => {
    setExtractedTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, [field]: value } : t))
    );
  };

  // Add manual tenant
  const handleAddManualTenant = () => {
    setExtractedTenants((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        is_primary: false,
        isEditing: true,
      },
    ]);
  };

  // Remove tenant from list
  const handleRemoveTenant = (tenantId: string) => {
    setExtractedTenants((prev) => prev.filter((t) => t.id !== tenantId));
  };

  // Complete onboarding
  const handleCompleteOnboarding = async () => {
    if (!createdHousehold) return;

    setError(null);
    setIsLoading(true);

    try {
      // Add all tenants that haven't been added yet
      const tenantsToAdd = extractedTenants.filter(
        (tenant) => !addedTenantIds.has(tenant.id)
      );

      for (const tenant of tenantsToAdd) {
        // Validate required fields
        if (!tenant.first_name || !tenant.last_name || !tenant.email) {
          setError(
            `Please fill in all required fields for ${tenant.first_name || 'tenant'} ${tenant.last_name || ''}`
          );
          setIsLoading(false);
          return;
        }

        const tenantData: TenantData = {
          first_name: tenant.first_name,
          last_name: tenant.last_name,
          email: tenant.email,
          phone_number: tenant.phone_number || undefined,
        };

        await onboardingAPI.addTenant(
          createdHousehold.id,
          tenantData,
          accessToken
        );

        // Mark as added
        setAddedTenantIds((prev) => new Set([...prev, tenant.id]));
      }

      // Only call complete onboarding API for first-time landlords
      if (!isOnboarded) {
        await onboardingAPI.completeOnboarding(accessToken);
        // Update the session to reflect is_onboarded = true
        await update({
          ...session,
          user: {
            ...(session?.user as any),
            is_onboarded: true,
            onboarding_step: 4,
          },
        });
      }

      // Clear saved progress
      localStorage.removeItem('onboarding_progress');
      // Redirect to dashboard for both flows
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to complete onboarding. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Go back
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    } else if (isOnboarded && currentStep === 1) {
      // For existing landlords, go back to intro card
      setCurrentStep(0);
      setError(null);
    }
  };

  // Save & Exit (for existing landlords)
  const handleSaveAndExit = () => {
    // Just navigate back to dashboard - progress is already saved
    router.push("/dashboard");
  };

  // Cancel (shows confirmation modal)
  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  // Confirm cancel (discard and go to dashboard)
  const handleConfirmCancel = () => {
    // Clear all saved progress
    localStorage.removeItem('onboarding_progress');
    setShowCancelModal(false);
    router.push("/dashboard");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileName: string): React.ReactElement => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const iconClass = "h-6 w-6 text-primary";

    switch (extension) {
      case "pdf":
        return <DocumentTextIcon className={iconClass} />;
      case "jpg":
      case "jpeg":
      case "png":
        return <PhotoIcon className={iconClass} />;
      case "xlsx":
      case "xls":
        return <TableCellsIcon className={iconClass} />;
      case "doc":
      case "docx":
        return <DocumentIcon className={iconClass} />;
      default:
        return <PaperClipIcon className={iconClass} />;
    }
  };

  // Get actual step number for display (skip intro card)
  const actualStep = isOnboarded && currentStep === 0 ? 0 : currentStep;

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Save & Exit button */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-semibold text-text-primary mb-2">
                {isOnboarded ? "Add New Household" : "Welcome! Let's get you set up"}
              </h1>
              <p className="text-lg text-text-secondary">
                {isOnboarded
                  ? "Add another property to your portfolio"
                  : "We'll guide you through adding your first household and tenants"}
              </p>
            </div>
            {/* Save & Exit button (only show for existing landlords in active steps) */}
            {isOnboarded && currentStep > 0 && (
              <Button
                onClick={handleSaveAndExit}
                variant="secondary"
                className="ml-4"
              >
                Save & Exit
              </Button>
            )}
          </div>
        </div>

        {/* Intro Card for Existing Landlords */}
        {isOnboarded && currentStep === 0 && (
          <Card className="mb-6 text-center" padding="lg">
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-text-primary mb-2">
                Ready to add another household?
              </h2>
              <p className="text-text-secondary mb-6">
                You currently manage {(session?.user as any)?.household_count || 0} household(s).
                Let's add another property with its tenants.
              </p>
              <Button
                onClick={() => setCurrentStep(1)}
                size="lg"
              >
                Get Started
              </Button>
            </div>
          </Card>
        )}

        {/* Stepper - only show when not on intro card */}
        {!(isOnboarded && currentStep === 0) && (
          <Stepper steps={steps} currentStep={isOnboarded ? currentStep : currentStep} />
        )}

        {/* Error message */}
        {error && (
          <Card className="mb-6 bg-error/10 border-2 border-error/20">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-error flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-medium text-error mb-1">Error</h3>
                <p className="text-sm text-error">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Step content */}
        <Card className="mb-6" padding="lg">
          {/* Step 1: Add Household */}
          {currentStep === 1 && (
            <FormSection
              title="Create Your First Household"
              description="Add the property you manage"
            >
              <Input
                label="Household Name"
                placeholder="e.g., Main Street Apartment"
                value={householdData.name}
                onChange={(e) =>
                  setHouseholdData({ ...householdData, name: e.target.value })
                }
                required
              />
              <Input
                label="Street Address"
                placeholder="123 Main Street"
                value={householdData.street_address}
                onChange={(e) =>
                  setHouseholdData({
                    ...householdData,
                    street_address: e.target.value,
                  })
                }
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="City"
                  placeholder="Amsterdam"
                  value={householdData.city}
                  onChange={(e) =>
                    setHouseholdData({ ...householdData, city: e.target.value })
                  }
                  required
                />
                <Input
                  label="Postal Code"
                  placeholder="1012 AB"
                  value={householdData.postal_code}
                  onChange={(e) =>
                    setHouseholdData({
                      ...householdData,
                      postal_code: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <Input
                label="Country"
                placeholder="Netherlands"
                value={householdData.country}
                onChange={(e) =>
                  setHouseholdData({
                    ...householdData,
                    country: e.target.value,
                  })
                }
                required
              />
              <Button
                onClick={handleCreateHousehold}
                isLoading={isLoading}
                disabled={
                  !householdData.name ||
                  !householdData.street_address ||
                  !householdData.city ||
                  !householdData.postal_code ||
                  !householdData.country
                }
                fullWidth
                size="lg"
              >
                {isOnboarded ? "Continue" : "Continue to Step 2"}
              </Button>
            </FormSection>
          )}

          {/* Step 2: Landlord Information - Only for first-time onboarding */}
          {!isOnboarded && currentStep === 2 && (
            <FormSection
              title="Landlord Details"
              description="Confirm your contact information"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="First Name"
                  value={landlordData.first_name}
                  onChange={(e) =>
                    setLandlordData({
                      ...landlordData,
                      first_name: e.target.value,
                    })
                  }
                  required
                />
                <Input
                  label="Last Name"
                  value={landlordData.last_name}
                  onChange={(e) =>
                    setLandlordData({
                      ...landlordData,
                      last_name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="landlord@example.com"
                value={landlordData.email}
                onChange={(e) =>
                  setLandlordData({
                    ...landlordData,
                    email: e.target.value,
                  })
                }
                required
                helperText="This email will be used for landlord contact information"
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+31 6 12345678"
                value={landlordData.phone_number}
                onChange={(e) =>
                  setLandlordData({
                    ...landlordData,
                    phone_number: e.target.value,
                  })
                }
              />
              <div className="flex gap-4">
                <Button variant="secondary" onClick={handleBack} fullWidth>
                  Back
                </Button>
                <Button
                  onClick={handleUpdateLandlord}
                  isLoading={isLoading}
                  disabled={
                    !landlordData.first_name || !landlordData.last_name || !landlordData.email
                  }
                  fullWidth
                  size="lg"
                >
                  Continue to Step 3
                </Button>
              </div>
            </FormSection>
          )}

          {/* Step 3 (or 2 for existing landlords): Upload Tenancy Agreements */}
          {((!isOnboarded && currentStep === 3) || (isOnboarded && currentStep === 2)) && (
            <FormSection
              title="Upload Tenancy Agreements"
              description="We'll extract tenant details automatically using AI"
            >
              <FileUpload
                onFilesSelected={handleFilesUpload}
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                multiple
              />

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-medium text-text-primary">
                    Uploaded Files
                  </h3>
                  {uploadedFiles.map((file) => (
                    <Card key={file.id} padding="md" className="border border-border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex-shrink-0 mt-1">{getFileIcon(file.name)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary truncate">
                              {file.name}
                            </p>
                            <p className="text-sm text-text-secondary">
                              {formatFileSize(file.size)}
                            </p>

                            {/* Status */}
                            <div className="mt-2">
                              {file.status === "uploading" && (
                                <div className="flex items-center gap-2 text-primary">
                                  <LoadingSpinner size="sm" />
                                  <span className="text-sm">Uploading...</span>
                                </div>
                              )}
                              {file.status === "uploaded" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleProcessFile(file.id)}
                                >
                                  Extract Tenant Data
                                </Button>
                              )}
                              {file.status === "processing" && (
                                <div className="flex items-center gap-2 text-primary">
                                  <LoadingSpinner size="sm" />
                                  <span className="text-sm">
                                    Processing with AI...
                                  </span>
                                </div>
                              )}
                              {file.status === "processed" &&
                                file.extractedData &&
                                tenancyFormData[file.id] && (
                                  <div className="mt-3 space-y-4">
                                    <p className="text-sm font-medium text-success mb-3">
                                      ✓ Data extracted successfully
                                    </p>

                                    <Input
                                      label="Tenancy Name *"
                                      placeholder="e.g., 2024-2025 Lease"
                                      value={tenancyFormData[file.id].tenancy_name}
                                      onChange={(e) =>
                                        setTenancyFormData((prev) => ({
                                          ...prev,
                                          [file.id]: {
                                            ...prev[file.id],
                                            tenancy_name: e.target.value,
                                          },
                                        }))
                                      }
                                      required
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Input
                                        label="Start Date *"
                                        type="date"
                                        value={tenancyFormData[file.id].start_date}
                                        onChange={(e) =>
                                          setTenancyFormData((prev) => ({
                                            ...prev,
                                            [file.id]: {
                                              ...prev[file.id],
                                              start_date: e.target.value,
                                            },
                                          }))
                                        }
                                        required
                                      />
                                      <Input
                                        label="End Date"
                                        type="date"
                                        value={tenancyFormData[file.id].end_date}
                                        onChange={(e) =>
                                          setTenancyFormData((prev) => ({
                                            ...prev,
                                            [file.id]: {
                                              ...prev[file.id],
                                              end_date: e.target.value,
                                            },
                                          }))
                                        }
                                      />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Input
                                        label="Monthly Rent (€) *"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tenancyFormData[file.id].monthly_rent}
                                        onChange={(e) =>
                                          setTenancyFormData((prev) => ({
                                            ...prev,
                                            [file.id]: {
                                              ...prev[file.id],
                                              monthly_rent: e.target.value,
                                            },
                                          }))
                                        }
                                        required
                                      />
                                      <Input
                                        label="Deposit (€)"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tenancyFormData[file.id].deposit}
                                        onChange={(e) =>
                                          setTenancyFormData((prev) => ({
                                            ...prev,
                                            [file.id]: {
                                              ...prev[file.id],
                                              deposit: e.target.value,
                                            },
                                          }))
                                        }
                                      />
                                    </div>

                                    {/* Renters preview */}
                                    {file.extractedData.renters && file.extractedData.renters.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-border">
                                        <p className="text-sm font-medium text-text-primary mb-2">
                                          Extracted Renters ({file.extractedData.renters.length}):
                                        </p>
                                        <div className="space-y-2">
                                          {file.extractedData.renters.map((renter, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
                                              <span>
                                                {renter.first_name || '?'} {renter.last_name || '?'}
                                                {renter.email && ` (${renter.email})`}
                                              </span>
                                              {renter.is_primary && (
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                                  Primary
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                        <p className="text-xs text-text-tertiary mt-2">
                                          You can edit renter details in the next step
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              {file.status === "failed" && (
                                <p className="text-sm text-error">
                                  {file.error || "Failed"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {/* View button */}
                          {file.url && (
                            <button
                              onClick={() => setViewingFile(file)}
                              className="text-text-tertiary hover:text-primary transition-colors"
                              title="View file"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                          )}
                          {/* Remove button */}
                          <button
                            onClick={() => handleRemoveFile(file.id)}
                            className="text-text-tertiary hover:text-error transition-colors"
                            title="Remove file"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button variant="secondary" onClick={handleBack} fullWidth>
                  Back
                </Button>
                <Button
                  onClick={handleContinueToStep4}
                  isLoading={isLoading}
                  fullWidth
                  size="lg"
                >
                  Continue to Step 4
                </Button>
              </div>
            </FormSection>
          )}

          {/* Step 4 (or 3 for existing landlords): Review & Add Tenants */}
          {((!isOnboarded && currentStep === 4) || (isOnboarded && currentStep === 3)) && (
            <FormSection
              title="Review Extracted Tenants"
              description="Verify and add tenants to your household"
            >
              {/* Add Tenant Button - Top */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
                <div>
                  <h3 className="text-lg font-medium text-text-primary">
                    {extractedTenants.length > 0
                      ? `${extractedTenants.length} Tenant${extractedTenants.length !== 1 ? 's' : ''} Found`
                      : "No Tenants Yet"
                    }
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {extractedTenants.length > 0
                      ? "Review details and add to your household"
                      : "Add your first tenant to continue"
                    }
                  </p>
                </div>
                <Button onClick={handleAddManualTenant} variant="secondary">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Tenant Manually
                </Button>
              </div>

              {extractedTenants.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <PlusIcon className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-text-secondary mb-4">
                    No tenants extracted from agreements.
                  </p>
                  <p className="text-sm text-text-tertiary">
                    Click "Add Tenant Manually" above to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {extractedTenants.map((tenant) => (
                    <Card
                      key={tenant.id}
                      padding="md"
                      className="border border-border relative"
                    >
                      {/* Trash button - top right */}
                      <button
                        onClick={() => handleRemoveTenant(tenant.id)}
                        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-error/10 transition-colors group"
                        title="Remove tenant from list"
                      >
                        <TrashIcon className="h-5 w-5 text-text-tertiary group-hover:text-error transition-colors" />
                      </button>

                      <div className="space-y-4 pr-12">
                        {/* Show primary badge if applicable */}
                        {(tenant as any).is_primary && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                              Primary Renter
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            label="First Name"
                            value={tenant.first_name || ""}
                            onChange={(e) =>
                              handleUpdateTenant(
                                tenant.id,
                                "first_name",
                                e.target.value
                              )
                            }
                            required
                          />
                          <Input
                            label="Last Name"
                            value={tenant.last_name || ""}
                            onChange={(e) =>
                              handleUpdateTenant(
                                tenant.id,
                                "last_name",
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>
                        <Input
                          label="Email"
                          type="email"
                          value={tenant.email || ""}
                          onChange={(e) =>
                            handleUpdateTenant(
                              tenant.id,
                              "email",
                              e.target.value
                            )
                          }
                          required
                        />
                        <Input
                          label="Phone Number"
                          type="tel"
                          value={tenant.phone_number || ""}
                          onChange={(e) =>
                            handleUpdateTenant(
                              tenant.id,
                              "phone_number",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button variant="secondary" onClick={handleBack} fullWidth>
                  Back
                </Button>
                <Button
                  onClick={handleCompleteOnboarding}
                  isLoading={isLoading}
                  disabled={extractedTenants.length === 0}
                  fullWidth
                  size="lg"
                >
                  {extractedTenants.length === 0
                    ? "Add Tenants to Continue"
                    : isOnboarded
                    ? "Complete & Add Tenants"
                    : "Complete Onboarding"
                  }
                </Button>
              </div>
            </FormSection>
          )}
        </Card>

        {/* Cancel Button - Show at bottom for all steps except intro */}
        {currentStep > 0 && (
          <div className="mt-4 text-center">
            <Button
              onClick={handleCancelClick}
              variant="secondary"
              className="text-text-secondary hover:text-text-primary"
            >
              Cancel & Discard Progress
            </Button>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md mx-4" padding="lg">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-warning/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Discard Progress?
                </h3>
                <p className="text-text-secondary mb-6">
                  Are you sure you want to cancel? Any unsaved changes will be lost.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowCancelModal(false)}
                    variant="secondary"
                    fullWidth
                  >
                    Keep Working
                  </Button>
                  <Button
                    onClick={handleConfirmCancel}
                    variant="primary"
                    fullWidth
                    className="bg-error hover:bg-error/90"
                  >
                    Discard & Exit
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* File Viewer Modal */}
        {viewingFile && (
          <Modal
            isOpen={true}
            onClose={() => setViewingFile(null)}
            maxWidth="2xl"
            showCloseButton={false}
          >
            <div className="relative -m-6">
              {/* Floating close button */}
              <button
                onClick={() => setViewingFile(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>

              {/* File preview */}
              <div className="bg-background-secondary overflow-hidden rounded-2xl">
                {viewingFile.url ? (
                  <>
                    {/* PDF Preview */}
                    {viewingFile.name.toLowerCase().endsWith('.pdf') && (
                      <iframe
                        src={viewingFile.url}
                        className="w-full h-[80vh] rounded-2xl"
                        title={viewingFile.name}
                      />
                    )}

                    {/* Image Preview */}
                    {(viewingFile.name.toLowerCase().endsWith('.jpg') ||
                      viewingFile.name.toLowerCase().endsWith('.jpeg') ||
                      viewingFile.name.toLowerCase().endsWith('.png')) && (
                      <div className="flex items-center justify-center h-[80vh] rounded-2xl">
                        <img
                          src={viewingFile.url}
                          alt={viewingFile.name}
                          className="max-w-full max-h-full object-contain rounded-2xl"
                        />
                      </div>
                    )}

                    {/* Word Document & Other Office files - Download with preview info */}
                    {(viewingFile.name.toLowerCase().endsWith('.doc') ||
                      viewingFile.name.toLowerCase().endsWith('.docx') ||
                      viewingFile.name.toLowerCase().endsWith('.xls') ||
                      viewingFile.name.toLowerCase().endsWith('.xlsx')) && (
                        <div className="p-8 text-center h-[80vh] flex flex-col items-center justify-center rounded-2xl">
                          <DocumentIcon className="h-16 w-16 text-primary mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-text-primary mb-2">
                            {viewingFile.name}
                          </h3>
                          <p className="text-text-secondary mb-2">
                            {formatFileSize(viewingFile.size)}
                          </p>
                          <p className="text-text-secondary mb-6 max-w-md">
                            Office documents cannot be previewed in the browser.
                            Click below to download and open in Microsoft Word or Excel.
                          </p>
                          <div className="flex gap-3">
                            <a
                              href={viewingFile.url}
                              download
                              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-primary text-white hover:bg-primary-dark min-w-[150px]"
                            >
                              Download File
                            </a>
                            <a
                              href={viewingFile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-secondary text-white hover:bg-secondary-dark"
                            >
                              Open in New Tab
                            </a>
                          </div>
                        </div>
                      )}

                    {/* Other file types - show download link */}
                    {!viewingFile.name.toLowerCase().endsWith('.pdf') &&
                      !viewingFile.name.toLowerCase().endsWith('.jpg') &&
                      !viewingFile.name.toLowerCase().endsWith('.jpeg') &&
                      !viewingFile.name.toLowerCase().endsWith('.png') &&
                      !viewingFile.name.toLowerCase().endsWith('.doc') &&
                      !viewingFile.name.toLowerCase().endsWith('.docx') &&
                      !viewingFile.name.toLowerCase().endsWith('.xls') &&
                      !viewingFile.name.toLowerCase().endsWith('.xlsx') && (
                        <div className="p-8 text-center h-[80vh] flex flex-col items-center justify-center rounded-2xl">
                          <DocumentIcon className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
                          <p className="text-text-secondary mb-4">
                            Preview not available for this file type
                          </p>
                          <a
                            href={viewingFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-primary text-white hover:bg-primary-dark"
                          >
                            Download File
                          </a>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="p-8 text-center h-[80vh] flex flex-col items-center justify-center rounded-2xl">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-text-secondary">Loading file...</p>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
