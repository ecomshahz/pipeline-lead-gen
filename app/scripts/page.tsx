'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, BookOpen, Mic, Plus, Trash2, Edit3, X, Check,
  ThumbsUp, ThumbsDown, ChevronDown, ChevronRight,
  Loader2, BarChart3, MessageSquare, Copy, Sparkles,
  MessagesSquare, ShieldAlert, Send, Target,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { CallRecorder, TranscriptInput } from '@/components/calls/call-recorder';
import { NICHES } from '@/lib/niches';
import { NICHE_PLAYBOOKS, type NichePlaybook } from '@/lib/niche-playbooks';

interface Script {
  id: string;
  name: string;
  niche: string | null;
  scenario: string;
  opening: string;
  value_proposition: string;
  discovery_questions: string;
  objection_handling: string;
  closing: string;
  is_default: boolean;
}

interface PlaybookTip {
  id: string;
  type: 'works' | 'avoid';
  tip: string;
  niche: string | null;
}

interface CallAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  analysis: Record<string, string>;
  rewrite_suggestions: string[];
  overall_summary: string;
}

interface Recording {
  id: string;
  lead_id: string | null;
  duration_seconds: number;
  transcript: string | null;
  ai_analysis: CallAnalysis | null;
  score: number | null;
  strengths: string[] | null;
  improvements: string[] | null;
  notes: string | null;
  created_at: string;
  leads?: { business_name: string; niche: string; city: string; state: string } | null;
}

const SCENARIO_LABELS: Record<string, string> = {
  no_website: 'No Website',
  bad_website: 'Bad Website',
  ai_services: 'AI Services',
  follow_up: 'Follow Up',
  general: 'General',
};

export default function ScriptsPage() {
  const [activeTab, setActiveTab] = useState<'scripts' | 'niches' | 'playbook' | 'recorder' | 'history'>('scripts');
  const [selectedNiche, setSelectedNiche] = useState<string>(NICHE_PLAYBOOKS[0]?.slug ?? '');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [playbook, setPlaybook] = useState<{ works: PlaybookTip[]; avoid: PlaybookTip[] }>({ works: [], avoid: [] });
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<CallAnalysis | null>(null);

  // New tip form
  const [newTipType, setNewTipType] = useState<'works' | 'avoid'>('works');
  const [newTipText, setNewTipText] = useState('');
  const [editingTip, setEditingTip] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchScripts(), fetchPlaybook(), fetchRecordings()]);
    setLoading(false);
  }

  async function fetchScripts() {
    const res = await fetch('/api/calls?type=scripts');
    if (res.ok) setScripts(await res.json());
  }

  async function fetchPlaybook() {
    const res = await fetch('/api/calls?type=playbook');
    if (res.ok) setPlaybook(await res.json());
  }

  async function fetchRecordings() {
    const res = await fetch('/api/calls?type=recordings');
    if (res.ok) setRecordings(await res.json());
  }

  async function addTip() {
    if (!newTipText.trim()) return;
    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'playbook', tipType: newTipType, tip: newTipText }),
    });
    if (res.ok) {
      setNewTipText('');
      fetchPlaybook();
    }
  }

  async function updateTip(id: string) {
    if (!editText.trim()) return;
    await fetch('/api/calls', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'playbook', id, tip: editText }),
    });
    setEditingTip(null);
    fetchPlaybook();
  }

  async function deleteTip(id: string) {
    await fetch(`/api/calls?type=playbook&id=${id}`, { method: 'DELETE' });
    fetchPlaybook();
  }

  async function deleteRecording(id: string) {
    await fetch(`/api/calls?type=recording&id=${id}`, { method: 'DELETE' });
    fetchRecordings();
  }

  async function analyzeTranscript(transcript: string) {
    setAnalyzing(true);
    setCurrentAnalysis(null);

    try {
      // Save recording first
      const saveRes = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'recording',
          transcript,
          duration_seconds: 0,
        }),
      });

      let recordingId: string | null = null;
      if (saveRes.ok) {
        const saved = await saveRes.json();
        recordingId = saved.id;
      }

      // Analyze
      const res = await fetch('/api/calls/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId, transcript }),
      });

      if (res.ok) {
        const analysis = await res.json();
        setCurrentAnalysis(analysis);
        fetchRecordings();
      } else {
        alert('Analysis failed. Check your API configuration.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleRecordingComplete(audioBlob: Blob, durationSeconds: number) {
    // Save the recording metadata
    await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'recording',
        duration_seconds: durationSeconds,
        notes: 'Audio recorded — paste transcript below for AI analysis',
      }),
    });
    fetchRecordings();

    // Switch to transcript input for analysis
    // (Browser speech-to-text could be added here in the future)
    alert(`Recording saved (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s). Paste the transcript below to get AI analysis.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cold Call Scripts</h1>
        <p className="text-muted text-sm mt-1">
          Your playbook, scripts, and call analysis
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit flex-wrap">
        {([
          { key: 'scripts', label: 'Scripts', icon: BookOpen },
          { key: 'niches', label: 'Niche Playbooks', icon: Target },
          { key: 'playbook', label: 'Playbook', icon: MessageSquare },
          { key: 'recorder', label: 'Record & Analyze', icon: Mic },
          { key: 'history', label: 'Call History', icon: BarChart3 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === key
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-muted hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Scripts Tab */}
      {activeTab === 'scripts' && (
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))
          ) : scripts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
              No scripts yet. Run the database migration to load default scripts.
            </div>
          ) : (
            scripts.map((script) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-card-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-accent-blue shrink-0" />
                    <div>
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        {script.name}
                        {script.is_default && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-accent-blue/10 text-accent-blue rounded">
                            Default
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted">
                        {SCENARIO_LABELS[script.scenario] ?? script.scenario}
                        {script.niche && ` · ${script.niche}`}
                      </p>
                    </div>
                  </div>
                  {expandedScript === script.id ? (
                    <ChevronDown className="w-4 h-4 text-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedScript === script.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                        <ScriptSection title="Opening" content={script.opening} color="text-accent-blue" />
                        <ScriptSection title="Value Proposition" content={script.value_proposition} color="text-accent-green" />
                        <ScriptSection title="Discovery Questions" content={script.discovery_questions} color="text-accent-amber" />
                        <ScriptSection title="Objection Handling" content={script.objection_handling} color="text-accent-red" />
                        <ScriptSection title="Closing / CTA" content={script.closing} color="text-accent-blue" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Niche Playbooks Tab */}
      {activeTab === 'niches' && (
        <NichePlaybooksView
          playbooks={NICHE_PLAYBOOKS}
          selectedSlug={selectedNiche}
          onSelect={setSelectedNiche}
        />
      )}

      {/* Playbook Tab */}
      {activeTab === 'playbook' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* What Works */}
          <div className="bg-card border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-accent-green" />
              <h3 className="font-semibold text-sm">What Works</h3>
              <span className="text-xs text-muted ml-auto">{playbook.works.length} tips</span>
            </div>
            <div className="p-4 space-y-2">
              {playbook.works.map((tip) => (
                <TipCard
                  key={tip.id}
                  tip={tip}
                  onEdit={(id) => { setEditingTip(id); setEditText(tip.tip); }}
                  onDelete={deleteTip}
                  editing={editingTip === tip.id}
                  editText={editText}
                  onEditTextChange={setEditText}
                  onEditSave={() => updateTip(tip.id)}
                  onEditCancel={() => setEditingTip(null)}
                />
              ))}
              {playbook.works.length === 0 && (
                <p className="text-sm text-muted py-4 text-center">No tips yet</p>
              )}
            </div>
          </div>

          {/* What to Avoid */}
          <div className="bg-card border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-accent-red" />
              <h3 className="font-semibold text-sm">What to Avoid</h3>
              <span className="text-xs text-muted ml-auto">{playbook.avoid.length} tips</span>
            </div>
            <div className="p-4 space-y-2">
              {playbook.avoid.map((tip) => (
                <TipCard
                  key={tip.id}
                  tip={tip}
                  onEdit={(id) => { setEditingTip(id); setEditText(tip.tip); }}
                  onDelete={deleteTip}
                  editing={editingTip === tip.id}
                  editText={editText}
                  onEditTextChange={setEditText}
                  onEditSave={() => updateTip(tip.id)}
                  onEditCancel={() => setEditingTip(null)}
                />
              ))}
              {playbook.avoid.length === 0 && (
                <p className="text-sm text-muted py-4 text-center">No tips yet</p>
              )}
            </div>
          </div>

          {/* Add New Tip */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent-blue" />
              Add New Tip
            </h3>
            <div className="flex gap-3 items-start">
              <select
                value={newTipType}
                onChange={(e) => setNewTipType(e.target.value as 'works' | 'avoid')}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
              >
                <option value="works">What Works</option>
                <option value="avoid">What to Avoid</option>
              </select>
              <input
                type="text"
                value={newTipText}
                onChange={(e) => setNewTipText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTip()}
                placeholder="e.g., Mentioning their Google rating builds credibility fast..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
              />
              <button
                onClick={addTip}
                disabled={!newTipText.trim()}
                className="px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record & Analyze Tab */}
      {activeTab === 'recorder' && (
        <div className="space-y-6">
          {/* Recorder */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Mic className="w-4 h-4 text-accent-red" />
              Record a Call
            </h3>
            <p className="text-sm text-muted mb-4">
              Hit record when you start a cold call. After you stop, paste the transcript below for AI analysis.
            </p>
            <CallRecorder onRecordingComplete={handleRecordingComplete} />
          </div>

          {/* Transcript Input */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent-blue" />
              Analyze a Call Transcript
            </h3>
            <p className="text-sm text-muted mb-4">
              Paste your call transcript and get AI-powered feedback on what you did well and what to improve.
            </p>
            <TranscriptInput onSubmit={analyzeTranscript} loading={analyzing} />
          </div>

          {/* Analysis Results */}
          <AnimatePresence>
            {currentAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Score */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">Call Analysis</h3>
                    <div className={cn(
                      'px-3 py-1.5 rounded-full font-mono font-bold text-sm border',
                      currentAnalysis.score >= 70 ? 'bg-accent-green/10 text-accent-green border-accent-green/30' :
                      currentAnalysis.score >= 40 ? 'bg-accent-amber/10 text-accent-amber border-accent-amber/30' :
                      'bg-accent-red/10 text-accent-red border-accent-red/30'
                    )}>
                      {currentAnalysis.score}/100
                    </div>
                  </div>

                  <p className="text-sm text-muted mb-4">{currentAnalysis.overall_summary}</p>

                  {/* Score bar */}
                  <div className="h-2 bg-border rounded-full overflow-hidden mb-6">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentAnalysis.score}%` }}
                      transition={{ duration: 0.8 }}
                      className={cn(
                        'h-full rounded-full',
                        currentAnalysis.score >= 70 ? 'bg-accent-green' :
                        currentAnalysis.score >= 40 ? 'bg-accent-amber' :
                        'bg-accent-red'
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 bg-accent-green/5 border border-accent-green/20 rounded-lg">
                      <h4 className="text-sm font-medium text-accent-green mb-2 flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4" />
                        Strengths
                      </h4>
                      <ul className="space-y-1.5">
                        {currentAnalysis.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-muted flex gap-2">
                            <span className="text-accent-green shrink-0">+</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="p-4 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
                      <h4 className="text-sm font-medium text-accent-amber mb-2 flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        Areas to Improve
                      </h4>
                      <ul className="space-y-1.5">
                        {currentAnalysis.improvements.map((s, i) => (
                          <li key={i} className="text-xs text-muted flex gap-2">
                            <span className="text-accent-amber shrink-0">→</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Detailed Analysis */}
                {currentAnalysis.analysis && (
                  <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-semibold text-sm mb-4">Detailed Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(currentAnalysis.analysis).map(([key, value]) => (
                        <div key={key} className="p-3 bg-background rounded-lg border border-border/50">
                          <p className="text-xs text-accent-blue font-medium mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rewrite Suggestions */}
                {currentAnalysis.rewrite_suggestions?.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-semibold text-sm mb-3">Suggested Rewrites</h3>
                    <div className="space-y-2">
                      {currentAnalysis.rewrite_suggestions.map((s, i) => (
                        <div key={i} className="p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                          <p className="text-xs text-muted">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Call History Tab */}
      {activeTab === 'history' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Call Recordings & Analysis</h3>
          </div>

          {recordings.length === 0 ? (
            <div className="px-5 py-12 text-center text-muted text-sm">
              <Mic className="w-8 h-8 mx-auto mb-3 opacity-50" />
              No recordings yet. Record a call or paste a transcript to get started.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recordings.map((rec) => (
                <div key={rec.id} className="px-5 py-4 hover:bg-card-hover transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Mic className="w-4 h-4 text-muted" />
                      <div>
                        <p className="text-sm font-medium">
                          {rec.leads?.business_name ?? 'Call Recording'}
                        </p>
                        <p className="text-xs text-muted">
                          {formatDateTime(rec.created_at)}
                          {rec.duration_seconds > 0 && ` · ${Math.floor(rec.duration_seconds / 60)}m ${rec.duration_seconds % 60}s`}
                          {rec.leads && ` · ${rec.leads.niche} · ${rec.leads.city}, ${rec.leads.state}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {rec.score !== null && (
                        <span className={cn(
                          'px-2 py-0.5 rounded-full font-mono text-xs font-medium border',
                          rec.score >= 70 ? 'bg-accent-green/10 text-accent-green border-accent-green/30' :
                          rec.score >= 40 ? 'bg-accent-amber/10 text-accent-amber border-accent-amber/30' :
                          'bg-accent-red/10 text-accent-red border-accent-red/30'
                        )}>
                          {rec.score}/100
                        </span>
                      )}
                      <button
                        onClick={() => deleteRecording(rec.id)}
                        className="p-1.5 text-muted hover:text-accent-red rounded-md hover:bg-card-hover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {rec.strengths && rec.strengths.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rec.strengths.slice(0, 3).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] bg-accent-green/10 text-accent-green rounded">
                          {s.length > 50 ? s.slice(0, 50) + '...' : s}
                        </span>
                      ))}
                    </div>
                  )}

                  {rec.improvements && rec.improvements.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {rec.improvements.slice(0, 3).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] bg-accent-amber/10 text-accent-amber rounded">
                          {s.length > 50 ? s.slice(0, 50) + '...' : s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NichePlaybooksView({
  playbooks,
  selectedSlug,
  onSelect,
}: {
  playbooks: NichePlaybook[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  const playbook = playbooks.find((p) => p.slug === selectedSlug) ?? playbooks[0];

  if (!playbook) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted text-sm">
        <Target className="w-8 h-8 mx-auto mb-3 opacity-50" />
        No niche playbooks yet. Add one in <span className="font-mono">lib/niche-playbooks.ts</span>.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Niche selector */}
      <div className="flex flex-wrap gap-2">
        {playbooks.map((p) => (
          <button
            key={p.slug}
            onClick={() => onSelect(p.slug)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
              selectedSlug === p.slug
                ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/40'
                : 'bg-card text-muted border-border hover:text-foreground'
            )}
          >
            {p.emoji && <span className="text-base">{p.emoji}</span>}
            {p.name}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          {playbook.emoji && <span className="text-3xl">{playbook.emoji}</span>}
          <h2 className="text-xl font-bold tracking-tight">{playbook.name}</h2>
        </div>
        {playbook.tagline && (
          <p className="text-sm text-muted">{playbook.tagline}</p>
        )}
      </div>

      {/* Cold DMs / Text Messages */}
      {playbook.dms && playbook.dms.length > 0 && (
        <PlaybookSection
          title="Cold Text / DM Messages (First Touch)"
          subtitle="These are your openers. The goal isn't to close — it's to start a conversation."
          icon={MessagesSquare}
          accent="text-accent-blue"
        >
          <div className="space-y-3">
            {playbook.dms.map((dm, i) => (
              <CopyableCard
                key={i}
                label={`Message ${i + 1} — ${dm.label}`}
                description={dm.description}
                body={dm.body}
              />
            ))}
          </div>
        </PlaybookSection>
      )}

      {/* Cold Call Script */}
      {playbook.coldCall && playbook.coldCall.length > 0 && (
        <PlaybookSection
          title="Cold Call Script"
          subtitle="Niche-specific script — pattern interrupt, listen, soft close."
          icon={Phone}
          accent="text-accent-green"
        >
          <div className="space-y-3">
            {playbook.coldCall.map((block, i) => (
              <CopyableCard
                key={i}
                label={block.label}
                description={block.guidance}
                body={block.body}
              />
            ))}
          </div>
        </PlaybookSection>
      )}

      {/* Objection Responses */}
      {playbook.objections && playbook.objections.length > 0 && (
        <PlaybookSection
          title="Objection Responses"
          subtitle="Pre-written responses to the most common pushback."
          icon={ShieldAlert}
          accent="text-accent-amber"
        >
          <div className="space-y-3">
            {playbook.objections.map((obj, i) => (
              <div
                key={i}
                className="bg-background border border-border/50 rounded-lg overflow-hidden"
              >
                <div className="px-4 py-3 bg-accent-amber/5 border-b border-accent-amber/20">
                  <p className="text-xs font-medium text-accent-amber uppercase tracking-wider mb-1">
                    Objection
                  </p>
                  <p className="text-sm italic">&ldquo;{obj.objection}&rdquo;</p>
                </div>
                <div className="p-4">
                  {obj.guidance && (
                    <p className="text-xs text-accent-red mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" />
                      {obj.guidance}
                    </p>
                  )}
                  <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
                    {obj.response}
                  </p>
                  <CopyButton text={obj.response} />
                </div>
              </div>
            ))}
          </div>
        </PlaybookSection>
      )}

      {/* Follow-Up Sequence */}
      {playbook.followUps && playbook.followUps.length > 0 && (
        <PlaybookSection
          title="Follow-Up Sequence"
          subtitle="After sending a spec site — a simple cadence that stays polite but persistent."
          icon={Send}
          accent="text-accent-blue"
        >
          <div className="relative border-l-2 border-border ml-2 pl-6 space-y-4">
            {playbook.followUps.map((fu, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-accent-blue border-2 border-background" />
                <p className="text-xs font-medium text-accent-blue uppercase tracking-wider mb-2">
                  {fu.timing}
                </p>
                <CopyableCard body={fu.body} />
              </div>
            ))}
          </div>
        </PlaybookSection>
      )}

      {/* Key Selling Points */}
      {playbook.sellingPoints && playbook.sellingPoints.length > 0 && (
        <PlaybookSection
          title="Key Selling Points"
          subtitle="Weave these in naturally during conversation — don't dump them all at once."
          icon={Sparkles}
          accent="text-accent-green"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {playbook.sellingPoints.map((sp, i) => (
              <div
                key={i}
                className="p-4 bg-background border border-border/50 rounded-lg"
              >
                <h4 className="text-sm font-semibold text-accent-green mb-1.5 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {sp.headline}
                </h4>
                <p className="text-xs text-muted leading-relaxed">{sp.detail}</p>
              </div>
            ))}
          </div>
        </PlaybookSection>
      )}
    </div>
  );
}

function PlaybookSection({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-start gap-3">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', accent)} />
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CopyableCard({
  label,
  description,
  body,
}: {
  label?: string;
  description?: string;
  body: string;
}) {
  return (
    <div className="bg-background border border-border/50 rounded-lg p-4">
      {label && (
        <p className="text-xs font-medium text-accent-blue uppercase tracking-wider mb-1">
          {label}
        </p>
      )}
      {description && (
        <p className="text-xs text-muted italic mb-2">{description}</p>
      )}
      <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{body}</p>
      <CopyButton text={body} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  };

  return (
    <button
      onClick={copy}
      className={cn(
        'mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors',
        copied
          ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
          : 'bg-transparent text-muted border-border hover:text-foreground hover:border-accent-blue/40'
      )}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy
        </>
      )}
    </button>
  );
}

function ScriptSection({ title, content, color }: { title: string; content: string; color: string }) {
  return (
    <div>
      <h4 className={`text-xs font-medium mb-2 uppercase tracking-wider ${color}`}>
        {title}
      </h4>
      <div className="p-4 bg-background rounded-lg border border-border/50">
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-muted">
          {content}
        </pre>
      </div>
    </div>
  );
}

function TipCard({
  tip,
  onEdit,
  onDelete,
  editing,
  editText,
  onEditTextChange,
  onEditSave,
  onEditCancel,
}: {
  tip: PlaybookTip;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  editing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-background rounded-lg border border-accent-blue/30">
        <input
          type="text"
          value={editText}
          onChange={(e) => onEditTextChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEditSave()}
          className="flex-1 px-2 py-1 bg-transparent text-sm focus:outline-none"
          autoFocus
        />
        <button onClick={onEditSave} className="p-1 text-accent-green hover:bg-card-hover rounded">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={onEditCancel} className="p-1 text-muted hover:bg-card-hover rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2 p-2 rounded-lg hover:bg-background transition-colors">
      <span className={cn(
        'mt-0.5 shrink-0 text-xs',
        tip.type === 'works' ? 'text-accent-green' : 'text-accent-red'
      )}>
        {tip.type === 'works' ? '✓' : '✗'}
      </span>
      <p className="flex-1 text-sm text-muted">{tip.tip}</p>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(tip.id)}
          className="p-1 text-muted hover:text-foreground rounded"
        >
          <Edit3 className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(tip.id)}
          className="p-1 text-muted hover:text-accent-red rounded"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
