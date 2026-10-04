/**
 * Dashboard — main interface.
 * Left panel: upload + style picker + generate button.
 * Right panel: current result + history list.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  createGeneration,
  deleteGeneration,
  getGeneration,
  listGenerations,
  type Generation,
} from '../services/api';

const STYLES = [
  { id: 'corporate', label: 'Corporate', desc: 'Clean studio, neutral background' },
  { id: 'startup',   label: 'Startup',   desc: 'Warm, approachable, modern' },
  { id: 'developer', label: 'Developer', desc: 'Smart casual, friendly' },
  { id: 'formal',    label: 'Formal',    desc: 'Elegant, composed portrait' },
] as const;

const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);
const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
  </svg>
);

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile]       = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]           = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle]     = useState('corporate');
  const [generating, setGenerating]           = useState(false);
  const [error, setError]                     = useState('');

  const [currentGen, setCurrentGen]           = useState<Generation | null>(null);
  const [generations, setGenerations]         = useState<Generation[]>([]);
  const [loadingHistory, setLoadingHistory]   = useState(true);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await listGenerations(0, 50);
      setGenerations(data.generations);
    } catch { /* silent */ } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
    setCurrentGen(null);
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setGenerating(true);
    setError('');
    setCurrentGen(null);

    try {
      const gen = await createGeneration(selectedFile, selectedStyle);
      setCurrentGen(gen);

      pollRef.current = setInterval(async () => {
        try {
          const updated = await getGeneration(gen.id);
          setCurrentGen(updated);
          if (updated.status === 'completed' || updated.status === 'failed') {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setGenerating(false);
            await loadHistory();
            if (updated.status === 'failed') {
              setError(updated.error_message || 'Generation failed. Please try again.');
            }
          }
        } catch { /* keep polling */ }
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start generation.');
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this generation?')) return;
    try {
      await deleteGeneration(id);
      setGenerations(prev => prev.filter(g => g.id !== id));
      if (currentGen?.id === id) setCurrentGen(null);
    } catch { /* silent */ }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const badgeClass = (status: string) =>
    status === 'completed'  ? 'badge badge-completed'  :
    status === 'processing' ? 'badge badge-processing' :
    status === 'failed'     ? 'badge badge-failed'     :
    'badge badge-pending';

  if (authLoading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="dashboard-page">

      <header className="dashboard-header">
        <div className="header-brand">
          <div className="brand-mark" />
          unfumble
        </div>
        <div className="header-actions">
          <span className="header-user">{user?.email}</span>
          <button onClick={handleLogout} className="btn-ghost" id="logout-button">
            Sign out
          </button>
        </div>
      </header>

      <div className="dashboard-body">

        <aside className="panel-left">

          <div>
            <p className="panel-section-title" style={{ marginBottom: 10 }}>Photo</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="image-upload"
            />
            <div
              className={`upload-zone${previewUrl ? ' has-image' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" />
                  <div className="upload-overlay"><span>Change photo</span></div>
                </>
              ) : (
                <div className="upload-zone-label">
                  <span className="upload-icon"><IconUpload /></span>
                  <span className="upload-text">Upload photo</span>
                  <span className="upload-hint">JPG, PNG, WebP · max 10 MB</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.75a.75.75 0 00-1.5 0v-3a.75.75 0 001.5 0v3z" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <p className="panel-section-title" style={{ marginBottom: 10 }}>Style</p>
            <div className="style-list">
              {STYLES.map(s => (
                <label
                  key={s.id}
                  className={`style-option${selectedStyle === s.id ? ' selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="style"
                    value={s.id}
                    checked={selectedStyle === s.id}
                    onChange={() => setSelectedStyle(s.id)}
                  />
                  <span className="style-indicator" />
                  <span className="style-info">
                    <span className="style-name">{s.label}</span>
                    <span className="style-desc">{s.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            className="btn-generate"
            disabled={!selectedFile || generating}
            id="generate-button"
          >
            {generating
              ? <><div className="spinner spinner-sm spinner-white" />Generating…</>
              : 'Generate'}
          </button>
        </aside>

        <div className="panel-right">

          {currentGen && (
            <section className="result-section">
              <div className="section-heading" style={{ marginBottom: 16 }}>
                <span className="dash-section-title">Result</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="section-sub" style={{ textTransform: 'capitalize' }}>{currentGen.style}</span>
                  <span className={badgeClass(currentGen.status)}>{currentGen.status}</span>
                </div>
              </div>

              <div className="result-pane">
                <div className="result-card">
                  <span className="result-card-label">Original</span>
                  {currentGen.original_image_url
                    ? <img src={currentGen.original_image_url} alt="Original" className="result-image" />
                    : <div className="result-placeholder"><span className="result-placeholder-text">Uploading…</span></div>
                  }
                </div>

                <div className="result-card">
                  <span className="result-card-label">Generated</span>
                  {currentGen.status === 'completed' && currentGen.generated_image_url ? (
                    <div style={{ position: 'relative' }}>
                      <img src={currentGen.generated_image_url} alt="Generated" className="result-image" />
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={currentGen.generated_image_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-download"
                        >
                          <IconDownload /> Download
                        </a>
                      </div>
                    </div>
                  ) : currentGen.status === 'failed' ? (
                    <div className="result-failed">
                      <p className="result-failed-text">{currentGen.error_message || 'Generation failed.'}</p>
                    </div>
                  ) : (
                    <div className="result-processing">
                      <div className="spinner" />
                      <p className="result-processing-text">
                        {currentGen.status === 'pending' ? 'Queued…' : 'Processing with AI…'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-4)' }}>This may take 30–60 s</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="history-section">
            <div className="section-heading">
              <span className="dash-section-title">History</span>
              {!loadingHistory && (
                <span className="section-sub">{generations.length} generation{generations.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {loadingHistory ? (
              <div className="history-empty"><div className="spinner" /></div>
            ) : generations.length === 0 ? (
              <div className="history-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span>No generations yet</span>
              </div>
            ) : (
              <div className="history-list">
                {generations.map(gen => (
                  <div key={gen.id} className="history-item">
                    <div className="history-thumbs">
                      {gen.original_image_url && (
                        <img src={gen.original_image_url} alt="Original" className="history-thumb" />
                      )}
                      {gen.generated_image_url && (
                        <img src={gen.generated_image_url} alt="Generated" className="history-thumb" />
                      )}
                    </div>
                    <div className="history-info">
                      <p className="history-style">{gen.style}</p>
                      <p className="history-date">
                        {new Date(gen.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className={badgeClass(gen.status)}>{gen.status}</span>
                    <div className="history-actions">
                      {gen.generated_image_url && (
                        <a
                          href={gen.generated_image_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-icon"
                          title="Download"
                        >
                          <IconDownload />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(gen.id)}
                        className="btn-icon danger"
                        title="Delete"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
