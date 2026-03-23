import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import useStore from "../store/useStore";
import Navbar from "./Navbar";
import Footer from "./Footer";
import {
  Zap, Shield, Plus, X, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, LogOut, MessageSquare, User, Settings as SettingsIcon, ChevronRight
} from "lucide-react";
import confetti from "canvas-confetti";
import { useNavigate, Link } from "react-router-dom";
import ChatBox from "./ChatBox";
import ProjectAnalyticsModal from "./ProjectAnalyticsModal";
import WalletBalance from "./WalletBalance";
import { createProject } from "../services/kyteApi";

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

    try {
      const result = await createProject(
        null, // token unused now but kept for sig
        {
          title: form.title,
          description: form.description,
          requirements: reqs,
          payment_algo: parseFloat(form.fiat_bounty_amount), // Renaming to represent ALGO for now
          score_threshold: parseInt(form.score_threshold),
          geminiApiKey
        },
        userProfile?.wallet_address
      );
      
      setCreatedProject(result);
      setStep("done");
      onCreated(result);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ["#66d3ff", "#759aff", "#fff"] });
    } catch (err) {
      setError(err.message || "Failed to create project.");
      setStep("form");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(20px)" }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="dash-glass"
        style={{ maxWidth: 620, width: "100%", padding: "3rem", position: "relative", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.03)", border: "none", color: "rgba(255,255,255,0.4)", borderRadius: "50%", width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer", transition: "all 0.2s" }}>
          <X size={20} />
        </button>

        {step === "form" && (
          <form onSubmit={handleCreate}>
            <div className="dash-subtitle" style={{ marginBottom: "0.5rem" }}>
              <Zap size={14} className="animate-pulse" /> INITIALIZE PROTOCOL
            </div>
            <h2 className="dash-title" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Post New Project</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "3rem", fontSize: "1rem", lineHeight: 1.6 }}>Lock funds in secure-escrow and deploy AI guardrails to enforce delivery standards.</p>

            <div style={{ display: "grid", gap: "1.5rem" }}>
              {[
                { label: "Project Title *", key: "title", placeholder: "e.g. Algorand Smart Contract Audit" },
                { label: "Description", key: "description", placeholder: "What needs to be built or audited?", multiline: true },
                { label: "Requirements (one per line) *", key: "requirements", placeholder: "Check for reentrancy\nVerify auth on admin calls\nMax 500 lines", multiline: true },
              ].map(({ label, key, placeholder, multiline }, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: 0.1 * idx }}
                  key={key}
                >
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "rgba(102, 211, 255, 0.6)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</label>
                  {multiline
                    ? <textarea className="signin-input" placeholder={placeholder} rows={3} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ resize: "vertical", fontSize: "0.95rem", background: "rgba(255,255,255,0.02)", width: "100%", padding: "1rem" }} />
                    : <input className="signin-input" placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ fontSize: "0.95rem", background: "rgba(255,255,255,0.02)", width: "100%", padding: "1rem" }} />
                  }
                </motion.div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem", marginBottom: "2.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "rgba(102, 211, 255, 0.6)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Budget ($USD)</label>
                <input type="number" className="signin-input" value={form.fiat_bounty_amount} min={10} step={1}
                  onChange={e => setForm(f => ({ ...f, fiat_bounty_amount: e.target.value }))} style={{ fontSize: "0.95rem", background: "rgba(255,255,255,0.02)", width: "100%", padding: "1rem" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "rgba(102, 211, 255, 0.6)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Score Threshold (%)</label>
                <input type="number" className="signin-input" value={form.score_threshold} min={0} max={100}
                  onChange={e => setForm(f => ({ ...f, score_threshold: e.target.value }))} style={{ fontSize: "0.95rem", background: "rgba(255,255,255,0.02)", width: "100%", padding: "1rem" }} />
              </div>
            </div>

            {error && <p style={{ color: "#f87171", fontSize: "0.9rem", marginBottom: "1.5rem", fontWeight: 600 }}>{error}</p>}

            <button type="submit" className="btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1rem", fontWeight: 700 }}>
              <Zap size={20} /> Deploy Contract
            </button>
          </form>
        )}

        {step === "creating" && (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 2rem' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid rgba(102, 211, 255, 0.1)', borderTopColor: '#66d3ff', animation: 'spin 1s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 15, borderRadius: '50%', border: '4px solid rgba(117, 154, 255, 0.1)', borderBottomColor: '#759aff', animation: 'spin 1.5s linear infinite reverse' }} />
              <Zap size={32} color="#66d3ff" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            </div>
            <h3 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>Initializing Protocol…</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem", lineHeight: 1.6 }}>Deploying smart-escrow nodes and <br/>calibrating AI auditing kernels.</p>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ width: 80, height: 80, borderRadius: '2.5rem', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', display: 'grid', placeItems: 'center', margin: '0 auto 2rem' }}>
              <CheckCircle2 size={42} color="#4ade80" />
            </div>
            <h3 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.75rem", letterSpacing: "-0.03em" }}>Protocol Live!</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem", marginBottom: "3rem", lineHeight: 1.6 }}>Your decentralized bounty is now indexed <br/>and visible to verified talent globally.</p>
            <button className="btn-primary" style={{ width: "100%", padding: "1rem", fontWeight: 800 }} onClick={onClose}>Access Dashboard</button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Evaluation Overlay ──────────────────────────────────────
function EvalOverlay({ evaluation, onClose }) {
  const passed = evaluation?.overall_score >= 80;
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

        <div style={{ display: "grid", gap: "1rem", marginBottom: "3rem" }}>
          {(evaluation.results || []).map((res, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              key={i} 
              style={{ display: "flex", gap: "1.5rem", padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.03)", alignItems: "flex-start" }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: res.met ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 4 }}>
                {res.met ? <CheckCircle2 color="#4ade80" size={18} /> : <AlertCircle color="#f87171" size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", gap: "1.5rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "1rem", color: '#fff' }}>{res.requirement}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>WEIGHT</div>
                    <span style={{ fontSize: "1.1rem", fontWeight: 900, color: res.met ? "#4ade80" : "#f87171" }}>{res.score}</span>
                  </div>
                </div>
                <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>{res.reason}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {evaluation.gap_report && (
          <div style={{ padding: "2rem", background: "rgba(248,113,113,0.03)", borderRadius: 24, border: "1px solid rgba(248,113,113,0.1)", marginBottom: "3rem" }}>
            <h4 style={{ color: "#f87171", marginBottom: "0.75rem", fontSize: "1rem", textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Anomaly Gap Report</h4>
            <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "rgba(255,255,255,0.6)", margin: 0 }}>{evaluation.gap_report}</p>
          </div>
        )}

        <button className={passed ? "btn-primary" : "btn-secondary"} style={{ width: "100%", padding: "1.25rem", fontSize: "1.1rem", fontWeight: 800 }} onClick={onClose}>
          {passed ? "Authorize Release" : "Return to Dashboard"}
        </button>
      </motion.div>
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
        style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(20px)" }}>
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="dash-glass" 
          style={{ maxWidth: 640, width: "100%", padding: "3rem", position: "relative", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}
        >
          <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.03)", border: "none", color: "rgba(255,255,255,0.4)", borderRadius: "50%", width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" }}>
            <X size={20} />
          </button>
          
          <div className="dash-subtitle" style={{ marginBottom: "0.5rem" }}>
             <Shield size={14} className="animate-pulse" color="#66d3ff" /> AUDIT TRAIL
          </div>
          <h2 className="dash-title" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Deliveries: {project.title}</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "3rem", fontSize: "1rem" }}>Chronological record of developer submissions and automated audit metrics.</p>

          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem 0", color: "rgba(255,255,255,0.2)" }}>
              <Loader2 size={40} className="spin" style={{ margin: "0 auto 1.5rem" }} />
              <p style={{ fontWeight: 600 }}>Syncing Audit Trail…</p>
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 0", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: '1px dashed rgba(255,255,255,0.05)' }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.1rem" }}>No submission packets detected.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1.25rem" }}>
              {submissions.map((sub, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  key={sub.id} 
                  className="dash-card-hover"
                  style={{ background: "rgba(255,255,255,0.02)", borderRadius: 20, padding: "1.75rem", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span className="dash-badge" style={{ 
                        background: sub.passed ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", 
                        color: sub.passed ? "#4ade80" : "#f87171", 
                        borderColor: sub.passed ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)" 
                      }}>
                        {sub.passed ? "VERIFIED" : "FAILURE"}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                        {new Date(sub.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>INDEX</div>
                       <span style={{ fontWeight: 900, fontSize: "1.5rem", color: sub.passed ? "#4ade80" : "#f87171", letterSpacing: '-0.02em' }}>
                         {sub.score}%
                       </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.03)', display: 'grid', placeItems: 'center' }}>
                        <ExternalLink size={14} color="rgba(255,255,255,0.3)" />
                     </div>
                     <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>REPOSITORY</div>
                        <a href={sub.github_url} target="_blank" rel="noreferrer" style={{ display: "block", color: "#66d3ff", fontSize: "0.88rem", textDecoration: "none", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {sub.github_url}
                        </a>
                     </div>
                  </div>

                  <button className="btn-secondary" style={{ width: "100%", padding: "0.85rem", fontWeight: 700 }} onClick={() => setEvaluation(sub.evaluation_result)}>
                    Review Cryptographic Report
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
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
        .select(`
          *,
          developer:developer_id (
            display_name,
            wallet_address
          )
        `)
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
      style={{ position: "fixed", inset: 0, background: "rgba(6,9,18,0.85)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(20px)" }}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="dash-glass" 
        style={{ maxWidth: 640, width: "100%", padding: "3rem", position: "relative", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.03)", border: "none", color: "rgba(255,255,255,0.4)", borderRadius: "50%", width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <X size={20} />
        </button>

        <div className="dash-subtitle" style={{ marginBottom: "0.5rem" }}>
           <Plus size={14} className="animate-pulse" color="#66d3ff" /> MARKET LIQUIDITY
        </div>
        <h2 className="dash-title" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Proposals: {project.title}</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "3rem", fontSize: "1.1rem" }}>Review talent proposals and initialize your smart-escrow layer.</p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "rgba(255,255,255,0.2)" }}>
            <Loader2 size={40} className="spin" style={{ margin: "0 auto 1.5rem" }} />
            <p style={{ fontWeight: 600 }}>Syncing Market…</p>
          </div>
        ) : bids.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: '1px dashed rgba(255,255,255,0.05)' }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.1rem" }}>No active bids on the protocol market.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {bids.map((bid, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                key={bid.id} 
                className="dash-card-hover"
                style={{ background: "rgba(255,255,255,0.02)", borderRadius: 24, padding: "2rem", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                     <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(102, 211, 255, 0.05)', display: 'grid', placeItems: 'center', border: '1px solid rgba(102, 211, 255, 0.1)' }}>
                        <Users size={24} color="#66d3ff" />
                     </div>
                     <div>
                        <span style={{ fontSize: "1.1rem", color: "#fff", display: "block", marginBottom: 2, fontWeight: 800, letterSpacing: '-0.01em' }}>
                          {bid.developer?.display_name || "Protocol Specialist"}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {bid.developer?.wallet_address ? `${bid.developer.wallet_address.substring(0, 6)}...${bid.developer.wallet_address.substring(bid.developer.wallet_address.length - 4)}` : `Node: ${bid.developer_id.substring(0, 8)}`}
                        </span>
                     </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>PROPOSAL</div>
                    <span style={{ fontWeight: 900, fontSize: "1.75rem", color: "#4ade80", letterSpacing: '-0.04em' }}>
                      ${bid.bid_amount}
                    </span>
                  </div>
                </div>
                
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.5rem", borderRadius: 16, fontSize: "1rem", color: "rgba(255,255,255,0.6)", marginBottom: "2rem", lineHeight: 1.6, border: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ color: 'rgba(102, 211, 255, 0.4)', fontSize: '1.5rem', fontFamily: 'serif', marginRight: '0.5rem', verticalAlign: 'middle' }}>“</span>
                  {bid.proposal_text}
                  <span style={{ color: 'rgba(102, 211, 255, 0.4)', fontSize: '1.5rem', fontFamily: 'serif', marginLeft: '0.5rem', verticalAlign: 'middle' }}>”</span>
                </div>

                {bid.status === "PENDING" && (
                  <button className="btn-primary" style={{ width: "100%", padding: "1.1rem", fontSize: "1rem", fontWeight: 800 }} onClick={() => handleAcceptBid(bid)} disabled={loading}>
                    {loading ? <Loader2 size={18} className="spin" /> : "Authorize & Lock Escrow"}
                  </button>
                )}
                {bid.status === "ACCEPTED" && (
                  <div style={{ width: "100%", padding: "1.1rem", borderRadius: '1rem', background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.05em' }}>
                    CHANNEL INITIALIZED
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Client Dashboard ─────────────────────────────────────────
export default function ClientDashboard() {
  const { userProfile, walletAddress, logout } = useStore();
  const navigate = useNavigate();
  const [googleUser, setGoogleUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setGoogleUser(user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/signin');
  };

  const currentWallet = walletAddress || userProfile?.wallet_address;
  const formatAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'No Wallet Connected';
  const avatarUrl = userProfile?.avatar_url || googleUser?.user_metadata?.avatar_url || googleUser?.user_metadata?.picture;
  const userEmail = userProfile?.email || googleUser?.email;
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProjectSubs, setSelectedProjectSubs] = useState(null);
  const [selectedProjectBids, setSelectedProjectBids] = useState(null);
  const [chatProject, setChatProject] = useState(null);
  const [analyticsProject, setAnalyticsProject] = useState(null);

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

  const statusColor = (s) => ({ OPEN: "#66d3ff", IN_PROGRESS: "#fbbf24", COMPLETED: "#4ade80" }[s] || "#666");

  return (
    <div className="dash-layout">
      <Navbar />

      <main className="container" style={{ padding: "8rem 1rem 4rem", position: "relative", zIndex: 1 }}>
        
        {/* User Account Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
          
          <div className="dash-glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(102, 211, 255, 0.1)', display: 'grid', placeItems: 'center', border: '1px solid rgba(102, 211, 255, 0.2)', overflow: 'hidden' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={24} color="#66d3ff" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.1rem' }}>{userProfile?.display_name || googleUser?.user_metadata?.full_name || 'Protocol User'}</h3>
              <p style={{ fontSize: '0.75rem', color: '#66d3ff', fontWeight: 600, letterSpacing: '0.05em' }}>{formatAddress(currentWallet)}</p>
            </div>
            <Link to="/settings" className="dash-header-btn" style={{ padding: '0.6rem' }} title="Settings">
              <SettingsIcon size={18} />
            </Link>
          </div>

          <WalletBalance address={userProfile?.wallet_address} />

          <div className="dash-glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
             <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>AI Oracle Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
                  <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>Operational</span>
                </div>
             </div>
             <button onClick={handleLogout} className="dash-header-btn" style={{ border: '1px solid rgba(248, 113, 113, 0.2)', color: '#f87171' }}>
               <LogOut size={16} />
             </button>
          </div>
        </div>

        {/* Existing Title & Actions */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem", flexWrap: "wrap", gap: "2rem" }}
        >
          <div>
            <div className="dash-subtitle">
              <Plus size={14} className="animate-pulse" /> CLIENT MANAGEMENT
            </div>
            <h1 className="dash-title">Project Portfolio</h1>
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Zap size={14} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "rgba(102, 211, 255, 0.4)" }} />
              <input 
                type="password" 
                placeholder="Escrow API Key (Gemini)" 
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
                style={{ 
                  padding: "0.75rem 1rem 0.75rem 2.6rem", 
                  borderRadius: "0.8rem", 
                  background: "rgba(255,255,255,0.02)", 
                  border: "1px solid rgba(102, 211, 255, 0.15)", 
                  color: "#fff", 
                  outline: "none", 
                  width: 260,
                  fontSize: "0.9rem",
                  transition: "all 0.3s"
                }} 
              />
            </div>
            <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1.5rem" }} onClick={() => setShowCreate(true)}>
              <Plus size={18} /> New Project
            </button>
          </div>
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "6rem 0", color: "rgba(255,255,255,0.2)" }}>
            <Loader2 size={42} className="spin" style={{ margin: "0 auto 1.5rem" }} />
            <p style={{ fontSize: "1.1rem", fontWeight: 500 }}>Syncing portfolio...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "2.5rem" }}>
            {/* Create card */}
            <motion.div 
              whileHover={{ y: -8, borderColor: "rgba(102, 211, 255, 0.4)" }} 
              className="dash-glass"
              style={{ padding: "2.5rem", borderStyle: "dashed", borderWidth: "2px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", cursor: "pointer", minHeight: 280, transition: "all 0.3s ease" }}
              onClick={() => setShowCreate(true)}
            >
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(102,211,255,0.08)", display: "grid", placeItems: "center", marginBottom: "1.5rem", border: "1px solid rgba(102, 211, 255, 0.2)" }}>
                <Plus size={32} color="#66d3ff" />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Initialize New Contract</h3>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>Deploy a new smart-escrow project with AI constraints.</p>
            </motion.div>

            {projects.map((p, i) => (
              <motion.div 
                key={p.id} 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }} 
                className="dash-glass dash-card-hover" 
                style={{ padding: "2rem", display: "flex", flexDirection: "column" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <span className="dash-badge" style={{ color: statusColor(p.status), background: `${statusColor(p.status)}15` }}>
                    {p.status}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>BONUS</div>
                    <span style={{ fontWeight: 800, color: "#4ade80", fontSize: "1.1rem" }}>${p.fiat_bounty_amount || p.payment_algo}</span>
                  </div>
                </div>

                <h3 style={{ marginBottom: "0.75rem", fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>{p.title}</h3>
                <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", marginBottom: "1.5rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.6 }}>
                  {p.description}
                </p>

                {/* Requirements count */}
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", padding: "0 0.25rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Shield size={14} color="#66d3ff" />
                    {(p.requirements || []).length} AI Guardrails
                  </span>
                  <span style={{ fontWeight: 600 }}>Thresh: {p.score_threshold}%</span>
                </div>

                <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "1rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                   <div>
                     <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: "0.2rem" }}>ACTIVITY</div>
                     <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{p.submission_count || 0} Submissions</span>
                   </div>
                   {p.best_score > 0 && (
                     <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: "0.2rem" }}>PEAK QUALITY</div>
                        <span style={{ color: p.best_score >= p.score_threshold ? "#4ade80" : "#fbbf24", fontWeight: 800 }}>{p.best_score}%</span>
                     </div>
                   )}
                </div>

                <div style={{ marginTop: "auto" }}>
                  {p.status === 'OPEN' ? (
                    <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setSelectedProjectBids(p)}>
                      Review Market Bids
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button className="btn-secondary" style={{ flex: 1, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem" }}
                        onClick={() => setSelectedProjectSubs(p)}>
                        Submissions
                      </button>
                      <button className="btn-primary" style={{ padding: "0 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                        onClick={() => setAnalyticsProject(p)}>
                        <Zap size={16} /> Analytics
                      </button>
                      <button className="dash-header-btn" style={{ padding: "0 1rem" }}
                        onClick={() => setChatProject(p)}>
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  )}
                </div>
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
        {analyticsProject && <ProjectAnalyticsModal project={analyticsProject} onClose={() => setAnalyticsProject(null)} />}
      </AnimatePresence>


      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
