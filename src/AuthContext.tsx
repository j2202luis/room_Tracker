import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, AccessRequest } from './types';
import * as db from './db';

interface AuthContextType {
  currentUser: UserProfile | null;
  sessionError: string | null;
  pendingRequestsCount: number;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: (message?: string) => void;
  requestAccess: (fullName: string, email: string, role: 'instructor' | 'student', reason: string) => { success: boolean; message: string };
  registerUser: (fullName: string, email: string, role: 'admin' | 'instructor' | 'student', password: string) => { success: boolean; message: string };
  changePassword: (newPassword: string) => { success: boolean; message: string };
  approveRequest: (requestId: string) => { success: boolean; tempPassword?: string };
  rejectRequest: (requestId: string) => { success: boolean };
  revokeAccess: (userId: string) => { success: boolean };
  getAllRequests: () => AccessRequest[];
  getApprovedUsers: () => UserProfile[];
  refreshRequests: () => void;
  forceLogoutMessage: string | null;
  setForceLogoutMessage: (msg: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [forceLogoutMessage, setForceLogoutMessage] = useState<string | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [requestsList, setRequestsList] = useState<AccessRequest[]>([]);
  
  // Initialize DB on mount
  useEffect(() => {
    db.initializeDB();
    
    // Check for existing active session
    const session = db.getSession();
    if (session) {
      const now = Date.now();
      const lastActive = new Date(session.lastActiveTime).getTime();
      const inactivityLimit = 30 * 60 * 1000; // 30 minutes in ms

      if (now - lastActive > inactivityLimit) {
        // Session expired due to inactivity
        db.clearSession();
        setForceLogoutMessage("You have been signed out due to inactivity.");
      } else {
        // Restore session
        setCurrentUser(session.user);
        // Update session last active
        db.saveSession({
          ...session,
          lastActiveTime: new Date().toISOString()
        });
      }
    }
    
    // Initial load of pending requests badge count
    refreshRequests();
  }, []);

  const refreshRequests = useCallback(() => {
    const list = db.getRequests();
    setRequestsList(list);
    const pending = list.filter(r => r.status === 'pending').length;
    setPendingRequestsCount(pending);
  }, []);

  // Set up inactivity tracker
  useEffect(() => {
    if (!currentUser) return;

    const activityHandler = () => {
      const session = db.getSession();
      if (session) {
        db.saveSession({
          ...session,
          lastActiveTime: new Date().toISOString()
        });
      }
    };

    // Events to monitor user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, activityHandler));

    // Periodic check every 30 seconds for 30 min expiration
    const interval = setInterval(() => {
      const session = db.getSession();
      if (session) {
        const now = Date.now();
        const lastActive = new Date(session.lastActiveTime).getTime();
        const inactivityLimit = 30 * 60 * 1000; // 30 mins

        if (now - lastActive > inactivityLimit) {
          logout("You have been signed out due to inactivity.");
        }
      }
    }, 15000);

    return () => {
      events.forEach(event => window.removeEventListener(event, activityHandler));
      clearInterval(interval);
    };
  }, [currentUser]);

  // Login handler
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedEmail = email.trim();
    
    // Standard rule: ssct.edu.ph emails only
    if (!trimmedEmail.toLowerCase().endsWith('@ssct.edu.ph')) {
      return { success: false, message: 'Access denied.' };
    }

    // Check brute force lockout
    const lockCheck = db.checkLockout(trimmedEmail);
    if (lockCheck.isLocked) {
      return { success: false, message: `Too many attempts. Try again in 15 minutes.` };
    }

    const users = db.getUsers();
    const user = users.find(u => u.email.toLowerCase() === trimmedEmail.toLowerCase());

    if (!user) {
      // Record failed attempt
      const { lockedUntil } = db.recordFailedAttempt(trimmedEmail);
      if (lockedUntil) {
        return { success: false, message: "Too many attempts. Try again in 15 minutes." };
      }
      return { success: false, message: 'Invalid credentials or unauthorized access.' };
    }

    // Check if user is approved
    if (!user.isApproved || user.status === 'revoked') {
      // Find request status to give a specific but secure message if pending/rejected
      const requests = db.getRequests();
      const req = requests.find(r => r.email.toLowerCase() === trimmedEmail.toLowerCase());
      
      if (req && req.status === 'pending') {
        return { success: false, message: 'Your account is awaiting admin approval.' };
      }
      return { success: false, message: 'Access denied.' };
    }

    // Check password
    if (user.passwordHash !== password) {
      const { lockedUntil } = db.recordFailedAttempt(trimmedEmail);
      if (lockedUntil) {
        return { success: false, message: "Too many attempts. Try again in 15 minutes." };
      }
      return { success: false, message: 'Invalid credentials or unauthorized access.' };
    }

    // Success login: clear lockout log
    db.clearFailedAttempts(trimmedEmail);

    // Save active session
    const sessionData = {
      user,
      loginTime: new Date().toISOString(),
      lastActiveTime: new Date().toISOString()
    };
    db.saveSession(sessionData);
    setCurrentUser(user);
    setForceLogoutMessage(null);
    return { success: true };
  };

  // Logout handler
  const logout = (message?: string) => {
    db.clearSession();
    setCurrentUser(null);
    if (message) {
      setForceLogoutMessage(message);
    } else {
      setForceLogoutMessage("You have been signed out.");
    }
  };

  // Submit access request
  const requestAccess = (fullName: string, email: string, role: 'instructor' | 'student', reason: string): { success: boolean; message: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail.endsWith('@ssct.edu.ph')) {
      return { success: false, message: 'Access denied. Only @ssct.edu.ph emails are allowed.' };
    }

    const requests = db.getRequests();
    
    // Check rate limit: 1 request per email per 24 hours
    const existing = requests.filter(r => r.email.toLowerCase() === trimmedEmail);
    if (existing.length > 0) {
      // Sort to get latest
      const latest = [...existing].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0];
      const timeElapsed = Date.now() - new Date(latest.requestedAt).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (timeElapsed < twentyFourHours) {
        const remainingHours = Math.ceil((twentyFourHours - timeElapsed) / (60 * 60 * 1000));
        return { 
          success: false, 
          message: `You have already requested access. Rate limit exceeded. Try again in ${remainingHours} hour${remainingHours > 1 ? 's' : ''}.` 
        };
      }
    }

    // Reject if email is already blacklisted/rejected by admin
    const isRejected = existing.some(r => r.status === 'rejected');
    if (isRejected) {
      return { success: false, message: 'Access denied. This email has been blocked or rejected by the administrator.' };
    }

    // Create Request
    const newRequest: AccessRequest = {
      id: `req-${Date.now()}`,
      fullName: fullName.trim(),
      email: trimmedEmail,
      role,
      reason: reason.trim(),
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    const updated = [...requests, newRequest];
    db.saveRequests(updated);
    refreshRequests();
    
    return { success: true, message: 'Your access request has been submitted successfully and is awaiting review by the administrator.' };
  };

  // Direct Sign Up/Register handler for new system users
  const registerUser = (fullName: string, email: string, role: 'admin' | 'instructor' | 'student', password: string): { success: boolean; message: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail.endsWith('@ssct.edu.ph')) {
      return { success: false, message: 'Access denied. Only @ssct.edu.ph emails are allowed.' };
    }

    const users = db.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (existing) {
      return { success: false, message: 'An account with this email is already registered.' };
    }

    // Password rules validation
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!minLength || !hasUppercase || !hasNumber || !hasSpecial) {
      return { 
        success: false, 
        message: 'Password must be at least 8 characters long, and contain at least 1 uppercase letter, 1 number, and 1 special character.' 
      };
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      email: trimmedEmail,
      fullName: fullName.trim(),
      role,
      isApproved: true, // Autoapprove direct registrations to enable immediate entry
      mustChangePassword: false, // Don't force password change if they crafted it themselves
      passwordHash: password,
      status: 'active',
    };

    const updated = [...users, newUser];
    db.saveUsers(updated);
    
    return { success: true, message: 'Your profile has been registered and approved successfully. You can log in now!' };
  };

  // Admin: Change password
  const changePassword = (newPassword: string): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'Not logged in.' };
    }

    // Password requirements check:
    // Minimum 8 characters, 1 uppercase, 1 number, 1 special character
    const minLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!minLength || !hasUppercase || !hasNumber || !hasSpecial) {
      return { 
        success: false, 
        message: 'Password must be at least 8 characters long, and contain at least 1 uppercase letter, 1 number, and 1 special character.' 
      };
    }

    // Cannot reuse the temporary password
    if (newPassword === currentUser.passwordHash) {
      return { success: false, message: 'Cannot reuse the temporary password. Please create a new unique password.' };
    }

    // Update profile
    const users = db.getUsers();
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          passwordHash: newPassword,
          mustChangePassword: false
        };
      }
      return u;
    });

    db.saveUsers(updatedUsers);
    
    // Update state context
    const updatedCurrentUser = {
      ...currentUser,
      passwordHash: newPassword,
      mustChangePassword: false
    };
    setCurrentUser(updatedCurrentUser);

    // Update session
    const session = db.getSession();
    if (session) {
      db.saveSession({
        ...session,
        user: updatedCurrentUser
      });
    }

    return { success: true, message: 'Password changed successfully.' };
  };

  // Admin Approval
  const approveRequest = (requestId: string): { success: boolean; tempPassword?: string } => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false };
    }

    const requests = db.getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return { success: false };

    const req = requests[reqIndex];
    if (req.status !== 'pending') return { success: false };

    // Update request
    requests[reqIndex] = {
      ...req,
      status: 'approved',
      reviewedBy: currentUser.id,
      reviewedAt: new Date().toISOString()
    };
    db.saveRequests(requests);

    // Generate Temp Password conforming to guidelines: 1 uppercase, 1 special, 1 number, minimum 8 characters
    // e.g. Temp@120593
    const random6 = Math.floor(100000 + Math.random() * 900000); // Ensures 6 digits
    const tempPassword = `SSCTTemp@${random6}`;

    // Create UserProfile
    const users = db.getUsers();
    
    // Check if user already exists
    const emailExists = users.some(u => u.email.toLowerCase() === req.email.toLowerCase());
    if (emailExists) {
      // Re-enable existing user
      const updatedUsers = users.map(u => {
        if (u.email.toLowerCase() === req.email.toLowerCase()) {
          return {
            ...u,
            isApproved: true,
            status: 'active' as const,
            mustChangePassword: true,
            passwordHash: tempPassword,
            approvedBy: currentUser.id,
            approvedAt: new Date().toISOString()
          };
        }
        return u;
      });
      db.saveUsers(updatedUsers);
    } else {
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        email: req.email.toLowerCase(),
        fullName: req.fullName,
        role: req.role,
        isApproved: true,
        mustChangePassword: true,
        passwordHash: tempPassword,
        status: 'active',
        approvedBy: currentUser.id,
        approvedAt: new Date().toISOString()
      };
      db.saveUsers([...users, newUser]);
    }

    refreshRequests();
    return { success: true, tempPassword };
  };

  // Admin Rejection
  const rejectRequest = (requestId: string): { success: boolean } => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false };
    }

    const requests = db.getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return { success: false };

    const req = requests[reqIndex];
    if (req.status !== 'pending') return { success: false };

    requests[reqIndex] = {
      ...req,
      status: 'rejected',
      reviewedBy: currentUser.id,
      reviewedAt: new Date().toISOString()
    };
    
    db.saveRequests(requests);
    refreshRequests();
    return { success: true };
  };

  // Admin Revocation
  const revokeAccess = (userId: string): { success: boolean } => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false };
    }

    const users = db.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return { success: false };

    const user = users[userIndex];
    // Can't revoke yourself
    if (user.id === currentUser.id) return { success: false };

    // Revoke
    users[userIndex] = {
      ...user,
      isApproved: false,
      status: 'revoked'
    };
    db.saveUsers(users);

    // If revoked user has active session, their session is checked on next tick/reload,
    // but let's clear it immediately if they are of the same browser
    const activeSession = db.getSession();
    if (activeSession && activeSession.user.id === userId) {
      db.clearSession();
      // If same local window, we will catch it.
    }

    refreshRequests();
    return { success: true };
  };

  const getAllRequests = (): AccessRequest[] => {
    return requestsList;
  };

  const getApprovedUsers = (): UserProfile[] => {
    const users = db.getUsers();
    // Return approved users other than the admin themself or including them
    return users.filter(u => u.isApproved && u.role !== 'admin');
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      sessionError: null,
      pendingRequestsCount,
      login,
      logout,
      requestAccess,
      registerUser,
      changePassword,
      approveRequest,
      rejectRequest,
      revokeAccess,
      getAllRequests,
      getApprovedUsers,
      refreshRequests,
      forceLogoutMessage,
      setForceLogoutMessage
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
