import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import ClientPage from './pages/ClientPage';
import HostPage from './pages/HostPage';
import LandingPage from './pages/LandingPage';

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background-tertiary text-text-primary font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35 }}
        >
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/host" element={<HostPage />} />
            <Route path="/client" element={<ClientPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;
