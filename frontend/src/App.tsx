import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DelayPredictor from './pages/DelayPredictor';
import PlatformGuard from './pages/PlatformGuard';
import TrackInspector from './pages/TrackInspector';
import CitizenApp from './pages/CitizenApp';
import ImpactDashboard from './pages/ImpactDashboard';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/delay" element={
            <ProtectedRoute>
              <Layout>
                <DelayPredictor />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/platform" element={
            <ProtectedRoute>
              <Layout>
                <PlatformGuard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/track" element={
            <ProtectedRoute>
              <Layout>
                <TrackInspector />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/impact" element={
            <ProtectedRoute>
              <Layout>
                <ImpactDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/citizen" element={
            <ProtectedRoute>
              <Layout>
                <CitizenApp />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
