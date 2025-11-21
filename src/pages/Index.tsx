import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Sparkles, Video, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthModal } from "@/components/AuthModal";

const Index = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setShowAuth(true);
      return;
    }

    setLoading(true);
    
    try {
      // Create course record
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
          user_id: session.user.id,
          source_url: url,
          title: 'Processing...',
          status: 'processing'
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Trigger content ingestion
      const { error: functionError } = await supabase.functions.invoke('ingest-content', {
        body: { url, courseId: course.id }
      });

      if (functionError) throw functionError;

      toast.success("Course generation started! This may take a few minutes.");
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16 animate-in fade-in duration-1000">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            {/* <span className="text-sm text-primary font-medium">AI-Pow ered Learning Platform</span> */}
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Turn Any Content Into Interactive Courses
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Transform blog posts and documentation into structured video courses with auto-generated chapters, voiceovers, quizzes, and progress tracking.
          </p>

          {/* URL Input Form */}
          <Card className="p-8 shadow-card border-border/50 backdrop-blur-sm bg-card/50 mb-12">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <Input
                type="url"
                placeholder="Enter blog post or documentation URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="flex-1 h-14 text-lg bg-background/50"
              />
              <Button 
                type="submit" 
                disabled={loading}
                className="h-14 px-8 bg-gradient-primary hover:opacity-90 shadow-glow"
              >
                {loading ? "Generating..." : "Create Course"}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-4">
              Paste any URL and we'll automatically generate a complete course
            </p>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon={<BookOpen className="w-8 h-8" />}
            title="Smart Content Parsing"
            description="AI automatically detects and structures content into logical chapters and sections"
          />
          <FeatureCard
            icon={<Video className="w-8 h-8" />}
            title="Video Generation"
            description="Auto-generate slides, voiceovers, and combine them into professional video lessons"
          />
          <FeatureCard
            icon={<Brain className="w-8 h-8" />}
            title="Interactive Quizzes"
            description="AI-generated quizzes with instant feedback and progress tracking"
          />
        </div>
      </div>

      <AuthModal open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300 group">
    <div className="w-16 h-16 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 text-primary-foreground group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </Card>
);

export default Index;