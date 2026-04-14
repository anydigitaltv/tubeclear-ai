import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

interface APIKey {
  id: string;
  name: string;
  key: string;
  provider: 'gemini' | 'groq' | 'openai';
  addedAt: string;
  lastUsed: string | null;
  usageCount: number;
  quotaUsed: number; // percentage
  status: 'active' | 'rate_limited' | 'expired' | 'error';
}

const STORAGE_KEY = 'tubeclear_api_keys';

const APIKeyManager = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState<'gemini' | 'groq' | 'openai'>('gemini');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setKeys(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const saveKeys = (updatedKeys: APIKey[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedKeys));
      setKeys(updatedKeys);
    } catch (error) {
      console.error('Failed to save API keys:', error);
      toast.error("Failed to save API key");
    }
  };

  const handleAddKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName.trim(),
      key: newKeyValue.trim(),
      provider: newKeyProvider,
      addedAt: new Date().toISOString(),
      lastUsed: null,
      usageCount: 0,
      quotaUsed: 0,
      status: 'active',
    };

    const updatedKeys = [...keys, newKey];
    saveKeys(updatedKeys);
    
    toast.success("API Key Added Successfully", {
      description: `${newKey.name} (${newKeyProvider.toUpperCase()}) is now active`,
    });

    // Reset form
    setNewKeyName("");
    setNewKeyValue("");
    setShowAddForm(false);
  };

  const handleDeleteKey = (id: string) => {
    if (confirm("Are you sure you want to delete this API key?")) {
      const updatedKeys = keys.filter(k => k.id !== id);
      saveKeys(updatedKeys);
      toast.success("API Key deleted");
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const maskKey = (key: string) => {
    if (key.length <= 10) return key;
    return key.substring(0, 5) + "••••••••" + key.substring(key.length - 3);
  };

  const getStatusBadge = (status: APIKey['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'rate_limited':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Rate Limited
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'text-purple-400';
      case 'groq': return 'text-yellow-400';
      case 'openai': return 'text-green-400';
      default: return 'text-white';
    }
  };

  const getQuotaColor = (quota: number) => {
    if (quota < 50) return "bg-green-500";
    if (quota < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">
          API Key Manager
        </h1>
        <p className="text-muted-foreground">
          Manage your AI provider keys with visual quota tracking
        </p>
      </div>

      {/* Add Key Button */}
      <Card className="glass-card border border-border/30 mb-6">
        <CardContent className="pt-6">
          {!showAddForm ? (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New API Key
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Key Name
                  </label>
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., My Gemini Key"
                    className="bg-slate-800/50 border-border/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Provider
                  </label>
                  <select
                    value={newKeyProvider}
                    onChange={(e) => setNewKeyProvider(e.target.value as any)}
                    className="w-full h-10 rounded-md border border-border/30 bg-slate-800/50 px-3 text-sm"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  API Key
                </label>
                <Input
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="Enter your API key"
                  className="bg-slate-800/50 border-border/30"
                  type="password"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddKey} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Key
                </Button>
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="border-border/30"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keys List */}
      <Card className="glass-card border border-border/30">
        <CardHeader className="border-b border-border/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5" />
              Your API Keys ({keys.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {keys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No API keys added yet</p>
              <p className="text-sm text-muted-foreground/60 mt-2">
                Add your first API key to start scanning
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => (
                <Card
                  key={key.id}
                  className="glass-card border border-border/20 hover:border-border/40 transition-all"
                >
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{key.name}</h3>
                            {getStatusBadge(key.status)}
                          </div>
                          <p className={`text-sm ${getProviderColor(key.provider)}`}>
                            {key.provider.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleShowKey(key.id)}
                            className="text-muted-foreground hover:text-white"
                          >
                            {showKeys[key.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteKey(key.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* API Key Value */}
                      <div className="p-3 rounded-lg bg-slate-800/50 border border-border/20 font-mono text-sm">
                        {showKeys[key.id] ? key.key : maskKey(key.key)}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Usage Count</p>
                          <p className="font-semibold text-white">{key.usageCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Used</p>
                          <p className="font-semibold text-white">
                            {key.lastUsed 
                              ? new Date(key.lastUsed).toLocaleDateString()
                              : "Never"
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Added</p>
                          <p className="font-semibold text-white">
                            {new Date(key.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Quota Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Quota Used</span>
                          <span className="text-sm font-semibold text-white">
                            {key.quotaUsed}%
                          </span>
                        </div>
                        <Progress 
                          value={key.quotaUsed} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="glass-card border border-blue-500/20 mt-6 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Activity className="w-6 h-6 text-blue-400 shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-400 mb-1">Automatic Failover</h4>
              <p className="text-sm text-muted-foreground">
                When you add multiple API keys, TubeClear automatically switches to the next available key if one hits rate limits.
                This ensures your scans never fail due to quota issues!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default APIKeyManager;
