export interface UserSummary {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  roles: string[];
  lockoutEnabled?: boolean;
}

export interface UserDetails extends UserSummary {
  emailConfirmed: boolean;
  phoneNumberConfirmed: boolean;
  lockoutEnabled: boolean;
  accessFailedCount: number;
}

export interface UpdateUserRolesPayload {
  roles: string[];
}

export interface UpdateUserStatusPayload {
  lockoutEnabled: boolean;
}

export interface PaginatedUserResponse {
  users: UserSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

