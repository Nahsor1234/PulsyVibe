# PulsyVibe V2 — V1 Migration Audit

Status: foundation audit completed. V1 runtime code remains intact and is not being deleted until V2 replacements are integrated and verified.

## Architecture rule

V2 follows: Engine → API → UI.

AI/recommendation code should produce `SongCandidate[]`. YouTube resolution should produce canonical `Track` objects. UI components should consume those contracts rather than implementing discovery or resolution logic themselves.

## V1 areas audited

### `src/app/actions/youtube.ts`

Legacy discovery and resolution are still active. It contains its own YouTube client, query variations, probabilistic scoring, K-pop filtering, non-music filtering, session deduplication, and a `resolveSpecificTrack()` implementation that selects the first acceptable search result.

Migration decision: RETAIN temporarily; replace consumers with `services/youtube` + `services/resolution`. Do not merge its resolver logic into V2.

### `src/app/api/discover/route.ts`

Legacy SSE endpoint directly invokes `discoveryPipelineGenerator` from the V1 action layer.

Migration decision: RETAIN temporarily; replace with the future V2 discovery API after `SongDiscoveryService` has an API adapter.

### `src/app/api/generate/route.ts`

Legacy AI endpoint combines model fallback, prompt construction, language detection, blacklist logic, streaming, and fallback playlist generation in one route. It also accepts an API key from the request body.

Migration decision: RETAIN temporarily; extract AI intent/recommendation responsibilities into dedicated services before replacing this endpoint. API-key handling must be reviewed as part of that migration rather than copied into the new architecture.

### `src/ai/flows/generate-songlist-from-mood.ts`

A second Gemini/Genkit generation path exists with a Zod schema and a different prompt contract.

Migration decision: RETAIN temporarily; consolidate generation into one V2 recommendation contract. Reuse its schema-validation concepts where appropriate.

### `src/hooks/use-playback.ts` and `src/hooks/usePlayback.ts`

Two near-duplicate playback hooks exist. Both depend directly on the legacy server actions and perform background resolution inside React state/effect logic.

Migration decision: do not delete yet. Trace all imports first, then replace both with the V2 playback/discovery boundary. The lowercase hook is currently used by `src/app/page.tsx`.

### `src/components/PersistentPlayer.tsx`

Current player embeds YouTube through an iframe and sends YouTube player commands via `postMessage`. This is presentation/runtime behavior, not the final V2 playback engine.

Migration decision: retain during migration. V2 playback must first establish a legitimate, technically playable source contract before replacing the iframe path.

### `src/components/SongList.tsx`

The UI defines its own `Song` and `TrackInfo` contracts and reads legacy `videoLinks` maps. This is tightly coupled to V1 resolution state.

Migration decision: adapt UI after the V2 `Track`/queue contract is stable.

### `src/lib/utils.ts`

Contains legacy normalization/identity functions in addition to general UI utilities and hue extraction. Its normalization removes non-ASCII characters and therefore conflicts with the Unicode-aware V2 normalization layer.

Migration decision: V2 code must use `src/lib/normalization.ts`. Keep `utils.ts` temporarily for unrelated UI/hue helpers; remove legacy identity helpers only after import migration.

## Key migration risks

1. **Two discovery engines:** V1 and V2 can return different YouTube entities for the same request.
2. **Two identity systems:** V1 `getIdentityKey()` and V2 `getSongIdentity()` can produce different deduplication/cache keys.
3. **Playback re-resolution:** V1 playback can search again even when a track was already discovered.
4. **Client/UI coupling:** React hooks currently own discovery state and background resolution.
5. **AI contract duplication:** `/api/generate` and the Genkit flow define overlapping but different output contracts.
6. **API-key architecture:** the legacy route accepts a client-provided Google AI key; V2 should establish an explicit key-management model before carrying this forward.
7. **Progressive resolution semantics:** V2 progressive resolution currently isolates the critical first track but still awaits later work. True background execution should be introduced when the queue/event contract exists.

## Next migration sequence

1. Define V2 AI `Intent` and `Recommendation` contracts without changing the active V1 UI.
2. Build recommendation service behind a provider interface so Google AI Studio/Genkit can be attached without coupling the resolver to a model.
3. Add a V2 discovery API adapter that accepts structured candidates and invokes `SongDiscoveryService`.
4. Integrate one controlled V2 path into the existing UI behind an explicit boundary.
5. Replace legacy playback resolution with canonical `Track` objects.
6. Introduce V2 queue/player state and Media Session.
7. Remove duplicate hooks and legacy discovery code only after import/runtime verification.

## Explicit non-goals of this audit

- No V1 files were deleted.
- No dependency upgrades were made.
- No playback source was changed.
- No AI provider was changed.
- No claims are made that the full V2 application is production-ready yet.
