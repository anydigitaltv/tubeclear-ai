import { useState } from "react";
import AdminPanel from "@/components/AdminPanel";
import AuditConfigsAdmin from "@/components/AuditConfigsAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("configs");

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gradient mb-6">Admin Dashboard</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="configs">Audit Configs</TabsTrigger>
          <TabsTrigger value="ai-doctor">AI Doctor</TabsTrigger>
        </TabsList>
        <TabsContent value="configs">
          <AuditConfigsAdmin />
        </TabsContent>
        <TabsContent value="ai-doctor">
          <AdminPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
