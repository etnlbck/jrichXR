import { NextResponse } from 'next/server';
import { loadExperience } from '@/lib/load-experience';

export async function GET() {
  const loaded = await loadExperience();
  return NextResponse.json({
    experience: loaded.experience,
    config: loaded.config,
    source: loaded.source,
  });
}
