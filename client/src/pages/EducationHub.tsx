import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";

const EducationHub = () => {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("questions");

  // Sample education content for each category
  const educationContent = {
    questions: [
      {
        id: 1,
        title: "Questions Before Starting Dialysis",
        items: [
          "What type of dialysis is best for my lifestyle?",
          "How will dialysis affect my daily routine?",
          "What are the potential side effects?",
          "How long will each dialysis session take?",
          "Can I travel while on dialysis?",
          "What dietary restrictions will I need to follow?",
          "How will dialysis affect my existing medications?",
          "What symptoms should I report immediately?",
        ],
        link: "https://www.kidney.org/atoz/content/dialysis-access",
        linkText: "Learn more about dialysis options",
      },
      {
        id: 2,
        title: "Questions About Your Treatment Plan",
        items: [
          "How often will my treatment plan be reviewed?",
          "What tests will be performed regularly to monitor my kidney function?",
          "How will we know if the treatment is working?",
          "What are my options if this treatment approach isn't effective?",
          "Are there any clinical trials I might be eligible for?",
        ],
        link: "https://www.kidney.org/atoz/content/choosing-a-treatment-kidney-failure",
        linkText: "Explore treatment options guide",
      },
    ],
    treatments: [
      {
        id: 1,
        title: "Understanding Medication Options",
        description: "Common medications for kidney disease management",
        items: [
          {
            name: "ACE inhibitors & ARBs",
            purpose: "Help lower blood pressure and reduce protein in urine",
            link: "https://www.kidney.org/atoz/content/ace-inhibitors-and-arbs-high-blood-pressure-ckd",
          },
          {
            name: "Diuretics",
            purpose: "Help reduce fluid retention and swelling",
            link: "https://www.kidney.org/atoz/content/diuretics",
          },
          {
            name: "Phosphate binders",
            purpose: "Help reduce phosphate levels in your blood",
            link: "https://www.kidney.org/atoz/content/phosphorus",
          },
          {
            name: "Vitamin D supplements",
            purpose: "Help maintain calcium levels and bone health",
            link: "https://www.kidney.org/atoz/content/vitamin-d-and-chronic-kidney-disease",
          },
          {
            name: "Erythropoietin supplements",
            purpose: "Help with anemia by stimulating red blood cell production",
            link: "https://www.kidney.org/atoz/content/what-anemia",
          },
        ],
        resourceLink: "https://www.kidney.org/atoz/content/commonly-prescribed-medications",
        resourceText: "View complete medication guide",
      },
      {
        id: 2,
        title: "Dialysis Options",
        description: "Different types of dialysis treatments",
        items: [
          {
            name: "Hemodialysis",
            purpose: "Blood cleaning through a machine, typically 3-4 times weekly",
            link: "https://www.kidney.org/atoz/content/hemodialysis",
          },
          {
            name: "Peritoneal Dialysis",
            purpose: "Uses the lining of your abdomen to filter blood, can be done at home",
            link: "https://www.kidney.org/atoz/content/peritoneal",
          },
          {
            name: "Home Hemodialysis",
            purpose: "Hemodialysis performed at home with special training",
            link: "https://www.kidney.org/atoz/content/homehemo",
          },
        ],
        resourceLink: "https://www.kidney.org/atoz/content/dialysis",
        resourceText: "Compare dialysis options",
      },
    ],
    news: [
      {
        id: 1,
        title: "New Transplant Initiative Launches Nationwide",
        date: "May 15, 2025",
        summary: "The National Kidney Foundation announces a new initiative to increase living donor kidney transplants by 50% over the next five years through education and advocacy.",
        source: "National Kidney Foundation",
        link: "https://www.kidney.org/transplantation",
      },
      {
        id: 2,
        title: "FDA Approves New Medication for CKD-Related Anemia",
        date: "May 1, 2025",
        summary: "The FDA has approved a new HIF-PH inhibitor that stimulates red blood cell production in the body, providing a new treatment option for anemia in chronic kidney disease patients.",
        source: "American Society of Nephrology",
        link: "https://www.asn-online.org/news/",
      },
      {
        id: 3,
        title: "Kidney Week 2025 Highlights Latest Research",
        date: "April 20, 2025",
        summary: "The annual Kidney Week conference showcased promising developments in kidney disease detection, progression monitoring, and treatment options that may change standard care protocols.",
        source: "American Society of Nephrology",
        link: "https://www.asn-online.org/education/kidneyweek/",
      },
      {
        id: 4,
        title: "Artificial Kidney Project Progresses in Clinical Trials",
        date: "April 5, 2025",
        summary: "The implantable artificial kidney device is showing promising results in early clinical trials, potentially offering an alternative to traditional dialysis for many patients.",
        source: "The Kidney Project - UCSF",
        link: "https://pharm.ucsf.edu/kidney",
      },
      {
        id: 5,
        title: "New Guidelines for Managing Kidney Stones Released",
        date: "March 15, 2025",
        summary: "Updated guidelines provide recommendations for preventing kidney stone recurrence through dietary changes, medications, and monitoring strategies based on the latest evidence.",
        source: "American Urological Association",
        link: "https://www.auanet.org/guidelines/kidney-stones",
      },
    ],
    advocacy: [
      {
        id: 1,
        title: "Preparing for Your Nephrology Visit",
        steps: [
          "Keep a symptom journal to share with your doctor",
          "Bring a complete list of all medications and supplements",
          "Prepare specific questions in advance",
          "Consider bringing a friend or family member for support",
          "Request a summary of your lab results before the appointment",
          "Take notes during the visit",
          "Ask for clarification if you don't understand something",
          "Discuss any concerns about treatment side effects",
        ],
        resourceLink: "https://www.kidney.org/patients/prepare-your-doctor-visit",
        resourceText: "Doctor visit preparation guide",
      },
      {
        id: 2,
        title: "Insurance and Financial Advocacy",
        steps: [
          "Understand your insurance coverage for kidney treatments",
          "Research financial assistance programs",
          "Appeal denied claims when necessary",
          "Request itemized billing statements",
          "Consult with a hospital financial counselor",
          "Learn about Medicare coverage for kidney disease",
          "Track all medical expenses for tax purposes",
        ],
        resourceLink: "https://www.kidney.org/patients/resources_Finance",
        resourceText: "Financial assistance resources",
      },
    ],
  };

  const handleResourceClick = (title: string) => {
    toast({
      title: "Resource Saved",
      description: `"${title}" has been saved to your resources.`,
    });
  };

  return (
    <div className="container max-w-md mx-auto pb-20 pt-4">
      <h1 className="text-2xl font-bold text-primary mb-4">Education & Advocacy Hub</h1>
      
      <Tabs defaultValue="questions" value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="advocacy">Advocacy</TabsTrigger>
        </TabsList>
        
        {/* Questions to Ask Tab */}
        <TabsContent value="questions" className="space-y-4">
          <h2 className="text-xl font-semibold">Suggested Questions</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Being prepared with the right questions can help you get the most out of your medical appointments.
          </p>
          
          {educationContent.questions.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="text-sm">{item}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {section.link && (
                    <a 
                      href={section.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline flex items-center"
                    >
                      <span className="material-icons text-sm mr-1">info</span>
                      {section.linkText || "Learn more"}
                    </a>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleResourceClick(section.title)}
                  >
                    <span className="material-icons text-sm mr-1">bookmark</span>
                    Save for Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        {/* Treatment Options Tab */}
        <TabsContent value="treatments" className="space-y-4">
          <h2 className="text-xl font-semibold">Treatment Options</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Understanding your treatment options helps you make informed decisions with your healthcare team.
          </p>
          
          {educationContent.treatments.map((treatment) => (
            <Card key={treatment.id}>
              <CardHeader>
                <CardTitle className="text-lg">{treatment.title}</CardTitle>
                <CardDescription>{treatment.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {treatment.items.map((item, idx) => (
                    <div key={idx} className="pb-2">
                      <h4 className="font-medium">
                        {item.link ? (
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center"
                          >
                            {item.name}
                            <span className="material-icons text-xs ml-1">open_in_new</span>
                          </a>
                        ) : (
                          item.name
                        )}
                      </h4>
                      <p className="text-sm text-neutral-600">{item.purpose}</p>
                      {idx < treatment.items.length - 1 && <Separator className="mt-2" />}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {treatment.resourceLink && (
                    <a 
                      href={treatment.resourceLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline flex items-center"
                    >
                      <span className="material-icons text-sm mr-1">medical_information</span>
                      {treatment.resourceText || "More information"}
                    </a>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleResourceClick(treatment.title)}
                  >
                    <span className="material-icons text-sm mr-1">bookmark</span>
                    Save Information
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        {/* Kidney Foundation News Tab */}
        <TabsContent value="news" className="space-y-4">
          <h2 className="text-xl font-semibold">Kidney Foundation News</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Stay updated with the latest research, treatments, and initiatives in kidney health.
          </p>
          
          {educationContent.news.map((article) => (
            <Card key={article.id}>
              <CardHeader>
                <CardTitle className="text-lg">{article.title}</CardTitle>
                <CardDescription>{article.date} • {article.source}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{article.summary}</p>
                <div className="flex justify-between items-center">
                  <a 
                    href={article.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-primary text-sm hover:underline"
                  >
                    <span className="material-icons text-sm mr-1">link</span>
                    Read Full Article
                  </a>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleResourceClick(article.title)}
                  >
                    <span className="material-icons text-sm">bookmark</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        {/* Self Advocacy Tips Tab */}
        <TabsContent value="advocacy" className="space-y-4">
          <h2 className="text-xl font-semibold">Self-Advocacy Tips</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Learn how to effectively advocate for yourself in your kidney health journey.
          </p>
          
          {educationContent.advocacy.map((resource) => (
            <Card key={resource.id}>
              <CardHeader>
                <CardTitle className="text-lg">{resource.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2">
                  {resource.steps.map((step, idx) => (
                    <li key={idx} className="text-sm">{step}</li>
                  ))}
                </ol>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {resource.resourceLink && (
                    <a 
                      href={resource.resourceLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline flex items-center"
                    >
                      <span className="material-icons text-sm mr-1">help_center</span>
                      {resource.resourceText || "Get help"}
                    </a>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleResourceClick(resource.title)}
                  >
                    <span className="material-icons text-sm mr-1">bookmark</span>
                    Save Tips
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
      
      <BottomNavigation />
    </div>
  );
};

export default EducationHub;