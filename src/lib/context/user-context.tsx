"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, getWorkspaceService } from "@/lib/services/api";

interface UserContextType {
  user: User | null;
  users: User[];
  isLoading: boolean;
  switchPersona: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const service = getWorkspaceService();
      const currentUser = await service.getCurrentUser();
      const allUsers = await service.getUsers();
      setUser(currentUser);
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to load user persona:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const switchPersona = async (userId: string) => {
    setIsLoading(true);
    try {
      const service = getWorkspaceService();
      const updatedUser = await service.setCurrentUserPersona(userId);
      setUser(updatedUser);
      // Reload page or trigger a refresh across key data points
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch persona:", error);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const service = getWorkspaceService();
      const currentUser = await service.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        users,
        isLoading,
        switchPersona,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
