import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { emailSignupSchema, emailLoginSchema } from '@shared/schema';
import type { EmailSignup, EmailLogin } from '@shared/schema';
import { Eye, EyeOff } from 'lucide-react';

export function EmailAuthForm() {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();

  const signupForm = useForm<EmailSignup>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    },
  });

  const loginForm = useForm<EmailLogin>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const forgotPasswordForm = useForm<{ email: string }>({
    resolver: zodResolver(emailLoginSchema.pick({ email: true })),
    defaultValues: { email: '' },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: EmailSignup) => {
      const response = await fetch('/api/auth/signup/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Account Created',
        description: data.message,
      });
      signupForm.reset();
      setIsSignup(false);
    },
    onError: (error) => {
      toast({
        title: 'Signup Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: EmailLogin) => {
      const response = await fetch('/api/auth/login/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: 'Login Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Reset Link Sent',
        description: data.message,
      });
      setShowForgotPassword(false);
      forgotPasswordForm.reset();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send reset link',
        variant: 'destructive',
      });
    },
  });

  if (showForgotPassword) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium">Reset Password</h3>
          <p className="text-sm text-gray-600 mt-1">
            Enter your email to receive a reset link
          </p>
        </div>
        
        <form onSubmit={forgotPasswordForm.handleSubmit((data) => forgotPasswordMutation.mutate(data))} className="space-y-4">
          <div>
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              {...forgotPasswordForm.register('email')}
              placeholder="Enter your email"
            />
            {forgotPasswordForm.formState.errors.email && (
              <p className="text-sm text-red-600 mt-1">
                {forgotPasswordForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={forgotPasswordMutation.isPending}
          >
            {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setShowForgotPassword(false)}
        >
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-1 text-sm">
        <button
          type="button"
          className={`px-4 py-2 rounded-md transition-colors ${
            !isSignup 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setIsSignup(false)}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-md transition-colors ${
            isSignup 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setIsSignup(true)}
        >
          Sign Up
        </button>
      </div>

      {isSignup ? (
        <form onSubmit={signupForm.handleSubmit((data) => signupMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...signupForm.register('firstName')}
                placeholder="John"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...signupForm.register('lastName')}
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              {...signupForm.register('email')}
              placeholder="john@example.com"
            />
            {signupForm.formState.errors.email && (
              <p className="text-sm text-red-600 mt-1">
                {signupForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                {...signupForm.register('password')}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {signupForm.formState.errors.password && (
              <p className="text-sm text-red-600 mt-1">
                {signupForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={signupMutation.isPending}
          >
            {signupMutation.isPending ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      ) : (
        <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              {...loginForm.register('email')}
              placeholder="john@example.com"
            />
            {loginForm.formState.errors.email && (
              <p className="text-sm text-red-600 mt-1">
                {loginForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                {...loginForm.register('password')}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {loginForm.formState.errors.password && (
              <p className="text-sm text-red-600 mt-1">
                {loginForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => setShowForgotPassword(true)}
          >
            Forgot your password?
          </Button>
        </form>
      )}
    </div>
  );
}