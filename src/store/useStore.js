import { create } from "zustand";

const useStore = create((set) => ({
    // Wallet (Pera)
    walletAddress: null,
    jwtToken: null,
    setWalletAddress: (address) => set({ walletAddress: address }),
    setJwtToken: (token) => set({ jwtToken: token }),

    // Supabase user profile + role
    userProfile: null,
    userRole: null, // 'client' | 'developer' | null
    setUserProfile: (profile) => set({ userProfile: profile, userRole: profile?.role ?? null }),
    setUserRole: (role) => set({ userRole: role }),

    // Full logout
    logout: () => set({ walletAddress: null, jwtToken: null, userProfile: null, userRole: null }),
}));

export default useStore;
