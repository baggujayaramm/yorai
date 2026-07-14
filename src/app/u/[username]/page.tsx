import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeUsername, toPublicProfile } from '@/lib/profile';

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const normalized = normalizeUsername(username);
  const [viewer, user] = await Promise.all([
    getCurrentUser(),
    prisma.user.findUnique({
      where: { username: normalized },
      include: {
        college: { select: { name: true } },
        _count: { select: { questions: true, answers: true, experiences: true, whatWorksPosts: true } },
      },
    }),
  ]);

  if (!user) notFound();
  const isOwner = viewer?.id === user.id;
  const profile = toPublicProfile(user, { isOwner, viewerSignedIn: Boolean(viewer) });

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="liquid-glass-panel liquid-glass-strong rounded-3xl p-6">
          <p className="text-sm font-semibold text-iris">Profile</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">This profile is not public</h1>
          <p className="mt-3 text-sm leading-6 text-ink/65">The student controls who can see this profile. Contributions still show minimal safe context where needed.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <section className="liquid-glass-panel liquid-glass-strong rounded-3xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-iris">@{profile.username}</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">{profile.displayName}</h1>
            <p className="mt-3 text-sm font-semibold text-ink/68">{profile.contextLabel}</p>
          </div>
          <span className="soft-badge">{profile.visibility === 'COMMUNITY_ONLY' ? 'Community only' : profile.visibility}</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="soft-badge">{profile.relationshipLabel}</span>
          {profile.verificationLabel && <span className="rounded-full bg-iris/10 px-2 py-1 text-iris">{profile.verificationLabel}</span>}
          {profile.roleLabel && <span className="rounded-full bg-leaf/10 px-2 py-1 text-leaf">{profile.roleLabel}</span>}
        </div>
        {profile.bio && <p className="mt-5 max-w-2xl text-sm leading-6 text-ink/70">{profile.bio}</p>}
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          {profile.college && <Info label="College" value={profile.college} />}
          {profile.branch && <Info label="Branch" value={profile.branch} />}
          {profile.year && <Info label="Year context" value={profile.year} />}
          <Info label="Joined" value={profile.joinedAt} />
        </dl>
      </section>
      <section className="liquid-glass-panel mt-5 rounded-3xl p-5">
        <h2 className="font-semibold text-ink">Public contributions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Contribution label="Threads" value={profile.contributions.threads} />
          <Contribution label="Replies" value={profile.contributions.replies} />
          <Contribution label="Experiences" value={profile.contributions.experiences} />
          <Contribution label="Insights" value={profile.contributions.insights} />
        </div>
        <p className="mt-4 text-sm text-ink/60">Yorai shows contribution context, not popularity scores.</p>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink/50">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Contribution({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/38 bg-surface/62 p-4 text-center dark:border-white/10">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink/55">{label}</p>
    </div>
  );
}
