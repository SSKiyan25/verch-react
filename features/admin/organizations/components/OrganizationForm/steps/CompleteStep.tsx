"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Building2, Mail, Phone, X } from "lucide-react";

interface CompleteStepProps {
  formData: {
    email: string;
    name: string;
    description: string;
    logoUrl: string;
    contactNumber: string;
    commissionRate: number;
    status: "active" | "inactive" | "pending";
    isVerified: boolean;
    password: string;
    confirmPassword: string;
  };
  isEditing: boolean;
  onClose: () => void;
}

export function CompleteStep({
  formData,
  isEditing,
  onClose,
}: CompleteStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {isEditing
            ? "Organization Updated Successfully!"
            : "Organization Created Successfully!"}
        </h3>
        <p className="text-muted-foreground mt-2">
          {isEditing
            ? "Your organization information has been updated."
            : "Your organization has been created and is ready to use."}
        </p>
      </div>

      {/* Organization Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">
                {formData.name}
              </h4>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {formData.description}
              </p>

              <div className="flex flex-col gap-1 mt-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{formData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{formData.contactNumber}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    formData.status === "active"
                      ? "bg-primary/10 text-primary"
                      : formData.status === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {formData.status}
                </span>
                {formData.isVerified && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    Verified
                  </span>
                )}
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent-foreground">
                  {formData.commissionRate}% commission
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      {!isEditing && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-3">Next Steps</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>
                  Check your email for login credentials and setup instructions
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>
                  Complete your organization profile with additional details
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>
                  Start creating and managing your organization&apos;s orders
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Close button */}
      <Button onClick={onClose} className="w-full" size="lg">
        <X className="w-4 h-4 mr-2" />
        Close
      </Button>
    </div>
  );
}
