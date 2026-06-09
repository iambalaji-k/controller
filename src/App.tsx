import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ToastManager } from './components/ToastManager';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TrainingPage } from './pages/TrainingPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { ProfilePage } from './pages/ProfilePage';

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('landing');

  // Render active page based on current routing state
  const renderPage = () => {
    switch (activePage) {
      case 'landing':
        return <LandingPage onEnter={() => setActivePage('dashboard')} />;
      case 'dashboard':
        return <DashboardPage setActivePage={setActivePage} />;
      case 'training':
        return <TrainingPage />;
      case 'achievements':
        return <AchievementsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <LandingPage onEnter={() => setActivePage('dashboard')} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 selection:bg-brand-purple/30 selection:text-white">
      {/* Navigation Header & Sidebar / Bottom bar */}
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      {/* Main Content Area */}
      <main 
        className={`flex-1 transition-all duration-300 ${
          activePage === 'landing' 
            ? 'w-full' 
            : 'w-full md:pl-64 px-4 md:px-8 py-6 pb-20 md:pb-8'
        }`}
      >
        <div className="mx-auto max-w-7xl">
          {renderPage()}
        </div>
      </main>

      {/* Overlay global notifications */}
      <ToastManager />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
