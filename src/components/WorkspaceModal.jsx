import React, { useState, useEffect } from "react";
import { X, Github, Users, Clock, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";

export default function WorkspaceModal({ project, onClose }) {
  const [repoUrl, setRepoUrl] = useState(project.github_repo_url || "");
  const [team, setTeam] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite states
  const [githubHandle, setGithubHandle] = useState("");
  const [inviting, setInviting] = useState(false);

  // Time logging states
  const [hours, setHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = async () => {
    setLoading(true);
    // Fetch Teams
    const { data: teamData } = await supabase
      .from("project_teams")
      .select("*")
      .eq("project_id", project.id);
    
    // Fetch Work Logs
    const { data: logData } = await supabase
      .from("work_logs")
      .select("*")
      .eq("project_id", project.id)
      .order("log_date", { ascending: false });

    setTeam(teamData || []);
    setLogs(logData || []);
    setLoading(false);
  };

  const handleUpdateRepo = async () => {
    if (!repoUrl) return;
    const { error } = await supabase.from("projects").update({ github_repo_url: repoUrl }).eq("id", project.id);
    if (!error) alert("Repository linked successfully!");
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!githubHandle) return;
    setInviting(true);

    const { error } = await supabase.from("project_teams").insert({
      project_id: project.id,
      github_handle: githubHandle,
      role: 'MEMBER',
      status: 'PENDING_CLIENT_APPROVAL'
    });

    setInviting(false);
    if (error) {
      alert("Error inviting member: " + error.message);
    } else {
      setGithubHandle("");
      loadWorkspace();
    }
  };

  const handleLogHours = async (e) => {
    e.preventDefault();
    if (!hours || !logDesc) return;
    setLogging(true);

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("work_logs").insert({
      project_id: project.id,
      developer_id: session.user.id,
      hours_logged: parseFloat(hours),
      description: logDesc
    });

    setLogging(false);
    if (error) {
      alert("Error logging hours: " + error.message);
    } else {
      setHours("");
      setLogDesc("");
      loadWorkspace();
    }
  };

  const getStatusColor = (s) => {
    if (s === 'APPROVED') return '#4ade80';
    if (s === 'REJECTED') return '#f87171';
    return '#fbbf24';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(3,6,12,0.85)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(25px)", overflowY: "auto" }}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 30 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        className="dash-glass"
        style={{ maxWidth: 1080, width: "100%", padding: "4rem", position: "relative", boxShadow: "0 50px 100px rgba(0,0,0,0.8)" }}
      >
        
        <button onClick={onClose} style={{ position: "absolute", top: "2rem", right: "2rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", borderRadius: "50%", padding: "0.6rem", cursor: "pointer", transition: "all 0.2s" }}>
          <X size={24} />
        </button>

        <div style={{ marginBottom: "3.5rem" }}>
          <div className="dash-subtitle">
            <Users size={14} className="animate-pulse" /> COLLABORATIVE NETWORK
          </div>
          <h2 className="dash-title" style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>Project Workspace</h2>
          <p style={{ color: "rgba(102, 211, 255, 0.45)", fontSize: "1.1rem", fontWeight: 600 }}>{project.title}</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "6rem 0", color: "rgba(255,255,255,0.15)" }}>
            <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 2rem' }}>
               <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(102,211,255,0.1)', borderTopColor: '#66d3ff', animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ fontSize: "1.2rem", fontWeight: 500, letterSpacing: '0.05em' }}>SYNCING KERNELS...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "4.5rem" }}>
            
            {/* Left Column: Infrastructure */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <div style={{ marginBottom: "3.5rem" }}>
                <h4 style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "1.1rem", marginBottom: "1.5rem", color: "#66d3ff", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <Github size={20} /> Repository Hub
                </h4>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <input className="signin-input" style={{ flex: 1, padding: "1rem 1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "1rem" }}
                    placeholder="https://github.com/talent/module" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
                  <button onClick={handleUpdateRepo} className="dash-header-btn" style={{ padding: "0 1.5rem", borderRadius: '1rem' }}>Connect</button>
                </div>
              </div>

              <div>
                <h4 style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "1.1rem", marginBottom: "1.5rem", color: "#66d3ff", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <Users size={20} /> Squad Deployment
                </h4>
                
                <form onSubmit={handleInvite} style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
                  <input className="signin-input" style={{ flex: 1, padding: "1rem 1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "1rem" }} required
                    placeholder="GitHub Alias" value={githubHandle} onChange={e => setGithubHandle(e.target.value)} />
                  <button type="submit" className="btn-primary" style={{ padding: "0 1.25rem", borderRadius: '1rem' }} disabled={inviting}>
                    {inviting ? <Loader2 size={20} className="spin" /> : <Plus size={20} />}
                  </button>
                </form>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {team.map((t, i) => (
                    <motion.div 
                      key={t.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "1.25rem", border: "1px solid rgba(255,255,255,0.03)" }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(45deg, #66d3ff22, #759aff22)', display: 'grid', placeItems: 'center', fontSize: '0.8rem', fontWeight: 900, color: '#66d3ff' }}>
                            {t.github_handle?.substring(0,2).toUpperCase() || 'LD'}
                         </div>
                         <span style={{ fontWeight: 700, color: "#fff", fontSize: '0.95rem' }}>@{t.github_handle || 'Project Lead'}</span>
                      </div>
                      <span className="dash-badge" style={{ color: getStatusColor(t.status), background: `${getStatusColor(t.status)}12`, padding: "0.4rem 1rem", fontSize: '0.75rem', fontWeight: 800 }}>
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </motion.div>
                  ))}
                  {team.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
                       <Users size={24} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                       <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>Awaiting node connections.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Right Column: Resource Allocation */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              style={{ background: "rgba(255,255,255,0.015)", padding: "3rem", borderRadius: "2.5rem", border: "1px solid rgba(255,255,255,0.03)" }}
            >
              <h4 style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "1.1rem", marginBottom: "2rem", color: "#fbbf24", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <Clock size={20} /> Activity Telemetry
              </h4>
              
              <form onSubmit={handleLogHours} style={{ background: "rgba(0,0,0,0.25)", padding: "2.5rem", borderRadius: "2rem", marginBottom: "3rem", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Temporal Units (Hrs)</label>
                  <input type="number" step="0.5" required className="signin-input" style={{ width: "100%", padding: "1.1rem", background: "rgba(0,0,0,0.2)", borderRadius: '0.75rem' }}
                    value={hours} onChange={e => setHours(e.target.value)} placeholder="0.00" />
                </div>
                <div style={{ marginBottom: "2rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Mission Log Description</label>
                  <textarea required className="signin-input" style={{ width: "100%", padding: "1.1rem", background: "rgba(0,0,0,0.2)", borderRadius: '0.75rem', resize: 'none' }} rows={2}
                    value={logDesc} onChange={e => setLogDesc(e.target.value)} placeholder="What did you execute during this cycle?" />
                </div>
                <button type="submit" className="btn-primary" style={{ width: "100%", padding: "1.1rem", justifyContent: "center", fontSize: '1rem', fontWeight: 800 }} disabled={logging}>
                  {logging ? <Loader2 size={18} className="spin" /> : 'Commit Activity Log'}
                </button>
              </form>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h5 style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.4)", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Ledger</h5>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxHeight: 350, overflowY: "auto", paddingRight: "0.75rem" }}>
                {logs.map((lg, i) => (
                  <motion.div 
                    key={lg.id} 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * i }}
                    style={{ padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderLeft: "4px solid #fbbf24", borderRadius: "1.25rem", border: "1px solid rgba(255,255,255,0.03)" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 900, color: "#fff" }}>{lg.hours_logged} Units</span>
                      <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>{new Date(lg.log_date).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6 }}>{lg.description}</p>
                  </motion.div>
                ))}
                {logs.length === 0 && <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "3rem" }}>No telemetry data.</p>}
              </div>
            </motion.div>

          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
