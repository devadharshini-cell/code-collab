import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signup = async (email, password, displayName) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
            await updateProfile(cred.user, { displayName });
            // updateProfile doesn't trigger onAuthStateChanged with the new
            // name locally, so reflect it immediately in state too.
            setUser({ ...cred.user, displayName });
        }
        return cred.user;
    };

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

    const logout = () => signOut(auth);

    const value = { user, loading, signup, login, loginWithGoogle, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
