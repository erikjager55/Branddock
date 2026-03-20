import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';
import { isDeveloperEmail } from '@/lib/developer-access';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ isDeveloper: false });
  }
  return NextResponse.json({ isDeveloper: isDeveloperEmail(session.user.email) });
}
