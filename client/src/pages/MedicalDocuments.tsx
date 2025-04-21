import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function MedicalDocuments() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [uploadForm, setUploadForm] = useState({
    fileName: "",
    documentType: "test_result", // Default to test result
    description: "",
    uploadDate: new Date(),
    metadata: {},
    aiVerified: false,
    aiVerificationNotes: ""
  });
  
  const [metadataKey, setMetadataKey] = useState("");
  const [metadataValue, setMetadataValue] = useState("");
  
  // Query to fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/medical-documents', user?.id],
    enabled: !!user
  });
  
  // Mutation to upload a document
  const { mutate: uploadDocument, isPending: isUploading } = useMutation({
    mutationFn: async (data) => {
      return apiRequest('POST', '/api/medical-documents', {
        ...data,
        userId: user?.id
      });
    },
    onSuccess: () => {
      // Reset form
      setUploadForm({
        fileName: "",
        documentType: "test_result",
        description: "",
        uploadDate: new Date(),
        metadata: {},
        aiVerified: false,
        aiVerificationNotes: ""
      });
      setMetadataKey("");
      setMetadataValue("");
      
      // Refetch documents
      queryClient.invalidateQueries({ queryKey: ['/api/medical-documents', user?.id] });
      
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded and will be verified.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your document.",
        variant: "destructive"
      });
    }
  });
  
  const handleAddMetadata = () => {
    if (!metadataKey.trim() || !metadataValue.trim()) return;
    
    setUploadForm({
      ...uploadForm,
      metadata: {
        ...uploadForm.metadata,
        [metadataKey]: metadataValue
      }
    });
    
    setMetadataKey("");
    setMetadataValue("");
  };
  
  const handleRemoveMetadata = (key) => {
    const newMetadata = { ...uploadForm.metadata };
    delete newMetadata[key];
    
    setUploadForm({
      ...uploadForm,
      metadata: newMetadata
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!uploadForm.fileName) {
      toast({
        title: "Missing information",
        description: "Please enter a file name.",
        variant: "destructive"
      });
      return;
    }
    
    uploadDocument(uploadForm);
  };
  
  const documentTypeLabels = {
    test_result: "Lab Results",
    scan: "Imaging/Scan",
    letter: "Doctor's Letter",
    prescription: "Prescription",
    insurance: "Insurance Document",
    other: "Other"
  };
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view your medical documents.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/">Return to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container pb-16">
      <Header title="Medical Documents" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>
              Add your test results and medical documents for AI verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fileName">Document Name</Label>
                  <Input 
                    id="fileName" 
                    placeholder="e.g. GFR Test Results June 2025"
                    value={uploadForm.fileName}
                    onChange={(e) => setUploadForm({...uploadForm, fileName: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select 
                    value={uploadForm.documentType}
                    onValueChange={(value) => setUploadForm({...uploadForm, documentType: value})}
                  >
                    <SelectTrigger id="documentType">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test_result">Lab Results</SelectItem>
                      <SelectItem value="scan">Imaging/Scan</SelectItem>
                      <SelectItem value="letter">Doctor's Letter</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="insurance">Insurance Document</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    placeholder="Brief description of the document"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Test Result Details</Label>
                  <div className="flex space-x-2">
                    <Input 
                      placeholder="Field (e.g. GFR)"
                      value={metadataKey}
                      onChange={(e) => setMetadataKey(e.target.value)}
                    />
                    <Input 
                      placeholder="Value (e.g. 75)"
                      value={metadataValue}
                      onChange={(e) => setMetadataValue(e.target.value)}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddMetadata}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                
                {/* Display metadata */}
                {Object.keys(uploadForm.metadata).length > 0 && (
                  <div className="space-y-2">
                    <Label>Added Details</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(uploadForm.metadata).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="py-1 px-3">
                          {key}: {value}
                          <button
                            type="button"
                            className="ml-2 text-red-500"
                            onClick={() => handleRemoveMetadata(key)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={isUploading}>
                    {isUploading ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Documents</CardTitle>
            <CardDescription>
              View your uploaded medical documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{doc.fileName}</CardTitle>
                            <CardDescription className="text-xs">
                              {format(new Date(doc.uploadDate), 'MMM d, yyyy')}
                            </CardDescription>
                          </div>
                          <Badge variant={doc.aiVerified ? "success" : "secondary"} className="ml-2">
                            {doc.aiVerified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <p className="text-sm">{doc.description}</p>
                        
                        {doc.documentType === 'test_result' && Object.keys(doc.metadata || {}).length > 0 && (
                          <>
                            <Separator className="my-2" />
                            <div className="grid grid-cols-2 gap-1">
                              {Object.entries(doc.metadata).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="font-medium">{key}:</span> {value}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        
                        {doc.aiVerified && doc.aiVerificationNotes && (
                          <>
                            <Separator className="my-2" />
                            <div className="text-xs italic text-muted-foreground">
                              <p className="font-medium">AI Analysis:</p>
                              <p>{doc.aiVerificationNotes}</p>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}