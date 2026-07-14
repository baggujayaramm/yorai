import { NextRequest, NextResponse } from 'next/server';
import { requireCollegeAdminUser } from '@/lib/auth';
import { updateCollegeFromAdmin } from '@/lib/admin-colleges';
import { prisma } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-response';

type AdminCollegeRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: AdminCollegeRouteProps) {
  try {
    const admin = await requireCollegeAdminUser();
    const { id } = await params;
    const body = await request.json() as Record<string, string | undefined>;
    const college = await updateCollegeFromAdmin(prisma, id, admin, body);
    return NextResponse.json({ ok: true, college: { id: college.id, recordStatus: college.recordStatus } });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update college.', request, 'college-admin');
  }
}
