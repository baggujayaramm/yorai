import { notFound } from 'next/navigation';
import { CollegeProfileHeader } from '@/components/CollegeProfileHeader';
import { CollegeTabs } from '@/components/CollegeTabs';
import Link from 'next/link';
import {
  AskStudentsPanel,
  ExperiencePanel,
  LiveThreadsPanel,
  WhatWorksPanel,
} from '@/components/ProfilePanels';
import { CreateExperienceForm, CreateWhatWorksForm } from '@/components/ExperienceForms';
import { InsightCards } from '@/components/InsightCards';
import { getCollegeBySlugWithDb, getCollegeProfileData } from '@/lib/data';
import { featureEnabled } from '@/lib/release-controls';
import { colleges } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

type CollegePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return colleges.map((college) => ({ slug: college.slug }));
}

export default async function CollegePage({ params }: CollegePageProps) {
  if (!await featureEnabled('public_browsing')) return <PublicBrowsingPaused />;
  const { slug } = await params;
  const college = await getCollegeBySlugWithDb(slug);

  if (!college) {
    notFound();
  }

  const profile = await getCollegeProfileData(college.id);

  return (
    <main>
      <CollegeProfileHeader college={college} />
      <CollegeTabs />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div id="overview" className="grid gap-8">
          <InsightCards
            insights={[
              { label: 'Recently active', value: 'Student voices this week', tone: 'leaf' },
              { label: 'Live student threads', value: 'Current students responding', tone: 'iris' },
              { label: 'Branch context available', value: 'CSE, ECE, AI and ML, BCA', tone: 'sun' },
              { label: 'Fresh student context', value: 'Updates come before totals', tone: 'leaf' },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="community-section-readable rounded-3xl border border-line bg-surface/72 p-6 shadow-soft backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-ink">Community context</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-ink/50">Location</dt>
                  <dd className="mt-1 font-semibold text-ink">{college.city}, {college.state}, {college.country}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink/50">Academic context</dt>
                  <dd className="mt-1 font-semibold text-ink">{college.affiliation}</dd>
                </div>
              </dl>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ink/70">Branches students are talking about</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {college.courses.map((course) => (
                    <span className="soft-badge px-3 py-1 text-sm font-medium" key={course}>
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <aside className="community-section-readable rounded-3xl border border-line bg-surface/72 p-6 shadow-soft backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-ink">Student connection signals</h2>
              <div className="mt-5 space-y-4 text-sm text-ink/68">
                <p>Recent answers include branch and batch context where available.</p>
                <p>Live threads surface recent student voices before older archive context.</p>
                <p>Student paths focus on what helped, what changed, and who the experience may help.</p>
                <p>Future cross-college spaces can connect students around projects, events, and communities.</p>
              </div>
            </aside>
          </div>

          <section id="ask-students" className="grid gap-4">
            <h2 className="text-2xl font-semibold text-ink">Ask Students</h2>
            <AskStudentsPanel questions={profile.questions} />
          </section>

          <section id="live-threads" className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold text-ink">Live Threads</h2>
              <Link className="rounded bg-iris px-4 py-3 text-sm font-semibold text-white hover:bg-iris/90" href={`/colleges/${college.slug}/threads/new`}>
                Start Thread
              </Link>
            </div>
            <div className="community-section-readable rounded-3xl border border-line bg-surface/72 p-4 text-sm leading-6 text-ink/65 shadow-soft backdrop-blur-xl">
              Context can include photos or screenshots when helpful. Before uploading, students should blur names, faces, roll numbers, phone numbers, addresses, QR codes, barcodes, signatures, and private chat identities.
            </div>
            <LiveThreadsPanel college={college} questions={profile.questions} />
          </section>

          <section id="student-experiences" className="grid gap-4">
            <h2 className="text-2xl font-semibold text-ink">Student Experiences</h2>
            <CreateExperienceForm college={college} />
            <ExperiencePanel college={college} experiences={profile.experiences} filtered />
          </section>

          <section id="what-actually-works" className="grid gap-4">
            <h2 className="text-2xl font-semibold text-ink">What Actually Works</h2>
            <CreateWhatWorksForm college={college} />
            <WhatWorksPanel posts={profile.whatWorks} />
          </section>

          <section id="student-paths" className="grid gap-4">
            <h2 className="text-2xl font-semibold text-ink">Student Paths</h2>
            <ExperiencePanel experiences={profile.experiences} />
          </section>

          <section id="opportunities" className="rounded border border-line bg-surface/72 p-6 shadow-soft backdrop-blur-xl">
            <h2 className="text-2xl font-semibold text-ink">Opportunities</h2>
            <p className="mt-3 text-sm text-ink/65">
              Future spaces can help students discover projects, events, hackathons, communities, and collaboration across colleges.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

function PublicBrowsingPaused() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <section className="liquid-glass-panel rounded-3xl p-6">
        <h1 className="text-2xl font-semibold text-ink">College context is temporarily paused</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">Yorai is reviewing launch access settings before showing public college context again.</p>
      </section>
    </main>
  );
}
