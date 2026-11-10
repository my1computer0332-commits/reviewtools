import type { CSSProperties } from "react";
import { PLATFORMS, type PlatformId } from "../platforms";

interface Props {
  value: PlatformId;
  onChange: (id: PlatformId) => void;
}

export function PlatformPicker({ value, onChange }: Props) {
  return (
    <div className="platform-picker" role="radiogroup" aria-label="Review platform">
      {PLATFORMS.map((platform) => {
        const selected = platform.id === value;
        return (
          <button
            key={platform.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`platform-option${selected ? " is-selected" : ""}`}
            onClick={() => onChange(platform.id)}
            style={{ "--platform-accent": platform.accent } as CSSProperties}
          >
            <span className={`platform-badge badge-${platform.id}`} aria-hidden="true">
              {platform.badge}
            </span>
            <span className="platform-text">
              <span className="platform-name">{platform.name}</span>
              <span className="platform-kind">{platform.linkKind}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
