'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpStep } from '@/components/verification/OtpStep';
import { SelfieStep } from '@/components/verification/SelfieStep';
import { SuccessStep } from '@/components/verification/SuccessStep';

type Step = 'intro' | 'otp' | 'selfie' | 'success';

export default function VerifyPage() {
  const [step, setStep] = useState<Step>('intro');
  const router = useRouter();

  const steps: Step[] = ['intro', 'otp', 'selfie', 'success'];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= stepIndex ? 'bg-brand-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {step === 'intro' && (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-3">Verify your identity</h2>
            <p className="text-gray-600 mb-2">Verified uses a two-step process to keep the community safe:</p>
            <ol className="text-left space-y-3 my-6 text-gray-700">
              <li className="flex gap-3"><span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">1</span><span><strong>Email code</strong> — confirms your email address is real</span></li>
              <li className="flex gap-3"><span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">2</span><span><strong>Selfie check</strong> — confirms you are a real person, not a stock photo</span></li>
            </ol>
            <p className="text-xs text-gray-500 mb-6">We do not collect government IDs. Your selfie is only used to verify your profile photos and is never shared.</p>
            <button className="btn-primary w-full" onClick={() => setStep('otp')}>
              Get Started
            </button>
          </div>
        )}

        {step === 'otp' && <OtpStep onComplete={() => setStep('selfie')} />}
        {step === 'selfie' && <SelfieStep onComplete={() => setStep('success')} />}
        {step === 'success' && <SuccessStep onComplete={() => router.push('/onboarding')} />}
      </div>
    </div>
  );
}
