import { useState, useEffect, useCallback, useRef } from 'react';
import type { SearchResult } from '../types';
import { ResultItem } from './ResultItem';
import { SEARCH_DEBOUNCE_MS } from '../constants';
import '../../styles/global.css';

async function sendMessage(type: string, payload?: unknown) {
  return chrome.runtime.sendMessage({ type, payload });
}

export function SearchInterface({ initialQuery = '', compact = false }: { initialQuery?: string; compact?: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pageCount: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    sendMessage('GET_STATS').then(setStats);
    inputRef.current?.focus();
  }, [results.length]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await sendMessage('SEARCH', { text: query });
        setResults(response.results ?? []);
        setSelectedIndex(0);
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleOpen = useCallback((index: number, newTab: boolean) => {
    const result = results[index];
    if (!result) return;
    if (newTab) {
      chrome.tabs.create({ url: result.page.url });
    } else {
      chrome.tabs.create({ url: result.page.url, active: true });
    }
  }, [results]);

  const handleDelete = useCallback(async (index: number) => {
    const result = results[index];
    if (!result) return;
    await sendMessage('DELETE_PAGE', { id: result.page.id });
    setResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePin = useCallback(async (index: number) => {
    const result = results[index];
    if (!result) return;
    await sendMessage('PIN_PAGE', { id: result.page.id, pinned: !result.page.pinned });
    setResults((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, page: { ...r.page, pinned: !r.page.pinned } } : r
      )
    );
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleOpen(selectedIndex, e.metaKey || e.ctrlKey);
      } else if (e.key === 'Escape') {
        window.parent.postMessage({ type: 'FINDIT_CLOSE' }, '*');
        window.close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [results, selectedIndex, handleOpen]);

  return (
    <div className={`search-interface ${compact ? 'compact' : ''}`}>
      <div className="search-header">
        <span className="search-icon">🔎</span>
        <input
          ref={inputRef}
          className="findit-input"
          type="text"
          placeholder="Search your browsing memory..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div className="findit-divider" />
      <div className="search-results" role="listbox">
        {loading && query && (
          <div className="search-status">Searching...</div>
        )}
        {!loading && query && results.length === 0 && (
          <div className="search-empty">
            <p>No memories found.</p>
            <ul>
              <li>Try fewer words</li>
              <li>Use a different phrase</li>
              <li>Try another time range</li>
              <li>Remove the domain filter</li>
            </ul>
            <p className="search-empty-stats">
              FINDIT has indexed {stats.pageCount.toLocaleString()} pages.
            </p>
          </div>
        )}
        {!query && results.length === 0 && !loading && (
          <div className="search-welcome">
            <div className="welcome-icon">🔎</div>
            {stats.pageCount === 0 ? (
              <>
                <h2>No pages indexed yet</h2>
                <p>Browse a few websites, then come back here to search.</p>
                <p className="privacy-note">Pages are indexed as you visit them — refresh open tabs or visit new sites to get started.</p>
              </>
            ) : (
              <>
                <h2>FINDIT is remembering</h2>
                <p>Browse normally. FINDIT will make your browsing searchable.</p>
                <p className="privacy-note">🔐 Everything stays local.</p>
              </>
            )}
          </div>
        )}
        {results.map((result, i) => (
          <ResultItem
            key={result.page.id}
            result={result}
            isSelected={i === selectedIndex}
            onSelect={() => setSelectedIndex(i)}
            onOpen={(newTab: boolean) => handleOpen(i, newTab)}
            onDelete={() => handleDelete(i)}
            onPin={() => handlePin(i)}
          />
        ))}
      </div>
      {results.length > 0 && (
        <div className="search-footer">
          <span><span className="findit-kbd">↑↓</span> Navigate</span>
          <span><span className="findit-kbd">↵</span> Open</span>
          <span><span className="findit-kbd">⌘↵</span> New tab</span>
          <span><span className="findit-kbd">esc</span> Close</span>
        </div>
      )}
      <style>{`
        .search-interface {
          background: var(--findit-surface);
          border: 1px solid var(--findit-border);
          border-radius: var(--findit-radius);
          box-shadow: var(--findit-shadow);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 480px;
        }
        .search-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-left: 4px;
        }
        .search-icon {
          font-size: 18px;
          padding-left: 12px;
          opacity: 0.6;
        }
        .search-results {
          flex: 1;
          overflow-y: auto;
          min-height: 100px;
        }
        .search-status, .search-empty, .search-welcome {
          padding: 32px 20px;
          text-align: center;
          color: var(--findit-text-secondary);
        }
        .search-empty ul {
          list-style: none;
          margin: 12px 0;
          font-size: 13px;
        }
        .search-empty li::before {
          content: '• ';
          color: var(--findit-accent);
        }
        .search-empty-stats {
          font-size: 12px;
          color: var(--findit-text-muted);
          margin-top: 16px;
        }
        .welcome-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        .search-welcome h2 {
          font-size: 16px;
          font-weight: 600;
          color: var(--findit-text);
          margin-bottom: 8px;
        }
        .search-welcome p {
          font-size: 13px;
        }
        .privacy-note {
          margin-top: 12px;
          font-size: 12px;
          color: var(--findit-text-muted);
        }
        .search-footer {
          display: flex;
          gap: 16px;
          padding: 8px 20px;
          border-top: 1px solid var(--findit-border);
          font-size: 11px;
          color: var(--findit-text-muted);
        }
      `}</style>
    </div>
  );
}
