export type UserRole = "Super Admin" | "Admin" | "Mahasiswa" | "User";

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerId?: string;
  role?: UserRole;
  linkedProviders?: string[];
}

export interface AuthSession {
  token: string | null;
  user: UserProfile | null;
}

export interface Mahasiswa {
  id?: string;
  nim: string;
  nama: string;
  jurusan: string;
  angkatan: string;
  createdAt?: string;
}
