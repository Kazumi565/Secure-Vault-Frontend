import { RotateCcw, ExternalLink } from 'lucide-react';

export function restartDemo() {
  window.location.hash = '/files';
  window.location.reload();
}

export default function DemoBanner() {
  return (
    <aside className="demo-banner" aria-label="Demo information">
      <div>
        <strong>
          <span className="demo-dot" />
          Interactive demo
        </strong>
        <span>Files stay in this tab. Refresh to reset. Security features are simulated.</span>
      </div>
      <div className="demo-banner-actions">
        <a href="https://github.com/Kazumi565/Secure-Vault" target="_blank" rel="noreferrer">
          View source <ExternalLink size={14} />
        </a>
        <button
          onClick={() => {
            if (window.confirm('Reset all demo files and changes?')) restartDemo();
          }}
        >
          <RotateCcw size={14} />
          Reset demo
        </button>
      </div>
    </aside>
  );
}
