'use client';

import Link from 'next/link';
import { VideoPreview } from './video-preview';
import { LayoutDashboard, ListVideo, Upload, Menu, X, Clapperboard } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, dateLabel, json, message, videoQuery, type Video, type VideoList } from '../../lib/video-api';

type Admin = { id: number; email: string };
type Dashboard = { totalVideos: number; publishedVideos: number; unpublishedVideos: number };
const sections = [
  { id: 'overview', label: 'Overview', description: 'Track the videos in your library and their publication status.', icon: LayoutDashboard },
  { id: 'library', label: 'Manage videos', description: 'Search your library and control what viewers can watch.', icon: ListVideo },
  { id: 'upload', label: 'Upload video', description: 'Add a video and thumbnail to your library as a draft.', icon: Upload },
] as const;
type Section = (typeof sections)[number]['id'];

const sessionKey = 'mk-video-admin';
const emptyList = { videos: [], page: 1, hasMore: false };

export default function AdminPage() {
  const [section, setSection] = useState<Section>('overview');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const active = sections.find(item => item.id === section) ?? sections[0];
  const [token, setToken] = useState('');
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [list, setList] = useState<VideoList<Video>>(emptyList);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function clearSession() {
    sessionStorage.removeItem(sessionKey);
    setSection('overview');
    setPreviewId(null);
    setMenuOpen(false);
    setToken('');
    setAdmin(null);
    setDashboard(undefined);
    setList(emptyList);
    setSearch('');
    setQuery('');
    setPage(1);
    setNotice('');
  }

  function handleError(cause: unknown, protectedRequest = true) {
    if (protectedRequest && cause instanceof ApiError && cause.status === 401) clearSession();
    setError(message(cause));
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(sessionKey);
    const controller = new AbortController();
    if (!saved) {
      setChecking(false);
      return;
    }
    api<{ admin: Admin }>('/admin/me', { signal: controller.signal }, saved)
      .then(result => {
        setAdmin(result.admin);
        setToken(saved);
      })
      .catch(cause => {
        if (!controller.signal.aborted) handleError(cause);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    setLoading(true);
    Promise.all([
      api<Dashboard>('/admin/dashboard', options, token),
      api<VideoList<Video>>('/videos/manage' + videoQuery(query, page), options, token),
    ]).then(([counts, videos]) => {
      setDashboard(counts);
      setList(videos);
    }).catch(cause => {
      if (!controller.signal.aborted) handleError(cause);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [token, query, page, revision]);

  async function perform(action: () => Promise<void>, protectedRequest = true) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (cause) {
      handleError(cause, protectedRequest);
    } finally {
      setBusy(false);
    }
  }

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void perform(async () => {
      const result = await api<{ token: string; admin: Admin }>('/admin/login',
        json('POST', { email: data.get('email'), password: data.get('password') }));
      sessionStorage.setItem(sessionKey, result.token);
      setAdmin(result.admin);
      setToken(result.token);
    }, false);
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const video = data.get('video');
    const thumbnail = data.get('thumbnail');
    void perform(async () => {
      if (!(video instanceof File) || !video.size || video.size > 250 * 1024 ** 2)
        throw new ApiError(400, 'Choose a video up to 250 MB.');
      if (!(thumbnail instanceof File) || !thumbnail.size || thumbnail.size > 5 * 1024 ** 2)
        throw new ApiError(400, 'Choose a thumbnail up to 5 MB.');
      await api('/videos/upload', { method: 'POST', body: data }, token);
      form.reset();
      setSearch('');
      setQuery('');
      setPage(1);
      setRevision(value => value + 1);
      setSection('library');
      setNotice('Upload complete. Publish the video from the library when it is ready.');
    });
  }

  function togglePublication(video: Video, published: boolean) {
    void perform(async () => {
      await api('/videos/' + video.id + '/publication', json('PATCH', { published }), token);
      setRevision(value => value + 1);
      setNotice(published ? 'Video published.' : 'Video unpublished.');
    });
  }

  return (
    <div className="workspace">
      <header className="topbar studio-header">
        <div className="studio-brand">
          {admin && <button className="studio-toggle secondary" type="button" aria-controls="studio-menu"
            aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            <span>{menuOpen ? 'Close menu' : 'Menu'}</span>
          </button>}
          <Link className="brand" href="/admin">MK Video <span>Studio</span></Link>
        </div>
        <nav aria-label="Studio navigation">
          <Link href="/">Watch site</Link>
          {admin && <button className="secondary" disabled={busy} onClick={() => void perform(async () => {
            await api('/admin/logout', { method: 'POST' }, token);
            clearSession();
          })}>Sign out</button>}
        </nav>
      </header>
      <div className={admin ? 'studio-layout' : undefined}>
        {admin && <aside id="studio-menu" className="studio-sidebar" data-open={menuOpen}>
          <nav aria-label="Dashboard sections">
            {sections.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-current={section === id ? 'page' : undefined}
                onClick={() => {
                  setSection(id);
                  setPreviewId(null);
                  setMenuOpen(false);
                  requestAnimationFrame(() => document.getElementById('studio-heading')?.focus());
                }}>
                <Icon size={19} aria-hidden />
                {label}
              </button>
            ))}
          </nav>
          <p className="studio-account"><small>Signed in as</small>{admin.email}</p>
        </aside>}
      <main className={admin ? 'studio-main' : 'container sign-in'}>
        {checking ? <p role="status">Checking your session…</p> : admin ? <>
          <div className="intro studio-intro">
            <h1 id="studio-heading" tabIndex={-1}>{active.label}</h1>
            <p>{active.description}</p>
          </div>
          {error && <p className="feedback error" role="alert">{error}</p>}
          {notice && <p className="feedback" role="status">{notice}</p>}
          <section className="stats studio-stats" aria-label="Video totals" hidden={section !== 'overview'}>
            {[['Total videos', dashboard?.totalVideos], ['Published', dashboard?.publishedVideos],
              ['Unpublished', dashboard?.unpublishedVideos]].map(([label, count]) =>
              <div className="panel stat" key={label}><Clapperboard size={19} aria-hidden /><span>{label}</span><strong>{count ?? '—'}</strong></div>)}
          </section>
          <div className="studio-sections">
            <section className="panel section" aria-label="Video library" hidden={section !== 'library'}>
              <form className="search" onSubmit={event => {
                event.preventDefault();
                setError('');
                setQuery(search.trim());
                setPage(1);
                setRevision(value => value + 1);
              }}>
                <input aria-label="Search video titles" placeholder="Search video titles" maxLength={200}
                  value={search} onChange={event => setSearch(event.target.value)}/>
                <button className="secondary">Search</button>
              </form>
              {loading ? <p role="status">Loading videos…</p> : list.videos.length ? (
                <ul className="video-rows">{list.videos.map(video => {
                  const published = !!video.publishedAt && Date.parse(video.publishedAt) <= Date.now();
                  const showingPreview = section === 'library' && previewId === video.id;
                  return <li key={video.id}><div className="video-title">
                    {published ? <Link href={'/watch/' + video.id}>{video.title}</Link> : <strong>{video.title}</strong>}
                    <small>{dateLabel(video.createdAt)}</small>
                  </div><span className={'badge ' + (published ? 'live' : '')}>{published ? 'Published' : 'Unpublished'}</span>
                    <button className="secondary" type="button" aria-expanded={showingPreview}
                      aria-label={(showingPreview ? 'Close preview for ' : 'Preview ') + video.title}
                      onClick={() => setPreviewId(showingPreview ? null : video.id)}>
                      {showingPreview ? 'Close preview' : 'Preview'}
                    </button>
                    <button className="secondary" disabled={busy} onClick={() => togglePublication(video, !published)}
                      aria-label={(published ? 'Unpublish ' : 'Publish ') + video.title}>
                      {published ? 'Unpublish' : 'Publish'}
                    </button>
                    {showingPreview && <div className="admin-video-preview">
                      <VideoPreview key={String(published)} video={video} token={token} published={published} />
                    </div>}
                  </li>;
                })}</ul>
              ) : !error && <p className="muted">{query ? 'No matching videos.' : 'Upload your first video to get started.'}</p>}
              {(page > 1 || list.hasMore) && <div className="pagination">
                <button className="secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
                <span>Page {page}</span>
                <button className="secondary" disabled={!list.hasMore || loading} onClick={() => setPage(page + 1)}>Next</button>
              </div>}
            </section>
            <section className="panel section studio-upload" aria-label="Upload a video" hidden={section !== 'upload'}>
              <form className="stack" onSubmit={upload}>
                <label>Title<input name="title" required maxLength={200} /></label>
                <label>Description <span className="muted">(optional)</span><textarea name="description" maxLength={4000} rows={3} /></label>
                <label>Video <small>MP4 or WebM, up to 250 MB</small><input name="video" type="file" accept="video/mp4,video/webm" required /></label>
                <label>Thumbnail <small>JPG, PNG or WebP, up to 5 MB</small><input name="thumbnail" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
                <button disabled={busy} type="submit">{busy ? 'Working…' : 'Upload as draft'}</button>
              </form>
            </section>
          </div>
        </> : <section className="panel section">
          <h1>Studio sign in</h1>
          <p className="muted">Sign in with your admin Gmail account.</p>
          {error && <p className="feedback error" role="alert">{error}</p>}
          <form className="stack" onSubmit={login}>
            <label>Gmail address<input name="email" type="email" autoComplete="username" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" maxLength={256} required /></label>
            <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </section>}
      </main>
      </div>
    </div>
  );
}
