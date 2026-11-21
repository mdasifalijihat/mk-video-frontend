import { Suspense } from 'react';
import WatchVideo from './watch-video';

type WatchParams = Promise<{ id: string }>;

async function VideoContent({ params }: { params: WatchParams }) {
  const { id } = await params;
  return <WatchVideo key={id} id={id} />;
}

export default function WatchPage({ params }: { params: WatchParams }) {
  return (
    <Suspense fallback={<div className="workspace"><main className="container watch"><p role="status">Loading video…</p></main></div>}>
      <VideoContent params={params} />
    </Suspense>
  );
}
