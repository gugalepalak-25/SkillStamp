import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WalletProvider } from "./hooks/useWallet";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Passport from "./pages/Passport";
import Issue from "./pages/Issue";
import Verify from "./pages/Verify";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import Opportunities from "./pages/Opportunities";
import Assistant from "./pages/Assistant";
import Skills from "./pages/Skills";
import SkillDetail from "./pages/SkillDetail";
import Evidence from "./pages/Evidence";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/evidence" element={<Evidence />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/passport/:address" element={<Passport />} />
            <Route path="/issue" element={<Issue />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/verify/:credentialId" element={<Verify />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/skills/:skill" element={<SkillDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<p>Page not found.</p>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
