-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true);

-- Create RLS policies for audio bucket
CREATE POLICY "Anyone can view audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio');

CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their audio files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audio' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their audio files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio' 
  AND auth.role() = 'authenticated'
);