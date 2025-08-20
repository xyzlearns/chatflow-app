import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { CheckCircle, MessageCircle } from 'lucide-react';

export default function EmailVerified() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="text-white text-2xl" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">Email Verified!</CardTitle>
          <div className="flex justify-center mt-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Your email address has been successfully verified. You can now sign in to your account.
          </p>

          <Button 
            onClick={() => navigate('/')}
            className="w-full"
          >
            Continue to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}