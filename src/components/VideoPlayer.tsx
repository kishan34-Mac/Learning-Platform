import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface VideoPlayerProps {
  videoUrl?: string | null;
  slideUrl?: string | null;
  audioUrl?: string | null;
  title: string;
  onTimeUpdate?: (seconds: number) => void;
  startPosition?: number;
}

export const VideoPlayer = ({ 
  videoUrl, 
  slideUrl,
  audioUrl, 
  title, 
  onTimeUpdate,
  startPosition = 0 
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current && startPosition > 0) {
      videoRef.current.currentTime = startPosition;
    }
  }, [startPosition]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(Math.floor(time));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If no video URL but has audio, show audio player
  if (!videoUrl && audioUrl) {
    return (
      <Card className="mb-6 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 flex flex-col items-center justify-center p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🎧</div>
            <p className="text-lg font-medium text-foreground mb-2">Audio Narration Available</p>
            <p className="text-sm text-muted-foreground">Listen to the AI-generated voiceover</p>
          </div>
          <audio
            ref={videoRef}
            src={audioUrl}
            controls
            className="w-full max-w-md"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />
        </div>
      </Card>
    );
  }

  // If no video URL, show slide or placeholder
  if (!videoUrl) {
    return (
      <Card className="mb-6 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="aspect-video bg-muted/30 flex items-center justify-center">
          {slideUrl ? (
            <img src={slideUrl} alt={title} className="w-full h-full object-contain" />
          ) : (
            <div className="text-center p-8">
              <div className="text-foreground">
                <p className="text-lg mb-2">📚 Content Ready to Learn</p>
                <p className="text-sm text-muted-foreground">Read the chapter content and take the quiz below</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Check if it's a YouTube embed URL
  const isYouTubeEmbed = videoUrl.includes('youtube.com/embed/');

  if (isYouTubeEmbed) {
    return (
      <Card className="overflow-hidden border-border/50 bg-card/50">
        <div className="relative aspect-video bg-black">
          <iframe
            src={videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/50 bg-card/50">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
        
        {/* Custom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="mb-4"
          />
          
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                />
              </div>
              
              <span className="text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};