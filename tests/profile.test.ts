import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canViewProfile,
  isProductProfileVisibility,
  isProfileRelationship,
  isValidProfileCollegeId,
  mapVisibilityToDb,
  mapVisibilityToProduct,
  normalizeUsername,
  profileContextLabel,
  relationshipLabel,
  reservedUsernames,
  toPublicProfile,
  validateUsername,
  verificationDisplay,
} from '../src/lib/profile';
import { prisma } from '../src/lib/prisma';

test('username normalization and validation are deterministic', () => {
  assert.equal(normalizeUsername('  Calm_Student27  '), 'calm_student27');
  assert.equal(validateUsername('ca').ok, false);
  assert.equal(validateUsername('calm-student').ok, false);
  assert.equal(validateUsername('calm_student27').ok, true);
});

test('reserved usernames are rejected', () => {
  for (const username of reservedUsernames) {
    assert.equal(validateUsername(username).ok, false);
  }
});

test('profile enum input guards reject unsafe values', () => {
  assert.equal(isProductProfileVisibility('PUBLIC'), true);
  assert.equal(isProductProfileVisibility('COMMUNITY_ONLY'), true);
  assert.equal(isProductProfileVisibility('friends_only'), false);
  assert.equal(isProfileRelationship('current_student'), true);
  assert.equal(isProfileRelationship('college_admin'), false);
});

test('duplicate usernames are rejected by database uniqueness', async () => {
  const username = `profile_dup_${Date.now()}`;
  const first = await prisma.user.create({
    data: { name: 'Profile Dup One', email: `${username}-one@example.test`, username, role: 'USER' },
  });

  try {
    await assert.rejects(() => prisma.user.create({
      data: { name: 'Profile Dup Two', email: `${username}-two@example.test`, username, role: 'USER' },
    }));
  } finally {
    await prisma.user.delete({ where: { id: first.id } });
  }
});

test('profile visibility rules enforce public, community, and private access', () => {
  assert.equal(canViewProfile('PUBLIC', { isOwner: false, viewerSignedIn: false }), true);
  assert.equal(canViewProfile('COMMUNITY_ONLY', { isOwner: false, viewerSignedIn: false }), false);
  assert.equal(canViewProfile('COMMUNITY_ONLY', { isOwner: false, viewerSignedIn: true }), true);
  assert.equal(canViewProfile('PRIVATE', { isOwner: false, viewerSignedIn: true }), false);
  assert.equal(canViewProfile('PRIVATE', { isOwner: true, viewerSignedIn: true }), true);
});

test('public profile filtering excludes private fields and handles incomplete profiles', () => {
  const user = {
    id: 'u-test',
    name: 'Profile Student',
    email: 'hidden@example.test',
    username: 'profile_student',
    passwordHash: 'hidden',
    anonymousDisplayName: null,
    displayName: null,
    role: 'CURRENT_STUDENT',
    verificationLevel: 1,
    verificationStatus: 'CONTEXT_ADDED',
    collegeId: null,
    branch: 'CSE',
    batch: null,
    year: '3rd year',
    hostelStatus: null,
    interestedBranch: null,
    publicBio: null,
    profileVisibility: 'PUBLIC_CONTEXT',
    trustScore: 0,
    betaStatus: 'ACTIVE',
    betaActivatedAt: new Date('2026-07-01T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    college: null,
    _count: { questions: 1, answers: 2, experiences: 0, whatWorksPosts: 0 },
  } as const;

  const profile = toPublicProfile(user, { isOwner: false, viewerSignedIn: false });
  assert.equal(profile?.displayName, 'Profile Student');
  assert.equal(profile?.contextLabel, 'Current Student · CSE · 3rd year');
  assert.equal(Object.hasOwn(profile ?? {}, 'email'), false);
  assert.equal(Object.hasOwn(profile ?? {}, 'passwordHash'), false);
});

test('private profile is hidden from non-owner', () => {
  const user = {
    id: 'private-test',
    name: 'Private Student',
    email: 'private@example.test',
    username: 'private_student',
    passwordHash: null,
    anonymousDisplayName: null,
    displayName: 'Private Student',
    role: 'ALUMNI',
    verificationLevel: 1,
    verificationStatus: 'UNVERIFIED',
    collegeId: null,
    branch: 'Mechanical',
    batch: '2024',
    year: null,
    hostelStatus: null,
    interestedBranch: null,
    publicBio: null,
    profileVisibility: 'PRIVATE',
    trustScore: 0,
    betaStatus: 'ACTIVE',
    betaActivatedAt: new Date('2026-07-01T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    college: null,
    _count: { questions: 0, answers: 0, experiences: 0, whatWorksPosts: 0 },
  } as const;

  assert.equal(toPublicProfile(user, { isOwner: false, viewerSignedIn: true }), null);
  assert.equal(toPublicProfile(user, { isOwner: true, viewerSignedIn: true })?.visibility, 'PRIVATE');
});

test('college association validation accepts only existing college ids', async () => {
  const college = await prisma.college.findFirst({ select: { id: true } });
  assert.equal(await isValidProfileCollegeId(prisma, college?.id), Boolean(college));
  assert.equal(await isValidProfileCollegeId(prisma, 'missing-college'), false);
});

test('role and verification display rules stay modest', () => {
  assert.equal(relationshipLabel('CURRENT_STUDENT'), 'Current Student');
  assert.equal(profileContextLabel({ role: 'ALUMNI', branch: 'Mechanical', batch: '2024', year: null, hostelStatus: null, interestedBranch: null }), 'Alumni · Mechanical · Class of 2024');
  assert.equal(verificationDisplay('UNVERIFIED'), undefined);
  assert.equal(verificationDisplay('CONTEXT_ADDED'), 'Self-declared context');
  assert.equal(mapVisibilityToProduct('LIMITED_CONTEXT'), 'COMMUNITY_ONLY');
  assert.equal(mapVisibilityToDb('COMMUNITY_ONLY'), 'LIMITED_CONTEXT');
});
