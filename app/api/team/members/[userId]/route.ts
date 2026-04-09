import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'better-auth/next-js';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 404 }
      );
    }

    // Get current user's role
    const currentMember = await prisma.teamMember.findUnique({
      where: {
        subscriptionId_userId: {
          subscriptionId: subscription.id,
          userId: session.user.id,
        },
      },
    });

    // Only admins can remove members
    if (currentMember?.role !== 'admin' && session.user.id !== subscription.userId) {
      return NextResponse.json(
        { error: 'Only admins can remove team members' },
        { status: 403 }
      );
    }

    // Can't remove the subscription owner
    const targetMember = await prisma.teamMember.findFirst({
      where: {
        subscriptionId: subscription.id,
        userId,
      },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: 'User is not a team member' },
        { status: 404 }
      );
    }

    // Get target user info
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Delete team member
    await prisma.teamMember.delete({
      where: {
        subscriptionId_userId: {
          subscriptionId: subscription.id,
          userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Removed ${targetUser?.email || 'user'} from team`,
    });
  } catch (error: any) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove team member' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 404 }
      );
    }

    // Get current user's role
    const currentMember = await prisma.teamMember.findUnique({
      where: {
        subscriptionId_userId: {
          subscriptionId: subscription.id,
          userId: session.user.id,
        },
      },
    });

    // Only admins can update roles
    if (currentMember?.role !== 'admin' && session.user.id !== subscription.userId) {
      return NextResponse.json(
        { error: 'Only admins can update team member roles' },
        { status: 403 }
      );
    }

    // Update role
    const updatedMember = await prisma.teamMember.update({
      where: {
        subscriptionId_userId: {
          subscriptionId: subscription.id,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      member: {
        id: updatedMember.user.id,
        email: updatedMember.user.email,
        name: updatedMember.user.name,
        role: updatedMember.role,
      },
    });
  } catch (error: any) {
    console.error('Update role error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update role' },
      { status: 500 }
    );
  }
}
