import { useState } from "react";
import { Key, Trash2, CheckCircle, AlertCircle, XCircle, Loader2, Cpu, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAIEngines, type EngineId, type KeyStatus, type APIKeyEntry } from "@/contexts/AIEngineContext";
import { cn } from "@/lib/utils";

const getStatusColor = (status: KeyStatus, isExhausted?: boolean): string => {
  if (isExhausted) return "bg-orange-500";
  switch (status) {
    case "ready":
      return "bg-green-500";
    case "no_quota":
      return "bg-orange-500";
    case "invalid":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
};

const getStatusIcon = (status: KeyStatus): React.ReactNode => {
  switch (status) {
    case "ready":
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case "no_quota":
      return <AlertCircle className="h-3 w-3 text-orange-500" />;
    case "invalid":
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
};

const getStatusLabel = (status: KeyStatus, isExhausted?: boolean): string => {
  if (isExhausted) return "Rate Limited";
  switch (status) {
    case "ready":
      return "Ready";
    case "no_quota":
      return "No Quota";
    case "invalid":
      return "Invalid";
    default:
      return "Not Set";
  }
};

const AIEngineSettings = () => {
  const { engines, pools, currentEngine, addKey, removeKey, validateKey, checkPoolHealth } = useAIEngines();
  const [editingEngine, setEditingEngine] = useState<EngineId | null>(null);
  const [inputKey, setInputKey] = useState("");
  const [validating, setValidating] = useState<string | null>(null);
  const [saving, setSaving] = useState<EngineId | null>(null);

  const handleAddKey = async (engineId: EngineId) => {
    if (!inputKey.trim()) return;
    
    setSaving(engineId);
    await addKey(engineId, inputKey.trim());
    setInputKey("");
    setEditingEngine(null);
    setSaving(null);
    
    // Auto-validate new key
    await validateKey(engineId);
  };

  const handleValidateKey = async (engineId: EngineId, keyId: string) => {
    setValidating(keyId);
    await validateKey(engineId, keyId);
    setValidating(null);
  };

  const handleValidateAll = async (engineId: EngineId) => {
    setValidating(engineId);
    await validateKey(engineId);
    setValidating(null);
  };

  const handleRemoveKey = async (engineId: EngineId, keyId: string) => {
    await removeKey(engineId, keyId);
  };

  const poolHealth = checkPoolHealth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Infinite API Pool
          </CardTitle>
          <CardDescription>
            Add unlimited API keys. Auto-rotation activates on rate limits. Keys stay in your browser.
          </CardDescription>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>Ready</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>Rate Limited</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Invalid</span>
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              Pool: {poolHealth.activeKeys}/{poolHealth.totalKeys} active
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Engine Pools */}
      <div className="space-y-4">
        {engines.map((engine) => {
          const pool = pools[engine.id];
          const isActive = currentEngine === engine.id;
          const isEditing = editingEngine === engine.id;
          const isSaving = saving === engine.id;
          const isPoolValidating = validating === engine.id;

          const activeKeys = pool?.keys.filter(k => !k.isExhausted && k.status === "ready").length || 0;
          const totalKeys = pool?.keys.length || 0;

          return (
            <Card
              key={engine.id}
              className={cn(
                "glass-card transition-all duration-300",
                isActive && "border-green-500/30"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{engine.name}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {engine.role === "visual" ? "Visual Scan" : "Policy Audit"}
                    </Badge>
                    {isActive && (
                      <Badge className="bg-green-500/20 text-green-500 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeKeys}/{totalKeys} keys ready
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Add Key Input */}
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      placeholder={engine.keyPlaceholder}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="flex-1 bg-secondary/50 h-9 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="neon"
                      className="h-9 text-xs"
                      onClick={() => handleAddKey(engine.id)}
                      disabled={!inputKey.trim() || isSaving}
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 text-xs"
                      onClick={() => {
                        setEditingEngine(null);
                        setInputKey("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-9 text-xs"
                    onClick={() => setEditingEngine(engine.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Key
                  </Button>
                )}

                {/* Key List */}
                {totalKeys > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Key Pool</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px]"
                        onClick={() => handleValidateAll(engine.id)}
                        disabled={isPoolValidating}
                      >
                        {isPoolValidating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Validate All"
                        )}
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {pool.keys.map((keyData: APIKeyEntry, index: number) => (
                        <div
                          key={keyData.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md bg-secondary/30",
                            pool.activeKeyIndex === index && "border border-green-500/30"
                          )}
                        >
                          {/* Status Indicator */}
                          <div className="relative">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                getStatusColor(keyData.status, keyData.isExhausted)
                              )}
                            />
                          </div>

                          {/* Key Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground font-mono">
                                ••••{keyData.key.slice(-4)}
                              </span>
                              {getStatusIcon(keyData.status)}
                              {pool.activeKeyIndex === index && (
                                <Badge className="bg-green-500/20 text-green-500 text-[9px] px-1.5">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                {getStatusLabel(keyData.status, keyData.isExhausted)}
                              </span>
                              {keyData.usageCount > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  • {keyData.usageCount} uses
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleValidateKey(engine.id, keyData.id)}
                              disabled={validating === keyData.id}
                            >
                              {validating === keyData.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveKey(engine.id, keyData.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="glass-card border-blue-500/20">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-2">How Infinite Rotation Works</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Add as many API keys as you want (no limit)</li>
            <li>• Keys are stored locally in your browser (BYOK privacy)</li>
            <li>• When a key hits rate limit (429), auto-switch to next key</li>
            <li>• Gemini handles visual/video scanning</li>
            <li>• Groq handles fast policy auditing</li>
            <li>• Scans continue uninterrupted while keys are available</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIEngineSettings;
