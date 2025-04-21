import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function TransplantRoadmap() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch transplant steps
  const { data: steps, isLoading: isLoadingSteps } = useQuery({
    queryKey: ["/api/transplant-steps"],
    enabled: !!user,
  });

  // Fetch user's progress
  const { data: progress, isLoading: isLoadingProgress } = useQuery({
    queryKey: [`/api/transplant-progress/${user?.id}`],
    enabled: !!user,
  });

  // Mutation for updating progress
  const { mutate: updateProgress, isPending: isUpdating } = useMutation({
    mutationFn: async (data: { id: number, status: string, completedDate?: Date }) => {
      const payload = {
        status: data.status,
        completedDate: data.status === "completed" ? new Date() : undefined
      };
      
      const response = await apiRequest("PUT", `/api/transplant-progress/${data.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/transplant-progress/${user?.id}`]
      });
      
      toast({
        title: "Progress updated",
        description: "Your transplant progress has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating progress",
        description: error.message || "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating new progress entry
  const { mutate: createProgress, isPending: isCreating } = useMutation({
    mutationFn: async (data: { userId: number, stepId: number, status: string, completedDate?: Date }) => {
      const response = await apiRequest("POST", "/api/transplant-progress", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/transplant-progress/${user?.id}`]
      });
      
      toast({
        title: "Progress created",
        description: "Your transplant progress has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating progress",
        description: error.message || "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Combine steps with user progress
  const getStepsWithProgress = () => {
    if (!steps || !progress) return [];

    return steps.map(step => {
      const userProgress = progress.find(p => p.stepId === step.id);
      return {
        ...step,
        progressId: userProgress?.id,
        status: userProgress?.status || "pending",
        completedDate: userProgress?.completedDate
      };
    });
  };

  const stepsWithProgress = getStepsWithProgress();

  // Handle status change
  const handleStatusChange = (step: any, newStatus: string) => {
    if (!user) return;
    
    if (step.progressId) {
      // Update existing progress
      updateProgress({
        id: step.progressId,
        status: newStatus,
        completedDate: newStatus === "completed" ? new Date() : undefined
      });
    } else {
      // Create new progress entry
      createProgress({
        userId: user.id,
        stepId: step.id,
        status: newStatus,
        completedDate: newStatus === "completed" ? new Date() : undefined
      });
    }
  };

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "Completed", bgColor: "bg-success", textColor: "text-white" };
      case "in_progress":
        return { text: "In Progress", bgColor: "bg-primary", textColor: "text-white" };
      default:
        return { text: "Pending", bgColor: "bg-neutral-200", textColor: "text-neutral-500" };
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Transplant Roadmap" />
      
      <main className="flex-grow pt-20 pb-20">
        <div className="px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <h2 className="font-display font-bold text-lg mb-4">Your Kidney Transplant Journey</h2>
            
            <p className="text-sm text-neutral-600 mb-6">
              This roadmap helps you track and understand each step on your kidney transplant journey. 
              Update your progress as you move through each stage.
            </p>
            
            {isLoadingSteps || isLoadingProgress ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              stepsWithProgress.map((step, index) => {
                const statusInfo = getStatusInfo(step.status);
                const isFirst = index === 0;
                const isLast = index === stepsWithProgress.length - 1;
                
                return (
                  <div 
                    key={step.id} 
                    className={`relative pl-6 border-l-2 ${
                      step.status === "completed" || step.status === "in_progress" ? "border-primary" : "border-neutral-200"
                    } ${!isLast ? "mb-6" : ""}`}
                  >
                    <div 
                      className={`absolute top-0 left-0 w-4 h-4 rounded-full ${
                        step.status === "completed" || step.status === "in_progress" ? "bg-primary" : "bg-neutral-200"
                      } transform -translate-x-1/2`}
                    ></div>
                    <div className="mb-4">
                      <h4 className={`font-medium ${step.status === "pending" ? "text-neutral-500" : ""}`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm ${step.status === "pending" ? "text-neutral-500" : "text-neutral-600"} mt-1`}>
                        {step.description}
                      </p>
                      <div className="flex flex-wrap items-center mt-2 gap-2">
                        <span className={`${statusInfo.bgColor} ${statusInfo.textColor} text-xs px-2 py-0.5 rounded`}>
                          {statusInfo.text}
                        </span>
                        {step.completedDate && (
                          <span className="text-xs text-neutral-500">
                            {format(new Date(step.completedDate), "MMM d, yyyy")}
                          </span>
                        )}
                        
                        <div className="ml-auto flex gap-2">
                          {step.status !== "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleStatusChange(step, "completed")}
                              disabled={isUpdating || isCreating}
                            >
                              Mark completed
                            </Button>
                          )}
                          {step.status !== "in_progress" && step.status !== "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleStatusChange(step, "in_progress")}
                              disabled={isUpdating || isCreating}
                            >
                              Mark in progress
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            <div className="mt-6 p-4 bg-neutral-100 rounded-lg">
              <h4 className="font-medium mb-2">Resources & Support</h4>
              <p className="text-sm text-neutral-600 mb-3">
                These trusted resources can help you understand and navigate your kidney transplant journey:
              </p>
              <ul className="text-sm space-y-2">
                <li>
                  <a href="https://www.kidney.org/transplantation" target="_blank" rel="noopener noreferrer" className="text-primary flex items-center">
                    <span className="material-icons text-sm mr-1">link</span>
                    National Kidney Foundation
                  </a>
                </li>
                <li>
                  <a href="https://unos.org/transplant/living-donation/" target="_blank" rel="noopener noreferrer" className="text-primary flex items-center">
                    <span className="material-icons text-sm mr-1">link</span>
                    United Network for Organ Sharing (UNOS)
                  </a>
                </li>
                <li>
                  <a href="https://www.srtr.org/" target="_blank" rel="noopener noreferrer" className="text-primary flex items-center">
                    <span className="material-icons text-sm mr-1">link</span>
                    Scientific Registry of Transplant Recipients
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
