import { z } from 'zod';

export const MusicIntentSchema = z.object({
  query: z.string().describe('The original or normalized user query'),
  mode: z.enum([
    'mood',
    'activity',
    'genre',
    'artist',
    'language',
    'era',
    'similar',
    'search',
    'mixed',
  ]).describe('The primary classification mode for the music request'),
  mood: z.string().optional().describe('Emotional vibe or feel (e.g. energetic, melancholic, chill)'),
  activity: z.string().optional().describe('Associated activity (e.g. workout, coding, sleep, party)'),
  genres: z.array(z.string()).optional().describe('List of musical genres requested or implied'),
  artists: z.array(z.string()).optional().describe('Specific artists named or implied in the request'),
  languages: z.array(z.string()).optional().describe('Languages or regional linguistic descriptors (e.g. Hindi, English, Spanish)'),
  eras: z.array(z.string()).optional().describe('Decades or eras (e.g. 80s, 90s, 2010s)'),
  seedSongs: z.array(
    z.object({
      title: z.string(),
      artist: z.string(),
    })
  ).optional().describe('Specific song references to base the vibe on'),
  count: z.number().int().min(1).max(50).default(20).describe('Number of songs requested (default: 20)'),
});

export const SongCandidateSchema = z.object({
  title: z.string().min(1).describe('The official track title of the real song'),
  artist: z.string().min(1).describe('The primary performing artist or band name'),
  album: z.string().optional().describe('Album or EP title if known'),
  year: z.number().int().optional().describe('Release year if known'),
  language: z.string().optional().describe('Primary language of the track (e.g. Hindi, English)'),
  genre: z.string().optional().describe('Specific genre or subgenre'),
  mood: z.string().optional().describe('Vibe/mood keyword'),
  energy: z.number().min(1).max(10).optional().describe('Energy score from 1 (very calm/ambient) to 10 (extreme workout/festival)'),
});

export const RecommendationResponseSchema = z.object({
  candidates: z.array(SongCandidateSchema).describe('List of recommended real, recognizable songs'),
});

export type MusicIntentOutput = z.infer<typeof MusicIntentSchema>;
export type SongCandidateOutput = z.infer<typeof SongCandidateSchema>;
export type RecommendationResponseOutput = z.infer<typeof RecommendationResponseSchema>;
