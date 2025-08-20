import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signInWithGoogle } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Sign in with Firebase Google OAuth
      const firebaseUser = await signInWithGoogle();
      
      // Send Firebase user info to backend for session creation
      const googleProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        picture: firebaseUser.photoURL,
        email_verified: firebaseUser.emailVerified,
      };

      // Authenticate with backend
      await apiRequest('POST', '/api/auth/google', { googleProfile });
      
      toast({
        title: "Success",
        description: "Signed in with Google successfully",
      });
      
      // Reload to update auth state
      window.location.reload();
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Error",
        description: "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleGoogleSignIn} 
      disabled={isLoading}
      variant="outline"
      className="w-full"
    >
      {isLoading ? "Signing in..." : "Continue with Google"}
    </Button>
  );
}