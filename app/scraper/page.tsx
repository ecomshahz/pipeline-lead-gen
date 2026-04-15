'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Play, Square, Clock, CheckCircle, AlertCircle,
  Loader2, MapPin, RefreshCw,
} from 'lucide-react';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { NICHES, US_CITIES } from '@/lib/niches';
import { ScrapeJob } from '@/types';

export default function ScraperPage() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  // Scrape form state
  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customState, setCustomState] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/scrape');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function startScrape() {
    const city = useCustomLocation ? customCity : selectedCity;
    const state = useCustomLocation
      ? customState
      : US_CITIES.find((c) => c.city === selectedCity)?.state ?? '';

    if (!selectedNiche || !city || !state) return;

    setScraping(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: selectedNiche, city, state }),
      });

      if (res.ok) {
        fetchJobs();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start scrape');
      }
    } catch (err) {
      console.error('Failed to start scrape:', err);
    } finally {
      setScraping(false);
    }
  }

  async function cancelJob(jobId: string) {
    try {
      const res = await fetch('/api/scrape', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action: 'cancel' }),
      });

      if (res.ok) {
        fetchJobs();
      }
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  }

  const runningJobs = jobs.filter((j) => j.status === 'running');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const failedJobs = jobs.filter((j) => j.status === 'failed');

  const uniqueStates = [...new Set(US_CITIES.map((c) => c.state))].sort();
  const citiesForState = selectedState
    ? US_CITIES.filter((c) => c.state === selectedState)
    : US_CITIES;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scraper Control</h1>
        <p className="text-muted text-sm mt-1">
          Find new leads by scraping Google Places
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scrape Configuration */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent-blue" />
              New Scrape Job
            </h3>

            <div className="space-y-4">
              {/* Niche Selection */}
              <div>
                <label className="block text-xs text-muted mb-1.5">Business Niche</label>
                <select
                  value={selectedNiche}
                  onChange={(e) => setSelectedNiche(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
                >
                  <option value="">Select a niche...</option>
                  <optgroup label="Tier 1 — Highest Close Rate">
                    {NICHES.filter((n) => n.tier === 'tier1').map((n) => (
                      <option key={n.name} value={n.name}>{n.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Tier 2 — High Value">
                    {NICHES.filter((n) => n.tier === 'tier2').map((n) => (
                      <option key={n.name} value={n.name}>{n.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Tier 3 — Volume Play">
                    {NICHES.filter((n) => n.tier === 'tier3').map((n) => (
                      <option key={n.name} value={n.name}>{n.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Location Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUseCustomLocation(false)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-md transition-colors',
                    !useCustomLocation
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  Select City
                </button>
                <button
                  onClick={() => setUseCustomLocation(true)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-md transition-colors',
                    useCustomLocation
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  Custom Location
                </button>
              </div>

              {useCustomLocation ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1.5">City</label>
                    <input
                      type="text"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      placeholder="e.g., Miami"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">State</label>
                    <input
                      type="text"
                      value={customState}
                      onChange={(e) => setCustomState(e.target.value)}
                      placeholder="e.g., FL"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">State</label>
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedCity('');
                      }}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
                    >
                      <option value="">All states</option>
                      {uniqueStates.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">City</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
                    >
                      <option value="">Select a city...</option>
                      {citiesForState.map((c) => (
                        <option key={`${c.city}-${c.state}`} value={c.city}>
                          {c.city}, {c.state}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Start Button */}
              <button
                onClick={startScrape}
                disabled={scraping || !selectedNiche || (useCustomLocation ? !customCity || !customState : !selectedCity)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Scraping
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3">Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-accent-blue" />
                  Running
                </span>
                <span className="font-mono text-sm">{runningJobs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-accent-green" />
                  Completed
                </span>
                <span className="font-mono text-sm">{completedJobs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-accent-red" />
                  Failed
                </span>
                <span className="font-mono text-sm">{failedJobs.length}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Total Leads Found</span>
                  <span className="font-mono text-sm text-accent-green">
                    {jobs.reduce((sum, j) => sum + j.leads_found, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Job History */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm">Scrape Jobs</h3>
              <div className="flex items-center gap-2">
                {runningJobs.length > 0 && (
                  <button
                    onClick={() => runningJobs.forEach((j) => cancelJob(j.id))}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-accent-red/10 text-accent-red text-xs font-medium rounded-md hover:bg-accent-red/20 transition-colors"
                  >
                    <Square className="w-3 h-3" />
                    Stop All ({runningJobs.length})
                  </button>
                )}
                <button
                  onClick={fetchJobs}
                  className="p-1.5 text-muted hover:text-foreground rounded-md hover:bg-card-hover"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-14 rounded-lg" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="px-5 py-12 text-center text-muted text-sm">
                <Globe className="w-8 h-8 mx-auto mb-3 opacity-50" />
                No scrape jobs yet. Configure and start your first scrape above.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {jobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="px-5 py-3 flex items-center gap-4 hover:bg-card-hover transition-colors"
                  >
                    <JobStatusIcon status={job.status} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{job.niche}</p>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 text-[10px] rounded font-medium',
                            job.status === 'running' && 'bg-accent-blue/10 text-accent-blue',
                            job.status === 'completed' && 'bg-accent-green/10 text-accent-green',
                            job.status === 'failed' && 'bg-accent-red/10 text-accent-red',
                            job.status === 'queued' && 'bg-muted/10 text-muted'
                          )}
                        >
                          {job.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                        {job.started_at && (
                          <> · {timeAgo(job.started_at)}</>
                        )}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono text-accent-green">
                        {job.leads_found}
                      </p>
                      <p className="text-xs text-muted">leads</p>
                    </div>

                    {job.status === 'running' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelJob(job.id);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-accent-red/10 text-accent-red text-xs font-medium rounded-md hover:bg-accent-red/20 transition-colors shrink-0"
                      >
                        <Square className="w-3 h-3" />
                        Stop
                      </button>
                    )}

                    {job.error_message && (
                      <div className="text-xs text-accent-red max-w-[200px] truncate">
                        {job.error_message}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-5 h-5 text-accent-blue animate-spin shrink-0" />;
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-accent-green shrink-0" />;
    case 'failed':
      return <AlertCircle className="w-5 h-5 text-accent-red shrink-0" />;
    default:
      return <Clock className="w-5 h-5 text-muted shrink-0" />;
  }
}
