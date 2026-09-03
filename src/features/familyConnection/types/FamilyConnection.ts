export interface FamilyInvitation {
  id: string;
  familyUid: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface FamilyConnection {
  familyUid: string;
  elderlyUid: string;
  createdAt: string;
}