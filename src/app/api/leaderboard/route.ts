import { action,json } from '@/lib/server';
import { getLeaderboard } from '@/lib/leaderboard';
export const GET=action(async()=>json({rows:await getLeaderboard()}));
