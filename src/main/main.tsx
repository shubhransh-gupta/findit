import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchInterface } from '../shared/components/SearchInterface';
import { formatBytes, formatExactDate } from '../shared/utils';
import '../styles/global.css';

async function sendMessage(type: string, payload?: unknown) {
  return chrome.runtime.sendMessage({ type, payload });
}

type Tab = 'search' | 'pinned' | 'collections' | 'recent' | 'privacy' | 'storage';

function Dashboard() {
  const [tab, setTab] = useState<Tab>('search');
  const [settings, setSettings] = useState({
    indexingEnabled: true,
    theme: 'system' as 'dark' | 'light' | 'system',
    retentionDays: 365,
    excludedDomains: [] as string[],
  });
  const [stats, setStats] = useState({ pageCount: 0, estimatedBytes: 0, oldestTimestamp: null as number | null });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const theme = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme;
    document.documentElement.setAttribute('data-theme', theme);
  }, [settings.theme]);

  async function loadData() {
    const [s, st, rs] = await Promise.all([
      sendMessage('GET_SETTINGS'),
      sendMessage('GET_STATS'),
      sendMessage('GET_RECENT_SEARCHES'),
    ]);
    setSettings(s);
    setStats(st);
    setRecentSearches(rs.searches ?? []);
  }

  async function toggleIndexing() {
    const updated = await sendMessage('UPDATE_SETTINGS', {
      indexingEnabled: !settings.indexingEnabled,
    });
    setSettings(updated);
  }

  async function addExcludedDomain() {
    if (!newDomain.trim()) return;
    const domains = [...settings.excludedDomains, newDomain.trim().toLowerCase()];
    const updated = await sendMessage('UPDATE_SETTINGS', { excludedDomains: domains });
    setSettings(updated);
    setNewDomain('');
  }

  async function removeExcludedDomain(domain: string) {
    const domains = settings.excludedDomains.filter((d) => d !== domain);
    const updated = await sendMessage('UPDATE_SETTINGS', { excludedDomains: domains });
    setSettings(updated);
  }

  async function setRetention(days: number | null) {
    const updated = await sendMessage('UPDATE_SETTINGS', { retentionDays: days });
    setSettings(updated);
  }

  async function clearOld() {
    if (settings.retentionDays) {
      const result = await sendMessage('CLEAR_OLD', { days: settings.retentionDays });
      alert(`Removed ${result.count} old pages.`);
      loadData();
    }
  }

  async function clearAll() {
    if (confirm('Delete ALL FINDIT data? This cannot be undone.')) {
      await sendMessage('CLEAR_ALL');
      loadData();
    }
  }

  async function clearSearchHistory() {
    await sendMessage('CLEAR_SEARCH_HISTORY');
    setRecentSearches([]);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'search', label: 'Search' },
    { id: 'pinned', label: 'Pinned' },
    { id: 'recent', label: 'Recent searches' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'storage', label: 'Storage' },
  ];

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div>
          <h1>FINDIT</h1>
          <p className="dash-tagline">Your personal search engine for the internet you've already seen.</p>
        </div>
        <div className="theme-toggle">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              className={`findit-btn ${settings.theme === t ? 'findit-btn-primary' : ''}`}
              onClick={async () => {
                const updated = await sendMessage('UPDATE_SETTINGS', { theme: t });
                setSettings(updated);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <nav className="dash-nav">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`dash-nav-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="dash-main">
        {tab === 'search' && (
          <div className="dash-search">
            <SearchInterface />
          </div>
        )}

        {tab === 'pinned' && (
          <PinnedView />
        )}

        {tab === 'recent' && (
          <div className="dash-section">
            <div className="section-header">
              <h2>Recent searches</h2>
              <button className="findit-btn" onClick={clearSearchHistory}>Clear</button>
            </div>
            {recentSearches.length === 0 ? (
              <p className="empty-text">No recent searches yet.</p>
            ) : (
              recentSearches.map((s) => (
                <div key={s} className="recent-search-item">{s}</div>
              ))
            )}
          </div>
        )}

        {tab === 'privacy' && (
          <div className="dash-section">
            <div className="privacy-banner">
              🔐 <strong>Your browsing memory stays on your device.</strong>
              <p>No account. No cloud. No tracking. No analytics.</p>
            </div>

            <div className="setting-group">
              <h3>Indexing</h3>
              <div className="setting-row">
                <span>{settings.indexingEnabled ? '● ON' : '⏸ Paused'}</span>
                <button className="findit-btn findit-btn-primary" onClick={toggleIndexing}>
                  {settings.indexingEnabled ? 'Pause FINDIT' : 'Resume FINDIT'}
                </button>
              </div>
              {!settings.indexingEnabled && (
                <p className="setting-note">FINDIT indexing is paused. Your browsing activity is not being indexed.</p>
              )}
            </div>

            <div className="setting-group">
              <h3>Excluded websites</h3>
              <div className="domain-list">
                {settings.excludedDomains.map((d) => (
                  <div key={d} className="domain-item">
                    <span>{d}</span>
                    <button className="findit-btn" onClick={() => removeExcludedDomain(d)}>✕</button>
                  </div>
                ))}
              </div>
              <div className="domain-add">
                <input
                  type="text"
                  placeholder="Add domain (e.g. gmail.com)"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExcludedDomain()}
                />
                <button className="findit-btn findit-btn-primary" onClick={addExcludedDomain}>Add</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'storage' && (
          <div className="dash-section">
            <h2>FINDIT Storage</h2>
            <div className="storage-grid">
              <div className="storage-stat">
                <span className="stat-value">{stats.pageCount.toLocaleString()}</span>
                <span className="stat-label">Indexed pages</span>
              </div>
              <div className="storage-stat">
                <span className="stat-value">{formatBytes(stats.estimatedBytes)}</span>
                <span className="stat-label">Storage used</span>
              </div>
              <div className="storage-stat">
                <span className="stat-value">
                  {stats.oldestTimestamp ? formatExactDate(stats.oldestTimestamp) : '—'}
                </span>
                <span className="stat-label">Oldest page</span>
              </div>
            </div>

            <div className="setting-group">
              <h3>Retention</h3>
              <div className="retention-options">
                {[
                  { label: '30 days', days: 30 },
                  { label: '90 days', days: 90 },
                  { label: '1 year', days: 365 },
                  { label: 'Forever', days: null },
                ].map(({ label, days }) => (
                  <label key={label} className="retention-option">
                    <input
                      type="radio"
                      name="retention"
                      checked={settings.retentionDays === days}
                      onChange={() => setRetention(days)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <button className="findit-btn" onClick={clearOld} style={{ marginTop: 12 }}>
                Clear old pages
              </button>
            </div>

            <button className="findit-btn danger-btn" onClick={clearAll}>
              Delete all FINDIT data
            </button>
          </div>
        )}
      </main>

      <style>{`
        .dashboard {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
          min-height: 100vh;
        }
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .dash-header h1 {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--findit-accent);
        }
        .dash-tagline {
          font-size: 14px;
          color: var(--findit-text-secondary);
          margin-top: 4px;
        }
        .theme-toggle {
          display: flex;
          gap: 4px;
        }
        .dash-nav {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--findit-border);
          margin-bottom: 24px;
        }
        .dash-nav-item {
          padding: 8px 16px;
          background: none;
          border: none;
          color: var(--findit-text-secondary);
          cursor: pointer;
          font-size: 13px;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }
        .dash-nav-item:hover { color: var(--findit-text); }
        .dash-nav-item.active {
          color: var(--findit-accent);
          border-bottom-color: var(--findit-accent);
        }
        .dash-search { max-width: 640px; }
        .dash-section { padding: 8px 0; }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section-header h2 { font-size: 18px; }
        .empty-text { color: var(--findit-text-muted); font-size: 14px; }
        .recent-search-item {
          padding: 8px 12px;
          border-bottom: 1px solid var(--findit-border);
          font-size: 14px;
          color: var(--findit-text-secondary);
        }
        .privacy-banner {
          background: var(--findit-surface);
          border: 1px solid var(--findit-border);
          border-radius: var(--findit-radius);
          padding: 20px;
          margin-bottom: 24px;
        }
        .privacy-banner p {
          font-size: 13px;
          color: var(--findit-text-secondary);
          margin-top: 4px;
        }
        .setting-group {
          margin-bottom: 24px;
        }
        .setting-group h3 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .setting-note {
          font-size: 13px;
          color: var(--findit-text-muted);
          margin-top: 8px;
        }
        .domain-list { margin-bottom: 12px; }
        .domain-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid var(--findit-border);
          font-size: 13px;
        }
        .domain-add {
          display: flex;
          gap: 8px;
        }
        .domain-add input {
          flex: 1;
          padding: 8px 12px;
          background: var(--findit-surface);
          border: 1px solid var(--findit-border);
          border-radius: var(--findit-radius-sm);
          color: var(--findit-text);
          font-size: 13px;
          outline: none;
        }
        .storage-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin: 16px 0 24px;
        }
        .storage-stat {
          background: var(--findit-surface);
          border: 1px solid var(--findit-border);
          border-radius: var(--findit-radius);
          padding: 16px;
          text-align: center;
        }
        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: var(--findit-text);
        }
        .stat-label {
          font-size: 12px;
          color: var(--findit-text-muted);
          margin-top: 4px;
        }
        .retention-options {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .retention-option {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .danger-btn {
          background: var(--findit-accent) !important;
          color: white !important;
          border-color: var(--findit-accent) !important;
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
}

function PinnedView() {
  const [results, setResults] = useState<Array<{ page: import('../shared/types').PageRecord; score: number; snippet: string; matchedTerms: string[] }>>([]);

  useEffect(() => {
    sendMessage('SEARCH', { text: '', pinnedOnly: true }).then((r) => {
      setResults(r.results ?? []);
    });
  }, []);

  if (results.length === 0) {
    return <p className="empty-text" style={{ padding: 20 }}>No pinned pages yet. Pin pages from search results with ☆.</p>;
  }

  return (
    <div>
      {results.map((r) => (
        <div key={r.page.id} className="recent-search-item">
          ★ {r.page.title} — {r.page.domain}
        </div>
      ))}
    </div>
  );
}

document.documentElement.setAttribute('data-theme', 'dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>
);
