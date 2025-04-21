import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export function TransplantRoadmapCard() {
  const { user } = useUser();
  const [expanded, setExpanded] = useState(true);

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

  // Combine steps with user progress
  const getStepsWithProgress = () => {
    if (!steps || !progress) return [];

    return steps.slice(0, 3).map(step => {
      const userProgress = progress.find(p => p.stepId === step.id);
      return {
        ...step,
        status: userProgress?.status || "pending",
        completedDate: userProgress?.completedDate
      };
    });
  };

  const stepsWithProgress = getStepsWithProgress();

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
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Transplant Roadmap</h3>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setExpanded(!expanded)}
          className="text-primary"
        >
          <span className="material-icons">
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </Button>
      </div>
      
      {expanded && (
        <>
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
                  } ${!isLast ? "mb-4" : ""}`}
                >
                  <div 
                    className={`absolute top-0 left-0 w-4 h-4 rounded-full ${
                      step.status === "completed" || step.status === "in_progress" ? "bg-primary" : "bg-neutral-200"
                    } transform -translate-x-1/2`}
                  ></div>
                  <div className="mb-4">
                    <h4 className={`font-medium text-sm ${step.status === "pending" ? "text-neutral-500" : ""}`}>
                      {step.title}
                    </h4>
                    <p className={`text-xs ${step.status === "pending" ? "text-neutral-500" : "text-neutral-600"} mt-1`}>
                      {step.description}
                    </p>
                    <div className="flex mt-2">
                      <span className={`${statusInfo.bgColor} ${statusInfo.textColor} text-xs px-2 py-0.5 rounded`}>
                        {statusInfo.text}
                      </span>
                      {step.completedDate && (
                        <span className="text-xs text-neutral-500 ml-2">
                          {format(new Date(step.completedDate), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          <Link href="/roadmap">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 text-primary border-primary mt-4">
              <span className="material-icons text-sm">timeline</span>
              View full roadmap
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

export default TransplantRoadmapCard;
