import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { validateMedicalDocument } from "@/lib/documentValidation";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";

// Icons
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  FileCheck, 
  CalendarIcon,
  Info
} from "lucide-react";

// Document type options
const documentTypes = [
  { value: "lab_result", label: "Lab Result" },
  { value: "scan", label: "Imaging/Scan" },
  { value: "prescription", label: "Prescription" },
  { value: "doctor_note", label: "Doctor's Note" },
  { value: "referral", label: "Referral Letter" },
  { value: "discharge", label: "Discharge Summary" },
  { value: "other", label: "Other" },
];

export default function MedicalDocuments() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    fileName: "",
    documentType: "",
    description: "",
    uploadDate: new Date(),
    metadata: {},
    aiVerified: false,
    aiVerificationNotes: ""
  });
  
  // File upload state
  const [fileSelected, setFileSelected] = useState(false);
  const [metadataFields, setMetadataFields] = useState<Record<string, string>>({});
  
  // Query to get all medical documents
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ["/api/medical-documents", user?.id],
    enabled: !!user,
  });
  
  // Mutation to create a new document
  const createDocumentMutation = useMutation({
    mutationFn: async (documentData: any) => {
      return apiRequest("/api/medical-documents", {
        method: "POST",
        body: JSON.stringify({
          ...documentData,
          userId: user?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents", user?.id] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Document Uploaded",
        description: "Your medical document has been successfully uploaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to validate a document with AI
  const validateDocumentMutation = useMutation({
    mutationFn: async (document: any) => {
      if (!user) throw new Error("User not found");
      
      // Call the server-side validation endpoint
      return apiRequest(`/api/medical-documents/${document.id}/validate`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents", user?.id] });
      setValidateDialogOpen(false);
      toast({
        title: "Document Validated",
        description: "The document has been verified by AI.",
      });
    },
    onError: (error) => {
      toast({
        title: "Validation Failed",
        description: "There was an error validating your document. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  // Handle metadata field changes
  const handleMetadataChange = (key: string, value: string) => {
    setMetadataFields({
      ...metadataFields,
      [key]: value,
    });
  };
  
  // Add new metadata field
  const addMetadataField = () => {
    setMetadataFields({
      ...metadataFields,
      [`field_${Object.keys(metadataFields).length + 1}`]: "",
    });
  };
  
  // Handle document type selection
  const handleDocumentTypeChange = (value: string) => {
    setFormData({
      ...formData,
      documentType: value,
    });
    
    // Suggest default metadata fields based on document type
    if (value === "lab_result") {
      setMetadataFields({
        test_name: "",
        result_value: "",
        unit: "",
        reference_range: "",
        date_collected: "",
      });
    } else if (value === "scan") {
      setMetadataFields({
        scan_type: "",
        findings: "",
        impression: "",
      });
    } else {
      setMetadataFields({});
    }
  };
  
  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const documentData = {
      ...formData,
      metadata: metadataFields,
      uploadDate: new Date(),
      fileUrl: "sample-url", // In a real app, this would be the URL from file upload
    };
    
    createDocumentMutation.mutate(documentData);
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      fileName: "",
      documentType: "",
      description: "",
      uploadDate: new Date(),
      metadata: {},
      aiVerified: false,
      aiVerificationNotes: ""
    });
    setMetadataFields({});
    setFileSelected(false);
  };
  
  // Handle file selection
  const handleFileSelect = () => {
    // In a real app, we would handle actual file upload here
    setFileSelected(true);
    toast({
      title: "File Selected",
      description: "Your file has been selected. Please fill out the remaining fields.",
    });
  };
  
  // Open document validation dialog
  const handleValidateDocument = (document: any) => {
    setSelectedDocument(document);
    setValidateDialogOpen(true);
  };
  
  // Filter documents based on active tab
  const filteredDocuments = documents?.filter((doc: any) => {
    if (activeTab === "all") return true;
    if (activeTab === "validated") return doc.aiVerified;
    if (activeTab === "unvalidated") return !doc.aiVerified;
    return doc.documentType === activeTab;
  });
  
  // Parse AI verification notes
  const parseVerificationNotes = (notes?: string) => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch (e) {
      return { analysis: notes };
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header title="Medical Documents" />
      
      <main className="flex-1 container max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Medical Documents</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Upload size={18} />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Medical Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="file">Document File</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 ${
                      fileSelected ? "border-green-500 bg-green-50" : "border-slate-300"
                    }`}
                    onClick={handleFileSelect}
                  >
                    {fileSelected ? (
                      <div className="flex flex-col items-center text-green-600">
                        <CheckCircle size={24} className="mb-2" />
                        <p>File selected. Click to change.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-500">
                        <Upload size={24} className="mb-2" />
                        <p>Click to select a document file</p>
                        <p className="text-xs mt-1">PDF, JPG, PNG, or DOCX</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fileName">Document Name</Label>
                  <Input
                    id="fileName"
                    name="fileName"
                    value={formData.fileName}
                    onChange={handleInputChange}
                    placeholder="e.g. Lab Results June 2024"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select 
                    value={formData.documentType} 
                    onValueChange={handleDocumentTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of this document"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Document Data (for AI validation)</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addMetadataField}
                    >
                      Add Field
                    </Button>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-md space-y-2">
                    {Object.keys(metadataFields).length > 0 ? (
                      Object.keys(metadataFields).map((key) => (
                        <div key={key} className="grid grid-cols-5 gap-2">
                          <Input
                            className="col-span-2"
                            value={key}
                            onChange={(e) => {
                              const newMetadataFields = { ...metadataFields };
                              const value = metadataFields[key];
                              delete newMetadataFields[key];
                              newMetadataFields[e.target.value] = value;
                              setMetadataFields(newMetadataFields);
                            }}
                            placeholder="Field name"
                          />
                          <Input
                            className="col-span-3"
                            value={metadataFields[key]}
                            onChange={(e) => handleMetadataChange(key, e.target.value)}
                            placeholder="Value"
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 italic text-center py-2">
                        Add fields with your test results or important values for AI validation
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!fileSelected || !formData.fileName || !formData.documentType}
                  >
                    Upload Document
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full overflow-x-auto flex whitespace-nowrap">
            <TabsTrigger value="all">All Documents</TabsTrigger>
            <TabsTrigger value="validated">AI Validated</TabsTrigger>
            <TabsTrigger value="unvalidated">Not Validated</TabsTrigger>
            <TabsTrigger value="lab_result">Lab Results</TabsTrigger>
            <TabsTrigger value="scan">Imaging/Scans</TabsTrigger>
            <TabsTrigger value="prescription">Prescriptions</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <p>Loading documents...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p>There was an error loading your documents</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/medical-documents", user?.id] })}
                >
                  Try Again
                </Button>
              </div>
            ) : filteredDocuments?.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-lg border border-slate-200">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-1">No documents found</h3>
                <p className="text-slate-500 mb-4">
                  {activeTab === "all" 
                    ? "Upload your first medical document to get started" 
                    : "No documents matching the selected filter"}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  Upload Document
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredDocuments?.map((doc: any) => {
                  const documentType = documentTypes.find(t => t.value === doc.documentType);
                  const verificationNotes = parseVerificationNotes(doc.aiVerificationNotes);
                  
                  return (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <Badge variant={doc.documentType === "lab_result" ? "secondary" : "outline"}>
                            {documentType?.label || doc.documentType}
                          </Badge>
                          {doc.aiVerified ? (
                            <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
                              <CheckCircle size={14} className="mr-1" /> Validated
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Validated</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg mt-2">{doc.fileName}</CardTitle>
                        <div className="flex items-center text-xs text-slate-500">
                          <CalendarIcon size={12} className="mr-1" />
                          {new Date(doc.uploadDate).toLocaleDateString()}
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        {doc.description && (
                          <p className="text-sm text-slate-600 mb-2">{doc.description}</p>
                        )}
                        
                        {doc.aiVerified && verificationNotes && (
                          <div className="bg-slate-50 p-3 rounded-md mb-2">
                            <div className="flex items-start gap-2">
                              <Info size={16} className="text-primary mt-1 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium">AI Analysis</p>
                                <p className="text-sm text-slate-600">{verificationNotes.analysis}</p>
                                
                                {verificationNotes.concerns && verificationNotes.concerns.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-amber-700">Potential Concerns:</p>
                                    <ul className="text-xs text-slate-600 list-disc pl-4">
                                      {verificationNotes.concerns.map((concern: string, i: number) => (
                                        <li key={i}>{concern}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                          <div className="border-t pt-2 mt-2">
                            <p className="text-xs text-slate-500 mb-1">Document Data:</p>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                              {Object.keys(doc.metadata).map((key) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium">{key}:</span>{" "}
                                  <span className="text-slate-600">{doc.metadata[key]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                      
                      <CardFooter className="border-t pt-3 flex justify-between">
                        <Button variant="outline" size="sm">
                          View Full Document
                        </Button>
                        
                        {!doc.aiVerified && (
                          <Button 
                            size="sm" 
                            onClick={() => handleValidateDocument(doc)}
                          >
                            <FileCheck size={16} className="mr-1" />
                            Validate
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Dialog for AI validation */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>AI Document Validation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-sm">
              Our AI assistant will analyze this document for:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>Potential abnormal values</li>
              <li>Relevance to your kidney health</li>
              <li>Recommendations based on the document content</li>
            </ul>
            
            {selectedDocument && (
              <div className="bg-slate-50 p-3 rounded-md">
                <p className="font-medium">{selectedDocument.fileName}</p>
                <p className="text-sm text-slate-600">{selectedDocument.description}</p>
              </div>
            )}
            
            <p className="text-sm text-slate-500 italic">
              Note: AI validation is not a substitute for professional medical advice.
              Always consult with your healthcare provider about your test results.
            </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setValidateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => validateDocumentMutation.mutate(selectedDocument)}
              disabled={validateDocumentMutation.isPending}
            >
              {validateDocumentMutation.isPending ? "Validating..." : "Validate Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}