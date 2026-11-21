'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, backend, dateLabel, message, type PublicVideo } from '../../../lib/video-api';

export default function WatchVideo({ id }: { id: string }) {
  const [video, setVideo] = useState<PublicVideo>();
  const [error, setError] = useState('');
  const [playbackError, setPlaybackError] = useState(false);
  const [playerVersion, setPlayerVersion] = useState(0);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api<{ video: PublicVideo }>('/videos/' + encodeURIComponent(id), { signal: controller.signal })
      .then(result => setVideo(result.video))
      .catch(cause => { if (!controller.signal.aborted) setError(message(cause)); });
    return () => controller.abort();
  }, [id, revision]);

  return <div className="workspace">
    <header className="topbar"><Link className="brand" href="/">MK Video</Link><Link href="/">Browse videos</Link></header>
    <main className="container watch">
      {error ? <div className="feedback error" role="alert">{error} <button className="secondary" onClick={() => {
        setError('');
        setRevision(value => value + 1);
      }}>Retry</button></div> : !video ? <p role="status">Loading video…</p> : <>
        <video className="player" key={playerVersion} controls playsInline preload="metadata"
          aria-label={video.title} src={backend + video.playbackUrl} poster={backend + video.thumbnailUrl}
          onError={() => setPlaybackError(true)} />
        {playbackError && <div className="feedback error" role="alert">Unable to play this video. <button className="secondary" onClick={() => {
          setPlaybackError(false);
          setPlayerVersion(value => value + 1);
        }}>Retry playback</button></div>}
        <div className="intro"><h1>{video.title}</h1>
          {video.publishedAt && <p>Published {dateLabel(video.publishedAt)}</p>}
        </div>
        {video.description && <p className="description">{video.description}</p>}
      </>}
    </main>
  </div>;
}
