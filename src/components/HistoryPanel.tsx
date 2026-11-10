import { PLATFORMS } from "../platforms";
import type { StoredLink } from "../lib/storage";

interface Props {
  items: StoredLink[];
  onRestore: (item: StoredLink) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function HistoryPanel({ items, onRestore, onRemove, onClear }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="card history">
      <div className="section-head section-head-row">
        <div>
          <p className="eyebrow">This browser</p>
          <h2>Recent links</h2>
        </div>
        <button type="button" className="text-button" onClick={onClear}>
          Clear all
        </button>
      </div>
      <ul className="history-list">
        {items.map((item) => {
          const platform = PLATFORMS.find((entry) => entry.id === item.platform);
          return (
            <li key={item.id} className="history-item">
              <button type="button" className="history-main" onClick={() => onRestore(item)}>
                <span className={`platform-badge badge-${item.platform} small`} aria-hidden="true">
                  {platform?.badge ?? "?"}
                </span>
                <span className="history-text">
                  <span className="history-label">{item.label ?? item.url}</span>
                  <span className="history-meta">
                    {platform?.name ?? item.platform} · {dateFormatter.format(new Date(item.createdAt))}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Remove from history"
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
