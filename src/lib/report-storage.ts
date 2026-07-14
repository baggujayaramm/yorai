export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'rejected';

export type LocalReport = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: string;
};

export const REPORT_EVENT = 'yorai-report-change';
const REPORTS_KEY = 'yorai.localReports.v1';

export const reportReasons = [
  'Harassment',
  'Private information',
  'Impersonation',
  'Spam',
  'Misleading context',
  'Unsupported accusation',
  'Irrelevant content',
  'Other',
];

export function getReports() {
  return read<LocalReport[]>([]);
}

export function addReport(input: Pick<LocalReport, 'targetType' | 'targetId' | 'reason' | 'details'>) {
  const report: LocalReport = {
    ...input,
    id: `report-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString().slice(0, 10),
  };
  write([report, ...getReports()]);
  notify();
  return report;
}

export function updateReportStatus(id: string, status: ReportStatus) {
  write(getReports().map((report) => (report.id === id ? { ...report, status } : report)));
  notify();
}

function read<T>(fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(REPORTS_KEY);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(value: LocalReport[]) {
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(value));
}

function notify() {
  window.dispatchEvent(new Event(REPORT_EVENT));
}
