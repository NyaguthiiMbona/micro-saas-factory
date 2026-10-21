import React from 'react';
import { AdSlot } from './AdSlot';

interface ToolLayoutProps {
  title: string;
  description: string;
  category: string;
  children: React.ReactNode;
}

export const ToolLayout: React.FC<ToolLayoutProps> = ({
  title,
  description,
  category,
  children,
}) => {
  // Schema.org WebApplication JSON-LD for rich snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    description: description,
    applicationCategory: category,
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
        {/* Navigation Header */}
        <header className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-tight text-indigo-600">{title}</h1>
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full font-medium">
              Free Utility
            </span>
          </div>
        </header>

        {/* Top Monetization Slot */}
        <div className="max-w-6xl mx-auto px-4 w-full">
          <AdSlot position="top" />
        </div>

        {/* Main Utility Workspace */}
        <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <p className="text-gray-600 mt-1">{description}</p>
            </div>
            
            {/* The dynamically generated Tool Workspace */}
            {children}
          </div>

          {/* Sidebar Monetization / Quick Info */}
          <aside className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="font-medium text-sm text-gray-700 mb-2">How to use</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Paste or enter your input into the provided field. The result will generate automatically. 100% client-side and secure.
              </p>
            </div>
            <AdSlot position="sidebar" />
          </aside>
        </main>

        {/* Bottom Monetization Slot */}
        <div className="max-w-6xl mx-auto px-4 w-full">
          <AdSlot position="bottom" />
        </div>

        {/* Footer */}
        <footer className="bg-white border-t mt-12 py-6 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Automated Micro-SaaS Network. Fast, Private & Free Utilities.</p>
        </footer>
      </div>
    </>
  );
};
