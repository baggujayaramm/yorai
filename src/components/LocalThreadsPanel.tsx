'use client';

import { useEffect, useState } from 'react';
import { getLocalThreadsForCollege, LOCAL_THREAD_EVENT, type LocalThread } from '@/lib/local-thread-storage';
import type { College } from '@/lib/types';
import { ThreadCard } from './ThreadCard';

export function LocalThreadsPanel({ college }: { college: College }) {
  const [threads, setThreads] = useState<LocalThread[]>([]);

  useEffect(() => {
    const load = () => setThreads(getLocalThreadsForCollege(college.id));
    load();
    window.addEventListener(LOCAL_THREAD_EVENT, load);
    window.addEventListener('storage', load);

    return () => {
      window.removeEventListener(LOCAL_THREAD_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [college.id]);

  if (threads.length === 0) return null;

  return (
    <div className="grid gap-4">
      {threads.map((thread) => (
        <ThreadCard college={college} thread={thread} key={thread.id} />
      ))}
    </div>
  );
}
