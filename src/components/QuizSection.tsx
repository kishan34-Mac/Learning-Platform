import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizSectionProps {
  chapterId: string;
}

export const QuizSection = ({ chapterId }: QuizSectionProps) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, [chapterId]);

  const fetchQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('chapter_id', chapterId);

    if (!error && data) {
      setQuizzes(data);
      setCurrentQuiz(0);
      setSelectedAnswer("");
      setShowResult(false);
      setScore(0);
      setCompleted(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    
    const correct = selectedAnswer === quizzes[currentQuiz].correct_answer;
    if (correct) {
      setScore(score + 1);
    }
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentQuiz < quizzes.length - 1) {
      setCurrentQuiz(currentQuiz + 1);
      setSelectedAnswer("");
      setShowResult(false);
    } else {
      setCompleted(true);
    }
  };

  if (quizzes.length === 0) {
    return null;
  }

  if (completed) {
    return (
      <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-accent" />
        <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
        <p className="text-lg mb-4">
          Your score: {score} out of {quizzes.length}
        </p>
        <p className="text-muted-foreground">
          {score === quizzes.length ? "Perfect score! 🎉" : "Keep learning to improve!"}
        </p>
      </Card>
    );
  }

  const quiz = quizzes[currentQuiz];

  return (
    <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="mb-4">
        <span className="text-sm text-muted-foreground">
          Question {currentQuiz + 1} of {quizzes.length}
        </span>
      </div>
      
      <h3 className="text-xl font-semibold mb-6">{quiz.question}</h3>

      <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={showResult}>
        <div className="space-y-3">
          {quiz.options.map((option: string, index: number) => (
            <div 
              key={index}
              className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                showResult && option === quiz.correct_answer
                  ? 'border-accent bg-accent/10'
                  : showResult && option === selectedAnswer && option !== quiz.correct_answer
                  ? 'border-destructive bg-destructive/10'
                  : 'border-border hover:border-primary'
              }`}
            >
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label 
                htmlFor={`option-${index}`}
                className="flex-1 cursor-pointer"
              >
                {option}
              </Label>
              {showResult && option === quiz.correct_answer && (
                <CheckCircle className="w-5 h-5 text-accent" />
              )}
              {showResult && option === selectedAnswer && option !== quiz.correct_answer && (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
            </div>
          ))}
        </div>
      </RadioGroup>

      {showResult && (
        <div className={`mt-6 p-4 rounded-lg ${
          selectedAnswer === quiz.correct_answer ? 'bg-accent/10' : 'bg-destructive/10'
        }`}>
          <p className="font-medium mb-2">
            {selectedAnswer === quiz.correct_answer ? "Correct!" : "Incorrect"}
          </p>
          <p className="text-sm text-muted-foreground">{quiz.explanation}</p>
        </div>
      )}

      <div className="mt-6">
        {!showResult ? (
          <Button 
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="w-full bg-gradient-primary"
          >
            Submit Answer
          </Button>
        ) : (
          <Button 
            onClick={handleNext}
            className="w-full bg-gradient-accent"
          >
            {currentQuiz < quizzes.length - 1 ? "Next Question" : "Finish Quiz"}
          </Button>
        )}
      </div>
    </Card>
  );
};