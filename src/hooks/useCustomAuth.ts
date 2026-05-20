import { useState, useCallback } from "react";
import { trpc } from "@/providers/trpc";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "coach" | "medical";
}

export function useCustomAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));
  const utils = trpc.useUtils();

  const {
    data: user,
    isLoading,
  } = trpc.customAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !!token,
  });

  const loginMutation = trpc.customAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      utils.invalidate();
    },
  });

  const registerMutation = trpc.customAuth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      utils.invalidate();
    },
  });

  const login = useCallback(
    (email: string, password: string) => {
      loginMutation.mutate({ email, password });
    },
    [loginMutation]
  );

  const register = useCallback(
    (data: { name: string; email: string; password: string; role: "coach" | "medical" }) => {
      registerMutation.mutate(data);
    },
    [registerMutation]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setToken(null);
    utils.invalidate();
    window.location.reload();
  }, [utils]);

  return {
    user: user as AuthUser | null | undefined,
    isAuthenticated: !!user,
    isLoading: isLoading && !!token,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    login,
    register,
    logout,
  };
}
