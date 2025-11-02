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
} from "@/types/onboarding";
import type { Household } from "@/types/household";

const initialOnboardingSteps = [
  { label: "Household", description: "Add your property" },
  { label: "Landlord", description: "Your details" },
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
    phone_number: "",
  });

  // Step 3: Uploaded files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Step 4: Extracted tenants
  const [extractedTenants, setExtractedTenants] = useState<
    (ExtractedTenantData & { id: string; isEditing?: boolean })[]
  >([]);
  const [addedTenantIds, setAddedTenantIds] = useState<Set<string>>(new Set());

  // Initialize step based on onboarding status
  useEffect(() => {
    if (session?.user) {
      const isOnboarded = (session.user as any).is_onboarded || false;
      // Start at intro card (step 0) for existing landlords, step 1 for new landlords
      setCurrentStep(isOnboarded ? 0 : 1);

      setLandlordData({
        first_name: (session.user as any).first_name || "",
        last_name: (session.user as any).last_name || "",
        phone_number: (session.user as any).phone_number || "",
      });
    }
  }, [session]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? {
                  ...f,
                  status: "uploaded" as const,
                  progress: 100,
                  agreementId: agreement.id,
                }
              : f
          )
        );
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

      // Add to extracted tenants if data was found
      if (agreement.extracted_data) {
        const hasData =
          agreement.extracted_data.first_name ||
          agreement.extracted_data.last_name ||
          agreement.extracted_data.email;

        if (hasData) {
          setExtractedTenants((prev) => [
            ...prev,
            { ...agreement.extracted_data!, id: `tenant-${Date.now()}` },
          ]);
        }
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
  };

  // Continue to step 4
  const handleContinueToStep4 = () => {
    setCurrentStep(4);
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
    setError(null);
    setIsLoading(true);

    try {
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return "📄";
      case "jpg":
      case "jpeg":
      case "png":
        return "🖼️";
      case "xlsx":
      case "xls":
        return "📊";
      case "doc":
      case "docx":
        return "📝";
      default:
        return "📎";
    }
  };

  // Get actual step number for display (skip intro card)
  const actualStep = isOnboarded && currentStep === 0 ? 0 : currentStep;

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold text-text-primary mb-2">
            {isOnboarded ? "Add New Household" : "Welcome! Let's get you set up"}
          </h1>
          <p className="text-lg text-text-secondary">
            {isOnboarded
              ? "Add another property to your portfolio"
              : "We'll guide you through adding your first household and tenants"}
          </p>
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
              title="Your Details"
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
              <Input
                label="Email"
                type="email"
                value={session.user?.email || ""}
                disabled
                helperText="Email cannot be changed"
              />
              <div className="flex gap-4">
                <Button variant="secondary" onClick={handleBack} fullWidth>
                  Back
                </Button>
                <Button
                  onClick={handleUpdateLandlord}
                  isLoading={isLoading}
                  disabled={
                    !landlordData.first_name || !landlordData.last_name
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
                          <span className="text-2xl">{getFileIcon(file.name)}</span>
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
                                file.extractedData && (
                                  <div className="bg-success/10 border border-success/20 rounded-lg p-3 mt-2">
                                    <p className="text-sm font-medium text-success mb-2">
                                      Tenant data extracted successfully
                                    </p>
                                    <div className="text-sm text-text-secondary space-y-1">
                                      {file.extractedData.first_name && (
                                        <p>
                                          Name: {file.extractedData.first_name}{" "}
                                          {file.extractedData.last_name}
                                        </p>
                                      )}
                                      {file.extractedData.email && (
                                        <p>Email: {file.extractedData.email}</p>
                                      )}
                                      {file.extractedData.phone_number && (
                                        <p>
                                          Phone: {file.extractedData.phone_number}
                                        </p>
                                      )}
                                    </div>
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

                        {/* Remove button */}
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-text-tertiary hover:text-error transition-colors"
                        >
                          <svg
                            className="w-5 h-5"
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
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button variant="secondary" onClick={handleBack} fullWidth>
                  Back
                </Button>
                <Button onClick={handleContinueToStep4} fullWidth size="lg">
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
              {extractedTenants.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-4">
                    No tenants extracted yet. You can add them manually.
                  </p>
                  <Button variant="secondary" onClick={handleAddManualTenant}>
                    Add Tenant Manually
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {extractedTenants.map((tenant) => (
                    <Card
                      key={tenant.id}
                      padding="md"
                      className="border border-border"
                    >
                      <div className="space-y-4">
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
                        <div className="flex gap-3">
                          {addedTenantIds.has(tenant.id) ? (
                            <div className="flex items-center gap-2 text-success flex-1">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span className="font-medium">Tenant Added</span>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleAddTenant(tenant.id)}
                              isLoading={isLoading}
                              fullWidth
                            >
                              Add Tenant
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            onClick={() => handleRemoveTenant(tenant.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  <Button
                    variant="secondary"
                    onClick={handleAddManualTenant}
                    fullWidth
                  >
                    Add Another Tenant Manually
                  </Button>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button variant="secondary" onClick={handleBack} fullWidth>
                  Back
                </Button>
                <Button
                  onClick={handleCompleteOnboarding}
                  isLoading={isLoading}
                  fullWidth
                  size="lg"
                >
                  Complete Onboarding
                </Button>
              </div>
            </FormSection>
          )}
        </Card>
      </div>
    </div>
  );
}
