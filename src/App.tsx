import React, { useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { Sidebar, TabType } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Locations } from './pages/Locations';
import { Security } from './pages/Security';
import { Statistics } from './pages/Statistics';
import { Diagnostics } from './pages/Diagnostics';
import { Settings } from './pages/Settings';
import { VpnProvider } from './context/VpnContext';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-white overflow-hidden">
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        <main className="flex-1 overflow-y-auto bg-[#0F172A]/40">
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigateToLocations={() => setCurrentTab('locations')}
              onNavigateToSecurity={() => setCurrentTab('security')}
              onNavigateToDiagnostics={() => setCurrentTab('diagnostics')}
            />
          )}

          {currentTab === 'locations' && (
            <Locations
              onSelectServer={() => {
                setCurrentTab('dashboard');
              }}
            />
          )}

          {currentTab === 'security' && <Security />}

          {currentTab === 'statistics' && <Statistics />}

          {currentTab === 'diagnostics' && <Diagnostics />}

          {currentTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <VpnProvider>
      <AppContent />
    </VpnProvider>
  );
};

export default App;
