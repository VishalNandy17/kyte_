import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import useStore from "../store/useStore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import {
  Github, CheckCircle2, AlertCircle, Loader2, X, Shield, LogOut, ExternalLink, Search, Send, MessageSquare
} from "lucide-react";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import ChatBox from "./ChatBox";

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

    const { error } = await supabase.from("bids").insert({
      project_id: project.id,
      developer_id: session.user.id,
      bid_amount: amount,
      proposal_text: proposal
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
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.92)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(12px)" }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card"
        style={{ maxWidth: 520, width: "100%", padding: "2.5rem", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
          <X size={20} />
        </button>
        <h3 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.25rem" }}>Submit Bid</h3>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>{project.title}</p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.4rem" }}>Bid Amount ($USD)</label>
            <input type="number" className="signin-input" value={amount} onChange={e => setAmount(e.target.value)} required min={10} style={{ fontSize: "0.9rem" }} />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.4rem" }}>Cover Letter / Proposal</label>
            <textarea className="signin-input" value={proposal} onChange={e => setProposal(e.target.value)} required rows={4} placeholder="Why should the client hire you?" style={{ resize: "vertical", fontSize: "0.9rem" }} />
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            Place Bid
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

    const { data, error: fnErr } = await supabase.functions.invoke("gemini-audit", {
      body: {
        action: "submit",
        geminiApiKey,
        data: {
           projectId: project.id,
           githubUrl,
           developerId: session?.user?.id,
           developerEmail: session?.user?.email
        }
      }
    });

    if (fnErr || data?.error) {
      setError(data?.error || fnErr?.message || "Audit failed.");
      setStep("form");
      return;
    }

    onEval(data);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.92)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(12px)" }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card"
        style={{ maxWidth: 520, width: "100%", padding: "2.5rem", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
          <X size={20} />
        </button>

        {step === "form" ? (
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(102,211,255,0.1)", display: "grid", placeItems: "center" }}>
                <Github size={20} color="#66d3ff" />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Submit Code</h3>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>{project.title}</p>
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.4rem" }}>GitHub Repository URL</label>
              <div style={{ position: "relative" }}>
                <Github style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.35 }} size={16} />
                <input className="signin-input" placeholder="https://github.com/you/project"
                  value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                  style={{ paddingLeft: "2.5rem", fontSize: "0.9rem" }} />
              </div>
            </div>

            {error && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}

            <button type="submit" className="btn-primary" style={{ width: "100%" }}>
              Submit for AI Audit
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <Loader2 size={48} color="#66d3ff" className="spin" style={{ margin: "0 auto 1.5rem" }} />
            <h3 style={{ marginBottom: "0.5rem" }}>Gemini AI Auditing…</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Fetching repo &amp; scanning requirements</p>
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
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.95)", zIndex: 201, display: "grid", placeItems: "center", padding: "2rem", overflowY: "auto" }}>
      <div className="glass-card" style={{ maxWidth: 700, width: "100%", padding: "3rem", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
          <X size={22} />
        </button>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ width: 110, height: 110, borderRadius: "50%", border: `8px solid ${passed ? "#4ade80" : "#f87171"}`, display: "grid", placeItems: "center", margin: "0 auto 1.5rem", fontSize: "2.2rem", fontWeight: 900 }}>
            {evaluation.overall_score}
          </div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>{passed ? "Audit Passed! 🎉" : "Audit Failed"}</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "0.5rem" }}>
            {passed ? "Your submission passed AI verification!" : "Requirements were not fully met."}
          </p>
        </div>

        <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
          {(evaluation.results || []).map((res, i) => (
            <div key={i} style={{ display: "flex", gap: "1rem", padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: 12, alignItems: "flex-start" }}>
              {res.met ? <CheckCircle2 color="#4ade80" size={18} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertCircle color="#f87171" size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{res.requirement}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: res.met ? "#4ade80" : "#f87171" }}>{res.score}/100</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>{res.reason}</p>
              </div>
            </div>
          ))}
        </div>

        {evaluation.gap_report && (
          <div style={{ padding: "1.25rem", background: "rgba(248,113,113,0.08)", borderRadius: 12, border: "1px solid rgba(248,113,113,0.2)", marginBottom: "2rem" }}>
            <h4 style={{ color: "#f87171", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Gap Report</h4>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>{evaluation.gap_report}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem" }}>
          <button className={passed ? "btn-primary" : "btn-secondary"} style={{ flex: 1 }} onClick={onClose}>
            {passed ? "Done" : "Revise & Resubmit"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Developer Dashboard ──────────────────────────────────────
export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [projects, setProjects] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [submitProject, setSubmitProject] = useState(null); // For code submission
  const [bidProject, setBidProject] = useState(null); // For bidding on OPEN projects
  const [evaluation, setEvaluation] = useState(null);
  const [chatProject, setChatProject] = useState(null);
  
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

  useEffect(() => { loadData(); }, [activeTab]);

  const filteredProjects = projects.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  const handleEval = (data) => {
    setEvaluation(data?.evaluation_result || data);
    loadData(); // refresh list
  };

  const statusColor = (s) => ({ OPEN: "#66d3ff", IN_PROGRESS: "#fbbf24", COMPLETED: "#4ade80" }[s] || "#666");

  return (
    <div style={{ minHeight: "100vh", background: "#060912", color: "#fff" }}>
      <Navbar />

      <main className="container" style={{ padding: "8rem 1rem 4rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ color: "#4ade80", fontSize: "0.85rem", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>DEVELOPER DASHBOARD</p>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900 }}>Bounty Hunter</h1>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <input type="password" placeholder="Gemini API Key" value={geminiApiKey}
              onChange={e => setGeminiApiKey(e.target.value)}
              style={{ padding: "0.55rem 1rem", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", width: 220 }} />
            <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "0.55rem 1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1rem" }}>
          <button onClick={() => setActiveTab("bounties")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.05rem", fontWeight: 700, color: activeTab === "bounties" ? "#fff" : "rgba(255,255,255,0.4)" }}>
            Bounties Market
          </button>
          <button onClick={() => setActiveTab("submissions")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.05rem", fontWeight: 700, color: activeTab === "submissions" ? "#fff" : "rgba(255,255,255,0.4)" }}>
            My Submissions
          </button>
        </div>

        {activeTab === "bounties" && (
          <>
            <div style={{ position: "relative", marginBottom: "2.5rem", maxWidth: 440 }}>
              <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.35 }} size={16} />
              <input className="signin-input" placeholder="Search projects…" value={search}
                onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "2.5rem", fontSize: "0.9rem" }} />
            </div>

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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
                {filteredProjects.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", border: p.status === 'IN_PROGRESS' ? '1px solid rgba(251, 191, 36, 0.3)' : undefined }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "0.72rem", padding: "0.22rem 0.65rem", borderRadius: 4, background: `${statusColor(p.status)}20`, color: statusColor(p.status), fontWeight: 700 }}>{p.status}</span>
                      <span style={{ fontWeight: 800, color: "#4ade80", fontSize: "1rem" }}>${p.fiat_bounty_amount || p.payment_algo} USD</span>
                    </div>

                    <h3 style={{ marginBottom: "0.4rem", fontSize: "1.05rem" }}>{p.title}</h3>
                    <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.45)", marginBottom: "1.25rem", flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>

                    <div style={{ marginBottom: "1.25rem" }}>
                      {(p.requirements || []).slice(0, 3).map((req, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem" }}>
                          <Shield size={11} color="#66d3ff" />
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90%" }}>{req}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", marginBottom: "1.25rem" }}>
                      Score threshold: {p.score_threshold || 80}%
                    </div>

                    {p.status === 'OPEN' ? (
                      <button className="btn-secondary" style={{ width: "100%", fontSize: "0.85rem" }} onClick={() => setBidProject(p)}>
                        Submit Bid
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn-primary" style={{ flex: 1, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }} onClick={() => setSubmitProject(p)}>
                          <Github size={14} /> Submit Code (Escrow Locked)
                        </button>
                        <button className="btn-secondary" style={{ padding: "0 1rem", display: "grid", placeItems: "center" }}
                          onClick={() => setChatProject(p)}>
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
      </AnimatePresence>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
