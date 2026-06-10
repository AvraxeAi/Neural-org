import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/system/ErrorBoundary';
import { AuthGate, AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate>
          <ProjectProvider>
            <App />
          </ProjectProvider>
        </AuthGate>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
