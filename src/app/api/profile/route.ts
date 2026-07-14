import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  isProductProfileVisibility,
  isProfileRelationship,
  isValidProfileCollegeId,
  mapVisibilityToDb,
  normalizeUsername,
  roleFromRelationship,
  validateUsername,
} from '@/lib/profile';
import { ApiError, apiErrorResponse } from '@/lib/api-response';
import { recordAnalytics } from '@/lib/analytics';
import { assertBetaWriteAccess } from '@/lib/release-controls';

const max = {
  displayName: 80,
  branch: 80,
  year: 40,
  bio: 240,
};

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    const body = (await request.json()) as {
      displayName?: string;
      username?: string;
      relationship?: string;
      collegeId?: string;
      branch?: string;
      year?: string;
      bio?: string;
      visibility?: string;
    };

    const displayName = body.displayName === undefined ? user.displayName ?? user.name : clean(body.displayName, max.displayName);
    const username = body.username === undefined ? user.username : normalizeUsername(body.username);
    const branch = body.branch === undefined ? user.branch : clean(body.branch, max.branch) || null;
    const submittedYear = body.year === undefined ? undefined : clean(body.year, max.year) || null;
    const publicBio = body.bio === undefined ? user.publicBio : clean(body.bio, max.bio) || null;
    const visibility = body.visibility === undefined ? user.profileVisibility : mapVisibilityToDb(body.visibility);
    const role = body.relationship === undefined ? user.role : roleFromRelationship(body.relationship, user.role);
    const year = body.year === undefined ? user.year : role === 'ALUMNI' ? null : submittedYear;
    const batch = body.year === undefined ? user.batch : role === 'ALUMNI' ? submittedYear : user.batch;
    const collegeId = body.collegeId === undefined ? user.collegeId : clean(body.collegeId, 120) || null;

    if (!displayName) {
      return NextResponse.json({ ok: false, error: 'Display name is required.' }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ ok: false, error: 'Choose a username.' }, { status: 400 });
    }

    if (body.visibility !== undefined && !isProductProfileVisibility(body.visibility)) {
      return NextResponse.json({ ok: false, error: 'Choose a valid profile visibility.' }, { status: 400 });
    }

    if (body.relationship !== undefined && !isProfileRelationship(body.relationship)) {
      return NextResponse.json({ ok: false, error: 'Choose a valid student context.' }, { status: 400 });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.ok) {
      return NextResponse.json({ ok: false, error: usernameValidation.error }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ ok: false, error: 'This username is already taken.' }, { status: 409 });
    }

    if (collegeId) {
      if (!await isValidProfileCollegeId(prisma, collegeId)) {
        return NextResponse.json({ ok: false, error: 'Choose a valid college from Yorai.' }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName,
        name: displayName,
        anonymousDisplayName: displayName,
        username,
        role,
        collegeId,
        branch,
        year,
        batch,
        publicBio,
        profileVisibility: visibility,
        verificationStatus: user.verificationStatus === 'UNVERIFIED' ? 'CONTEXT_ADDED' : user.verificationStatus,
      },
      select: { username: true },
    });

    await recordAnalytics('ONBOARDING_COMPLETED', { userId: user.id });

    return NextResponse.json({ ok: true, username: updated.username });
  } catch (error) {
    const conflict = typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
    return apiErrorResponse(conflict ? new ApiError(409, 'This username is already taken.', 'username_conflict') : error, 'Could not update profile yet.', request, 'profiles');
  }
}

function clean(value: string | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? '';
}
