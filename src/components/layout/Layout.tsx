import type { ReactNode } from 'react';
import { Header } from './Header.tsx';
import { Footer } from './Footer.tsx';
import type { AppStep } from '../../lib/store/app-store.ts';

interface LayoutProps {
  children: ReactNode;
  currentStep: AppStep;
}

export function Layout({ children, currentStep }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-warm-white dark:bg-dark-bg transition-colors">
      <Header currentStep={currentStep} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
