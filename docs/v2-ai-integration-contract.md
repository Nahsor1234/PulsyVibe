# PulsyVibe V2 AI Integration Contract

This document defines the boundary between the runtime Gemini layer and the existing PulsyVibe V2 discovery/playback engines.

## Architecture rule

The runtime AI decides **what songs should be recommended**. It must not decide YouTube video IDs and must not perform playback resolution.

```text
User query
  -> Intent Engine
  -> MusicIntent
  -> Recommendation Engine
  -> SongCandidate[]
  -> SongDiscoveryService
  -> Track[]
  -> Playback Queue
  -> Official YouTube IFrame Player API
```

## Runtime responsibilities

### Gemini / AI provider

Gemini receives a natural-language music request and produces structured intent/recommendation data.

It may:

- infer mood, activity, genre, artist, language, era, similarity, or mixed intent
- choose a sensible recommendation count within the application limit
- recommend song title/artist pairs
- provide optional metadata when confidently known

It must not:

- return YouTube video IDs as authoritative playback identifiers
- return direct media/audio URLs
- claim that a recommended song has been verified on YouTube
- bypass the discovery/resolution layer

### PulsyVibe discovery layer

`SongDiscoveryService` owns:

- song deduplication
- resolution cache
- YouTube search
- search-query variants
- result filtering
- deterministic ranking
- confidence thresholding
- fallback resolution
- canonical `Track` creation

### Playback layer

`YouTubePlaybackController` owns:

- queue state
- play/pause
- next/previous
- seek
- volume/mute
- shuffle/repeat
- Media Session integration
- playback through the official YouTube IFrame Player API

## Canonical contracts

The AI layer should produce `RecommendationResult` containing `SongCandidate[]`.

`SongCandidate` is the only input identity used by the resolver:

```ts
export interface SongCandidate {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  language?: string;
  genre?: string;
  mood?: string;
  energy?: number;
}
```

The resolver converts a candidate into a verified `Track` containing a YouTube `videoId` only after its own search/ranking/verification process.

## API boundary

The V2 discovery endpoint is intentionally AI-agnostic:

```text
POST /api/discovery/resolve
```

It accepts structured `SongCandidate[]` and returns resolution results. The endpoint must remain independent of the Gemini provider.

## Runtime example

Input:

```text
"happy mood"
```

A valid AI result could be:

```json
{
  "intent": {
    "query": "happy mood",
    "mode": "mood",
    "mood": "happy",
    "count": 20
  },
  "candidates": [
    { "title": "Example Song", "artist": "Example Artist" }
  ]
}
```

The application then sends the candidates to discovery. Discovery, not Gemini, determines which YouTube entities are valid playback tracks.

## Output sanitation

All provider output must pass the existing recommendation sanitization layer before discovery. Empty title/artist entries must be removed, duplicate songs must be collapsed using the shared song identity, and output size must remain bounded.

## Security requirements

Do not expose a secret Gemini provider key in ordinary client-side code. The runtime provider should be called through the application's server-side boundary or another explicitly secured deployment mechanism.

## AI Studio implementation scope

When implementing the runtime AI layer in Google AI Studio, preserve the existing types and service boundaries. The preferred work is:

1. Implement the concrete Gemini provider.
2. Connect it to `IntentEngine` and `RecommendationEngine`.
3. Add the server-side runtime route/service that accepts a user query and returns sanitized recommendations.
4. Connect the V2 UI to this flow without reintroducing V1 discovery or playback paths.

Do not rewrite the YouTube resolver or create a second playback/discovery engine.
