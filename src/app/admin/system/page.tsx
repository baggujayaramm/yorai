import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { validateEnvironment } from '@/lib/environment';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export default async function AdminSystemPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <Restricted />;
  const config = validateEnvironment();
  let database = false;
  try { await prisma.$queryRaw`SELECT 1`; database = true; } catch { database = false; }
  const [pendingModeration, failedImports, highRisk, warnings] = await Promise.all([
    prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED'] } } }),
    prisma.collegeImportBatch.count({ where: { status: 'FAILED' } }),
    prisma.report.count({ where: { riskLevel: 'HIGH', status: { in: ['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED'] } } }),
    prisma.operationalEvent.findMany({ where: { level: { in: ['warn', 'error'] } }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, level: true, category: true, code: true, requestId: true, createdAt: true } }),
  ]);
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><p className="text-sm font-semibold text-iris">Admin operations</p><h1 className="mt-2 text-3xl font-semibold text-ink">Platform health</h1><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Application" value="Running" /><Metric label="Database" value={database ? 'Connected' : 'Unavailable'} /><Metric label="Configuration" value={config.ok ? 'Ready' : 'Needs attention'} /><Metric label="Pending moderation" value={pendingModeration} /><Metric label="High-risk unresolved" value={highRisk} /></div><section className="content-solid mt-6 rounded-2xl border border-line p-5"><h2 className="font-semibold text-ink">Operations</h2><p className="mt-2 text-sm text-ink/65">Failed imports: {failedImports}. Health responses expose status only, never credentials or environment values.</p><div className="mt-4 grid gap-2">{warnings.length ? warnings.map((item) => <div className="rounded-xl bg-mist/70 p-3 text-sm" key={item.id}><span className="font-semibold text-ink">{item.category} · {item.code}</span><span className="ml-2 text-ink/50">{item.createdAt.toISOString()} {item.requestId ? `· Error ID ${item.requestId}` : ''}</span></div>) : <p className="text-sm text-ink/60">No recent operational warnings.</p>}</div></section></main>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="liquid-glass-panel rounded-2xl p-4"><p className="text-xs text-ink/55">{label}</p><p className="mt-1 font-semibold text-ink">{value}</p></div>; }
function Restricted() { return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><section className="liquid-glass-panel rounded-3xl p-6"><h1 className="text-2xl font-semibold text-ink">Admin access required</h1><p className="mt-3 text-sm text-ink/65">Platform health is limited to Yorai administrators.</p><Link className="button-secondary mt-5 inline-flex px-4 py-2" href="/">Return home</Link></section></main>; }
