import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';

async function sendMessage(type: string, payload?: unknown) {
  return chrome.runtime.sendMessage({ type, payload });
}

function Popup() {
  const [stats, setStats] = useState({ pageCount: 0 });
  const [settings, setSettings] = useState({ indexingEnabled: true });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    sendMessage('GET_STATS').then(setStats);
    sendMessage('GET_SETTINGS').then(setSettings);
    sendMessage('GET_RECENT_SEARCHES').then((r) => setRecentSearches(r.searches ?? []));
  }, []);

  const openPalette = (query?: string) => {
    sendMessage('OPEN_PALETTE', { query });
    window.close();
  };

  const openMain = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/main/index.html') });
    window.close();
  };

  return (
    <div className="popup">
      <div className="popup-header">
        <h1>FINDIT</h1>
        <span className="popup-tagline">We all float down here... in your memories.</span>
      </div>

      <button className="popup-search-btn" onClick={() => openPalette()}>
        🔎 Search your browsing memory
      </button>

      {recentSearches.length > 0 && (
        <>
          <div className="findit-divider" />
          <div className="popup-section">
            <h3>Recent</h3>
            {recentSearches.slice(0, 5).map((s) => (
              <button key={s} className="popup-recent-item" onClick={() => openPalette(s)}>
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="findit-divider" />

      <div className="popup-footer">
        <span>{stats.pageCount.toLocaleString()} pages indexed</span>
        <span className={`status-dot ${settings.indexingEnabled ? 'active' : ''}`}>
          {settings.indexingEnabled ? '● Indexing enabled' : '⏸ Indexing paused'}
        </span>
      </div>

      <button className="popup-link" onClick={openMain}>
        Open dashboard →
      </button>

      <style>{`
        .popup {
          width: 320px;
          padding: 16px;
          background: var(--findit-bg);
          color: var(--findit-text);
        }
        .popup-header h1 {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--findit-accent);
        }
        .popup-tagline {
          font-size: 11px;
          color: var(--findit-text-muted);
          font-style: italic;
        }
        .popup-search-btn {
          width: 100%;
          margin-top: 12px;
          padding: 10px 14px;
          background: var(--findit-surface);
          border: 1px solid var(--findit-border);
          border-radius: var(--findit-radius-sm);
          color: var(--findit-text-secondary);
          cursor: pointer;
          font-size: 13px;
          text-align: left;
          transition: all 0.15s;
        }
        .popup-search-btn:hover {
          border-color: var(--findit-accent);
          color: var(--findit-text);
        }
        .popup-section {
          padding: 8px 0;
        }
        .popup-section h3 {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--findit-text-muted);
          margin-bottom: 6px;
        }
        .popup-recent-item {
          display: block;
          width: 100%;
          padding: 6px 8px;
          background: none;
          border: none;
          color: var(--findit-text-secondary);
          cursor: pointer;
          font-size: 13px;
          text-align: left;
          border-radius: var(--findit-radius-sm);
        }
        .popup-recent-item:hover {
          background: var(--findit-surface-hover);
          color: var(--findit-text);
        }
        .popup-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 11px;
          color: var(--findit-text-muted);
        }
        .status-dot.active {
          color: var(--findit-success);
        }
        .popup-link {
          width: 100%;
          padding: 8px;
          background: none;
          border: none;
          color: var(--findit-accent);
          cursor: pointer;
          font-size: 12px;
          text-align: center;
        }
        .popup-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

document.documentElement.setAttribute('data-theme', 'dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Popup />
  </StrictMode>
);
