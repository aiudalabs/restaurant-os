export interface Station {
  id: string;
  orgId: string;
  branchId: string;
  name: string;
  categoryIds: string[];
  fcmTokens: string[];
  color: string;
  isActive: boolean;
}
