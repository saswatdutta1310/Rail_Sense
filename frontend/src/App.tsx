import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DelayPredictor from './pages/DelayPredictor';
import PlatformGuard from './pages/PlatformGuard';
import TrackInspector from './pages/TrackInspector';
import CitizenApp from './pages/CitizenApp';
import ImpactDashboard from './pages/ImpactDashboard';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/delay" element={<DelayPredictor />} />
          <Route path="/platform" element={<PlatformGuard />} />
          <Route path="/track" element={<TrackInspector />} />
          <Route path="/citizen" element={<CitizenApp />} />
          <Route path="/impact" element={<ImpactDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
