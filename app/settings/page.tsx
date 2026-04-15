'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Key, Mail, Globe, Download, Save, Check, BarChart3, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ApiCostEntry {
  api_name: string;
  endpoint: string;
  calls: number;
  cost: number;
}

interface TrendEntry {
  date: string;
  calls: number;
  cost: number;
}

interface UsageData {
  today: ApiCostEntry[];
  month: ApiCostEntry[];
  todayTotalCost: number;
  monthTotalCost: number;
  trend: TrendEntry[];
  totals: { calls: number; cost: number };
}

const API_DISPLAY_NAMES: Record<string, string> = {
  google_places: 'Google Places',
  google_pagespeed: 'Google PageSpeed',
  hunter_io: 'Hunter.io',
  resend: 'Resend',
};

const API_COLORS: Record<string, string> = {
  google_places: '#3B82F6',
  google_pagespeed: '#10B981',
  hunter_io: '#F59E0B',
  resend: '#EF4444',
};

function aggregateByApi(entries: ApiCostEntry[]): Record<string, { calls: number; cost: number }> {
  const map: Record<string, { calls: number; cost: number }> = {};
  for (const entry of entries) {
    if (!map[entry.api_name]) {
      map[entry.api_name] = { calls: 0, cost: 0 };
    }
    map[entry.api_name].calls += entry.calls;
    map[entry.api_name].cost += entry.cost;
  }
  return map;
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // These would connect to a settings store or env vars in production
  const [settings, setSettings] = useState({
    googlePlacesKey: '',
    googlePagespeedKey: '',
    hunterKey: '',
    resendKey: '',
    emailFromAddress: '',
    emailFromName: '',
    senderName: '',
    senderTitle: 'Web & AI Solutions',
    maxEmailsPerDay: 50,
    emailDelaySeconds: 30,
    defaultNiches: ['Plumbers', 'HVAC Contractors', 'Electricians'],
    cronEnabled: false,
  });

  function updateSetting(key: string, value: string | number | boolean | string[]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    // In production, this would save to a database or Supabase
    // For now, settings are managed via environment variables
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleExport(format: 'csv' | 'json') {
    setExporting(true);
    try {
      const res = await fetch(`/api/leads/export?format=${format}`);
      if (!res.ok) throw new Error('Export failed');

      if (format === 'csv') {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pipeline-leads-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pipeline-leads-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Make sure you have leads in the database.');
    } finally {
      setExporting(false);
    }
  }

  const todayByApi = usage ? aggregateByApi(usage.today) : {};
  const monthByApi = usage ? aggregateByApi(usage.month) : {};
  const allApiNames = ['google_places', 'google_pagespeed', 'hunter_io', 'resend'];
  const maxMonthCalls = Math.max(
    1,
    ...allApiNames.map((name) => monthByApi[name]?.calls ?? 0)
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted text-sm mt-1">
          Configure API keys, email settings, and preferences
        </p>
      </div>

      {/* API Usage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent-green" />
            API Usage
          </h3>
          <button
            onClick={fetchUsage}
            disabled={usageLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-background border border-border rounded-lg hover:bg-card-hover transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${usageLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {usageLoading && !usage ? (
          <div className="flex items-center justify-center py-8 text-muted text-sm">
            Loading usage data...
          </div>
        ) : (
          <>
            {/* Usage Summary Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-xs text-muted font-medium">API</th>
                    <th className="text-right py-2 px-2 text-xs text-muted font-medium">Today</th>
                    <th className="text-right py-2 px-2 text-xs text-muted font-medium">Month</th>
                    <th className="text-right py-2 px-2 text-xs text-muted font-medium">Cost Today</th>
                    <th className="text-right py-2 px-2 text-xs text-muted font-medium">Cost Month</th>
                    <th className="py-2 pl-4 text-xs text-muted font-medium w-32">Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {allApiNames.map((apiName) => {
                    const todayCalls = todayByApi[apiName]?.calls ?? 0;
                    const monthCalls = monthByApi[apiName]?.calls ?? 0;
                    const todayCost = todayByApi[apiName]?.cost ?? 0;
                    const monthCost = monthByApi[apiName]?.cost ?? 0;
                    const barWidth = maxMonthCalls > 0 ? (monthCalls / maxMonthCalls) * 100 : 0;
                    const color = API_COLORS[apiName] ?? '#71717A';

                    return (
                      <tr key={apiName} className="border-b border-border/50">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm">{API_DISPLAY_NAMES[apiName] ?? apiName}</span>
                          </div>
                        </td>
                        <td className="text-right py-2.5 px-2 font-mono text-sm">
                          {todayCalls.toLocaleString()}
                        </td>
                        <td className="text-right py-2.5 px-2 font-mono text-sm">
                          {monthCalls.toLocaleString()}
                        </td>
                        <td className="text-right py-2.5 px-2 font-mono text-sm text-muted">
                          ${todayCost.toFixed(2)}
                        </td>
                        <td className="text-right py-2.5 px-2 font-mono text-sm text-muted">
                          ${monthCost.toFixed(2)}
                        </td>
                        <td className="py-2.5 pl-4">
                          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: color,
                                minWidth: monthCalls > 0 ? '4px' : '0',
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-sm">Total</td>
                    <td className="text-right py-2.5 px-2 font-mono text-sm font-medium">
                      {allApiNames.reduce((sum, n) => sum + (todayByApi[n]?.calls ?? 0), 0).toLocaleString()}
                    </td>
                    <td className="text-right py-2.5 px-2 font-mono text-sm font-medium">
                      {allApiNames.reduce((sum, n) => sum + (monthByApi[n]?.calls ?? 0), 0).toLocaleString()}
                    </td>
                    <td className="text-right py-2.5 px-2 font-mono text-sm font-medium text-accent-amber">
                      ${(usage?.todayTotalCost ?? 0).toFixed(2)}
                    </td>
                    <td className="text-right py-2.5 px-2 font-mono text-sm font-medium text-accent-amber">
                      ${(usage?.monthTotalCost ?? 0).toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Trend Chart */}
            {usage && usage.trend.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs text-muted font-medium mb-3">Last 30 Days</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usage.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#71717A' }}
                        tickFormatter={(value: string) => {
                          const parts = value.split('-');
                          return `${parts[1]}/${parts[2]}`;
                        }}
                        stroke="#1E1E2A"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#71717A' }}
                        stroke="#1E1E2A"
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111118',
                          border: '1px solid #1E1E2A',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#fff',
                        }}
                        labelFormatter={(label) => {
                          const d = new Date(String(label) + 'T00:00:00');
                          return d.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          });
                        }}
                        formatter={(value, name) => {
                          const v = Number(value);
                          if (name === 'cost') return [`$${v.toFixed(2)}`, 'Est. Cost'];
                          return [v.toLocaleString(), 'API Calls'];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="calls"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#3B82F6' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="#F59E0B"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 4"
                        activeDot={{ r: 3, fill: '#F59E0B' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted justify-center">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-accent-blue inline-block rounded" />
                    API Calls
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-accent-amber inline-block rounded border-dashed" />
                    Est. Cost ($)
                  </span>
                </div>
              </div>
            )}

            {usage && usage.trend.length === 0 && (
              <div className="text-center py-6 text-muted text-sm">
                No usage data yet. API calls will appear here once tracking begins.
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* API Keys */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-5"
      >
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-accent-blue" />
          API Keys
        </h3>
        <p className="text-xs text-muted mb-4">
          API keys are managed via environment variables (.env.local). Update them there and restart the server.
        </p>

        <div className="space-y-4">
          <SettingInput
            label="Google Places API Key"
            value={settings.googlePlacesKey}
            onChange={(v) => updateSetting('googlePlacesKey', v)}
            placeholder="Set via GOOGLE_PLACES_API_KEY env var"
            type="password"
          />
          <SettingInput
            label="Google PageSpeed API Key"
            value={settings.googlePagespeedKey}
            onChange={(v) => updateSetting('googlePagespeedKey', v)}
            placeholder="Set via GOOGLE_PAGESPEED_API_KEY env var"
            type="password"
          />
          <SettingInput
            label="Hunter.io API Key"
            value={settings.hunterKey}
            onChange={(v) => updateSetting('hunterKey', v)}
            placeholder="Set via HUNTER_API_KEY env var"
            type="password"
          />
          <SettingInput
            label="Resend API Key"
            value={settings.resendKey}
            onChange={(v) => updateSetting('resendKey', v)}
            placeholder="Set via RESEND_API_KEY env var"
            type="password"
          />
        </div>
      </motion.div>

      {/* Email Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl p-5"
      >
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-accent-amber" />
          Email Configuration
        </h3>

        <div className="space-y-4">
          <SettingInput
            label="From Email Address"
            value={settings.emailFromAddress}
            onChange={(v) => updateSetting('emailFromAddress', v)}
            placeholder="you@yourdomain.com"
          />
          <SettingInput
            label="From Name"
            value={settings.emailFromName}
            onChange={(v) => updateSetting('emailFromName', v)}
            placeholder="Your Name or Company"
          />
          <SettingInput
            label="Sender Name (for templates)"
            value={settings.senderName}
            onChange={(v) => updateSetting('senderName', v)}
            placeholder="John Smith"
          />
          <SettingInput
            label="Sender Title (for templates)"
            value={settings.senderTitle}
            onChange={(v) => updateSetting('senderTitle', v)}
            placeholder="Web & AI Solutions"
          />
          <div className="grid grid-cols-2 gap-4">
            <SettingInput
              label="Max Emails Per Day"
              value={String(settings.maxEmailsPerDay)}
              onChange={(v) => updateSetting('maxEmailsPerDay', parseInt(v) || 50)}
              placeholder="50"
              type="number"
            />
            <SettingInput
              label="Delay Between Emails (sec)"
              value={String(settings.emailDelaySeconds)}
              onChange={(v) => updateSetting('emailDelaySeconds', parseInt(v) || 30)}
              placeholder="30"
              type="number"
            />
          </div>
        </div>
      </motion.div>

      {/* Scraping Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-5"
      >
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent-green" />
          Scraping Preferences
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.cronEnabled}
                onChange={(e) => updateSetting('cronEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-border bg-background accent-accent-blue"
              />
              <div>
                <span className="text-sm font-medium">Enable Auto-Scraping (Cron)</span>
                <p className="text-xs text-muted">Automatically scrape new cities and niches on a schedule</p>
              </div>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Data Export */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-xl p-5"
      >
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-accent-blue" />
          Export Data
        </h3>

        <div className="flex gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm hover:bg-card-hover transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export as CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm hover:bg-card-hover transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export as JSON
          </button>
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
        {saved && (
          <span className="text-sm text-accent-green">Settings saved successfully</span>
        )}
      </div>
    </div>
  );
}

function SettingInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none"
      />
    </div>
  );
}
