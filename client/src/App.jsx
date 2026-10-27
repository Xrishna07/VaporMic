import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Listen from './pages/Listen';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
        <Header />

        <main className="flex-1 flex flex-col items-center justify-center">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/listen/:id" element={<Listen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-zinc-900 bg-zinc-950/60 py-4 px-6 text-center text-xs text-zinc-600">
          <p>© {new Date().getFullYear()} VaporMic • Ephemeral, zero-knowledge voice notes.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
