import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, UploadCloud, X } from 'lucide-react';
import { formatBytes, uploadFile } from './api';
import { useVault } from './context';
import { DEMO_MODE } from './demo/config';

export default function UploadQueue({ folderId, limit, onComplete, inputRef, disabled }) {
  const { t } = useVault();
  const [jobs, setJobs] = useState([]),
    [drag, setDrag] = useState(false);
  const running = useRef(false),
    controller = useRef(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  const add = (files) =>
    setJobs((current) => [
      ...current,
      ...Array.from(files)
        .slice(0, Math.max(0, 100 - current.length))
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          folderId,
          status: file.size > limit ? 'error' : 'queued',
          progress: 0,
          error: file.size > limit ? `Maximum file size: ${formatBytes(limit)}` : '',
        })),
    ]);
  useEffect(() => {
    const job = jobs.find((j) => j.status === 'queued');
    if (!job || running.current) return;
    running.current = true;
    controller.current = new AbortController();
    const patch = (data) => {
      if (alive.current) setJobs((all) => all.map((j) => (j.id === job.id ? { ...j, ...data } : j)));
    };
    patch({ status: 'uploading' });
    uploadFile(job.file, {
      folderId: job.folderId,
      signal: controller.current.signal,
      onProgress: (progress) => patch({ progress }),
    })
      .then(() => patch({ status: 'done', progress: 100 }))
      .catch((e) => patch({ status: e.name === 'AbortError' ? 'cancelled' : 'error', error: e.message }))
      .finally(() => {
        running.current = false;
        if (alive.current) {
          setJobs((all) => [...all]);
          onComplete();
        }
      });
  }, [jobs, onComplete]);
  return (
    <>
      <div
        className={`dropzone ${drag ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!disabled) add(e.dataTransfer.files);
        }}
      >
        <span className="drop-icon">
          <UploadCloud size={25} />
        </span>
        <div>
          <strong>{t('Drop files here or choose from your computer')}</strong>
          <p>
            {formatBytes(limit)} per file ·{' '}
            {DEMO_MODE ? 'Tab memory only · No server upload or encryption' : 'Encrypted before storage'}
          </p>
        </div>
        <button disabled={disabled} onClick={() => inputRef.current?.click()}>
          {t('Choose files')}
        </button>
        <input
          type="file"
          multiple
          hidden
          ref={inputRef}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
          disabled={disabled}
          aria-label={t('Upload files')}
        />
      </div>
      {!!jobs.length && (
        <div className="upload-jobs" aria-live="polite">
          {jobs.map((j) => (
            <div key={j.id} className="upload-job">
              <div className="job-top">
                <span>
                  {j.status === 'done' && <CheckCircle2 size={15} />} {j.file.name}
                </span>
                <span>
                  {j.status === 'uploading'
                    ? `${j.progress}%`
                    : t(
                        { done: 'Done', cancelled: 'Cancelled', queued: 'Waiting', error: 'Failed' }[
                          j.status
                        ],
                      )}
                </span>
                {j.status === 'uploading' ? (
                  <button
                    className="icon-button"
                    aria-label={`Cancel ${j.file.name}`}
                    onClick={() => controller.current?.abort()}
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <button
                    className="icon-button"
                    aria-label={`Dismiss ${j.file.name}`}
                    onClick={() => setJobs((all) => all.filter((x) => x.id !== j.id))}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {j.status === 'uploading' && <progress value={j.progress} max="100" />}
              {j.status === 'error' && (
                <div className="job-error">
                  {j.error}{' '}
                  <button
                    disabled={j.file.size > limit}
                    onClick={() =>
                      setJobs((all) =>
                        all.map((x) => (x.id === j.id ? { ...x, status: 'queued', progress: 0 } : x)),
                      )
                    }
                  >
                    {t('Retry')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
