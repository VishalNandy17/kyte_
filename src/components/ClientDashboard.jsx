import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import useStore from "../store/useStore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import {
  Zap, Shield, Plus, X, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, LogOut, MessageSquare
} from "lucide-react";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import ChatBox from "./ChatBox";

// ─── Create Project Modal ──────────────────────────────────────
function CreateProjectModal({ onClose, onCreated, geminiApiKey }) {
  const { userProfile } = useStore();
  const [step, setStep] = useState("form"); // form | creating | done
  const [form, setForm] = useState({
    title: "", description: "", requirements: "", fiat_bounty_amount: 100, score_threshold: 80
  });
  const [error, setError] = useState("");
  const [createdProject, setCreatedProject] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.requirements) { setError("Title and requirements are required."); return; }
    if (!geminiApiKey) { setError("Please enter your Gemini API Key."); return; }
    setStep("creating");
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    const reqs = form.requirements.split("\n").map(r => r.trim()).filter(Boolean);

    const { data, error: fnError } = await supabase.functions.invoke("gemini-audit", {
      body: {
        action: "create",
        geminiApiKey,
        data: {
          title: form.title,
          description: form.description,
          requirements: reqs,
          fiat_bounty_amount: parseFloat(form.fiat_bounty_amount),
          score_threshold: parseInt(form.score_threshold),
          wallet_address: userProfile?.wallet_address || session?.user?.email || "unknown",
          owner_id: session?.user?.id,
        }
      }
    });

    if (fnError || data?.error) {
      setError(data?.error || fnError?.message || "Failed to create project.");
      setStep("form");
      return;
    }

    setCreatedProject(data);
    setStep("done");
    onCreated(data);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ["#66d3ff", "#759aff", "#fff"] });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.92)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass-card"
        style={{ maxWidth: 580, width: "100%", padding: "2.5rem", position: "relative" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
          <X size={20} />
        </button>

        {step === "form" && (
          <form onSubmit={handleCreate}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>Post New Project</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "2rem", fontSize: "0.9rem" }}>Lock funds in escrow and let the AI enforce delivery.</p>

            {[
              { label: "Project Title *", key: "title", placeholder: "e.g. Algorand Smart Contract Audit" },
              { label: "Description", key: "description", placeholder: "What needs to be built or audited?", multiline: true },
              { label: "Requirements (one per line) *", key: "requirements", placeholder: "Check for reentrancy\nVerify auth on admin calls\nMax 500 lines", multiline: true },
            ].map(({ label, key, placeholder, multiline }) => (
              <div key={key} style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.4rem" }}>{label}</label>
                {multiline
                  ? <textarea className="signin-input" placeholder={placeholder} rows={4} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ resize: "vertical", fontSize: "0.9rem" }} />
                  : <input className="signin-input" placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ fontSize: "0.9rem" }} />
                }
              </div>
            ))}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.4rem" }}>Budget ($USD)</label>
                <input type="number" className="signin-input" value={form.fiat_bounty_amount} min={10} step={1}
                  onChange={e => setForm(f => ({ ...f, fiat_bounty_amount: e.target.value }))} style={{ fontSize: "0.9rem" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.4rem" }}>Score Threshold (%)</label>
                <input type="number" className="signin-input" value={form.score_threshold} min={0} max={100}
                  onChange={e => setForm(f => ({ ...f, score_threshold: e.target.value }))} style={{ fontSize: "0.9rem" }} />
              </div>
            </div>

            {error && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}

            <button type="submit" className="btn-primary" style={{ width: "100%" }}>
              <Zap size={16} /> Post Project
            </button>
          </form>
        )}

        {step === "creating" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <Loader2 size={48} color="#66d3ff" style={{ animation: "spin 1s linear infinite", margin: "0 auto 1.5rem" }} />
            <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Creating Project…</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Saving to database and initializing escrow.</p>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <CheckCircle2 size={56} color="#4ade80" style={{ margin: "0 auto 1.5rem" }} />
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Project Created!</h3>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "2rem" }}>Your project is now live and open for developers.</p>
            <button className="btn-primary" style={{ width: "100%" }} onClick={onClose}>Go to Dashboard</button>
          </div>
        )}
      </motion.div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </motion.div>
  );
}

// ─── Evaluation Overlay ──────────────────────────────────────
function EvalOverlay({ evaluation, onClose }) {
  const passed = evaluation?.overall_score >= 80;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
          <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "0.5rem" }}>{passed ? "Payment will be released to developer." : "Requirements were not fully met."}</p>
        </div>

        <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
          {(evaluation.results || []).map((res, i) => (
            <div key={i} style={{ display: "flex", gap: "1rem", padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: 12, alignItems: "flex-start" }}>
              {res.met ? <CheckCircle2 color="#4ade80" size={18} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertCircle color="#f87171" size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem", gap: "1rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{res.requirement}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: res.met ? "#4ade80" : "#f87171", flexShrink: 0 }}>{res.score}/100</span>
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

        <button className={passed ? "btn-primary" : "btn-secondary"} style={{ width: "100%" }} onClick={onClose}>
          {passed ? "Close & Collect" : "Close"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Submissions Modal ─────────────────────────────────────────
function SubmissionsModal({ project, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      if (!error && data) setSubmissions(data);
      setLoading(false);
    }
    load();
  }, [project.id]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.92)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(12px)" }}>
        <div className="glass-card" style={{ maxWidth: 600, width: "100%", padding: "2rem", position: "relative", maxHeight: "85vh", overflowY: "auto" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
            <X size={20} />
          </button>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>Submissions: {project.title}</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "2rem", fontSize: "0.9rem" }}>Review developer submissions and AI audit scores.</p>

          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "rgba(255,255,255,0.3)" }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
              <p>Loading submissions…</p>
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.95rem" }}>No submissions yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {submissions.map(sub => (
                <div key={sub.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: 4, background: sub.passed ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", color: sub.passed ? "#4ade80" : "#f87171", fontWeight: 700, marginRight: "0.75rem" }}>
                        {sub.passed ? "PASSED" : "FAILED"}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
                        {new Date(sub.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: "1.1rem", color: sub.passed ? "#4ade80" : "#f87171" }}>
                      {sub.score}/100
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>Developer ID: </span> {sub.developer_id.substring(0, 8)}...
                  </div>
                  <a href={sub.github_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#66d3ff", fontSize: "0.85rem", textDecoration: "none", marginBottom: "1rem" }}>
                    <ExternalLink size={14} /> {sub.github_url}
                  </a>
                  <button className="btn-secondary" style={{ width: "100%", fontSize: "0.8rem", padding: "0.6rem" }} onClick={() => setEvaluation(sub.evaluation_result)}>
                    View AI Audit Report
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
      <AnimatePresence>
        {evaluation && <EvalOverlay evaluation={evaluation} onClose={() => setEvaluation(null)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Bids Modal ───────────────────────────────────────────────
const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

function BidsModal({ project, onClose, onRefresh }) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("bids")
        .select("*, developer:developer_id(id)")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });
      if (!error && data) setBids(data);
      setLoading(false);
    }
    load();
  }, [project.id]);

  const handleAcceptBid = async (bid) => {
    setLoading(true);
    const scriptLoaded = await loadRazorpay();
    if (!scriptLoaded) {
      alert("Failed to load Razorpay SDK. Check connection.");
      setLoading(false);
      return;
    }

    // 1. Create order
    const { data: orderData, error: orderErr } = await supabase.functions.invoke("razorpay-checkout", {
      body: { action: "create_order", bidId: bid.id }
    });

    if (orderErr || orderData?.error) {
      alert(orderData?.error || orderErr?.message || "Failed to create order.");
      setLoading(false);
      return;
    }

    const { order_id, amount, currency, key } = orderData;

    // 2. Open Razorpay Checkout overlay
    const options = {
      key,
      amount,
      currency,
      name: "KYTE Escrow",
      description: `Fund Project: ${project.title}`,
      order_id,
      handler: async function (response) {
        // 3. Verify Payment
        const { data: verifyData, error: verifyErr } = await supabase.functions.invoke("razorpay-checkout", {
          body: {
            action: "verify_payment",
            bidId: bid.id,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature
          }
        });

        if (verifyErr || verifyData?.error) {
          alert("Payment Verification Failed! " + (verifyData?.error || verifyErr?.message));
        } else {
          alert("Payment Successful! Developer is now hired and funds are locked in Escrow.");
          onRefresh();
          onClose();
        }
      },
      theme: { color: "#66d3ff" }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response){
      alert("Payment Failed: " + response.error.description);
    });
    rzp.open();
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.92)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(12px)" }}>
      <div className="glass-card" style={{ maxWidth: 600, width: "100%", padding: "2rem", position: "relative", maxHeight: "85vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
          <X size={20} />
        </button>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>Bids: {project.title}</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "2rem", fontSize: "0.9rem" }}>Review developer proposals and set your Escrow.</p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "rgba(255,255,255,0.3)" }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
          </div>
        ) : bids.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 0", background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.95rem" }}>No bids yet. Developers are taking a look.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {bids.map(bid => (
              <div key={bid.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "1.25rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 4 }}>
                      Dev: {bid.developer_id.substring(0, 8)}...
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                      {new Date(bid.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#4ade80" }}>
                    ${bid.bid_amount}
                  </span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: 8, fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", marginBottom: "1rem" }}>
                  "{bid.proposal_text}"
                </div>
                {bid.status === "PENDING" && (
                  <button className="btn-primary" style={{ width: "100%", fontSize: "0.85rem", padding: "0.6rem" }} onClick={() => handleAcceptBid(bid)} disabled={loading}>
                    {loading ? <Loader2 size={16} className="spin" /> : "Accept & Pay via Razorpay"}
                  </button>
                )}
                {bid.status === "ACCEPTED" && (
                  <button className="btn-secondary" style={{ width: "100%", fontSize: "0.85rem", padding: "0.6rem", opacity: 0.5 }} disabled>
                    Bid Accepted
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Client Dashboard ─────────────────────────────────────────
export default function ClientDashboard() {
  const { userProfile } = useStore();
  const navigate = useNavigate();
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProjectSubs, setSelectedProjectSubs] = useState(null);
  const [selectedProjectBids, setSelectedProjectBids] = useState(null);
  const [chatProject, setChatProject] = useState(null);

  const loadProjects = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  // Fetch this client's projects
  useEffect(() => {
    loadProjects();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  const statusColor = (s) => ({ OPEN: "#66d3ff", IN_REVIEW: "#fbbf24", COMPLETED: "#4ade80", DISPUTED: "#f87171" }[s] || "#666");

  return (
    <div style={{ minHeight: "100vh", background: "#060912", color: "#fff" }}>
      <Navbar />

      <main className="container" style={{ padding: "8rem 1rem 4rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ color: "#66d3ff", fontSize: "0.85rem", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>CLIENT DASHBOARD</p>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900 }}>My Projects</h1>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <input type="password" placeholder="Gemini API Key" value={geminiApiKey}
              onChange={e => setGeminiApiKey(e.target.value)}
              style={{ padding: "0.55rem 1rem", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", width: 220 }} />
            <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Post Project
            </button>
            <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "0.55rem 1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "rgba(255,255,255,0.3)" }}>
            <Loader2 size={36} style={{ animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
            <p>Loading projects…</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {/* Create card */}
            <motion.div whileHover={{ y: -4 }} className="glass-card"
              style={{ padding: "2rem", border: "1px dashed rgba(102,211,255,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", cursor: "pointer", minHeight: 200 }}
              onClick={() => setShowCreate(true)}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(102,211,255,0.1)", display: "grid", placeItems: "center", marginBottom: "1rem" }}>
                <Plus size={22} color="#66d3ff" />
              </div>
              <h3>Post New Project</h3>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>Lock funds in escrow &amp; set AI requirements</p>
            </motion.div>

            {projects.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass-card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: 4, background: `${statusColor(p.status)}18`, color: statusColor(p.status), fontWeight: 700 }}>{p.status}</span>
                  <span style={{ fontWeight: 800, color: "#4ade80", fontSize: "0.95rem" }}>${p.fiat_bounty_amount || p.payment_algo} USD</span>
                </div>
                <h3 style={{ marginBottom: "0.4rem", fontSize: "1.05rem" }}>{p.title}</h3>
                <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.45)", marginBottom: "1.25rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>

                {/* Requirements count */}
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <Shield size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                    {(p.requirements || []).length} requirement{(p.requirements || []).length !== 1 ? "s" : ""}
                  </span>
                  <span>Threshold {p.score_threshold}%</span>
                </div>

                <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                     Submissions: <span style={{ color: "#fff", fontWeight: 700 }}>{p.submission_count || 0}</span>
                   </div>
                   {p.best_score > 0 && (
                     <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                       Best Score: <span style={{ color: p.best_score >= p.score_threshold ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>{p.best_score}/100</span>
                     </div>
                   )}
                </div>

                {p.status === 'OPEN' ? (
                  <button className="btn-secondary" style={{ width: "100%", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                    onClick={() => setSelectedProjectBids(p)}>
                    Review Bids
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn-secondary" style={{ flex: 1, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                      onClick={() => setSelectedProjectSubs(p)}>
                      View Submissions
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
      </main>

      <Footer />

      {/* Modals */}
      <AnimatePresence>
        {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={p => { setShowCreate(false); loadProjects(); }} geminiApiKey={geminiApiKey} />}
        {selectedProjectSubs && <SubmissionsModal project={selectedProjectSubs} onClose={() => setSelectedProjectSubs(null)} />}
        {selectedProjectBids && <BidsModal project={selectedProjectBids} onClose={() => setSelectedProjectBids(null)} onRefresh={loadProjects} />}
        {chatProject && <ChatBox project={chatProject} onClose={() => setChatProject(null)} />}
      </AnimatePresence>


      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
