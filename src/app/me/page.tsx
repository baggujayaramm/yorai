import { MyYoraiDashboard } from '@/components/MyYoraiDashboard';
import { FirstUseGuidance } from '@/components/FirstUseGuidance';

export const dynamic = 'force-dynamic';

export default function MyYoraiPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6"><FirstUseGuidance /></div>
      <MyYoraiDashboard />
    </>
  );
}
