import type { ContextAttachmentModerationStatus, ContextAttachmentTargetType, ContextAttachmentVisibility } from '@prisma/client';

export const attachmentWarning =
  'Before sharing images or screenshots, blur names, faces, roll numbers, phone numbers, addresses, QR codes, barcodes, signatures, and private chat identities.';

export const privacyChecklist = [
  'I removed or blurred private information.',
  'I have the right to share this context.',
  'This does not expose another person’s private data.',
  'This is shared to help students understand context, not to attack anyone.',
];

export const allowedAttachmentTypes = ['image/png', 'image/jpeg', 'image/webp'];
export const maxAttachmentBytes = 3 * 1024 * 1024;

export type SafeContextAttachment = {
  id: string;
  targetType: ContextAttachmentTargetType;
  targetId: string;
  fileType: string;
  visibility: ContextAttachmentVisibility;
  moderationStatus: ContextAttachmentModerationStatus;
  privacyChecked: boolean;
  caption?: string;
  createdAt: string;
};

export function attachmentStatusCopy(attachment: Pick<SafeContextAttachment, 'visibility' | 'moderationStatus'>) {
  if (attachment.moderationStatus === 'APPROVED' && attachment.visibility === 'PUBLIC_AFTER_REVIEW') {
    return 'Photo context approved for public display.';
  }

  if (attachment.moderationStatus === 'REJECTED' || attachment.moderationStatus === 'NEEDS_REDACTION') {
    return 'This context needs privacy review before it can be shown.';
  }

  return 'Context shared privately for review.';
}
