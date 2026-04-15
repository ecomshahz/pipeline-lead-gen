'use client';

import { Globe, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ScrapeJob {
  id: string;
  niche: string;
  location: string;
  status: string;
  leads_found: number;
  started_at: string;
}

export function ScrapeStatus({ jobs }: { jobs: ScrapeJob[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-accent-blue" />
        <h3 className="font-semibold text-sm">Scraping Status</h3>
      </div>

      {jobs.length === 0 ? (
        <div className="py-6 text-center text-muted text-sm">
          No active scrape jobs
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50"
            >
              <StatusIcon status={job.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{job.niche}</p>
                <p className="text-xs text-muted">{job.location}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono text-accent-green">
                  {job.leads_found}
                </p>
                <p className="text-xs text-muted">leads</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-4 h-4 text-accent-blue animate-spin" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-accent-green" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-accent-red" />;
    default:
      return <Globe className="w-4 h-4 text-muted" />;
  }
}
