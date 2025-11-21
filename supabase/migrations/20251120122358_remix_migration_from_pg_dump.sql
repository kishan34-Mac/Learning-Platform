--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    script text,
    slide_url text,
    audio_url text,
    video_url text,
    order_index integer NOT NULL,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    source_url text NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chapter_id uuid NOT NULL,
    question text NOT NULL,
    options jsonb NOT NULL,
    correct_answer text NOT NULL,
    explanation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    chapter_id uuid,
    completed boolean DEFAULT false,
    quiz_score integer,
    last_position_seconds integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: user_progress user_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_pkey PRIMARY KEY (id);


--
-- Name: user_progress user_progress_user_id_chapter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_user_id_chapter_id_key UNIQUE (user_id, chapter_id);


--
-- Name: idx_chapters_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapters_course_id ON public.chapters USING btree (course_id);


--
-- Name: idx_chapters_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapters_order ON public.chapters USING btree (course_id, order_index);


--
-- Name: idx_progress_user_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_progress_user_chapter ON public.user_progress USING btree (user_id, chapter_id);


--
-- Name: idx_progress_user_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_progress_user_course ON public.user_progress USING btree (user_id, course_id);


--
-- Name: idx_quizzes_chapter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quizzes_chapter_id ON public.quizzes USING btree (chapter_id);


--
-- Name: courses update_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_progress update_user_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chapters chapters_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: user_progress user_progress_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: user_progress user_progress_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: chapters Users can create chapters in their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create chapters in their courses" ON public.chapters FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = chapters.course_id) AND (courses.user_id = auth.uid())))));


--
-- Name: quizzes Users can create quizzes in their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create quizzes in their courses" ON public.quizzes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.chapters
     JOIN public.courses ON ((courses.id = chapters.course_id)))
  WHERE ((chapters.id = quizzes.chapter_id) AND (courses.user_id = auth.uid())))));


--
-- Name: courses Users can create their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own courses" ON public.courses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: courses Users can delete their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own courses" ON public.courses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_progress Users can insert their own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own progress" ON public.user_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: courses Users can update their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own courses" ON public.courses FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_progress Users can update their own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own progress" ON public.user_progress FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chapters Users can view chapters of their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chapters of their courses" ON public.chapters FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = chapters.course_id) AND (courses.user_id = auth.uid())))));


--
-- Name: quizzes Users can view quizzes of their courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view quizzes of their courses" ON public.quizzes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.chapters
     JOIN public.courses ON ((courses.id = chapters.course_id)))
  WHERE ((chapters.id = quizzes.chapter_id) AND (courses.user_id = auth.uid())))));


--
-- Name: courses Users can view their own courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own courses" ON public.courses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_progress Users can view their own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own progress" ON public.user_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chapters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: quizzes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


