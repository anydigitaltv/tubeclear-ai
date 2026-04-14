import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLicenseKeys, type LicenseKeyType } from "@/contexts/LicenseKeyContext";
import { Key, Plus, Trash2, ToggleLeft, ToggleRight, Shield } from "lucide-react";
import { toast } from "sonner";

const LICENSE_KEY_TYPES: { value: LicenseKeyType; label: string; icon: string }[] = [
  { value: "gemini_api", label: "Google Gemini API", icon: "🤖" },
  { value: "openai_api", label: "OpenAI API", icon: "🧠" },
  { value: "claude_api", label: "Anthropic Claude API", icon: "💬" },
  { value: "vision_api", label: "Vision/Frame Analysis API", icon: "👁️" },
  { value: "audio_api", label: "Audio/Music Detection API", icon: "🎵" },
  { value: "custom_api", label: "Custom API", icon: "🔧" },
];

const LicenseKeyManager = () => {
  const { keys, addKey, removeKey, toggleKey, getKeyCount } = useLicenseKeys();
  const [isOpen, setIsOpen] = useState(false);
  const [newKeyType, setNewKeyType] = useState<LicenseKeyType>("gemini_api");
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");

  const handleAddKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the key");
      return;
    }
    if (!newKeyValue.trim()) {
      toast.error("Please enter the API key");
      return;
    }

    const success = await addKey(newKeyType, newKeyValue, newKeyName);
    if (success) {
      toast.success("License key added successfully!");
      setNewKeyName("");
      setNewKeyValue("");
      setIsOpen(false);
    } else {
      toast.error("Failed to add license key");
    }
  };

  const handleRemoveKey = async (id: string, name: string) => {
    if (confirm(`Remove "${name}"?`)) {
      const success = await removeKey(id);
      if (success) {
        toast.success("Key removed");
      }
    }
  };

  const handleToggleKey = async (id: string) => {
    await toggleKey(id);
  };

  const getKeyTypeLabel = (type: LicenseKeyType) => {
    return LICENSE_KEY_TYPES.find(t => t.value === type)?.label || type;
  };

  const getKeyTypeIcon = (type: LicenseKeyType) => {
    return LICENSE_KEY_TYPES.find(t => t.value === type)?.icon || "🔑";
  };

  const maskKey = (key: string) => {
    if (key.length <= 10) return key;
    return key.substring(0, 6) + "..." + key.substring(key.length - 4);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">License Keys</CardTitle>
              <CardDescription>
                Manage your API keys for advanced scanning features. Keys are stored locally on your device.
              </CardDescription>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New License Key</DialogTitle>
                <DialogDescription>
                  Add your API key to enable advanced scanning features. Keys are stored locally and never sent to our servers.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select value={newKeyType} onValueChange={(value) => setNewKeyType(value as LicenseKeyType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_KEY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Key Name</Label>
                  <Input
                    placeholder="e.g., My Gemini Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    placeholder="Enter your API key"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    type="password"
                  />
                </div>
                <Button onClick={handleAddKey} className="w-full">
                  <Key className="h-4 w-4 mr-2" />
                  Add License Key
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{getKeyCount()} active key(s)</span>
            <span className="text-xs">🔒 Stored locally on your device</span>
          </div>

          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No license keys added yet</p>
              <p className="text-xs mt-1">Add API keys to enable advanced scanning features</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`p-4 rounded-lg border transition-all ${
                    key.isActive
                      ? "bg-card border-border"
                      : "bg-muted/50 border-border/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getKeyTypeIcon(key.type)}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{key.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getKeyTypeLabel(key.type)}
                          </p>
                        </div>
                        <Badge variant={key.isActive ? "default" : "secondary"} className="text-xs">
                          {key.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <code className="bg-muted px-2 py-1 rounded font-mono">
                          {maskKey(key.key)}
                        </code>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Added: {new Date(key.createdAt).toLocaleDateString()}</span>
                        <span>Used: {key.usageCount} times</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleKey(key.id)}
                        title={key.isActive ? "Deactivate" : "Activate"}
                      >
                        {key.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveKey(key.id, key.name)}
                        className="text-destructive hover:text-destructive"
                        title="Remove key"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <strong>Privacy Note:</strong> All license keys are stored locally on your device using localStorage. 
              They are never transmitted to our servers. Keys are tied to your user account (if logged in) or device (if guest).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LicenseKeyManager;
