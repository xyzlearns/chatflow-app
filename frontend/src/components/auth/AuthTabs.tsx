import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailAuthForm } from '@/components/auth/EmailAuthForm';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { MessageCircle } from 'lucide-react';

export function AuthTabs() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="text-white text-2xl" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">ChatFlow</CardTitle>
          <p className="text-gray-600 mt-2">Connect with friends instantly</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Google Auth Button */}
          <GoogleAuthButton />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or continue with</span>
            </div>
          </div>

          {/* Auth Methods Tabs */}
          <EmailAuthForm />
        </CardContent>
      </Card>
    </div>
  );
}