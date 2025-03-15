import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import theme from './theme';

// Layout
import MainLayout from './layouts/MainLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ProjectOverview from './pages/ProjectOverview';
import DataModeler from './pages/DataModeler';
import WorkflowBuilder from './pages/WorkflowBuilder';
import ConversationBuilder from './pages/ConversationBuilder';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Templates from './pages/Templates';
import DeploymentPage from './pages/DeploymentPage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <AuthProvider>
          <ProjectProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="templates" element={<Templates />} />
                  <Route path="projects/:projectId" element={<ProjectOverview />} />
                  <Route path="projects/:projectId/data-modeler" element={<DataModeler />} />
                  <Route path="projects/:projectId/workflow-builder" element={<WorkflowBuilder />} />
                  <Route path="projects/:projectId/conversation-builder" element={<ConversationBuilder />} />
                  <Route path="projects/:projectId/settings" element={<Settings />} />
                  <Route path="projects/:projectId/analytics" element={<Analytics />} />
                  <Route path="projects/:projectId/deploy" element={<DeploymentPage />} />
                </Route>
              </Routes>
            </Router>
          </ProjectProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
