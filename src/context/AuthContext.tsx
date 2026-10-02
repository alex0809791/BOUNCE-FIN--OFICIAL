import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, SubscriptionStatus, PaymentRequest, PaymentStatus } from '../types';
import {
  getStoredUsers,
  saveStoredUsers,
  getActiveUserId,
  setActiveUserId,
  getPaymentRequests,
  savePaymentRequests,
} from '../utils/storage';
import {
  hashPassword,
  generateSalt,
  isWebAuthnSupported,
  registerBiometricPasskey,
  authenticateWithBiometrics,
} from '../utils/crypto';
import { supabase, TRIAL_DAYS, APP_DOMAIN } from '../utils/supabase';

// Admin emails with automatic administrative permissions
const ADMIN_EMAILS = ['alexfernandestb6@gmail.com', 'admin@bouncefin.com.br'];
export const PIX_OFFICIAL_KEY = '4799264966';
export const PIX_FORMATTED_KEY = '47 99264-966';
export const SUBSCRIPTION_PRICE = 4.99;
export const SUBSCRIPTION_DURATION_DAYS = 30; // Cada pagamento aprovado libera exatamente 30 dias

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isBiometricsAvailable: boolean;
  subscriptionStatus: SubscriptionStatus;
  isRecoveryMode: boolean;
  setIsRecoveryMode: (val: boolean) => void;
  paymentRequests: PaymentRequest[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (name: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  registerBiometrics: () => Promise<{ success: boolean; error?: string }>;
  loginWithBiometrics: () => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  informPixPayment: () => Promise<{ success: boolean; message: string }>;
  markSubscriptionActive: () => void;
  resetTrial: () => void;
  // Admin methods
  adminConfirmPayment: (requestId: string) => void;
  adminRejectPayment: (requestId: string, notes?: string) => void;
  adminToggleUserSubscription: (userId: string, isSubscribed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState<boolean>(false);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      window.location.hash.includes('access_token') &&
      window.location.hash.includes('type=recovery')
    );
  });

  // Load payment requests
  useEffect(() => {
    setPaymentRequests(getPaymentRequests());
  }, []);

  /**
   * Calcula o status de assinatura do usuário considerando:
   * 1. 35 dias de acesso gratuito inicial a partir de user.createdAt.
   * 2. Após os 35 dias, acesso exige assinatura mensal ativa de R$ 4,99.
   * 3. Cada pagamento mensal aprovado pelo administrador concede 30 dias a partir da aprovação (ou prorroga por 30 dias se já estiver ativo).
   * 4. Ao término dos 30 dias da assinatura mensal, o usuário é bloqueado até novo pagamento de R$ 4,99.
   */
  const computeSubscriptionStatus = (
    currentUser: UserProfile | null | undefined,
    allPayments: PaymentRequest[]
  ): SubscriptionStatus => {
    if (!currentUser) {
      return {
        isTrial: false,
        trialDaysTotal: TRIAL_DAYS,
        trialDaysLeft: 0,
        isExpired: false,
        isSubscribed: false,
        accessGranted: false,
        registeredAt: new Date().toISOString(),
        paymentStatus: 'pending',
        hasInformedPayment: false,
      };
    }

    const now = new Date();

    // Checar solicitação de pagamento pendente/informada
    const userPayment = allPayments.find(p => p.userId === currentUser.id);
    const paymentStatus: PaymentStatus = userPayment?.status || (currentUser.isSubscribed ? 'confirmed' : 'pending');
    const hasInformedPayment = userPayment?.status === 'informed';

    // 1. Verificar se possui assinatura mensal paga ativa com data de expiração
    if (currentUser.isSubscribed && currentUser.subscriptionExpiresAt) {
      const expiresDate = new Date(currentUser.subscriptionExpiresAt);
      const remainingMs = expiresDate.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

      if (remainingMs > 0) {
        // Assinatura mensal vigente (dentro dos 30 dias pagos)
        return {
          isTrial: false,
          trialDaysTotal: TRIAL_DAYS,
          trialDaysLeft: 0,
          isExpired: false,
          isSubscribed: true,
          accessGranted: true,
          registeredAt: currentUser.createdAt || now.toISOString(),
          paymentStatus: 'confirmed',
          hasInformedPayment: false,
          subscriptionDaysLeft: remainingDays,
          subscriptionExpiresAt: currentUser.subscriptionExpiresAt,
        };
      }
      // Se a data de expiração da assinatura mensal já passou, ela venceu!
    }

    // 2. Verificar período gratuito de 35 dias a partir da data de cadastro original
    const regDate = currentUser.createdAt ? new Date(currentUser.createdAt) : now;
    const diffMs = now.getTime() - regDate.getTime();
    const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const trialDaysLeft = Math.max(0, TRIAL_DAYS - daysElapsed);
    const isTrialExpired = daysElapsed >= TRIAL_DAYS;

    if (!isTrialExpired) {
      // Ainda dentro dos 35 dias gratuitos
      return {
        isTrial: true,
        trialDaysTotal: TRIAL_DAYS,
        trialDaysLeft,
        isExpired: false,
        isSubscribed: false,
        accessGranted: true,
        registeredAt: currentUser.createdAt || now.toISOString(),
        paymentStatus,
        hasInformedPayment,
      };
    }

    // 3. Período gratuito expirado E assinatura mensal vencida/inexistente -> Acesso bloqueado até novo Pix mensal
    return {
      isTrial: false,
      trialDaysTotal: TRIAL_DAYS,
      trialDaysLeft: 0,
      isExpired: true,
      isSubscribed: false,
      accessGranted: false,
      registeredAt: currentUser.createdAt || now.toISOString(),
      paymentStatus,
      hasInformedPayment,
      subscriptionDaysLeft: 0,
      subscriptionExpiresAt: currentUser.subscriptionExpiresAt,
    };
  };

  const subscriptionStatus = computeSubscriptionStatus(user, paymentRequests);

  useEffect(() => {
    // Check biometrics platform support
    isWebAuthnSupported().then(supported => {
      setIsBiometricsAvailable(supported);
    });

    // Check active session in local storage
    const activeId = getActiveUserId();
    if (activeId) {
      const users = getStoredUsers();
      const current = users.find(u => u.id === activeId);
      if (current) {
        const isAdmin = ADMIN_EMAILS.includes(current.email.toLowerCase());
        const userObj: UserProfile = {
          ...current,
          role: isAdmin ? 'admin' : (current.role || 'user'),
        };
        setUser(userObj);
      } else {
        setActiveUserId(null);
      }
    }

    // Check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !activeId) {
        const users = getStoredUsers();
        let matched = users.find(u => u.email.toLowerCase() === session.user.email?.toLowerCase());
        if (matched) {
          const isAdmin = ADMIN_EMAILS.includes(matched.email.toLowerCase());
          const userObj: UserProfile = {
            ...matched,
            role: isAdmin ? 'admin' : (matched.role || 'user'),
          };
          setUser(userObj);
          setActiveUserId(matched.id);
        }
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const users = getStoredUsers();
        let matched = users.find(u => u.email.toLowerCase() === session.user.email?.toLowerCase());
        if (matched) {
          const isAdmin = ADMIN_EMAILS.includes(matched.email.toLowerCase());
          const userObj: UserProfile = {
            ...matched,
            role: isAdmin ? 'admin' : (matched.role || 'user'),
          };
          setUser(userObj);
          setActiveUserId(matched.id);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const users = getStoredUsers();
    const existing = users.find(u => u.email.toLowerCase() === trimmedEmail);

    // 1. Attempt Supabase Auth login
    try {
      const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (!supaError && supaData?.user) {
        let activeUser = existing;
        if (!activeUser) {
          const salt = generateSalt();
          const hash = await hashPassword(password, salt);
          const createdAt = supaData.user.created_at || new Date().toISOString();
          const isAdmin = ADMIN_EMAILS.includes(trimmedEmail);
          activeUser = {
            id: supaData.user.id || 'usr_' + Date.now().toString(36),
            email: trimmedEmail,
            name: supaData.user.user_metadata?.name || trimmedEmail.split('@')[0],
            passwordHash: hash,
            salt,
            createdAt,
            isSubscribed: false,
            role: isAdmin ? 'admin' : 'user',
          };
          saveStoredUsers([...users, activeUser]);
        } else {
          if (ADMIN_EMAILS.includes(trimmedEmail) && activeUser.role !== 'admin') {
            activeUser = { ...activeUser, role: 'admin' };
            saveStoredUsers(users.map(u => (u.id === activeUser!.id ? activeUser! : u)));
          }
        }
        setUser(activeUser);
        setActiveUserId(activeUser.id);
        return { success: true };
      }
    } catch (supaErr) {
      console.warn('Supabase sign-in fallback to local verification:', supaErr);
    }

    // 2. Fallback to local storage credentials
    if (!existing) {
      return { success: false, error: 'E-mail ou senha incorretos.' };
    }

    const computedHash = await hashPassword(password, existing.salt);
    if (computedHash !== existing.passwordHash) {
      return { success: false, error: 'E-mail ou senha incorretos.' };
    }

    const isAdmin = ADMIN_EMAILS.includes(trimmedEmail);
    const activeUser = {
      ...existing,
      role: isAdmin ? 'admin' : (existing.role || 'user'),
    };

    setUser(activeUser);
    setActiveUserId(activeUser.id);
    return { success: true };
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim() || trimmedEmail.split('@')[0];

    if (!trimmedEmail || !password) {
      return { success: false, error: 'Preencha todos os campos obrigatórios.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'A senha deve ter no mínimo 6 caracteres.' };
    }

    const users = getStoredUsers();
    const exists = users.some(u => u.email.toLowerCase() === trimmedEmail);
    if (exists) {
      return { success: false, error: 'Já existe uma conta cadastrada com este e-mail.' };
    }

    let supaUserId = '';
    const nowIso = new Date().toISOString();

    // 1. Create user in Supabase
    try {
      const { data: supaData, error: supaError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName,
            registered_at: nowIso,
          },
          emailRedirectTo: `${APP_DOMAIN}`,
        },
      });

      if (supaError) {
        if (supaError.message.includes('User already registered') || supaError.status === 422) {
          return { success: false, error: 'Já existe uma conta cadastrada com este e-mail no Supabase. Tente entrar ou recupere a senha.' };
        }
        console.warn('Supabase registration error (proceeding with local registration):', supaError.message);
      } else if (supaData?.user) {
        supaUserId = supaData.user.id;
      }
    } catch (supaErr: any) {
      console.warn('Supabase exception:', supaErr);
    }

    // 2. Create user in secure Local Storage (preserves zero-latency, local privacy, fallback)
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const isAdmin = ADMIN_EMAILS.includes(trimmedEmail);

    const newUser: UserProfile = {
      id: supaUserId || 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      email: trimmedEmail,
      name: trimmedName,
      passwordHash,
      salt,
      createdAt: nowIso,
      isSubscribed: false,
      role: isAdmin ? 'admin' : 'user',
    };

    const updated = [...users, newUser];
    saveStoredUsers(updated);

    setUser(newUser);
    setActiveUserId(newUser.id);
    return { success: true };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
    setUser(null);
    setActiveUserId(null);
  };

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { success: false, error: 'Informe seu e-mail cadastrado.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${APP_DOMAIN}/#reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Link de recuperação enviado com sucesso para seu e-mail! Verifique sua caixa de entrada e spam.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao solicitar recuperação de senha.' };
    }
  };

  // Informa que o usuário realizou o pagamento Pix mensal de R$ 4,99
  // REGRA: NÃO libera o acesso automaticamente. Apenas registra a solicitação com status 'informed' para o administrador.
  const informPixPayment = async (): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Usuário não conectado.' };

    const currentRequests = getPaymentRequests();
    const existingIndex = currentRequests.findIndex(r => r.userId === user.id);

    const newReq: PaymentRequest = {
      id: existingIndex >= 0 ? currentRequests[existingIndex].id : 'pix_' + Date.now().toString(36),
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      amount: SUBSCRIPTION_PRICE,
      pixKey: PIX_OFFICIAL_KEY,
      status: 'informed',
      requestedAt: existingIndex >= 0 ? currentRequests[existingIndex].requestedAt : new Date().toISOString(),
      informedAt: new Date().toISOString(),
    };

    let updatedRequests: PaymentRequest[];
    if (existingIndex >= 0) {
      updatedRequests = currentRequests.map((r, i) => (i === existingIndex ? newReq : r));
    } else {
      updatedRequests = [newReq, ...currentRequests];
    }

    savePaymentRequests(updatedRequests);
    setPaymentRequests(updatedRequests);

    return {
      success: true,
      message: 'Pagamento informado com sucesso! A administração irá conferir o recebimento do Pix mensal de R$ 4,99 e liberar seus 30 dias de acesso.',
    };
  };

  /**
   * Ativação de 30 dias (usada para testes do desenvolvedor ou fallback)
   */
  const markSubscriptionActive = () => {
    if (!user) return;
    const expiresAt = new Date(Date.now() + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const users = getStoredUsers();
    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          isSubscribed: true,
          subscriptionExpiresAt: expiresAt,
        };
      }
      return u;
    });
    saveStoredUsers(updatedUsers);
    const updated = updatedUsers.find(u => u.id === user.id) || null;
    setUser(updated);
  };

  const resetTrial = () => {
    if (!user) return;
    const users = getStoredUsers();
    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          createdAt: new Date().toISOString(),
          isSubscribed: false,
          subscriptionExpiresAt: undefined,
        };
      }
      return u;
    });
    saveStoredUsers(updatedUsers);
    const updated = updatedUsers.find(u => u.id === user.id) || null;
    setUser(updated);
  };

  /**
   * ADMIN OPERATION: Aprovação manual de pagamento Pix pelo administrador.
   * REGRA FUNDAMENTAL: Cada aprovação concede 30 dias de acesso.
   * Se o usuário já tiver dias restantes na assinatura atual, acrescenta +30 dias ao vencimento.
   */
  const adminConfirmPayment = (requestId: string) => {
    const current = getPaymentRequests();
    const target = current.find(r => r.id === requestId);
    if (!target) return;

    const confirmedAtIso = new Date().toISOString();
    const updatedRequests = current.map(r =>
      r.id === requestId
        ? { ...r, status: 'confirmed' as PaymentStatus, confirmedAt: confirmedAtIso }
        : r
    );
    savePaymentRequests(updatedRequests);
    setPaymentRequests(updatedRequests);

    // Calcular novo vencimento de 30 dias
    const users = getStoredUsers();
    const targetUser = users.find(u => u.id === target.userId);
    let baseTime = Date.now();

    // Se já tinha assinatura ativa que ainda não venceu, estende a partir da data atual de expiração
    if (targetUser?.subscriptionExpiresAt) {
      const currentExpiry = new Date(targetUser.subscriptionExpiresAt).getTime();
      if (currentExpiry > baseTime) {
        baseTime = currentExpiry;
      }
    }

    const newExpiresAt = new Date(baseTime + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const updatedUsers = users.map(u => {
      if (u.id === target.userId) {
        return {
          ...u,
          isSubscribed: true,
          subscriptionExpiresAt: newExpiresAt,
        };
      }
      return u;
    });
    saveStoredUsers(updatedUsers);

    // Se o usuário logado for o alvo, sincroniza o estado imediatamente
    if (user?.id === target.userId) {
      setUser(prev =>
        prev
          ? {
              ...prev,
              isSubscribed: true,
              subscriptionExpiresAt: newExpiresAt,
            }
          : prev
      );
    }
  };

  const adminRejectPayment = (requestId: string, notes?: string) => {
    const current = getPaymentRequests();
    const updatedRequests = current.map(r =>
      r.id === requestId
        ? {
            ...r,
            status: 'rejected' as PaymentStatus,
            rejectedAt: new Date().toISOString(),
            adminNotes: notes || 'Pix não localizado no extrato bancário',
          }
        : r
    );
    savePaymentRequests(updatedRequests);
    setPaymentRequests(updatedRequests);
  };

  /**
   * ADMIN OPERATION: Alterna manualmente a assinatura concedendo 30 dias de acesso
   */
  const adminToggleUserSubscription = (userId: string, isSubscribed: boolean) => {
    const users = getStoredUsers();
    const newExpiresAt = isSubscribed
      ? new Date(Date.now() + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          isSubscribed,
          subscriptionExpiresAt: newExpiresAt,
        };
      }
      return u;
    });
    saveStoredUsers(updatedUsers);

    if (user?.id === userId) {
      setUser(prev =>
        prev
          ? {
              ...prev,
              isSubscribed,
              subscriptionExpiresAt: newExpiresAt,
            }
          : prev
      );
    }
  };

  const updateProfile = async (name: string, avatarUrl?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado.' };

    const users = getStoredUsers();
    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          name: name.trim(),
          avatarUrl: avatarUrl !== undefined ? avatarUrl : u.avatarUrl,
        };
      }
      return u;
    });

    saveStoredUsers(updatedUsers);
    const updated = updatedUsers.find(u => u.id === user.id) || null;
    setUser(updated);
    return { success: true };
  };

  const updatePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado.' };
    if (newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    const currentHash = await hashPassword(currentPassword, user.salt);
    if (currentHash !== user.passwordHash) {
      return { success: false, error: 'A senha atual está incorreta.' };
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);

    try {
      await supabase.auth.updateUser({ password: newPassword });
    } catch (err) {
      console.warn('Supabase password update notice:', err);
    }

    const users = getStoredUsers();
    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          passwordHash: newHash,
          salt: newSalt,
        };
      }
      return u;
    });

    saveStoredUsers(updatedUsers);
    const updated = updatedUsers.find(u => u.id === user.id) || null;
    setUser(updated);
    return { success: true };
  };

  const registerBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado.' };
    if (!isBiometricsAvailable) {
      return { success: false, error: 'Biometria não suportada neste dispositivo.' };
    }

    try {
      const res = await registerBiometricPasskey(user.id, user.email, user.name);
      if (res.success && res.credentialId) {
        const users = getStoredUsers();
        const updatedUsers = users.map(u => {
          if (u.id === user.id) {
            return {
              ...u,
              hasBiometrics: true,
              biometricCredentialId: res.credentialId,
            };
          }
          return u;
        });
        saveStoredUsers(updatedUsers);
        const updated = updatedUsers.find(u => u.id === user.id) || null;
        setUser(updated);
        return { success: true };
      }
      return { success: false, error: 'Falha ao registrar biometria.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao configurar biometria.' };
    }
  };

  const loginWithBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isBiometricsAvailable) {
      return { success: false, error: 'Biometria não suportada neste dispositivo.' };
    }

    try {
      const users = getStoredUsers();
      const bioUsers = users.filter(u => u.hasBiometrics);
      if (bioUsers.length === 0) {
        return { success: false, error: 'Nenhuma conta configurada com biometria neste navegador.' };
      }

      const targetCredentialId = bioUsers.length === 1 ? bioUsers[0].biometricCredentialId : undefined;
      const success = await authenticateWithBiometrics(targetCredentialId);
      if (success) {
        const authenticatedUser = bioUsers[0];
        setUser(authenticatedUser);
        setActiveUserId(authenticatedUser.id);
        return { success: true };
      }
      return { success: false, error: 'Autenticação biométrica não concluída.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro na autenticação biométrica.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isBiometricsAvailable,
        subscriptionStatus,
        isRecoveryMode,
        setIsRecoveryMode,
        paymentRequests,
        login,
        register,
        logout,
        updateProfile,
        updatePassword,
        registerBiometrics,
        loginWithBiometrics,
        requestPasswordReset,
        informPixPayment,
        markSubscriptionActive,
        resetTrial,
        adminConfirmPayment,
        adminRejectPayment,
        adminToggleUserSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
