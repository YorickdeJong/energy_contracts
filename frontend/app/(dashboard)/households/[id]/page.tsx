"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, Button, Modal, Input, Badge, Avatar } from "@/app/components/ui";
import FileUpload from "@/app/components/ui/FileUpload";
import { householdsAPI, tenanciesAPI } from "@/lib/api";
import type { Household, HouseholdMembership } from "@/types/household";
import type { TenancyListItem } from "@/types/tenancy";
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  EyeIcon,
  ClipboardDocumentListIcon,
  BoltIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

export default function HouseholdDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const householdId = parseInt(params.id as string);

  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMembership[]>([]);
  const [tenancies, setTenancies] = useState<TenancyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState("");

  // File upload states - modal-based per tenancy
  const [uploadTenancyId, setUploadTenancyId] = useState<number | null>(null);
  const [uploadInventoryTenancyId, setUploadInventoryTenancyId] = useState<number | null>(null);
  const [uploadCheckoutTenancyId, setUploadCheckoutTenancyId] = useState<number | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadingInventoryReport, setUploadingInventoryReport] = useState(false);
  const [uploadingCheckoutReading, setUploadingCheckoutReading] = useState(false);

  useEffect(() => {
    if (session) {
      loadHousehold();
      loadMembers();
      loadTenancies();
    }
  }, [householdId, session]);

  const loadHousehold = async () => {
    try {
      const accessToken = (session as any)?.accessToken;
      if (!accessToken) {
        setError("No access token found. Please log in again.");
        return;
      }

      const data = await householdsAPI.get(householdId, accessToken);
      setHousehold(data);
    } catch (error) {
      console.error("Failed to load household", error);
      setError("Failed to load household");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const accessToken = (session as any)?.accessToken;
      if (!accessToken) {
        setError("No access token found. Please log in again.");
        return;
      }

      const data = await householdsAPI.getMembers(householdId, accessToken);
      setMembers(data.members || data);
    } catch (error) {
      console.error("Failed to load members", error);
      setError("Failed to load members");
    }
  };

  const loadTenancies = async () => {
    try {
      const accessToken = (session as any)?.accessToken;
      if (!accessToken) {
        return;
      }

      const data = await tenanciesAPI.list(accessToken, { household: householdId });
      setTenancies(data.results || []);
    } catch (error) {
      console.error("Failed to load tenancies", error);
    }
  };

  const handleAddMember = async (email: string, firstName?: string, lastName?: string) => {
    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
      setError("No access token found. Please log in again.");
      return;
    }

    await householdsAPI.addMember(householdId, email, accessToken, firstName, lastName);
    loadMembers();
    setIsAddMemberModalOpen(false);
  };

  const handleRemoveMember = async (userId: number) => {
    if (confirm("Are you sure you want to remove this tenant?")) {
      const accessToken = (session as any)?.accessToken;
      if (!accessToken) {
        setError("No access token found. Please log in again.");
        return;
      }

      await householdsAPI.removeMember(householdId, userId, accessToken);
      loadMembers();
    }
  };

  const handleDelete = async () => {
    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
      setError("No access token found. Please log in again.");
      return;
    }

    await householdsAPI.delete(householdId, accessToken);
    router.push("/households");
  };

  const handleUploadProof = async (file: File) => {
    if (!uploadTenancyId) return;

    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
      setError("No access token found. Please log in again.");
      return;
    }

    setUploadingProof(true);
    try {
      await tenanciesAPI.uploadProof(uploadTenancyId, file, accessToken);
      await loadTenancies(); // Reload to show updated document
      setUploadTenancyId(null); // Close modal
    } catch (error) {
      console.error("Failed to upload proof document", error);
      setError("Failed to upload document");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleUploadInventoryReport = async (file: File) => {
    if (!uploadInventoryTenancyId) return;

    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
      setError("No access token found. Please log in again.");
      return;
    }

    setUploadingInventoryReport(true);
    try {
      await tenanciesAPI.uploadInventoryReport(uploadInventoryTenancyId, file, accessToken);
      await loadTenancies(); // Reload to show updated document
      setUploadInventoryTenancyId(null); // Close modal
    } catch (error) {
      console.error("Failed to upload inventory report", error);
      setError("Failed to upload inventory report");
    } finally {
      setUploadingInventoryReport(false);
    }
  };

  const handleUploadCheckoutReading = async (file: File) => {
    if (!uploadCheckoutTenancyId) return;

    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
      setError("No access token found. Please log in again.");
      return;
    }

    setUploadingCheckoutReading(true);
    try {
      await tenanciesAPI.uploadCheckoutReading(uploadCheckoutTenancyId, file, accessToken);
      await loadTenancies(); // Reload to show updated document
      setUploadCheckoutTenancyId(null); // Close modal
    } catch (error) {
      console.error("Failed to upload checkout reading", error);
      setError("Failed to upload checkout reading");
    } finally {
      setUploadingCheckoutReading(false);
    }
  };

  if (isLoading || !household) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-error/10 p-4 border border-error/20">
          <div className="text-sm text-error">{error}</div>
        </div>
      )}

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

      {/* Landlord Information */}
      {household.landlord && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <UserIcon className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-xl font-medium text-text-primary">Landlord</h2>
          </div>
          <div className="flex items-center space-x-4">
            <Avatar
              alt={(household.landlord.first_name || household.landlord.email || "Landlord")}
              fallbackText={(household.landlord.first_name || household.landlord.email || "L")}
              size="lg"
            />
            <div className="flex-1">
              <p className="font-semibold text-text-primary text-lg">
                {household.landlord.first_name || ""} {household.landlord.last_name || ""}
                {!household.landlord.first_name && !household.landlord.last_name && household.landlord.email}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-sm text-text-secondary">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  <a
                    href={`mailto:${household.landlord.email}`}
                    className="hover:text-primary transition-colors"
                  >
                    {household.landlord.email}
                  </a>
                </div>
                {household.landlord.phone_number && (
                  <div className="flex items-center text-sm text-text-secondary">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    <a
                      href={`tel:${household.landlord.phone_number}`}
                      className="hover:text-primary transition-colors"
                    >
                      {household.landlord.phone_number}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

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

      {/* Tenancies Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-xl font-medium text-text-primary">
              Tenancy Agreements ({tenancies.length})
            </h2>
          </div>
        </div>

        {tenancies.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            No tenancy agreements yet.
          </div>
        ) : (
          <div className="space-y-4">
            {tenancies.map((tenancy) => (
              <div
                key={tenancy.id}
                className="p-4 rounded-lg bg-gray-100/80 hover:bg-gray-200/80 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-text-primary">
                        {tenancy.name || `Tenancy #${tenancy.id}`}
                      </h3>
                      <Badge
                        variant={
                          tenancy.status === 'active'
                            ? 'success'
                            : tenancy.status === 'future'
                            ? 'primary'
                            : tenancy.status === 'moving_out'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {tenancy.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="flex items-center text-sm text-text-secondary">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <span>
                          {new Date(tenancy.start_date).toLocaleDateString()}
                          {tenancy.end_date && ` - ${new Date(tenancy.end_date).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-text-secondary">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                        <span>€{Number(tenancy.monthly_rent).toFixed(2)}/month</span>
                      </div>
                    </div>

                    {tenancy.renters && tenancy.renters.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-text-tertiary mb-2">Renters:</p>
                        <div className="flex flex-wrap gap-2">
                          {tenancy.renters.map((renter) => (
                            <div
                              key={renter.id}
                              className="flex items-center gap-2 px-3 py-1 bg-background rounded-full text-sm"
                            >
                              <span className="text-text-primary">
                                {renter.user.first_name} {renter.user.last_name}
                              </span>
                              {renter.is_primary && (
                                <span className="text-xs text-primary">Primary</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Actions */}
                  <div className="ml-4 flex flex-col gap-2">
                    {/* Proof Document */}
                    <div className="flex gap-2">
                      {tenancy.proof_document && (
                        <a
                          href={tenancy.proof_document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-xs"
                          title="View proof document"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span className="font-medium">Proof</span>
                        </a>
                      )}
                      <button
                        onClick={() => setUploadTenancyId(tenancy.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors text-xs"
                        title={tenancy.proof_document ? 'Re-upload proof document' : 'Upload proof document'}
                      >
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        <span className="font-medium">
                          {tenancy.proof_document ? 'Re-upload' : 'Upload'}
                        </span>
                      </button>
                    </div>

                    {/* Inventory Report */}
                    <div className="flex gap-2">
                      {tenancy.inventory_report && (
                        <a
                          href={tenancy.inventory_report}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-xs"
                          title="View inventory report"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span className="font-medium">Inventory</span>
                        </a>
                      )}
                      <button
                        onClick={() => setUploadInventoryTenancyId(tenancy.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors text-xs"
                        title={tenancy.inventory_report ? 'Re-upload inventory report' : 'Upload inventory report'}
                      >
                        <ClipboardDocumentListIcon className="h-4 w-4" />
                        <span className="font-medium">
                          {tenancy.inventory_report ? 'Update' : 'Upload'}
                        </span>
                      </button>
                    </div>

                    {/* Checkout Reading */}
                    <div className="flex gap-2">
                      {tenancy.checkout_reading && (
                        <a
                          href={tenancy.checkout_reading}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-xs"
                          title="View checkout reading"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span className="font-medium">Reading</span>
                        </a>
                      )}
                      <button
                        onClick={() => setUploadCheckoutTenancyId(tenancy.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors text-xs"
                        title={tenancy.checkout_reading ? 'Re-upload checkout reading' : 'Upload checkout reading'}
                      >
                        <BoltIcon className="h-4 w-4" />
                        <span className="font-medium">
                          {tenancy.checkout_reading ? 'Update' : 'Upload'}
                        </span>
                      </button>
                    </div>
                  </div>
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

      {/* Upload Proof Document Modal */}
      <Modal
        isOpen={uploadTenancyId !== null}
        onClose={() => setUploadTenancyId(null)}
        title="Upload Proof Document"
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            Upload or replace the proof document for this tenancy. Accepted formats: PDF, DOCX, DOC, JPG, PNG.
          </p>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleUploadProof(file);
              }
            }}
            disabled={uploadingProof}
            className="w-full text-sm text-text-secondary
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-primary/10 file:text-primary
              hover:file:bg-primary/20
              file:cursor-pointer cursor-pointer"
          />
          {uploadingProof && (
            <div className="text-sm text-text-secondary">Uploading...</div>
          )}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setUploadTenancyId(null)}
              disabled={uploadingProof}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload Inventory Report Modal */}
      <Modal
        isOpen={uploadInventoryTenancyId !== null}
        onClose={() => setUploadInventoryTenancyId(null)}
        title="Upload Inventory Report"
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            Upload or replace the inventory report for this tenancy. Accepted formats: PDF, DOCX, DOC, JPG, PNG.
          </p>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleUploadInventoryReport(file);
              }
            }}
            disabled={uploadingInventoryReport}
            className="w-full text-sm text-text-secondary
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-primary/10 file:text-primary
              hover:file:bg-primary/20
              file:cursor-pointer cursor-pointer"
          />
          {uploadingInventoryReport && (
            <div className="text-sm text-text-secondary">Uploading...</div>
          )}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setUploadInventoryTenancyId(null)}
              disabled={uploadingInventoryReport}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload Checkout Reading Modal */}
      <Modal
        isOpen={uploadCheckoutTenancyId !== null}
        onClose={() => setUploadCheckoutTenancyId(null)}
        title="Upload Checkout Reading"
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            Upload or replace the checkout reading for this tenancy. Accepted formats: PDF, XLSX, XLS, JPG, PNG.
          </p>
          <input
            type="file"
            accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleUploadCheckoutReading(file);
              }
            }}
            disabled={uploadingCheckoutReading}
            className="w-full text-sm text-text-secondary
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-primary/10 file:text-primary
              hover:file:bg-primary/20
              file:cursor-pointer cursor-pointer"
          />
          {uploadingCheckoutReading && (
            <div className="text-sm text-text-secondary">Uploading...</div>
          )}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setUploadCheckoutTenancyId(null)}
              disabled={uploadingCheckoutReading}
            >
              Cancel
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
