import { useEffect, useEffectEvent, useRef } from 'react';
import { File, FileImage, FileText, FileVideo, Music, ShieldCheck, X } from 'lucide-react';
import { useVault } from './context';

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <ShieldCheck size={24} />
      </span>
      <span>
        Secure<span className="brand-light">Vault</span>
      </span>
    </div>
  );
}
export function FileIcon({ mime = '' }) {
  const Icon = mime.startsWith('image/')
    ? FileImage
    : mime.startsWith('video/')
      ? FileVideo
      : mime.startsWith('audio/')
        ? Music
        : mime.includes('text') || mime.includes('pdf')
          ? FileText
          : File;
  return (
    <span className={`file-icon ${mime.split('/')[0]}`}>
      <Icon size={22} />
    </span>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  const close = useEffectEvent(onClose);
  const { t } = useVault();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const listener = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const items = [
          ...ref.current.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select, a[href], textarea, [tabindex="0"]',
          ),
        ];
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t('Close')}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function ErrorBox({ error }) {
  return error ? (
    <div className="alert error" role="alert">
      {error}
    </div>
  ) : null;
}
export function Pager({ offset, total, limit = 30, setOffset }) {
  const { t } = useVault();
  return (
    total > limit && (
      <div className="pager">
        <span>
          {offset + 1}–{Math.min(offset + limit, total)} / {total}
        </span>
        <button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - limit))}>
          {t('Previous')}
        </button>
        <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
          {t('Next')}
        </button>
      </div>
    )
  );
}
