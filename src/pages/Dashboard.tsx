import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { BookOpen, PlayCircle, LogOut } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchCourses();

    const channel = supabase
      .channel('course-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses'
        },
        () => fetchCourses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/');
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Courses</h1>
            <p className="text-muted-foreground">Manage and track your learning progress</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {courses.length === 0 ? (
          <Card className="p-12 text-center border-border/50 bg-card/50">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first course by entering a URL on the home page
            </p>
            <Button onClick={() => navigate('/')}>Create Course</Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CourseCard = ({ course }: { course: any }) => {
  const navigate = useNavigate();

  const getStatusBadge = () => {
    switch (course.status) {
      case 'completed':
        return <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">Ready</span>;
      case 'processing':
        return <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Processing...</span>;
      case 'failed':
        return <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">Failed</span>;
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300 group cursor-pointer"
      onClick={() => course.status === 'completed' && navigate(`/course/${course.id}`)}>
      <div className="aspect-video bg-gradient-primary relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircle className="w-16 h-16 text-primary-foreground opacity-80 group-hover:scale-110 transition-transform" />
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-2">{course.title}</h3>
          {getStatusBadge()}
        </div>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {course.description}
          </p>
        )}
        {course.status === 'processing' && (
          <Progress value={33} className="h-1" />
        )}
        {course.status === 'completed' && (
          <Button className="w-full mt-2 bg-gradient-primary">
            Start Learning
          </Button>
        )}
      </div>
    </Card>
  );
};

export default Dashboard;