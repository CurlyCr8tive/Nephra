import { useState } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import AdminTools from "@/components/AdminTools";
import { useUser } from "@/contexts/UserContext";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Admin Page Component
 * 
 * Provides access to administrative tools with basic access control
 */
export default function AdminPage() {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("data-transfer");

  // If user is not logged in, redirect to auth page
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User must be logged in to access admin page
  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Administration</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="data-transfer">Data Transfer</TabsTrigger>
          <TabsTrigger value="system-status">System Status</TabsTrigger>
        </TabsList>
        
        <TabsContent value="data-transfer" className="py-2">
          <div className="grid grid-cols-1 gap-4">
            <div className="col-span-1">
              <AdminTools />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="system-status" className="py-2">
          <div className="text-center p-12 border rounded-lg bg-muted">
            <h3 className="text-xl font-medium mb-2">System Status</h3>
            <p className="text-muted-foreground mb-4">
              System diagnostics and monitoring will be available here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}