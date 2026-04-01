import { useState, useRef } from "react";
import { FileText, Upload, X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDispute, type DisputeType, type Dispute } from "@/contexts/DisputeContext";
import { cn } from "@/lib/utils";

const DisputeForm = () => {
  const { createDispute, getUserDisputes, performOCRAnalysis } = useDispute();
  
  const [issueType, setIssueType] = useState<DisputeType>("missing_coins");
  const [tid, setTid] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tid.trim()) {
      alert("Please enter Transaction ID");
      return;
    }

    setIsSubmitting(true);

    try {
      await createDispute({
        userId: "current-user-id", // Would come from auth context
        type: issueType,
        tid: tid.trim(),
        description,
        screenshotUrl: screenshot?.name,
      });
      
      // Reset form
      setIssueType("missing_coins");
      setTid("");
      setDescription("");
      setScreenshot(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error creating dispute:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const userDisputes = getUserDisputes();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/20 text-green-500";
      case "rejected": return "bg-red-500/20 text-red-500";
      case "pending": return "bg-yellow-500/20 text-yellow-500";
      case "ai_reviewing": return "bg-blue-500/20 text-blue-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Dispute Form */}
      <Card className="glass-card border-border/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Report Payment Issue</CardTitle>
              <CardDescription>AI Doctor will review your dispute automatically</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Issue Type */}
            <div className="space-y-2">
              <Label htmlFor="issue-type">Issue Type</Label>
              <Select value={issueType} onValueChange={(v) => setIssueType(v as DisputeType)}>
                <SelectTrigger id="issue-type">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing_coins">Missing Coins</SelectItem>
                  <SelectItem value="wrong_amount">Wrong Amount</SelectItem>
                  <SelectItem value="tid_not_found">TID Not Found</SelectItem>
                  <SelectItem value="screenshot_rejected">Screenshot Rejected</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction ID */}
            <div className="space-y-2">
              <Label htmlFor="tid">Transaction ID (TID)</Label>
              <Input
                id="tid"
                placeholder="Enter Transaction ID"
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-2">
              <Label>Receipt Screenshot (Optional)</Label>
              <div
                className="border-2 border-dashed border-border/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {screenshot ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">{screenshot.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScreenshot(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload receipt</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI Doctor will verify authenticity
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !tid.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI Doctor Reviewing...
                </>
              ) : (
                "Submit Dispute"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dispute History */}
      <Card className="glass-card border-border/20">
        <CardHeader>
          <CardTitle className="text-lg">Dispute History</CardTitle>
        </CardHeader>
        <CardContent>
          {userDisputes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No disputes yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {userDisputes.map((dispute) => (
                  <DisputeHistoryItem key={dispute.id} dispute={dispute} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const DisputeHistoryItem = ({ dispute }: { dispute: Dispute }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/20 text-green-500";
      case "rejected": return "bg-red-500/20 text-red-500";
      case "pending": return "bg-yellow-500/20 text-yellow-500";
      case "ai_reviewing": return "bg-blue-500/20 text-blue-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-4 rounded-lg bg-secondary/30 border border-border/30 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium capitalize">{dispute.type.replace("_", " ")}</span>
          <Badge className={cn("text-xs", getStatusColor(dispute.status))}>
            {dispute.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">TID: {dispute.tid}</p>
        <p className="text-xs text-muted-foreground mt-1">{dispute.description}</p>
        
        {dispute.aiDecision && (
          <div className={cn(
            "mt-2 p-2 rounded text-xs",
            dispute.aiDecision.verdict === "approved"
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          )}>
            <div className="flex items-center gap-2">
              {dispute.aiDecision.verdict === "approved" ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              <span>{dispute.aiDecision.reason}</span>
            </div>
          </div>
        )}
        
        {dispute.coinsAwarded && (
          <p className="text-xs text-green-500 mt-1">+{dispute.coinsAwarded} coins awarded</p>
        )}
        
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(dispute.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
    </div>
  );
};

export default DisputeForm;
