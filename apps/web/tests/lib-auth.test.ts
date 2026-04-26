import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/auth';
import { auth, setTokens, clearTokens, loadTokens, getAccessToken } from '@/lib/api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  auth: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  loadTokens: vi.fn(),
  getAccessToken: vi.fn(),
}));

describe('lib/auth.ts - useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      mfaRequired: false,
      mfaSessionToken: null,
      pendingEmail: null,
      pendingPassword: null,
      error: null,
    });
  });

  it('initializes with correct default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.mfaRequired).toBe(false);
  });

  describe('login', () => {
    it('sets state correctly on successful login without MFA', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      vi.mocked(auth.login).mockResolvedValueOnce({
        accessToken: 'token123',
        refreshToken: 'refresh123',
        mfaRequired: false,
        advocate: mockUser,
      } as any);

      const result = await useAuthStore.getState().login('test@example.com', 'password');

      expect(result).toBe(true);
      expect(setTokens).toHaveBeenCalledWith('token123', 'refresh123');
      
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('handles MFA requirement correctly', async () => {
      vi.mocked(auth.login).mockResolvedValueOnce({
        mfaRequired: true,
        mfaSessionToken: 'session123',
      } as any);

      const result = await useAuthStore.getState().login('test@example.com', 'password');

      expect(result).toBe(false);
      expect(setTokens).not.toHaveBeenCalled();
      
      const state = useAuthStore.getState();
      expect(state.mfaRequired).toBe(true);
      expect(state.mfaSessionToken).toBe('session123');
      expect(state.pendingEmail).toBe('test@example.com');
      expect(state.pendingPassword).toBe('password');
    });

    it('handles login errors', async () => {
      vi.mocked(auth.login).mockRejectedValueOnce(new Error('Invalid credentials'));

      const result = await useAuthStore.getState().login('test@example.com', 'wrong');

      expect(result).toBe(false);
      
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('verifyMfa', () => {
    it('fails if no pending MFA session', async () => {
      const result = await useAuthStore.getState().verifyMfa('123456');
      
      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('MFA session expired');
    });

    it('succeeds with valid code', async () => {
      // Set up pending MFA state
      useAuthStore.setState({
        mfaRequired: true,
        pendingEmail: 'test@example.com',
        pendingPassword: 'password',
      });

      const mockUser = { id: '1', email: 'test@example.com' };
      vi.mocked(auth.login).mockResolvedValueOnce({
        accessToken: 'token123',
        refreshToken: 'refresh123',
      } as any);
      vi.mocked(auth.me).mockResolvedValueOnce(mockUser as any);

      const result = await useAuthStore.getState().verifyMfa('123456');

      expect(result).toBe(true);
      expect(auth.login).toHaveBeenCalledWith('test@example.com', 'password', '123456');
      expect(setTokens).toHaveBeenCalledWith('token123', 'refresh123');
      
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.mfaRequired).toBe(false);
      expect(state.pendingEmail).toBeNull();
      expect(state.pendingPassword).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears state and tokens', async () => {
      useAuthStore.setState({
        user: { id: '1' } as any,
        isAuthenticated: true,
      });

      vi.mocked(auth.logout).mockResolvedValueOnce(undefined);

      await useAuthStore.getState().logout();

      expect(auth.logout).toHaveBeenCalled();
      expect(clearTokens).toHaveBeenCalled();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
