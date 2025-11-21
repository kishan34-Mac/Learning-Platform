import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, CheckCircle, Circle, Award } from "lucide-react";
import { toast } from "sonner";
import { QuizSection } from "@/components/QuizSection";
import { VideoPlayer } from "@/components/VideoPlayer";
import { generateCertificate } from "@/lib/generateCertificate";

const Course = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [currentChapter, setCurrentChapter] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "Student");
      }

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('course_id', id)
        .order('order_index');

      if (chaptersError) throw chaptersError;
      setChapters(chaptersData || []);
      
      if (chaptersData && chaptersData.length > 0) {
        setCurrentChapter(chaptersData[0]);
      }

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('course_id', id);

      setProgress(progressData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isChapterCompleted = (chapterId: string) => {
    return progress.some(p => p.chapter_id === chapterId && p.completed);
  };

  const handleChapterComplete = async (chapterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id: id!,
          chapter_id: chapterId,
          completed: true,
          last_position_seconds: 0
        }, {
          onConflict: 'user_id,chapter_id'
        });

      if (error) throw error;
      fetchCourseData();
      toast.success("Chapter completed!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleVideoTimeUpdate = async (seconds: number) => {
    if (!currentChapter) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id: id!,
          chapter_id: currentChapter.id,
          last_position_seconds: seconds,
          completed: false
        }, {
          onConflict: 'user_id,chapter_id'
        });
    } catch (error) {
      // Silent fail for progress updates
      console.error('Error updating progress:', error);
    }
  };

  const handleDownloadCertificate = () => {
    if (!course || !userEmail) return;
    
    const userName = userEmail.split('@')[0].replace(/[._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    generateCertificate({
      userName,
      courseName: course.title,
      completionDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      totalChapters: chapters.length
    });
    
    toast.success("Certificate downloaded successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  const completedCount = chapters.filter(ch => isChapterCompleted(ch.id)).length;
  const progressPercent = chapters.length > 0 ? (completedCount / chapters.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-bg">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar - Chapter List */}
          <div className="lg:col-span-1">
            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm sticky top-8">
              <h2 className="text-2xl font-bold mb-4">{course?.title}</h2>
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{completedCount}/{chapters.length} chapters</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
              
              {/* Certificate Download Button */}
              {progressPercent === 100 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-accent/20 to-primary/20 rounded-lg border border-accent/30">
                  <div className="flex items-center gap-3 mb-3">
                    <Award className="w-6 h-6 text-accent" />
                    <div>
                      <p className="font-semibold text-sm">Course Completed!</p>
                      <p className="text-xs text-muted-foreground">Congratulations on finishing all chapters</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleDownloadCertificate}
                    className="w-full"
                    variant="default"
                  >
                    Download Certificate
                  </Button>
                </div>
              )}
              
              <div className="space-y-2">
                {chapters.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    onClick={() => setCurrentChapter(chapter)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      currentChapter?.id === chapter.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isChapterCompleted(chapter.id) ? (
                        <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs opacity-70 mb-1">Chapter {index + 1}</div>
                        <div className="font-medium text-sm">{chapter.title}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {currentChapter && (
              <div className="space-y-6">
                <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                  <h1 className="text-3xl font-bold mb-6">{currentChapter.title}</h1>
                  
                  {/* Video Player */}
                  <VideoPlayer
                    videoUrl={currentChapter.video_url}
                    slideUrl={currentChapter.slide_url}
                    audioUrl={currentChapter.audio_url}
                    title={currentChapter.title}
                    onTimeUpdate={handleVideoTimeUpdate}
                    startPosition={progress.find(p => p.chapter_id === currentChapter.id)?.last_position_seconds || 0}
                  />

                  <div className="prose prose-invert max-w-none">
                    <h3 className="text-xl font-semibold mb-3">Chapter Content</h3>
                    <p className="text-muted-foreground mb-6">{currentChapter.content}</p>
                    
                    <h3 className="text-xl font-semibold mb-3">Script</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{currentChapter.script}</p>
                  </div>

                  {!isChapterCompleted(currentChapter.id) && (
                    <Button 
                      className="w-full mt-6 bg-gradient-accent"
                      onClick={() => handleChapterComplete(currentChapter.id)}
                    >
                      Mark as Complete
                    </Button>
                  )}
                </Card>

                <QuizSection chapterId={currentChapter.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Course;