import { UserProfileData } from '../types';

export interface RegisteredAccount {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  registeredAt: string;
  lastLoginAt: string;
  birthDate?: string;
  age?: number;
  verified18: boolean;
  profileData: UserProfileData;
}

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  username: string;
  expiresAt: number;
}

const STORAGE_ACCOUNTS_KEY = 'jobs_database_accounts';
const STORAGE_SESSION_KEY = 'jobs_current_session';

// Helper: SHA-256 Hash using native Web Crypto API with Salt
async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:jobs_secure_salt_2026`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Initial default accounts for seamless demo & audit
const SEED_ACCOUNTS: Omit<RegisteredAccount, 'passwordHash' | 'passwordSalt'>[] = [
  {
    id: 'user_emilio_vip',
    email: 'membro.vip@jobs.app',
    username: 'emilio_vip',
    registeredAt: '2026-01-10T10:00:00.000Z',
    lastLoginAt: '2026-10-18T00:00:00.000Z',
    birthDate: '1998-05-14',
    age: 28,
    verified18: true,
    profileData: {
      name: 'Emilio Borges',
      age: 28,
      birthDate: '1998-05-14',
      bio: 'Apreciador de bons vinhos, noites animadas e conexões autênticas sem tabus.',
      occupation: 'Empresário & Investidor',
      city: 'São Paulo - Jardins',
      interests: ['Vinhos Finos', 'Viagens Internacionais', 'Restaurantes', 'Vida Noturna'],
      hobbies: ['Musculação', 'Culinária / Gastronomia', 'Fotografia', 'Praia & Barco'],
      musicGenres: ['Eletrônica / Techno', 'Trap & Hip-Hop', 'Rock Clássico'],
      zodiacSign: 'Touro',
      heightCm: 182,
      drinking: 'Socialmente',
      smoking: 'Não fumo',
      seeking: 'Mulheres com atitude para encontros casuais ou VIP',
      verified18: true,
    },
  },
  {
    id: 'user_mariana_jobs',
    email: 'mariana.silva@jobs.app',
    username: 'mariana_s',
    registeredAt: '2026-02-15T14:30:00.000Z',
    lastLoginAt: '2026-10-17T20:00:00.000Z',
    birthDate: '1999-08-22',
    age: 27,
    verified18: true,
    profileData: {
      name: 'Mariana Silva',
      age: 27,
      birthDate: '1999-08-22',
      bio: 'Curto artes visuais, viagens espontâneas e boas conversas acompanhadas de café.',
      occupation: 'Designer de Produtos',
      city: 'São Paulo - Pinheiros',
      interests: ['Arte Contemporânea', 'Viagens', 'Cafés Especiais'],
      hobbies: ['Pintura', 'Fotografia', 'Ioga'],
      musicGenres: ['Indie Rock', 'MPB'],
      zodiacSign: 'Leão',
      heightCm: 167,
      drinking: 'Socialmente',
      smoking: 'Não fumo',
      seeking: 'Namoro sério',
      verified18: true,
    },
  },
];

class AuthService {
  private accountsCache: RegisteredAccount[] | null = null;
  private isInitialized = false;

  private async initializeIfNeeded(): Promise<void> {
    if (this.isInitialized) return;

    const stored = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (!stored) {
      // Seed default accounts with secure hashes
      const seeded: RegisteredAccount[] = [];
      for (const seed of SEED_ACCOUNTS) {
        const salt = generateRandomSalt();
        const hash = await hashPasswordWithSalt('Jobs@2026Secure!', salt);
        seeded.push({
          ...seed,
          passwordHash: hash,
          passwordSalt: salt,
        });
      }
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(seeded));
      this.accountsCache = seeded;
    } else {
      try {
        this.accountsCache = JSON.parse(stored);
      } catch (e) {
        this.accountsCache = [];
      }
    }
    this.isInitialized = true;
  }

  public async getAccounts(): Promise<RegisteredAccount[]> {
    await this.initializeIfNeeded();
    return this.accountsCache || [];
  }

  private saveAccounts(accounts: RegisteredAccount[]): void {
    this.accountsCache = accounts;
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  /**
   * Register a new user account with unique validation and password hashing
   */
  public async register(
    email: string,
    username: string,
    rawPassword: string
  ): Promise<{ success: boolean; account?: RegisteredAccount; error?: string }> {
    await this.initializeIfNeeded();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase().replace('@', '');

    const accounts = await this.getAccounts();

    // Check email uniqueness
    if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Este e-mail já está cadastrado no JOBS. Faça login ou recupere sua senha.' };
    }

    // Check username uniqueness
    if (accounts.some((a) => a.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'Este nome de usuário já está em uso por outro membro. Escolha outro.' };
    }

    const salt = generateRandomSalt();
    const passwordHash = await hashPasswordWithSalt(rawPassword, salt);

    const newAccount: RegisteredAccount = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      passwordSalt: salt,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      verified18: false,
      profileData: {
        name: cleanUsername,
        age: 25,
        birthDate: '2001-01-01',
        bio: 'Novo membro no JOBS.',
        occupation: '',
        city: 'São Paulo, SP',
        interests: ['Gastronomia', 'Viagens'],
        hobbies: ['Fotografia', 'Música'],
        musicGenres: ['MPB'],
        zodiacSign: 'Áries',
        heightCm: 175,
        drinking: 'Socialmente',
        smoking: 'Não fumo',
        seeking: 'Namoro sério',
        verified18: false,
      },
    };

    accounts.push(newAccount);
    this.saveAccounts(accounts);
    this.createSession(newAccount);

    return { success: true, account: newAccount };
  }

  /**
   * Authenticate user with email or username and verify password hash
   */
  public async login(
    identifier: string,
    rawPassword: string
  ): Promise<{ success: boolean; account?: RegisteredAccount; error?: string }> {
    await this.initializeIfNeeded();
    const rawIdentifier = identifier.trim().toLowerCase();
    const cleanUsernameId = rawIdentifier.replace(/^@/, '');
    const accounts = await this.getAccounts();

    const account = accounts.find(
      (a) => a.email.toLowerCase() === rawIdentifier || a.username.toLowerCase() === cleanUsernameId
    );

    if (!account) {
      return { success: false, error: 'Credenciais inválidas. Verifique seu e-mail/usuário e senha.' };
    }

    const computedHash = await hashPasswordWithSalt(rawPassword, account.passwordSalt);
    if (computedHash !== account.passwordHash) {
      return { success: false, error: 'Senha incorreta. Tente novamente ou use a recuperação de senha.' };
    }

    account.lastLoginAt = new Date().toISOString();
    this.saveAccounts(accounts);
    this.createSession(account);

    return { success: true, account };
  }

  /**
   * Reset password for registered account
   */
  public async resetPassword(
    email: string,
    newRawPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    await this.initializeIfNeeded();
    const cleanEmail = email.trim().toLowerCase();
    const accounts = await this.getAccounts();

    const accountIndex = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);
    if (accountIndex === -1) {
      return { success: false, error: 'Não encontramos nenhuma conta com o e-mail informado.' };
    }

    const salt = generateRandomSalt();
    const newHash = await hashPasswordWithSalt(newRawPassword, salt);

    accounts[accountIndex].passwordSalt = salt;
    accounts[accountIndex].passwordHash = newHash;
    this.saveAccounts(accounts);

    return { success: true };
  }

  /**
   * Update profile data for an account
   */
  public async updateAccountProfile(
    userId: string,
    updates: Partial<UserProfileData> & { birthDate?: string; age?: number; verified18?: boolean }
  ): Promise<void> {
    await this.initializeIfNeeded();
    const accounts = await this.getAccounts();
    const idx = accounts.findIndex((a) => a.id === userId);
    if (idx !== -1) {
      accounts[idx].profileData = { ...accounts[idx].profileData, ...updates };
      if (updates.birthDate) accounts[idx].birthDate = updates.birthDate;
      if (updates.age !== undefined) accounts[idx].age = updates.age;
      if (updates.verified18 !== undefined) accounts[idx].verified18 = updates.verified18;
      this.saveAccounts(accounts);
    }
  }

  /**
   * Session Management
   */
  public createSession(account: RegisteredAccount): AuthSession {
    const session: AuthSession = {
      token: `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: account.id,
      email: account.email,
      username: account.username,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days session
    };
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('jhobs_age_verified', account.verified18 ? 'true' : 'false');
    localStorage.setItem('jhobs_user_profile_data', JSON.stringify(account.profileData));
    return session;
  }

  public getCurrentSession(): AuthSession | null {
    const stored = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!stored) return null;
    try {
      const session: AuthSession = JSON.parse(stored);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        this.logout();
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  public logout(): void {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem('jhobs_age_verified');
  }
}

export const authService = new AuthService();
