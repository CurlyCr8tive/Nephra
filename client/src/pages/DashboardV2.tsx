import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import HeaderV2 from "@/components/HeaderV2";

const DashboardV2 = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderV2 title="Nephra Dashboard" />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-2">Welcome, {user?.username || "Patient"}!</h1>
          <p className="text-muted-foreground mb-6">
            Track your kidney health journey and access personalized resources.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Health Tracking Card */}
            <Card className="group">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </span>
                  Track Health
                </CardTitle>
                <CardDescription>
                  Log your daily health metrics and symptoms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Record blood pressure, medications, symptoms, and more to see patterns over time.
                </p>
                <Link href="/track">
                  <Button className="w-full group-hover:bg-primary-dark transition-colors">
                    Open Health Tracker
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Journal Card */}
            <Card className="group">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </span>
                  Journal
                </CardTitle>
                <CardDescription>
                  Document your health journey with AI insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Write journal entries about your experiences and receive supportive AI feedback.
                </p>
                <Link href="/journal">
                  <Button variant="outline" className="w-full group-hover:border-primary/50 transition-colors">
                    Open Journal
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* AI Chat Card */}
            <Card className="group">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-green-100 text-green-700 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </span>
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Get medical information and emotional support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Chat with our kidney health AI assistant to get information and emotional support.
                </p>
                <Link href="/chat">
                  <Button variant="outline" className="w-full group-hover:border-primary/50 transition-colors">
                    Start a Chat
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Educational Resources */}
            <Card className="group">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  </span>
                  Education Hub
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Kidney disease resources and personalized information
                </p>
                <Link href="/education">
                  <Button size="sm" variant="outline" className="w-full">
                    Browse Resources
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Transplant Roadmap */}
            <Card className="group">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-700 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </span>
                  Transplant Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Track your progress through the kidney transplant journey
                </p>
                <Link href="/transplant">
                  <Button size="sm" variant="outline" className="w-full">
                    View Roadmap
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card className="group">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="bg-red-100 text-red-700 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  Medical Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Store and organize your medical records and test results
                </p>
                <Link href="/documents">
                  <Button size="sm" variant="outline" className="w-full">
                    Manage Documents
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardV2;