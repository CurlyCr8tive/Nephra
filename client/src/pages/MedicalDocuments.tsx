import { useState, useEffect, useRef } from "react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { validateMedicalDocument } from "@/lib/documentValidation";

// Supabase for optional file storage - may not be configured
let supabase: any = null;
try {
  const { supabase: sb } = require("@/lib/supabaseClient");
  supabase = sb;
} catch (e) {
  console.warn("Supabase not available - file storage features disabled");
}

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
import { Progress } from "@/components/ui/progress";

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
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [fileSelected, setFileSelected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [metadataFields, setMetadataFields] = useState<Record<string, string>>({});
  
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
  
  // Query to get all medical documents
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ["/api/medical-documents", user?.id],
    enabled: !!user,
  });
  
  // Mutation to create a new document
  const createDocumentMutation = useMutation({
    mutationFn: async (documentData: any) => {
      const response = await fetch("/api/medical-documents", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...documentData,
          userId: user?.id,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-documents", user?.id] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Document Uploaded",
        description: "Your medical document has been successfully uploaded.",
      });
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });
  
  // Mutation to validate a document with AI
  const validateDocumentMutation = useMutation({
    mutationFn: async (document: any) => {
      if (!user) throw new Error("User not found");
      
      // Call the server-side validation endpoint
      const response = await apiRequest("POST", `/api/medical-documents/${document.id}/validate`);
      return response;
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
  
  // Handle file selection
  const handleFileSelect = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };
  
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setFileSelected(true);
      setFormData({
        ...formData,
        fileName: files[0].name
      });
      toast({
        title: "File Selected",
        description: `${files[0].name} (${formatFileSize(files[0].size)})`,
      });
    }
  };
  
  // Submit form with Replit Object Storage file upload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !user) {
      toast({
        title: "Upload Failed",
        description: "Please select a file and ensure you are logged in.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Get presigned upload URL from backend
      const uploadRes = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!uploadRes.ok) {
        throw new Error('Failed to get upload URL');
      }
      
      const { uploadURL } = await uploadRes.json();
      setUploadProgress(30);
      
      // Upload file directly to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error('File upload failed');
      }
      
      setUploadProgress(70);
      
      // Register the uploaded document with backend
      const registerRes = await fetch('/api/documents/uploaded', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          uploadURL,
          isPrivate: true,
        }),
      });
      
      if (!registerRes.ok) {
        throw new Error('Failed to register document');
      }
      
      const { objectPath } = await registerRes.json();
      setUploadProgress(90);
      
      // Prepare document data with the file URL
      const documentData = {
        ...formData,
        metadata: metadataFields,
        uploadDate: new Date(),
        fileUrl: objectPath,
      };
      
      // Save document metadata to the database
      createDocumentMutation.mutate(documentData);
      
    } catch (error: any) {
      console.error("Document upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
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
    setFile(null);
    setUploadProgress(0);
  };
  
  // Helper to format file size
  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Open document validation dialog
  const handleValidateDocument = (document: any) => {
    setSelectedDocument(document);
    setValidateDialogOpen(true);
  };
  
  // Filter documents based on active tab
  const filteredDocuments = Array.isArray(documents) ? documents.filter((doc: any) => {
    if (activeTab === "all") return true;
    if (activeTab === "validated") return doc.aiVerified;
    if (activeTab === "unvalidated") return !doc.aiVerified;
    return doc.documentType === activeTab;
  }) : [];
  
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
                        <p>File selected: {file?.name}</p>
                        <p className="text-xs mt-1">{file && formatFileSize(file.size)}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-500">
                        <Upload size={24} className="mb-2" />
                        <p>Click to select a document file</p>
                        <p className="text-xs mt-1">PDF, JPG, PNG, or DOCX</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Hidden file input */}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".pdf,.jpg,.jpeg,.png,.docx" 
                    onChange={handleFileInputChange}
                  />
                </div>
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
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
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!fileSelected || !formData.fileName || !formData.documentType || isUploading}
                  >
                    {isUploading ? "Uploading..." : "Upload Document"}
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
            ) : filteredDocuments.length === 0 ? (
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
                {filteredDocuments.map((doc: any) => {
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
                      
                      <CardFooter className="flex justify-between pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          View Document
                        </Button>
                        
                        {!doc.aiVerified && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => handleValidateDocument(doc)}
                          >
                            <FileCheck size={14} />
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
        
        {/* AI Validation Dialog */}
        <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>AI Document Validation</DialogTitle>
            </DialogHeader>
            
            {selectedDocument && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">{selectedDocument.fileName}</h3>
                  <p className="text-sm text-slate-500">
                    {documentTypes.find(t => t.value === selectedDocument.documentType)?.label || selectedDocument.documentType}
                  </p>
                </div>
                
                <div className="border rounded-md p-3 bg-slate-50">
                  <p className="text-sm mb-2">
                    AI validation will:
                  </p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Analyze the document for consistency and accuracy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Identify potential concerns or discrepancies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Provide a summary interpretation of key findings</span>
                    </li>
                  </ul>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setValidateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => validateDocumentMutation.mutate(selectedDocument)}
                    disabled={validateDocumentMutation.isPending}
                  >
                    {validateDocumentMutation.isPending ? "Validating..." : "Start Validation"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}