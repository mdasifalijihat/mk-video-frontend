import { useEffect, useState } from 'react';
import { backend, message, ApiError, type Video } from '../../lib/video-api';

export function VideoPreview({ video, token, published }: {
  video: Video;
  token: string;
  published: boolean;
}) {
  const [draftUrl, setDraftUrl] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const path = backend + '/api/v1/videos/';

  useEffect(() => {
    if (published) return;
    const controller = new AbortController();
    let objectUrl = '';
    async function load() {
      const response = await fetch(path + 'manage/' + video.id + '/playback', {
        headers: { Authorization: 'Bearer ' + token },
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new ApiError(response.status, body?.message ?? 'Could not load this preview.');
      }
      const file = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(file);
      setDraftUrl(objectUrl);
    }
    void load().catch(cause => {
      if (!controller.signal.aborted) setError(message(cause));
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attempt, path, published, token, video.id]);

  const source = published ? path + video.id + '/playback' : draftUrl;
  if (error) return <div className="feedback error" role="alert">{error} <button type="button" className="secondary" onClick={() => {
    setError('');
    setDraftUrl('');
    setAttempt(value => value + 1);
  }}>Retry preview</button></div>;

  return source ? <video className="player" controls playsInline preload="metadata" aria-label={video.title}
    src={source} poster={published ? path + video.id + '/thumbnail' : undefined}
    onError={() => setError('Could not play this video.')} />
    : <p role="status">Loading draft preview…</p>;
}
