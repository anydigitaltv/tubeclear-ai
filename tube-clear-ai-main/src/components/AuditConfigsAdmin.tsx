import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuditConfig {
  id: string;
  label: string;
  engine_type: string; // 'gemini' or 'groq'
  system_prompt: string;
  is_active: boolean;
  created_at: string;
}

const AuditConfigsAdmin = () => {
  const [configs, setConfigs] = useState<AuditConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    engine_type: "gemini",
    system_prompt: "",
    is_active: true,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      // @ts-ignore - audit_configs table not in generated types yet
      const { data, error } = await supabase
        .from("audit_configs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      console.error("Error fetching configs:", error);
      toast.error("Failed to load audit configs");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.label.trim()) {
      toast.error("Label is required");
      return;
    }

    try {
      // @ts-ignore
      const { error } = await supabase.from("audit_configs").insert({
        label: formData.label,
        engine_type: formData.engine_type,
        system_prompt: formData.system_prompt,
        is_active: formData.is_active,
      });

      if (error) throw error;

      toast.success("Audit config added successfully");
      setFormData({ label: "", engine_type: "gemini", system_prompt: "", is_active: true });
      setShowAddForm(false);
      fetchConfigs();
    } catch (error: any) {
      console.error("Error adding config:", error);
      toast.error(`Failed to add config: ${error.message}`);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.label.trim()) {
      toast.error("Label is required");
      return;
    }

    try {
      // @ts-ignore
      const { error } = await supabase
        .from("audit_configs")
        .update({
          label: formData.label,
          engine_type: formData.engine_type,
          system_prompt: formData.system_prompt,
          is_active: formData.is_active,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Audit config updated successfully");
      setEditingId(null);
      setFormData({ label: "", engine_type: "gemini", system_prompt: "", is_active: true });
      fetchConfigs();
    } catch (error: any) {
      console.error("Error updating config:", error);
      toast.error(`Failed to update config: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this audit config?")) return;

    try {
      // @ts-ignore
      const { error } = await supabase.from("audit_configs").delete().eq("id", id);

      if (error) throw error;

      toast.success("Audit config deleted successfully");
      fetchConfigs();
    } catch (error: any) {
      console.error("Error deleting config:", error);
      toast.error(`Failed to delete config: ${error.message}`);
    }
  };

  const startEdit = (config: AuditConfig) => {
    setEditingId(config.id);
    setFormData({
      label: config.label,
      engine_type: config.engine_type,
      system_prompt: config.system_prompt,
      is_active: config.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ label: "", engine_type: "gemini", system_prompt: "", is_active: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gradient">Audit Configs Manager</h2>
            <p className="text-sm text-muted-foreground">Manage audit configuration labels and settings</p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Config
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="glass-card border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Add New Audit Config</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Deep Scan, Metadata Only"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Status</Label>
                <div className="flex gap-2 pt-2">
                  <Badge
                    className={`cursor-pointer ${formData.is_active ? "bg-green-500" : "bg-slate-500"}`}
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  >
                    {formData.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="engine_type">AI Engine</Label>
              <select
                id="engine_type"
                value={formData.engine_type}
                onChange={(e) => setFormData({ ...formData, engine_type: e.target.value })}
                className="w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
              >
                <option value="gemini">Gemini 1.5 Flash</option>
                <option value="groq">Groq Llama 3.1</option>
                <option value="openai">OpenAI GPT-4</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="system_prompt">System Prompt</Label>
              <Textarea
                id="system_prompt"
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                placeholder="Enter the system prompt for this audit config..."
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleAdd}>
                <Save className="h-4 w-4 mr-2" />
                Save Config
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="glass-card border-border/20">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>System Prompt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit configs found. Click "Add Config" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      {editingId === config.id ? (
                        <Input
                          value={formData.label}
                          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                          className="max-w-[200px]"
                        />
                      ) : (
                        <span className="font-medium">{config.label}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === config.id ? (
                        <select
                          value={formData.engine_type}
                          onChange={(e) => setFormData({ ...formData, engine_type: e.target.value })}
                          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                        >
                          <option value="gemini">Gemini</option>
                          <option value="groq">Groq</option>
                          <option value="openai">OpenAI</option>
                        </select>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {config.engine_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {editingId === config.id ? (
                        <Textarea
                          value={formData.system_prompt}
                          onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                          rows={3}
                          className="text-xs"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground line-clamp-3 font-mono">
                          {config.system_prompt || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === config.id ? (
                        <Badge
                          className={`cursor-pointer ${formData.is_active ? "bg-green-500" : "bg-slate-500"}`}
                          onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                        >
                          {formData.is_active ? "Active" : "Inactive"}
                        </Badge>
                      ) : (
                        <Badge variant={config.is_active ? "default" : "secondary"}>
                          {config.is_active ? "Active" : "Inactive"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(config.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {editingId === config.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdate(config.id)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(config)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditConfigsAdmin;
