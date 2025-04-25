import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSupabase } from "@/hooks/useSupabase";
import BottomNavigation from "@/components/BottomNavigation";
import { SupabaseEducationArticle } from "@shared/schema";

const EducationHubSupabase = () => {
  const { toast } = useToast();
  const { supabase, isConnected, isConnecting } = useSupabase();
  const [activeCategory, setActiveCategory] = useState("questions");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SupabaseEducationArticle[]>([]);

  // Fetch education articles based on category
  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['/api/supabase/education-articles', activeCategory],
    queryFn: async () => {
      const response = await fetch(`/api/supabase/education-articles?category=${activeCategory}`);
      if (!response.ok) {
        throw new Error('Failed to fetch education articles');
      }
      return response.json();
    },
    enabled: !isSearching
  });

  // Handle search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/supabase/education-articles?query=${encodeURIComponent(searchQuery)}`);
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data);
          }
        } catch (error) {
          console.error('Search error:', error);
        }
      } else {
        setIsSearching(false);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fallback to hardcoded data if needed
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
        link: "https://www.kidney.org/atoz/content/dialysis",
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
        link: "https://www.niddk.nih.gov/health-information/kidney-disease/kidney-failure/treatment",
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
        resourceLink: "https://www.kidney.org/kidney-basics/what-dialysis",
        resourceText: "Compare dialysis options",
      },
    ],
    news: [
      {
        id: 1,
        title: "New Transplant Initiative Launches Nationwide",
        date: "April 15, 2025",
        summary: "The National Kidney Foundation announces a new initiative to increase living donor kidney transplants by 50% over the next five years through education and advocacy.",
        source: "National Kidney Foundation",
        link: "https://www.kidney.org",
      },
      {
        id: 2,
        title: "Breakthrough in Immunosuppression Medication",
        date: "March 28, 2025",
        summary: "Researchers have developed a new immunosuppression medication that may reduce rejection rates while minimizing side effects in kidney transplant patients.",
        source: "American Journal of Transplantation",
        link: "https://onlinelibrary.wiley.com/journal/16006143",
      },
      {
        id: 3,
        title: "Artificial Kidney Project Enters Human Trials",
        date: "February 10, 2025",
        summary: "After years of development, the first implantable artificial kidney device has been approved for human clinical trials, potentially offering an alternative to dialysis.",
        source: "The Kidney Project - UCSF",
        link: "https://pharm.ucsf.edu/kidney",
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

  // Render articles from Supabase if available
  const renderArticles = () => {
    if (isSearching) {
      return searchResults.map((article: SupabaseEducationArticle) => renderArticleCard(article));
    }

    // If we have Supabase data, use it
    if (articles && articles.length > 0) {
      return articles.map((article: SupabaseEducationArticle) => renderArticleCard(article));
    }
    
    // Otherwise fall back to hardcoded data
    return renderFallbackContent();
  };

  const renderArticleCard = (article: SupabaseEducationArticle) => (
    <Card key={article.id}>
      <CardHeader>
        <CardTitle className="text-lg">{article.title}</CardTitle>
        <CardDescription>
          {article.published_date && new Date(article.published_date).toLocaleDateString()} • {article.source}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">{article.summary}</p>
        <div className="flex justify-between items-center">
          <a
            href={article.url}
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
  );

  // Render hardcoded content based on category
  const renderFallbackContent = () => {
    switch (activeCategory) {
      case 'questions':
        return educationContent.questions.map((section) => (
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
        ));
        
      case 'treatments':
        return educationContent.treatments.map((treatment) => (
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
        ));
        
      case 'news':
        return educationContent.news.map((article) => (
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
        ));
        
      case 'advocacy':
        return educationContent.advocacy.map((resource) => (
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
        ));
        
      default:
        return <p>No content available for this category.</p>;
    }
  };

  return (
    <div className="container max-w-md mx-auto pb-20 pt-4">
      <h1 className="text-2xl font-bold text-primary mb-4">Education & Advocacy Hub</h1>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for resources..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isSearching ? (
        <div className="mb-4">
          <h2 className="text-lg font-medium mb-2">Search Results</h2>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results found for "{searchQuery}"</p>
          ) : null}
        </div>
      ) : (
        <Tabs defaultValue="questions" value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="treatments">Treatments</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="advocacy">Advocacy</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="space-y-4">
        {isLoading || isConnecting ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading resources...</p>
          </div>
        ) : error ? (
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-red-600">
              There was an error loading education resources. Please try again later.
            </p>
          </div>
        ) : (
          renderArticles()
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default EducationHubSupabase;