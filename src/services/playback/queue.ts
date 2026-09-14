import type { Track } from '@/types/track';
import type { QueueState } from '@/types/playback';

export function createQueueState(items: Track[] = []): QueueState {
  return { items: [...items], currentIndex: items.length ? 0 : -1, shuffle: false, repeat: 'off' };
}

export function currentTrack(queue: QueueState): Track | null {
  return queue.currentIndex >= 0 ? queue.items[queue.currentIndex] ?? null : null;
}

export function enqueue(queue: QueueState, tracks: Track[]): QueueState {
  const items = [...queue.items, ...tracks];
  return { ...queue, items, currentIndex: queue.currentIndex < 0 && items.length ? 0 : queue.currentIndex };
}

export function removeAt(queue: QueueState, index: number): QueueState {
  if (index < 0 || index >= queue.items.length) return queue;
  const items = queue.items.filter((_, i) => i !== index);
  let currentIndex = queue.currentIndex;
  if (!items.length) currentIndex = -1;
  else if (index < currentIndex) currentIndex -= 1;
  else if (index === currentIndex) currentIndex = Math.min(currentIndex, items.length - 1);
  return { ...queue, items, currentIndex };
}

export function moveTo(queue: QueueState, index: number): QueueState {
  if (index < 0 || index >= queue.items.length) return queue;
  return { ...queue, currentIndex: index };
}

export function nextIndex(queue: QueueState): number {
  if (!queue.items.length) return -1;
  if (queue.repeat === 'one') return queue.currentIndex;
  if (queue.shuffle) {
    if (queue.items.length === 1) return queue.currentIndex;
    let index = queue.currentIndex;
    while (index === queue.currentIndex) index = Math.floor(Math.random() * queue.items.length);
    return index;
  }
  if (queue.currentIndex + 1 < queue.items.length) return queue.currentIndex + 1;
  return queue.repeat === 'all' ? 0 : -1;
}

export function previousIndex(queue: QueueState): number {
  if (!queue.items.length) return -1;
  if (queue.currentIndex > 0) return queue.currentIndex - 1;
  return queue.repeat === 'all' ? queue.items.length - 1 : 0;
}
