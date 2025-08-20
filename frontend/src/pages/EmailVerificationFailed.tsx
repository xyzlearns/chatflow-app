import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { XCircle, MessageCircle } from 'lucide-react';

export default function EmailVerificationFailed() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="text-white text-2xl" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">Verification Failed</CardTitle>
          <div className="flex justify-center mt-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            The email verification link is invalid or has expired. Please try signing up again or contact support.
          </p>

          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Try Again
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.location.href = 'mailto:support@chatflow.com'}
              className="w-full"
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}