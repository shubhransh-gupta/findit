import type { SearchResult } from '../types';
import { formatRelativeTime, escapeHtml } from '../utils';
import { highlightTerms } from '../../search/scorer';

interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: (newTab: boolean) => void;
  onDelete: () => void;
  onPin: () => void;
}

export function ResultItem({
  result,
  isSelected,
  onSelect,
  onOpen,
  onDelete,
  onPin,
}: ResultItemProps) {
  const { page, snippet, matchedTerms } = result;
  const highlightedSnippet = highlightTerms(escapeHtml(snippet), matchedTerms);

  return (
    <div
      className={`result-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={() => onOpen(false)}
      role="option"
      aria-selected={isSelected}
    >
      <div className="result-header">
        {page.favicon && (
          <img src={page.favicon} alt="" className="result-favicon" width={16} height={16} />
        )}
        <div className="result-title-row">
          <span className="result-title">{escapeHtml(page.title)}</span>
          {page.pinned && <span className="result-pin">★</span>}
        </div>
      </div>
      <div className="result-domain">{escapeHtml(page.domain)}</div>
      {snippet && (
        <div
          className="result-snippet"
          dangerouslySetInnerHTML={{ __html: `"${highlightedSnippet}"` }}
        />
      )}
      <div className="result-footer">
        <span className="result-meta">
          {formatRelativeTime(page.lastVisited)}
          {page.visitCount > 1 && ` · visited ${page.visitCount} times`}
        </span>
        <div className="result-actions">
          <button className="findit-btn" onClick={(e) => { e.stopPropagation(); onPin(); }} title="Pin">
            {page.pinned ? '★' : '☆'}
          </button>
          <button className="findit-btn" onClick={(e) => { e.stopPropagation(); onOpen(false); }} title="Open">
            ↗ Open
          </button>
          <button className="findit-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
            ✕
          </button>
        </div>
      </div>
      <style>{`
        .result-item {
          padding: 12px 20px;
          cursor: pointer;
          border-bottom: 1px solid var(--findit-border);
          transition: background 0.1s ease;
        }
        .result-item:hover, .result-item.selected {
          background: var(--findit-surface-hover);
        }
        .result-item.selected {
          border-left: 2px solid var(--findit-accent);
        }
        .result-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .result-favicon {
          border-radius: 2px;
          flex-shrink: 0;
        }
        .result-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .result-title {
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .result-pin {
          color: var(--findit-accent);
          font-size: 12px;
        }
        .result-domain {
          font-size: 12px;
          color: var(--findit-text-secondary);
          margin-top: 2px;
        }
        .result-snippet {
          font-size: 13px;
          color: var(--findit-text-secondary);
          margin-top: 6px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .result-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }
        .result-meta {
          font-size: 11px;
          color: var(--findit-text-muted);
        }
        .result-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .result-item:hover .result-actions,
        .result-item.selected .result-actions {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
