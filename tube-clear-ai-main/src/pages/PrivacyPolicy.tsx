import { useState } from "react";
import { Shield, FileText, Download, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDynamicCompliance } from "@/contexts/DynamicComplianceContext";
import { cn } from "@/lib/utils";

const PrivacyPolicyPage = () => {
  const {
    privacyPolicy,
    termsOfService,
    activeFeatures,
    generatePrivacyPolicy,
    generateTermsOfService,
    getComplianceStatus,
    exportPolicy,
  } = useDynamicCompliance();

  const [isRegenerating, setIsRegenerating] = useState(false);
  const compliance = getComplianceStatus();

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    generatePrivacyPolicy();
    generateTermsOfService();
    setIsRegenerating(false);
  };

  const handleDownload = (type: "privacy" | "terms") => {
    const content = exportPolicy(type);
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type === "privacy" ? "privacy-policy" : "terms-of-service"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gradient">Dynamic Compliance</h1>
            <p className="text-sm text-muted-foreground">Self-healing privacy policy & terms</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={compliance.compliant ? "default" : "destructive"} className="gap-1">
            {compliance.compliant ? (
              <>
                <Check className="h-3 w-3" />
                Compliant
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3" />
                {compliance.missing.length} Issues
              </>
            )}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isRegenerating}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRegenerating && "animate-spin")} />
            Regenerate
          </Button>
        </div>
      </div>

      <Card className="glass-card border-border/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Active Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {activeFeatures.map((feature) => (
              <Badge key={feature} variant="secondary" className="capitalize">
                {feature}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="privacy" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
            <TabsTrigger value="terms">Terms of Service</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => handleDownload("privacy")}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <TabsContent value="privacy" className="mt-4">
          <Card className="glass-card border-border/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Privacy Policy
                </CardTitle>
                {privacyPolicy && (
                  <span className="text-xs text-muted-foreground">
                    v{privacyPolicy.version.split(".")[1]?.slice(0, 8)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {privacyPolicy ? (
                <ScrollArea className="h-[500px]">
                  <Accordion type="multiple" className="w-full space-y-2">
                    {privacyPolicy.sections.map((section) => (
                      <AccordionItem key={section.id} value={section.id} className="border border-border/30 rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{section.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {section.platform}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-2 pb-4 space-y-2">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {section.content}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Required features: {section.requiredFeatures.join(", ") || "None"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last updated: {new Date(section.lastUpdated).toLocaleString()}
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No privacy policy generated yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="mt-4">
          <Card className="glass-card border-border/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Terms of Service
                </CardTitle>
                {termsOfService && (
                  <span className="text-xs text-muted-foreground">
                    v{termsOfService.version.split(".")[1]?.slice(0, 8)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {termsOfService ? (
                <ScrollArea className="h-[500px]">
                  <Accordion type="multiple" className="w-full space-y-2">
                    {termsOfService.sections.map((section) => (
                      <AccordionItem key={section.id} value={section.id} className="border border-border/30 rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{section.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {section.platform}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-2 pb-4 space-y-2">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {section.content}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Required features: {section.requiredFeatures.join(", ") || "None"}
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No terms of service generated yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrivacyPolicyPage;
