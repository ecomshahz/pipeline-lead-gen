'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Plus, Send, Eye, Clock, Trash2, Edit3, X, ChevronDown } from 'lucide-react';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { EmailTemplate, EmailLog } from '@/types';

export default function EmailCenterPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'history' | 'compose'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  // New template form state
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newNiche, setNewNiche] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchEmailLogs();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/emails/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmailLogs() {
    try {
      const res = await fetch('/api/leads?limit=50&sort=created_at&order=desc');
      if (res.ok) {
        // Email logs would come from a dedicated endpoint; for now use empty
        setEmailLogs([]);
      }
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
    }
  }

  async function handleSaveTemplate() {
    if (!newName || !newSubject || !newBody) return;

    try {
      const res = await fetch('/api/emails/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          subject: newSubject,
          body: newBody,
          niche: newNiche || null,
        }),
      });

      if (res.ok) {
        setNewName('');
        setNewSubject('');
        setNewBody('');
        setNewNiche('');
        setShowNewTemplate(false);
        fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  }

  async function handleUpdateTemplate() {
    if (!editingTemplate) return;

    try {
      const res = await fetch('/api/emails/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate.id,
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          body: editingTemplate.body,
          niche: editingTemplate.niche,
        }),
      });

      if (res.ok) {
        setEditingTemplate(null);
        fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to update template:', err);
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      const res = await fetch(`/api/emails/templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  }

  const variables = [
    '{{business_name}}', '{{owner_name}}', '{{niche}}',
    '{{city}}', '{{website_issue}}', '{{ai_opportunity}}',
    '{{sender_name}}', '{{sender_title}}',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Center</h1>
          <p className="text-muted text-sm mt-1">Manage templates and send cold emails</p>
        </div>
        <button
          onClick={() => setShowNewTemplate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {(['templates', 'history', 'compose'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize',
              activeTab === tab
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-muted hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <div className="skeleton h-5 w-40 rounded mb-3" />
                <div className="skeleton h-4 w-full rounded mb-2" />
                <div className="skeleton h-20 w-full rounded" />
              </div>
            ))
          ) : (
            templates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-accent-blue/10 text-accent-blue rounded">
                          Default
                        </span>
                      )}
                    </h3>
                    {template.niche && (
                      <span className="text-xs text-muted">Niche: {template.niche}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingTemplate({ ...template })}
                      className="p-1.5 text-muted hover:text-foreground rounded-md hover:bg-card-hover"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!template.is_default && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1.5 text-muted hover:text-accent-red rounded-md hover:bg-card-hover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-xs text-muted">Subject: </span>
                  <span className="text-sm">{template.subject}</span>
                </div>

                <div className="p-3 bg-background rounded-lg border border-border/50 max-h-32 overflow-y-auto">
                  <pre className="text-xs text-muted whitespace-pre-wrap font-sans">
                    {template.body}
                  </pre>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Sent Emails</h3>
          </div>
          {emailLogs.length === 0 ? (
            <div className="px-5 py-12 text-center text-muted text-sm">
              <Mail className="w-8 h-8 mx-auto mb-3 opacity-50" />
              No emails sent yet. Select leads and send your first campaign.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {emailLogs.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-center gap-4 hover:bg-card-hover">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.subject}</p>
                    <p className="text-xs text-muted">{formatDateTime(log.sent_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {log.opened && (
                      <span className="flex items-center gap-1 text-xs text-accent-green">
                        <Eye className="w-3 h-3" /> Opened
                      </span>
                    )}
                    {log.replied && (
                      <span className="flex items-center gap-1 text-xs text-accent-blue">
                        <Mail className="w-3 h-3" /> Replied
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">Compose Email</h3>
          <p className="text-sm text-muted mb-4">
            To send emails, go to the{' '}
            <a href="/leads" className="text-accent-blue hover:underline">
              Leads page
            </a>
            , select leads with email addresses, and use the bulk action &quot;Send Email&quot; button.
          </p>

          <div className="p-4 bg-background rounded-lg border border-border/50">
            <h4 className="text-sm font-medium mb-2">Available Variables</h4>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <code
                  key={v}
                  className="px-2 py-1 bg-card rounded text-xs font-mono text-accent-blue border border-border"
                >
                  {v}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Template Modal */}
      <AnimatePresence>
        {showNewTemplate && (
          <TemplateModal
            title="Create New Template"
            name={newName}
            subject={newSubject}
            body={newBody}
            niche={newNiche}
            onNameChange={setNewName}
            onSubjectChange={setNewSubject}
            onBodyChange={setNewBody}
            onNicheChange={setNewNiche}
            onSave={handleSaveTemplate}
            onClose={() => setShowNewTemplate(false)}
            variables={variables}
          />
        )}
      </AnimatePresence>

      {/* Edit Template Modal */}
      <AnimatePresence>
        {editingTemplate && (
          <TemplateModal
            title="Edit Template"
            name={editingTemplate.name}
            subject={editingTemplate.subject}
            body={editingTemplate.body}
            niche={editingTemplate.niche ?? ''}
            onNameChange={(v) => setEditingTemplate({ ...editingTemplate, name: v })}
            onSubjectChange={(v) => setEditingTemplate({ ...editingTemplate, subject: v })}
            onBodyChange={(v) => setEditingTemplate({ ...editingTemplate, body: v })}
            onNicheChange={(v) => setEditingTemplate({ ...editingTemplate, niche: v })}
            onSave={handleUpdateTemplate}
            onClose={() => setEditingTemplate(null)}
            variables={variables}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TemplateModal({
  title,
  name,
  subject,
  body,
  niche,
  onNameChange,
  onSubjectChange,
  onBodyChange,
  onNicheChange,
  onSave,
  onClose,
  variables,
}: {
  title: string;
  name: string;
  subject: string;
  body: string;
  niche: string;
  onNameChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onNicheChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  variables: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g., Follow Up — No Response"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Niche (optional)</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => onNicheChange(e.target.value)}
              placeholder="Leave empty for universal template"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="e.g., Quick question about {{business_name}}"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Email Body</label>
            <textarea
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={12}
              placeholder="Write your email template here. Use {{variables}} for personalization."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none resize-y font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Available Variables</label>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <button
                  key={v}
                  onClick={() => onBodyChange(body + v)}
                  className="px-2 py-0.5 bg-background rounded text-xs font-mono text-accent-blue border border-border hover:bg-card-hover transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!name || !subject || !body}
            className="px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Template
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
