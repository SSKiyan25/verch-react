/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Sparkles } from "lucide-react";
import { Organization, CreateOrganizationData } from "@/lib/types/organization";
import { EmailStep } from "./steps/EmailStep";
import { VerificationStep } from "./steps/VerificationStep";
import { DetailsStep } from "./steps/DetailsStep";
import { CompleteStep } from "./steps/CompleteStep";

interface OrganizationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
  onSubmit: (data: CreateOrganizationData | Partial<Organization>) => void;
}

type FormStep = "email" | "verification" | "details" | "complete";

export function OrganizationFormDialog({
  open,
  onOpenChange,
  organization,
  onSubmit,
}: OrganizationFormDialogProps) {
  const isEditing = !!organization;
  const CREATE_STEPS: FormStep[] = [
    "email",
    "verification",
    "details",
    "complete",
  ];
  const EDIT_STEPS: FormStep[] = ["details", "complete"];

  const [currentStep, setCurrentStep] = useState<FormStep>(
    isEditing ? "details" : "email"
  );

  const [formData, setFormData] = useState({
    email: organization?.contact_email || "",
    name: organization?.name || "",
    description: organization?.description || "",
    logoUrl: organization?.logo_image_url || "",
    contactNumber: organization?.phone_number || "",
    commissionRate: organization?.settings?.commissionRate || 5.0,
    status: mapOrganizationStatusToFormStatus(organization?.status || "draft"),
    isVerified: organization?.is_verified || false,
    password: "",
    confirmPassword: "",
  });

  function mapOrganizationStatusToFormStatus(
    orgStatus: Organization["status"]
  ): "active" | "inactive" | "pending" {
    switch (orgStatus) {
      case "active":
        return "active";
      case "suspended":
      case "archived":
        return "inactive";
      default:
        return "pending";
    }
  }

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep(isEditing ? "details" : "email");
      setFormData({
        email: organization?.contact_email || "",
        name: organization?.name || "",
        description: organization?.description || "",
        logoUrl: organization?.logo_image_url || "",
        contactNumber: organization?.phone_number || "",
        commissionRate: organization?.settings?.commissionRate || 5.0,
        status: mapOrganizationStatusToFormStatus(
          organization?.status || "draft"
        ),
        isVerified: organization?.is_verified || false,
        password: "",
        confirmPassword: "",
      });
    }
    onOpenChange(newOpen);
  };

  const nextStep = () => {
    const steps = isEditing ? EDIT_STEPS : CREATE_STEPS;
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps = isEditing ? EDIT_STEPS : CREATE_STEPS;
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleFormSubmit = async () => {
    try {
      if (isEditing) {
        // Handle editing
        const transformedData = {
          name: formData.name,
          description: formData.description,
          phone_number: formData.contactNumber,
          logo_image_url: formData.logoUrl,
          settings: {
            businessHours: organization?.settings?.businessHours || {},
            commissionRate: formData.commissionRate,
            autoAcceptOrders: organization?.settings?.autoAcceptOrders || false,
            requireOrderApproval:
              organization?.settings?.requireOrderApproval || true,
          },
          status: organization?.status || "draft",
          is_verified: formData.isVerified,
        };

        onSubmit(transformedData);
        setCurrentStep("complete");
      } else {
        // Handle creation - call API
        const response = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        // Transform for parent
        const transformedData: CreateOrganizationData = {
          name: result.organization.name,
          contact_email: result.organization.contact_email,
          phone_number: result.organization.phone_number,
          description: result.organization.description,
          settings: result.organization.settings,
        };

        onSubmit(transformedData);
        setCurrentStep("complete");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "email":
        return (
          <EmailStep
            formData={formData}
            setFormData={setFormData}
            onNext={nextStep}
          />
        );
      case "verification":
        return (
          <VerificationStep
            formData={formData}
            setFormData={setFormData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case "details":
        return (
          <DetailsStep
            formData={formData}
            setFormData={setFormData}
            isEditing={isEditing}
            onSubmit={handleFormSubmit}
            onPrev={isEditing ? undefined : prevStep}
          />
        );
      case "complete":
        return (
          <CompleteStep
            formData={formData}
            isEditing={isEditing}
            onClose={() => handleDialogClose(false)}
          />
        );
      default:
        return null;
    }
  };

  const steps = isEditing ? EDIT_STEPS : CREATE_STEPS;
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {isEditing ? (
              <>
                <Building2 className="w-5 h-5 text-primary" />
                Edit Organization
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-primary" />
                Create New Organization
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((step, index) => {
            const isActive = currentStep === step;
            const isCompleted = currentStepIndex > index;
            return (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      isCompleted ? "bg-primary/20" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {renderCurrentStep()}
      </DialogContent>
    </Dialog>
  );
}
