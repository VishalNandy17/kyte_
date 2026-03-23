import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import useStore from "../store/useStore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import {
  Github, CheckCircle2, AlertCircle, Loader2, X, Shield, LogOut, ExternalLink, Search, Send, MessageSquare, Plus, Users, User, Settings as SettingsIcon, Code, Trophy, DollarSign, Zap, ChevronRight
} from "lucide-react";
import confetti from "canvas-confetti";
import { useNavigate, Link } from "react-router-dom";
import ChatBox from "./ChatBox";
import WorkspaceModal from "./WorkspaceModal";
import WalletBalance from "./WalletBalance";
import { submitProject } from "../services/kyteApi";
import { createClaimTxn, signTransaction, getAlgodClient } from "../services/wallet";

// ─── Bid Modal ──────────────────────────────────────────────
function BidModal({ project, onClose, onRefresh }) {
  const [amount, setAmount] = useState(project.fiat_bounty_amount || 100);
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proposal.trim()) return alert("Please enter a proposal.");
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if already bid
    const { data: existing } = await supabase.from("bids")
      .select("id").eq("project_id", project.id).eq("developer_id", session.user.id).single();

    if (existing) {
      alert("You have already placed a bid on this project.");
      setLoading(false);
      return onClose();
    }

    const { data: bidData, error } = await supabase.functions.invoke("bid-engine", {
      body: {
        action: "submit_bid",
        data: {
          projectId: project.id,
          developerId: session.user.id,
          bidAmount: amount,
          proposalText: proposal
        }
      }
    });

    setLoading(false);
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Bid placed! The client will review your proposal.");
      onRefresh();
      onClose();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(20px)" }}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} 
        className="dash-glass"
        style={{ maxWidth: 540, width: "100%", padding: "3rem", position: "relative", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.03)", border: "none", color: "rgba(255,255,255,0.4)", borderRadius: "50%", width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <X size={20} />
        </button>

        <div className="dash-subtitle" style={{ marginBottom: "0.5rem" }}>
          <Plus size={14} className="animate-pulse" color="#66d3ff" /> PROPOSAL SUBMISSION
        </div>
        <h3 className="dash-title" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Submit Market Bid</h3>
        <p style={{ color: "rgba(102, 211, 255, 0.45)", fontSize: "0.95rem", marginBottom: "2.5rem", fontWeight: 600 }}>{project.title}</p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.4)", marginBottom: "0.6rem", textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bid Amount ($USD)</label>
            <input type="number" className="signin-input" value={amount} onChange={e => setAmount(e.target.value)} required min={10} style={{ fontSize: "1rem", background: 'rgba(255,255,255,0.02)', padding: '1rem' }} />
          </div>
          <div style={{ marginBottom: "2.5rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.4)", marginBottom: "0.6rem", textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cover Letter / Strategy</label>
            <textarea className="signin-input" value={proposal} onChange={e => setProposal(e.target.value)} required rows={4} placeholder="Why should the client trust your node for this execution?" style={{ resize: "vertical", fontSize: "0.95rem", background: 'rgba(255,255,255,0.02)', padding: '1rem' }} />
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%", padding: "1.1rem", fontSize: "1rem", fontWeight: 800, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }} disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            Commit Proposal
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Submission Modal ─────────────────────────────────────────
function SubmitModal({ project, geminiApiKey, onClose, onEval }) {
  const [githubUrl, setGithubUrl] = useState("");
  const [step, setStep] = useState("form"); // form | auditing
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!githubUrl.includes("github.com")) { setError("Please enter a valid GitHub URL."); return; }
    if (!geminiApiKey) { setError("Please enter your Gemini API Key."); return; }
    setStep("auditing");
    setError("");

    const { data: { session } } = await supabase.auth.getSession();

    try {
      const result = await submitProject(
        null,
          {
            projectId: project.id,
            githubUrl,
            appId: project.app_id,
            geminiApiKey,
            developerId: session?.user?.id,
            developerEmail: session?.user?.email
          },
          session?.user?.id
        );

      onEval(result);
      onClose();
    } catch (err) {
      setError(err.message || "Audit failed.");
      setStep("form");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(20px)" }}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} 
        className="dash-glass"
        style={{ maxWidth: 540, width: "100%", padding: "3rem", position: "relative", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.03)", border: "none", color: "rgba(255,255,255,0.4)", borderRadius: "50%", width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <X size={20} />
        </button>

        {step === "form" ? (
          <form onSubmit={handleSubmit}>
            <div className="dash-subtitle" style={{ marginBottom: "0.5rem" }}>
               <Shield size={14} className="animate-pulse" color="#66d3ff" /> PROTOCOL DELIVERY
            </div>
            <h3 className="dash-title" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Submit Evidence</h3>
            <p style={{ color: "rgba(102, 211, 255, 0.45)", fontSize: "0.95rem", marginBottom: "2.5rem", fontWeight: 600 }}>{project.title}</p>

            <div style={{ marginBottom: "2.5rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.4)", marginBottom: "0.6rem", textTransform: 'uppercase', letterSpacing: '0.1em' }}>GitHub Evidence URL</label>
              <div style={{ position: "relative" }}>
                <Github style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.35 }} size={20} />
                <input className="signin-input" placeholder="https://github.com/talent/repository"
                  value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                  style={{ paddingLeft: "3rem", fontSize: "1rem", background: 'rgba(255,255,255,0.02)', padding: '1rem 3rem' }} />
              </div>
            </div>

            {error && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "1.5rem", fontWeight: 600 }}>{error}</p>}

            <button type="submit" className="btn-primary" style={{ width: "100%", padding: "1.1rem", fontSize: "1.1rem", fontWeight: 800 }}>
              Initialize AI Audit
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 2.5rem' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid rgba(102, 211, 255, 0.1)', borderTopColor: '#66d3ff', animation: 'spin 1.s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 15, borderRadius: '50%', border: '4px solid rgba(117, 154, 255, 0.1)', borderBottomColor: '#759aff', animation: 'spin 1.5s linear infinite reverse' }} />
              <Shield size={32} color="#66d3ff" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            </div>
            <h3 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>Auditing Kernels…</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem", lineHeight: 1.6 }}>Fetching evidence from version control <br/>and running requirement cross-checks.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Evaluation Result Overlay ────────────────────────────────
function EvalOverlay({ evaluation, onClose }) {
  const passed = evaluation?.overall_score >= 80;
  useEffect(() => {
    if (passed) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#4ade80", "#66d3ff", "#fff"] });
  }, [passed]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.9)", zIndex: 201, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(30px)" }}>
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="dash-glass" 
        style={{ maxWidth: 840, width: "100%", padding: "4rem", position: "relative", boxShadow: "0 50px 120px rgba(0,0,0,0.9)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "2rem", right: "2rem", background: "rgba(255,255,255,0.03)", border: "none", color: "rgba(255,255,255,0.4)", borderRadius: "50%", width: 44, height: 44, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <X size={24} />
        </button>

        <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', marginBottom: "4rem" }}>
          <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
             <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r="64" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                <circle cx="70" cy="70" r="64" fill="none" stroke={passed ? "#4ade80" : "#f87171"} strokeWidth="12" 
                  strokeDasharray={402} strokeDashoffset={402 - (402 * evaluation.overall_score) / 100}
                  strokeLinecap="round" style={{ transition: 'all 1.5s ease' }}
                />
             </svg>
             <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: "2.5rem", fontWeight: 900, color: '#fff' }}>
                {evaluation.overall_score}
             </div>
          </div>
          <div>
            <div className="dash-subtitle" style={{ color: passed ? "#4ade80" : "#f87171" }}>
               {passed ? "PROTOCOL VALIDATED" : "PROTOCOL REJECTED"}
            </div>
            <h2 className="dash-title" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{passed ? "Audit Pass! 🎉" : "Audit Failure"}</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem", maxWidth: 400, lineHeight: 1.6 }}>
               {passed ? "Quality index exceeds network threshold. Smart-escrow release authorized." : "Submission fails to meet the cryptographically signed requirements."}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: "1.25rem", marginBottom: "3rem" }}>
          {(evaluation.results || []).map((res, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              key={i} 
              style={{ display: "flex", gap: "1.5rem", padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.03)", alignItems: "flex-start" }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: res.met ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 4 }}>
                {res.met ? <CheckCircle2 color="#4ade80" size={18} /> : <AlertCircle color="#f87171" size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", gap: "1.5rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "1.1rem", color: '#fff' }}>{res.requirement}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>WEIGHT</div>
                    <span style={{ fontSize: "1.2rem", fontWeight: 900, color: res.met ? "#4ade80" : "#f87171" }}>{res.score}</span>
                  </div>
                </div>
                <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>{res.reason}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {evaluation.gap_report && (
          <div style={{ padding: "2rem", background: "rgba(248,113,113,0.03)", borderRadius: 28, border: "1px solid rgba(248,113,113,0.1)", marginBottom: "3rem" }}>
            <h4 style={{ color: "#f87171", marginBottom: "0.75rem", fontSize: "1.1rem", textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Anomaly Gap Report</h4>
            <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "rgba(255,255,255,0.6)", margin: 0 }}>{evaluation.gap_report}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: "1.5rem" }}>
          <button className={passed ? "btn-primary" : "btn-secondary"} style={{ flex: 1, padding: '1.25rem', fontSize: '1.1rem', fontWeight: 800 }} onClick={onClose}>
            {passed ? "Protocol Finalized" : "Revise submission"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Developer Dashboard ──────────────────────────────────────
export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const { userProfile, walletAddress, logout } = useStore();
  const [googleUser, setGoogleUser] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [projects, setProjects] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userBids, setUserBids] = useState([]);
  
  const [submitProject, setSubmitProject] = useState(null); // For code submission
  const [bidProject, setBidProject] = useState(null); // For bidding on OPEN projects
  const [evaluation, setEvaluation] = useState(null);
  const [chatProject, setChatProject] = useState(null);
  const [workspaceProject, setWorkspaceProject] = useState(null);
  
  const [activeTab, setActiveTab] = useState("bounties"); // bounties | submissions

  const loadData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (activeTab === "bounties") {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .or(`status.eq.OPEN,and(status.eq.IN_PROGRESS,developer_id.eq.${session.user.id})`)
        .order("created_at", { ascending: false });
      setProjects(data || []);

      // Fetch user's bids
      const { data: bids } = await supabase
        .from("bids")
        .select("project_id")
        .eq("developer_id", session.user.id);
      setUserBids(bids || []);
    } else {
      const { data } = await supabase
        .from("submissions")
        .select("*, projects(title, status)")
        .eq("developer_id", session.user.id)
        .order("created_at", { ascending: false });
      setMySubmissions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setGoogleUser(user);
    });
  }, []);

  useEffect(() => { loadData(); }, [activeTab]);

  const filteredProjects = projects.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/signin');
  };

  const currentWallet = walletAddress || userProfile?.wallet_address;
  const formatAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'No Wallet Connected';
  const avatarUrl = userProfile?.avatar_url || googleUser?.user_metadata?.avatar_url || googleUser?.user_metadata?.picture;
  const userEmail = userProfile?.email || googleUser?.email;

  const handleEval = (data) => {
    setEvaluation(data?.evaluation_result || data);
    loadData(); // refresh list
  };

  const handleClaim = async (project) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // 1. Prepare Claim Txn
      const txns = await createClaimTxn(userProfile?.wallet_address, project.app_id);
      const signed = await signTransaction(txns);
      if (!signed) return;

      const client = getAlgodClient();
      await client.sendRawTransaction(signed).do();
      alert("Payment claimed successfully! The funds have been transferred to your wallet.");
      loadData();
    } catch (err) {
      alert("Failed to claim payment: " + err.message);
    }
  };

  const statusColor = (s) => ({ OPEN: "#66d3ff", IN_PROGRESS: "#fbbf24", COMPLETED: "#4ade80" }[s] || "#666");

  return (
    <div className="dash-layout">
      <Navbar />

      <main className="container" style={{ padding: "8rem 1rem 4rem", position: "relative", zIndex: 1 }}>
        
        {/* User Account Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
          
          <div className="dash-glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(74, 222, 128, 0.1)', display: 'grid', placeItems: 'center', border: '1px solid rgba(74, 222, 128, 0.2)', overflow: 'hidden' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={24} color="#4ade80" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.1rem' }}>{userProfile?.display_name || googleUser?.user_metadata?.full_name || 'Protocol Dev'}</h3>
              <p style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600, letterSpacing: '0.05em' }}>{formatAddress(currentWallet)}</p>
            </div>
            <Link to="/settings" className="dash-header-btn" style={{ padding: '0.6rem' }} title="Settings">
              <SettingsIcon size={18} />
            </Link>
          </div>

          <WalletBalance address={userProfile?.wallet_address} />

          <div className="dash-glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
             <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Network Reputation</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trophy size={14} color="#facc15" />
                  <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>Elite Developer</span>
                </div>
             </div>
             <button onClick={handleLogout} className="dash-header-btn" style={{ border: '1px solid rgba(248, 113, 113, 0.2)', color: '#f87171' }}>
               <LogOut size={16} />
             </button>
          </div>
        </div>

        {/* Portfolio Stats Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
          {[
            { label: 'Audit Pass Rate', value: '94%', icon: <Code size={20} />, color: '#66d3ff' },
            { label: 'Total Earned', value: '1,240 ALGO', icon: <DollarSign size={20} />, color: '#4ade80' },
            { label: 'Completed Jobs', value: '18', icon: <Trophy size={20} />, color: '#facc15' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="dash-glass" 
              style={{ padding: '1.5rem' }}
            >
              <div style={{ color: stat.color, marginBottom: '0.75rem' }}>{stat.icon}</div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>{stat.label}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Title & Actions Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", flexWrap: "wrap", gap: "1.5rem" }}
        >
          <div>
            <div className="dash-subtitle">
              <Zap size={14} className="animate-pulse" /> DEVELOPER WORKSPACE
            </div>
            <h1 className="dash-title">Bounty Hunter</h1>
          </div>
          
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Shield size={14} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
              <input 
                type="password" 
                placeholder="Gemini API Key" 
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
                style={{ 
                  padding: "0.7rem 1rem 0.7rem 2.4rem", 
                  borderRadius: "0.75rem", 
                  background: "rgba(255,255,255,0.03)", 
                  border: "1px solid rgba(102, 211, 255, 0.15)", 
                  color: "#fff", 
                  outline: "none", 
                  width: 240,
                  fontSize: "0.85rem",
                  transition: "border-color 0.2s"
                }} 
              />
            </div>
          </div>
        </motion.div>

        {/* Tabs Bar */}
        <div style={{ display: "flex", gap: "2rem", marginBottom: "3rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.1rem" }}>
          {["bounties", "submissions"].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              style={{ 
                background: "none", 
                border: "none", 
                cursor: "pointer", 
                fontSize: "1rem", 
                fontWeight: 700, 
                padding: "0.75rem 0.5rem",
                color: activeTab === tab ? "#66d3ff" : "rgba(255,255,255,0.35)",
                position: "relative",
                transition: "color 0.3s"
              }}
            >
              {tab === "bounties" ? "Project Market" : "My Submissions"}
              {activeTab === tab && (
                <motion.div 
                  layoutId="tab-underline"
                  style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: "#66d3ff", boxShadow: "0 0 10px #66d3ff" }} 
                />
              )}
            </button>
          ))}
        </div>

        {activeTab === "bounties" && (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ position: "relative", marginBottom: "3rem", maxWidth: 480 }}
            >
              <Search style={{ position: "absolute", left: "1.25rem", top: "50%", transform: "translateY(-50%)", color: "#66d3ff", opacity: 0.5 }} size={18} />
              <input 
                className="signin-input" 
                placeholder="Search premium bounties..." 
                value={search}
                onChange={e => setSearch(e.target.value)} 
                style={{ 
                  padding: "0.85rem 1rem 0.85rem 3rem", 
                  fontSize: "0.95rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "1rem"
                }} 
              />
            </motion.div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "4rem 0", color: "rgba(255,255,255,0.3)" }}>
                <Loader2 size={36} className="spin" style={{ margin: "0 auto 1rem" }} />
                <p>Loading market…</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 0", color: "rgba(255,255,255,0.25)" }}>
                <h3 style={{ marginBottom: "0.5rem" }}>No open projects</h3>
                <p style={{ fontSize: "0.9rem" }}>Check back later.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "2rem" }}>
                {filteredProjects.map((p, i) => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ y: -5 }}
                    className={`dash-glass dash-card-hover ${p.status === 'IN_PROGRESS' ? 'active-project-border' : ''}`}
                    style={{ padding: "2rem", display: "flex", flexDirection: "column", minHeight: "320px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <span className="dash-badge" style={{ color: statusColor(p.status), background: `${statusColor(p.status)}12` }}>
                        {p.status}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>REWARD</div>
                        <div style={{ fontWeight: 800, color: "#4ade80", fontSize: "1.1rem", textShadow: "0 0 15px rgba(74,222,128,0.2)" }}>
                          ${p.fiat_bounty_amount || p.payment_algo} USD
                        </div>
                      </div>
                    </div>

                    <h3 style={{ marginBottom: "0.75rem", fontSize: "1.2rem", fontWeight: 700 }}>{p.title}</h3>
                    <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", marginBottom: "1.75rem", flex: 1, lineHeight: "1.6" }}>
                      {p.description}
                    </p>

                    <div style={{ marginBottom: "1.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {(p.requirements || []).slice(0, 2).map((req, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(102, 211, 255, 0.1)", display: "grid", placeItems: "center" }}>
                            <Shield size={10} color="#66d3ff" />
                          </div>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{req}</span>
                        </div>
                      ))}
                      {(p.requirements || []).length > 2 && (
                        <div style={{ fontSize: "0.75rem", color: "#66d3ff", opacity: 0.6, paddingLeft: "1.5rem" }}>
                          +{(p.requirements || []).length - 2} more requirements
                        </div>
                      )}
                    </div>

                    {p.status === 'OPEN' ? (
                      userBids.some(b => b.project_id === p.id) ? (
                        <div style={{ padding: "1rem", background: "rgba(102, 211, 255, 0.05)", borderRadius: "0.75rem", textAlign: "center", border: "1px solid rgba(102, 211, 255, 0.1)" }}>
                          <span style={{ color: "#66d3ff", fontWeight: 700, fontSize: "0.9rem" }}>Proposal Pending...</span>
                        </div>
                      ) : (
                        <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setBidProject(p)}>
                          Place Proposal
                        </button>
                      )
                    ) : p.status === 'COMPLETED' ? (
                      <button className="btn-primary" style={{ width: "100%", justifyContent: "center", background: 'linear-gradient(135deg, #4ade80, #22c55e)' }} onClick={() => handleClaim(p)}>
                         Claim Payment
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <button className="btn-primary" style={{ flex: 1, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }} onClick={() => setSubmitProject(p)}>
                          <Github size={14} /> Submit
                        </button>
                        <button className="dash-header-btn" style={{ padding: "0 0.9rem" }} onClick={() => setWorkspaceProject(p)}>
                          <Users size={16} />
                        </button>
                        <button className="dash-header-btn" style={{ padding: "0 0.9rem" }} onClick={() => setChatProject(p)}>
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "submissions" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", padding: "4rem 0", color: "rgba(255,255,255,0.3)" }}>
                <Loader2 size={36} className="spin" />
              </div>
            ) : mySubmissions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 0", color: "rgba(255,255,255,0.25)" }}>
                <h3 style={{ marginBottom: "0.5rem" }}>No submissions yet</h3>
                <p style={{ fontSize: "0.9rem" }}>Your AI audit history will appear here.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {mySubmissions.map((sub, i) => (
                  <motion.div key={sub.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="glass-card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                       <h3 style={{ fontSize: "1.05rem", marginBottom: "0.2rem" }}>{sub.projects?.title || "Unknown Project"}</h3>
                       <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                         <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                         <a href={sub.github_url} target="_blank" rel="noreferrer" style={{ color: "#66d3ff", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                           <ExternalLink size={12} /> Repo
                         </a>
                       </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                       <div style={{ textAlign: "right" }}>
                         <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.2rem" }}>Score</div>
                         <div style={{ fontWeight: 800, fontSize: "1.2rem", color: sub.passed ? "#4ade80" : "#f87171" }}>{sub.score}/100</div>
                       </div>
                       <button className="btn-secondary" style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }} onClick={() => setEvaluation(sub.evaluation_result)}>
                         View Report
                       </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      <AnimatePresence>
        {bidProject && <BidModal project={bidProject} onClose={() => setBidProject(null)} onRefresh={loadData} />}
        {submitProject && (
          <SubmitModal project={submitProject} geminiApiKey={geminiApiKey}
            onClose={() => setSubmitProject(null)}
            onEval={result => { setSubmitProject(null); handleEval(result); }} />
        )}
        {evaluation && <EvalOverlay evaluation={evaluation} onClose={() => setEvaluation(null)} />}
        {chatProject && <ChatBox project={chatProject} onClose={() => setChatProject(null)} />}
        {workspaceProject && <WorkspaceModal project={workspaceProject} onClose={() => setWorkspaceProject(null)} />}
      </AnimatePresence>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
