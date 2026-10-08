import { NextResponse } from 'next/server';
import { DEFAULT_EXPERIENCE_ID } from '@/lib/config';
import { parseExperienceId } from '@/lib/experience-id';
import {
  ExperienceNotFoundError,
  loadExperience,
} from '@/lib/load-experience';

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('id');
  const id = raw ? parseExperienceId(raw) : DEFAULT_EXPERIENCE_ID;
  if (!id) {
    return NextResponse.json({ error: 'invalid_experience_id' }, { status: 400 });
  }
  try {
    const loaded = await loadExperience(id);
    return NextResponse.json({
      experience: loaded.experience,
      config: loaded.config,
      source: loaded.source,
    });
  } catch (err) {
    if (err instanceof ExperienceNotFoundError) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    throw err;
  }
}
