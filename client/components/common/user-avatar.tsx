"use client";

import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

export function UserAvatar() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading || !user) {
    return null;
  }

  const getInitials = () => {
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer aspect-square h-full p-2 focus:outline-none">
          <Avatar className="h-full w-full cursor-pointer">
            <AvatarFallback className="rounded-none bg-linear-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="-mt-1.5 mr-2 w-56 rounded-none">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 p-1">
            {user.username && (
              <p className="text-muted-foreground text-sm leading-none">@{user.username}</p>
            )}
            <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="group cursor-pointer rounded-none hover:bg-red-800! hover:text-white!"
        >
          <LogOut className="mr-2 h-4 w-4 text-xs group-hover:text-white" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
