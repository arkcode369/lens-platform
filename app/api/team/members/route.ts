import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'better-auth/next-js';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      include: {
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ members: [], limit: 1 });
    }

    const plan = SUBSCRIPTION_PLANS[subscription.plan as keyof typeof SUBSCRIPTION_PLANS];
    const memberCount = subscription.teamMembers.length;

    return NextResponse.json({
      members: subscription.teamMembers.map((tm) => ({
        id: tm.user.id,
        email: tm.user.email,
        name: tm.user.name,
        role: tm.role,
        status: tm.status,
        joinedAt: tm.joinedAt,
      })),
      limit: plan.features.maxTeamMembers,
      currentCount: memberCount,
    });
  } catch (error) {
    console.error('Team members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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
      include: { teamMembers: true },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 404 }
      );
    }

    // Check plan limits
    const plan = SUBSCRIPTION_PLANS[subscription.plan as keyof typeof SUBSCRIPTION_PLANS];
    if (plan.features.maxTeamMembers !== Infinity) {
      if (subscription.teamMembers.length >= plan.features.maxTeamMembers) {
        return NextResponse.json(
          { error: 'Team member limit reached' },
          { status: 400 }
        );
      }
    }

    // Find or create user
    let targetUser = await prisma.user.findFirst({
      where: { email },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found. Please invite existing users only.' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = subscription.teamMembers.find(
      (tm) => tm.userId === targetUser.id
    );

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a team member' },
        { status: 400 }
      );
    }

    // Add team member
    const newMember = await prisma.teamMember.create({
      data: {
        subscriptionId: subscription.id,
        userId: targetUser.id,
        role,
        status: 'accepted',
        joinedAt: new Date(),
      },
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
        id: newMember.user.id,
        email: newMember.user.email,
        name: newMember.user.name,
        role: newMember.role,
        status: newMember.status,
      },
    });
  } catch (error: any) {
    console.error('Invite member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to invite team member' },
      { status: 500 }
    );
  }
}
