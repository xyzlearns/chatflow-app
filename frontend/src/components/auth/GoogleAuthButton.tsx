import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';

export function GoogleAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const googleAuthMutation = useMutation({
    mutationFn: async (googleProfile: any) => {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleProfile }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Google auth failed');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Login Successful',
        description: 'Welcome to ChatFlow!',
      });
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: 'Google Login Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      
      // Configure Google provider with additional scopes
      googleProvider.addScope('email');
      googleProvider.addScope('profile');
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      console.log('Firebase user:', user);
      
      // Extract profile information
      const googleProfile = {
        sub: user.uid,
        email: user.email,
        given_name: user.displayName?.split(' ')[0] || '',
        family_name: user.displayName?.split(' ').slice(1).join(' ') || '',
        picture: user.photoURL,
      };

      console.log('Sending profile to backend:', googleProfile);
      await googleAuthMutation.mutateAsync(googleProfile);
    } catch (error: any) {
      console.error('Google login error:', error);
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Domain not authorized. Please add this domain to Firebase authorized domains in the Firebase Console.';
      } else if (error.code === 'auth/invalid-api-key') {
        errorMessage = 'Invalid Firebase configuration. Please check your API keys.';
      }
      
      toast({
        title: 'Google Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Google login detailed error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback to Replit auth if Firebase is not configured
  const handleReplitLogin = () => {
    setIsLoading(true);
    window.location.href = '/api/login';
  };

  // Check if Firebase is configured
  const isFirebaseConfigured = 
    import.meta.env.VITE_FIREBASE_API_KEY && 
    import.meta.env.VITE_FIREBASE_PROJECT_ID && 
    import.meta.env.VITE_FIREBASE_APP_ID;

  return (
    <Button
      onClick={isFirebaseConfigured ? handleGoogleLogin : handleReplitLogin}
      disabled={isLoading || googleAuthMutation.isPending}
      className="w-full bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md"
    >
      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {isLoading || googleAuthMutation.isPending 
        ? 'Signing in...' 
        : `Continue with Google${!isFirebaseConfigured ? ' (Replit)' : ''}`}
    </Button>
  );
}