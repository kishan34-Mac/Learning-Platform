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
    const { url, courseId } = await req.json();
    console.log('Ingesting content from:', url);

    // Extract YouTube video ID if it's a YouTube URL
    let youtubeVideoId = null;
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
    const match = url.match(youtubeRegex);
    if (match) {
      youtubeVideoId = match[1];
      console.log('YouTube video ID:', youtubeVideoId);
    }

    // Fetch the webpage
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract text content (simple parsing)
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('Extracted content length:', textContent.length);

    // Call AI to structure the content
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling AI to structure content...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Your task is to analyze content and create a structured course outline with chapters. Each chapter should have a clear title, content summary, and a script suitable for voiceover narration.'
          },
          {
            role: 'user',
            content: `Analyze this content and create a course structure with 5-8 chapters. For each chapter, provide:
1. A clear, engaging title
2. Key content points (2-3 sentences)
3. A natural voiceover script (2-3 paragraphs) that explains the concepts clearly

Content to analyze:
${textContent.substring(0, 10000)}

Return ONLY a valid JSON object with this structure:
{
  "title": "Course Title",
  "description": "Course description",
  "chapters": [
    {
      "title": "Chapter Title",
      "content": "Key points summary",
      "script": "Full voiceover script"
    }
  ]
}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI API error:', error);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    console.log('AI response received');

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const courseStructure = JSON.parse(jsonMatch[0]);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Update course with title and description
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        title: courseStructure.title,
        description: courseStructure.description,
      })
      .eq('id', courseId);

    if (updateError) {
      console.error('Error updating course:', updateError);
      throw updateError;
    }

    // Insert chapters with YouTube embed URL if available
    const chaptersToInsert = courseStructure.chapters.map((chapter: any, index: number) => ({
      course_id: courseId,
      title: chapter.title,
      content: chapter.content,
      script: chapter.script,
      order_index: index,
      video_url: youtubeVideoId ? `https://www.youtube.com/embed/${youtubeVideoId}` : null,
    }));

    const { data: insertedChapters, error: chaptersError } = await supabase
      .from('chapters')
      .insert(chaptersToInsert)
      .select();

    if (chaptersError) {
      console.error('Error inserting chapters:', chaptersError);
      throw chaptersError;
    }

    console.log(`Created ${insertedChapters.length} chapters`);

    // Generate audio and quizzes for each chapter in the background
    for (const chapter of insertedChapters) {
      // Generate TTS audio
      if (chapter.script) {
        console.log(`Generating audio for chapter: ${chapter.title}`);
        fetch(`${supabaseUrl}/functions/v1/generate-tts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: chapter.script,
            chapterId: chapter.id,
            voice: 'alloy',
          }),
        }).catch(err => console.error('TTS generation error:', err));
      }
    }

    // Generate quizzes for each chapter
    for (const chapter of insertedChapters) {
      const quizResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: `Create 3 multiple choice quiz questions based on this content:

Title: ${chapter.title}
Content: ${chapter.content}

Return ONLY a valid JSON array:
[
  {
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Why this is correct"
  }
]`
            }
          ],
        }),
      });

      if (quizResponse.ok) {
        const quizData = await quizResponse.json();
        const quizContent = quizData.choices[0].message.content;
        const quizMatch = quizContent.match(/\[[\s\S]*\]/);
        
        if (quizMatch) {
          const quizzes = JSON.parse(quizMatch[0]);
          const quizzesToInsert = quizzes.map((quiz: any) => ({
            chapter_id: chapter.id,
            question: quiz.question,
            options: quiz.options,
            correct_answer: quiz.correct_answer,
            explanation: quiz.explanation,
          }));

          await supabase.from('quizzes').insert(quizzesToInsert);
          console.log(`Created ${quizzes.length} quizzes for chapter: ${chapter.title}`);
        }
      }
    }

    // Mark course as completed
    await supabase
      .from('courses')
      .update({ status: 'completed' })
      .eq('id', courseId);

    return new Response(
      JSON.stringify({ success: true, chapters: insertedChapters.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ingest-content:', error);
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