"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "@/lib/api";

interface User {
  email: string;
  emailVerified: boolean;
}

interface AccessMap {
  userId: string;
  orgId: string;
  orgStatus: string;
  roleTemplate: string;
  scopeType: "org" | "zones" | "stores";
  dataScope: {
    zoneIds?: string[];
    storeIds?: string[];
  };
  permissions: string[];
  modules: string[];
}

interface AuthContextType {
  user: User | null;
  accessMap: AccessMap | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // true = SSO authenticated but no 360 org yet → show onboarding
  needsOnboarding: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasModule: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessMap, setAccessMap] = useState<AccessMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.user);
      setAccessMap(response.data.accessMap);
    } catch {
      setUser(null);
      setAccessMap(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
      const ssoUrl =
        process.env.NEXT_PUBLIC_SSO_URL || "http://localhost:8000/api/v1";
      window.location.href = `${ssoUrl}/auth/logout?redirect_uri=${encodeURIComponent(window.location.origin)}`;
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  const hasPermission = (permission: string) =>
    accessMap?.permissions.includes(permission) ?? false;

  const hasAnyPermission = (permissions: string[]) =>
    permissions.some((p) => accessMap?.permissions.includes(p) ?? false);

  const hasModule = (module: string) =>
    accessMap?.modules.includes(module) ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessMap,
        isAuthenticated: !!user,
        isLoading,
        needsOnboarding: !!user && !accessMap,
        logout,
        refreshUser,
        hasPermission,
        hasAnyPermission,
        hasModule,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
