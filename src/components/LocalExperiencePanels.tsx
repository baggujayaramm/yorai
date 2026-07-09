'use client';

import { useEffect, useState } from 'react';
import type { College } from '@/lib/types';
import {
  getLocalExperiences,
  getLocalWhatWorks,
  LOCAL_POST_EVENT,
  type LocalExperience,
  type LocalWhatWorks,
} from '@/lib/local-post-storage';
import { ExperiencePanel, WhatWorksPanel } from './ProfilePanels';

export function LocalExperiencePanel({ college }: { college: College }) {
  const [experiences, setExperiences] = useState<LocalExperience[]>([]);

  useEffect(() => {
    const refresh = () => setExperiences(getLocalExperiences(college.id));
    refresh();
    window.addEventListener(LOCAL_POST_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(LOCAL_POST_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [college.id]);

  if (!experiences.length) return null;

  return <ExperiencePanel experiences={experiences} />;
}

export function LocalWhatWorksPanel({ college }: { college: College }) {
  const [posts, setPosts] = useState<LocalWhatWorks[]>([]);

  useEffect(() => {
    const refresh = () => setPosts(getLocalWhatWorks(college.id));
    refresh();
    window.addEventListener(LOCAL_POST_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(LOCAL_POST_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [college.id]);

  if (!posts.length) return null;

  return <WhatWorksPanel posts={posts} />;
}
