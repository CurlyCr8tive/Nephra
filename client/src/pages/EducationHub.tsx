import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Calendar, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";

// News article interface matching the server
interface NewsArticle {
  id: string;
  title: string;
  date: string;
  summary: string;
  source: string;
  link: string;
  category: 'research' | 'treatment' | 'policy' | 'prevention' | 'general';
  relevanceScore: number;
}

const EducationHub = () => {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("questions");

  // Fetch live kidney health news
  const { 
    data: newsData, 
    isLoading: newsLoading, 
    error: newsError,
    refetch: refetchNews
  } = useQuery({
    queryKey: ["/api/kidney-news"],
    queryFn: async () => {
      const response = await fetch("/api/kidney-news?limit=8");
      if (!response.ok) {
        throw new Error("Failed to fetch news");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });

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
        
        {/* Latest Kidney Health News Tab */}
        <TabsContent value="news" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Latest Kidney Health News</h2>
              <p className="text-sm text-neutral-600">
                Current developments in kidney disease research, treatments, and policy updates.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchNews()}
              disabled={newsLoading}
              className="flex items-center gap-2"
            >
              {newsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              Refresh
            </Button>
          </div>

          {newsLoading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm text-neutral-600">Fetching latest news...</span>
            </div>
          )}

          {newsError && (
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">
                  Unable to fetch the latest news. Please check your connection and try again.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => refetchNews()}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {newsData?.success && newsData.articles.length > 0 && (
            <div className="space-y-4">
              <div className="text-xs text-neutral-500 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Last updated: {new Date(newsData.lastUpdated).toLocaleString()}
                <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                  {newsData.count} articles
                </span>
              </div>
              
              {newsData.articles.map((article: NewsArticle) => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg leading-tight pr-2">{article.title}</CardTitle>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Tag className={`w-3 h-3 ${
                          article.category === 'research' ? 'text-blue-600' :
                          article.category === 'treatment' ? 'text-green-600' :
                          article.category === 'policy' ? 'text-purple-600' :
                          article.category === 'prevention' ? 'text-orange-600' :
                          'text-neutral-600'
                        }`} />
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          article.category === 'research' ? 'bg-blue-50 text-blue-700' :
                          article.category === 'treatment' ? 'bg-green-50 text-green-700' :
                          article.category === 'policy' ? 'bg-purple-50 text-purple-700' :
                          article.category === 'prevention' ? 'bg-orange-50 text-orange-700' :
                          'bg-neutral-50 text-neutral-700'
                        }`}>
                          {article.category}
                        </span>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {article.date} • {article.source}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-700 mb-3 leading-relaxed">{article.summary}</p>
                    <div className="flex justify-between items-center">
                      <a 
                        href={article.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-primary text-sm hover:underline transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Read Full Article
                      </a>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleResourceClick(article.title)}
                        className="text-neutral-600 hover:text-primary"
                      >
                        <span className="material-icons text-sm">bookmark_add</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {newsData?.success && newsData.articles.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-neutral-600">No news articles available at the moment.</p>
              </CardContent>
            </Card>
          )}
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