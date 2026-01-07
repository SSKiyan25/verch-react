"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FileText, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  isLoading?: boolean;
}

export function TermsModal({
  isOpen,
  onClose,
  onAccept,
  isLoading = false,
}: TermsModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [activeTab, setActiveTab] = useState("terms");

  const canProceed = termsAccepted && privacyAccepted;

  // Load content from API
  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoadingContent(true);

        const [termsResponse, privacyResponse] = await Promise.all([
          fetch("/api/content?type=terms"),
          fetch("/api/content?type=privacy"),
        ]);

        if (!termsResponse.ok || !privacyResponse.ok) {
          throw new Error("Failed to load content");
        }

        const [termsData, privacyData] = await Promise.all([
          termsResponse.json(),
          privacyResponse.json(),
        ]);

        setTermsContent(termsData.content || "");
        setPrivacyContent(privacyData.content || "");
      } catch (error) {
        console.error("Error loading terms content:", error);
        // Fallback content
        setTermsContent(
          "# Terms and Conditions\n\nTerms content could not be loaded. Please contact support."
        );
        setPrivacyContent(
          "# Privacy Policy\n\nPrivacy content could not be loaded. Please contact support."
        );
      } finally {
        setIsLoadingContent(false);
      }
    };

    if (isOpen) {
      loadContent();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTermsAccepted(false);
      setPrivacyAccepted(false);
      setActiveTab("terms");
    }
  }, [isOpen]);

  const handleAccept = () => {
    if (canProceed) {
      onAccept();
    }
  };

  const formatMarkdownContent = (content: string) => {
    // Simple markdown to HTML conversion for display
    return content
      .replace(
        /^# (.*$)/gm,
        '<h1 class="text-xl font-bold mb-4 text-foreground">$1</h1>'
      )
      .replace(
        /^## (.*$)/gm,
        '<h2 class="text-lg font-semibold mb-3 mt-6 text-foreground">$1</h2>'
      )
      .replace(
        /^### (.*$)/gm,
        '<h3 class="text-base font-medium mb-2 mt-4 text-foreground">$1</h3>'
      )
      .replace(
        /^\*\*(.*?)\*\*/gm,
        '<strong class="font-semibold text-foreground">$1</strong>'
      )
      .replace(
        /^- (.*$)/gm,
        '<li class="ml-4 mb-1 text-muted-foreground list-disc">$1</li>'
      )
      .replace(/\n\n/g, '</p><p class="mb-3 text-muted-foreground">')
      .replace(
        /^(?!<[h|l|s])/gm,
        '<p class="mb-3 text-muted-foreground leading-relaxed">'
      )
      .replace(/(?<!>)$/gm, "</p>");
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="w-[95vw] h-[90vh] max-w-4xl p-0 gap-0 sm:h-[85vh] bg-background"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 bg-muted/30">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Terms & Privacy Agreement
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground">
            Please review and accept our terms and privacy policy to continue
            using Verch.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted">
              <TabsTrigger
                value="terms"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Terms & Conditions</span>
                <span className="sm:hidden">Terms</span>
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Privacy Policy</span>
                <span className="sm:hidden">Privacy</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <TabsContent value="terms" className="h-full mt-0">
                <ScrollArea className="h-full pr-4">
                  {isLoadingContent ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-muted-foreground">
                        Loading terms...
                      </div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdownContent(termsContent),
                      }}
                    />
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="privacy" className="h-full mt-0">
                <ScrollArea className="h-full pr-4">
                  {isLoadingContent ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-muted-foreground">
                        Loading privacy policy...
                      </div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdownContent(privacyContent),
                      }}
                    />
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <Separator />

        {/* Footer with Checkboxes and Actions */}
        <DialogFooter className="p-4 sm:p-6 pt-4 bg-muted/10">
          <div className="w-full space-y-4">
            {/* Agreement Checkboxes */}
            <div className="flex flex-col space-y-4">
              <div
                className={`flex items-center space-x-3 p-3 rounded-lg border bg-background hover:bg-accent/5 transition-colors ${
                  isLoading ? "opacity-50" : ""
                }`}
              >
                <Checkbox
                  id="terms-checkbox"
                  checked={termsAccepted}
                  onCheckedChange={(checked) =>
                    setTermsAccepted(checked as boolean)
                  }
                  disabled={isLoading}
                  className="w-5 h-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                />
                <label
                  htmlFor="terms-checkbox"
                  className="text-sm text-foreground leading-relaxed cursor-pointer flex-1 flex items-center gap-2"
                >
                  {termsAccepted && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  I have read and agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("terms")}
                    className="text-primary hover:underline font-medium"
                    disabled={isLoading}
                  >
                    Terms and Conditions
                  </button>
                </label>
              </div>

              <div
                className={`flex items-center space-x-3 p-3 rounded-lg border bg-background hover:bg-accent/5 transition-colors ${
                  isLoading ? "opacity-50" : ""
                }`}
              >
                <Checkbox
                  id="privacy-checkbox"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) =>
                    setPrivacyAccepted(checked as boolean)
                  }
                  disabled={isLoading}
                  className="w-5 h-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                />
                <label
                  htmlFor="privacy-checkbox"
                  className="text-sm text-foreground leading-relaxed cursor-pointer flex-1 flex items-center gap-2"
                >
                  {privacyAccepted && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  I have read and agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("privacy")}
                    className="text-primary hover:underline font-medium"
                    disabled={isLoading}
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>

              {/* Warning if not all accepted */}
              {!canProceed && (termsAccepted || privacyAccepted) && (
                <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200 text-sm">
                    Please accept both terms and privacy policy to continue.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Sign Out
              </Button>
              <Button
                onClick={handleAccept}
                disabled={!canProceed || isLoading}
                className="w-full sm:w-auto min-w-[140px] bg-primary hover:bg-primary/90"
              >
                {isLoading ? "Updating..." : "Accept & Continue"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
