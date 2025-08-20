import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { resetPasswordSchema } from '@/types/schema';
import type { ResetPassword } from '@/types/schema';
import { useLocation } from 'wouter';
import { Eye, EyeOff, MessageCircle } from 'lucide-react';

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<ResetPassword & { confirmPassword: string }>({
    resolver: zodResolver(resetPasswordSchema.extend({
      confirmPassword: resetPasswordSchema.shape.password,
    }).refine(data => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    })),
    defaultValues: {
      token: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      form.setValue('token', tokenParam);
    } else {
      toast({
        title: 'Invalid Reset Link',
        description: 'No reset token found in the URL.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [form, navigate, toast]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPassword) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Reset failed');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been reset. You can now sign in with your new password.',
      });
      navigate('/');
    },
    onError: (error) => {
      toast({
        title: 'Reset Failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: ResetPassword & { confirmPassword: string }) => {
    resetPasswordMutation.mutate({
      token: data.token,
      password: data.password,
    });
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="text-white text-2xl" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">Reset Password</CardTitle>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('password')}
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
              {form.formState.errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...form.register('confirmPassword')}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-sm"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}