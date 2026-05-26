export interface AuthCallbackParams {
  code: string;
  state: string | null;
  codeVerifier: string | null | undefined;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  orgId: string;
  roleTemplate: string;
}
