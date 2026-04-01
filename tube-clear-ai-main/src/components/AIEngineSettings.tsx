import { useState } from "react";
import { Key, Trash2, CheckCircle, AlertCircle, XCircle, Loader2, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAIEngines, type EngineId, type KeyStatus } from "@/contexts/AIEngineContext";
import { cn } from "@/lib/utils";

const getStatusColor = (status: KeyStatus): string => {
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
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "no_quota":
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case "invalid":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};

const getStatusLabel = (status: KeyStatus): string => {
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
  const { engines, apiKeys, currentEngine, setAPIKey, removeAPIKey, validateKey } = useAIEngines();
  const [editingKey, setEditingKey] = useState<EngineId | null>(null);
  const [inputKey, setInputKey] = useState("");
  const [validating, setValidating] = useState<EngineId | null>(null);
  const [saving, setSaving] = useState<EngineId | null>(null);

  const handleSave = async (engineId: EngineId) => {
    if (!inputKey.trim()) return;
    
    setSaving(engineId);
    await setAPIKey(engineId, inputKey.trim());
    setInputKey("");
    setEditingKey(null);
    setSaving(null);
    
    // Auto-validate after save
    setValidating(engineId);
    await validateKey(engineId);
    setValidating(null);
  };

  const handleValidate = async (engineId: EngineId) => {
    setValidating(engineId);
    await validateKey(engineId);
    setValidating(null);
  };

  const handleRemove = async (engineId: EngineId) => {
    await removeAPIKey(engineId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            AI Engine Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add your API keys below. Keys are stored locally in your browser and synced to cloud when logged in.
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>Ready</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>No Quota</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Invalid</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engine List */}
      <div className="space-y-3">
        {engines.map((engine) => {
          const keyData = apiKeys[engine.id];
          const hasKey = !!keyData?.key;
          const isActive = currentEngine === engine.id;
          const isEditing = editingKey === engine.id;
          const isValidating = validating === engine.id;
          const isSaving = saving === engine.id;

          return (
            <Card
              key={engine.id}
              className={cn(
                "glass-card transition-all duration-300",
                isActive && "border-green-500/30",
                !hasKey && "opacity-70"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Handshake Light */}
                  <div className="relative">
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        getStatusColor(keyData?.status || "unknown"),
                        keyData?.status === "ready" && "animate-pulse"
                      )}
                    />
                    {isActive && (
                      <div className="absolute -inset-1 rounded-full bg-green-500/20 animate-ping" />
                    )}
                  </div>

                  {/* Engine Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{engine.name}</h4>
                      <Badge variant="outline" className="text-[10px]">
                        Priority {engine.priority}
                      </Badge>
                      {isActive && (
                        <Badge className="bg-green-500/20 text-green-500 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="password"
                          placeholder={engine.keyPlaceholder}
                          value={inputKey}
                          onChange={(e) => setInputKey(e.target.value)}
                          className="flex-1 bg-secondary/50 h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="neon"
                          className="h-8 text-xs"
                          onClick={() => handleSave(engine.id)}
                          disabled={!inputKey.trim() || isSaving}
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => {
                            setEditingKey(null);
                            setInputKey("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        {hasKey ? (
                          <>
                            <span className="text-xs text-muted-foreground">
                              ••••••••{keyData.key.slice(-4)}
                            </span>
                            {getStatusIcon(keyData.status)}
                            <span className="text-xs text-muted-foreground">
                              {getStatusLabel(keyData.status)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No key set</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      {hasKey && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => handleValidate(engine.id)}
                            disabled={isValidating}
                          >
                            {isValidating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Validate"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => {
                              setEditingKey(engine.id);
                              setInputKey(keyData.key);
                            }}
                          >
                            <Key className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleRemove(engine.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {!hasKey && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => setEditingKey(engine.id)}
                        >
                          <Key className="h-3 w-3 mr-1" />
                          Add Key
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AIEngineSettings;
