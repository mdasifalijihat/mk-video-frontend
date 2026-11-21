'use client';

import Link from 'next/link';
import Image from 'next/image';
import logo from '../../public/logo.png';
import { Grid2X2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, backend, dateLabel, message, videoQuery, type PublicVideo, type VideoList } from '../lib/video-api';

export default function Home() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<VideoList<PublicVideo>>();
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api<VideoList<PublicVideo>>('/videos' + videoQuery(query, page), { signal: controller.signal })
      .then(setResult)
      .catch(cause => { if (!controller.signal.aborted) setError(message(cause)); });
    return () => controller.abort();
  }, [query, page, revision]);

  function load(nextPage: number, nextQuery = query) {
    setResult(undefined);
    setError('');
    setPage(nextPage);
    setQuery(nextQuery);
    setRevision(value => value + 1);
  }

  function browse() {
    setSearch('');
    load(1, '');
  }

  return <div className="workspace video-feed">
    <header className="feed-header">
      <Link href="/" className="feed-brand" onClick={browse}>
        <Image src={logo} alt="MK Video home" className="feed-logo" sizes="128px" />
      </Link>
      <form className="feed-search" role="search" onSubmit={event => {
        event.preventDefault();
        load(1, search.trim());
      }}>
        <input aria-label="Search video titles" placeholder="Search videos" maxLength={200}
          value={search} onChange={event => setSearch(event.target.value)} />
        <button type="submit" aria-label="Search"><Search size={20} aria-hidden /></button>
      </form>
    </header>
    <div className="feed-layout">
      <aside className="feed-sidebar">
        <nav aria-label="Video navigation">
          <Link href="/" onClick={browse} aria-current={query ? undefined : 'page'}><Grid2X2 size={19} aria-hidden /> Browse</Link>
        </nav>
      </aside>
      <main className="feed-main">
      <section aria-labelledby="collection">
        <h1 id="collection">{query ? 'Search results' : 'Latest videos'}</h1>
        {error ? <div className="feedback error" role="alert">{error} <button className="secondary" onClick={() => load(page)}>Retry</button></div>
          : !result ? <p role="status">Loading videos…</p>
          : !result.videos.length ? <p className="panel section muted">{query ? 'No videos match your search.' : 'Published videos will appear here.'}</p>
          : <ul className="video-grid">{result.videos.map(video => <li key={video.id}>
            <Link className="video-card" href={'/watch/' + video.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={backend + video.thumbnailUrl} alt="" loading="lazy" width={480} height={270} />
              <div><h2>{video.title}</h2>{video.publishedAt && <small>{dateLabel(video.publishedAt)}</small>}</div>
            </Link>
          </li>)}</ul>}
        {(page > 1 || result?.hasMore) && <div className="pagination">
          <button className="secondary" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
          <span>Page {page}</span>
          <button className="secondary" disabled={!result?.hasMore} onClick={() => load(page + 1)}>Next</button>
        </div>}
      </section>
      </main>
    </div>
  </div>;
}
