import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, chapterId, voice = "alloy" } = await req.json();
    console.log('Generating TTS for chapter:', chapterId);

    if (!text) {
      throw new Error('Text is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Generate speech using OpenAI TTS
    console.log('Calling OpenAI TTS API...');
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
      }),
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('OpenAI TTS error:', error);
      throw new Error(`TTS generation failed: ${ttsResponse.status}`);
    }

    console.log('TTS generated successfully');

    // Get audio as array buffer
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBlob = new Uint8Array(audioBuffer);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upload to storage
    const fileName = `${chapterId}.mp3`;
    console.log('Uploading to storage:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName);

    console.log('Audio uploaded successfully:', publicUrl);

    // Update chapter with audio URL
    const { error: updateError } = await supabase
      .from('chapters')
      .update({ audio_url: publicUrl })
      .eq('id', chapterId);

    if (updateError) {
      console.error('Chapter update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ audioUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-tts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
