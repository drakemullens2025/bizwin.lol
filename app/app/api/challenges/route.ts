import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveChallenges,
  getChallengeProgress,
  createChallenge,
  isAdmin,
} from '@/lib/supabase';

// GET /api/challenges — active challenges for user with progress
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const challenges = await getActiveChallenges(userId);
    const challengeIds = challenges.map((c: { id: string }) => c.id);
    const progress = await getChallengeProgress(userId, challengeIds);

    const progressMap = progress.reduce(
      (acc: Record<string, unknown>, p: { challenge_id: string }) => {
        acc[p.challenge_id] = p;
        return acc;
      },
      {} as Record<string, unknown>,
    );

    const result = challenges.map((c: { id: string }) => ({
      ...c,
      progress: progressMap[c.id] || null,
    }));

    return NextResponse.json({ challenges: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/challenges:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/challenges — create a new challenge (admin only)
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = await isAdmin(userId);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      challenge_type,
      target_value,
      xp_reward,
      scope,
      cohort_id,
      starts_at,
      ends_at,
    } = body;

    if (!title || !challenge_type || !target_value || !xp_reward || !scope || !starts_at || !ends_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const challenge = await createChallenge({
      created_by: userId,
      title,
      description,
      challenge_type,
      target_value,
      xp_reward,
      scope,
      cohort_id,
      starts_at,
      ends_at,
    });

    return NextResponse.json({ challenge });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/challenges:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
