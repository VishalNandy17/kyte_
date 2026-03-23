import React, { useState, useEffect } from "react";
import { X, Users, Clock, Github, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";

export default function ProjectAnalyticsModal({ project, onClose }) {
  const [team, setTeam] = useState([]);
  const [logs, setLogs] = useState([]);
  const [commits, setCommits] = useState([]);
  
  const [loadingDb, setLoadingDb] = useState(true);
  const [loadingGit, setLoadingGit] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadDatabaseMetrics();
  }, []);

  const loadDatabaseMetrics = async () => {
    setLoadingDb(true);
    const { data: teamData } = await supabase
      .from("project_teams")
      .select("*")
      .eq("project_id", project.id);
      
    const { data: logData } = await supabase
      .from("work_logs")
      .select("*, developer:developer_id(email)")
      .eq("project_id", project.id)
      .order("log_date", { ascending: false });

    setTeam(teamData || []);
    setLogs(logData || []);
    setLoadingDb(false);

    // After loading team, trigger github fetch if repo exists
    if (project.github_repo_url) {
      fetchGitHubCommits(teamData || []);
    }
  };

  const fetchGitHubCommits = async (currentTeam) => {
    setLoadingGit(true);
    const approvedHandles = currentTeam
      .filter(t => t.status === 'APPROVED' && t.github_handle)
      .map(t => t.github_handle);

    const { data, error } = await supabase.functions.invoke("github-analytics", {
      body: { repoUrl: project.github_repo_url, githubHandles: approvedHandles }
    });

    if (error || data?.error) {
      console.warn("Could not fetch commits:", error || data?.error);
    } else {
      setCommits(data?.commits || []);
    }
    setLoadingGit(false);
  };

  const handleTeamAction = async (teamId, status) => {
    setActionLoading(teamId);
    
    // Step 1: Update status
    const { error } = await supabase
      .from("project_teams")
      .update({ status })
      .eq("id", teamId)
      .select()
      .single();

    if (error) {
      alert("Error updating member status: " + error.message);
    } else {
      // Step 2: Trigger Webhook/Edge Function for Notification
      // For now, assume the trigger handles it, or manually invoke send-email
      const member = team.find(t => t.id === teamId);
      if (status === 'APPROVED' && member) {
          await supabase.functions.invoke("send-email", {
              body: { 
                  action: "team_approved", 
                  payload: { developerId: member.developer_id, projectTitle: project.title } 
              }
          });
      }
      loadDatabaseMetrics();
    }
    setActionLoading(null);
  };

  const pendingMembers = team.filter(t => t.status === 'PENDING_CLIENT_APPROVAL');
  const activeMembers = team.filter(t => t.status === 'APPROVED' || t.role === 'LEAD');
  
  const totalHours = logs.reduce((sum, lg) => sum + Number(lg.hours_logged), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(3,6,12,0.96)", zIndex: 200, display: "grid", placeItems: "center", padding: "2rem", backdropFilter: "blur(24px)", overflowY: "auto" }}>
      <motion.div initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} className="dash-glass"
        style={{ maxWidth: 1040, width: "100%", padding: "3.5rem", position: "relative", boxShadow: "0 0 100px rgba(0,0,0,0.7)" }}>
        
        <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: "50%", padding: "0.5rem", cursor: "pointer", transition: "all 0.2s" }}>
          <X size={20} />
        </button>

        <div style={{ marginBottom: "3rem" }}>
          <div className="dash-subtitle">
            <Zap size={14} className="animate-pulse" /> PROTOCOL AUDIT & ANALYTICS
          </div>
          <h2 className="dash-title" style={{ fontSize: "2.5rem" }}>Portfolio Insights</h2>
          <p style={{ color: "rgba(102, 211, 255, 0.5)", fontSize: "1.05rem", fontWeight: 500 }}>Global monitoring for project: <span style={{ color: "#fff", fontWeight: 700 }}>{project.title}</span></p>
        </div>

        {loadingDb ? (
          <div style={{ textAlign: "center", padding: "6rem 0", color: "rgba(255,255,255,0.2)" }}>
            <Loader2 size={42} className="spin" style={{ margin: "0 auto 1.5rem" }} />
            <p style={{ fontSize: "1.1rem" }}>Retrieving on-chain and off-chain telemetry...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "4rem" }}>
            
            {/* Left Column: Management & Identity */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
              
              {/* Approvals Section */}
              {pendingMembers.length > 0 && (
                <div style={{ padding: "2rem", background: "rgba(251, 191, 36, 0.03)", border: "1px solid rgba(251, 191, 36, 0.2)", borderRadius: "1.5rem", boxShadow: "0 10px 30px rgba(251, 191, 36, 0.05)" }}>
                  <h4 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", marginBottom: "1.25rem", color: "#fbbf24", fontWeight: 700 }}>
                    <Users size={20} /> Identity Validation
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "1.5rem", lineHeight: 1.6 }}>New contributors requesting access to the project stream.</p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {pendingMembers.map(m => (
                      <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", background: "rgba(0,0,0,0.3)", borderRadius: "1rem", border: "1px solid rgba(251, 191, 36, 0.1)" }}>
                        <span style={{ fontWeight: 700, fontSize: "1rem" }}>@{m.github_handle || 'Unknown Dev'}</span>
                        <div style={{ display: "flex", gap: "0.75rem" }}>
                          <button className="dash-header-btn" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", color: "#f87171" }} onClick={() => handleTeamAction(m.id, 'REJECTED')} disabled={actionLoading === m.id}>Reject</button>
                          <button className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }} onClick={() => handleTeamAction(m.id, 'APPROVED')} disabled={actionLoading === m.id}>
                            {actionLoading === m.id ? <Loader2 size={16} className="spin" /> : 'Authorize'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Team Grid */}
              <div>
                <h4 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", marginBottom: "1.5rem", color: "#66d3ff", fontWeight: 700 }}>
                  <Users size={20} /> Authorized Contributors
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1rem" }}>
                  {activeMembers.map(m => (
                    <motion.div key={m.id} whileHover={{ y: -5 }}
                      style={{ padding: "1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: m.role==='LEAD'?'rgba(102,211,255,0.1)':'rgba(74,222,128,0.1)', display: "grid", placeItems: "center", margin: "0 auto 0.75rem" }}>
                        <Github size={20} color={m.role==='LEAD'?'#66d3ff':'#4ade80'} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem", overflow: "hidden", textOverflow: "ellipsis" }}>@{m.github_handle || 'Lead'}</div>
                      <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6 }}>{m.role}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Time Tracking / Resource Utilization */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
                  <h4 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.1rem", color: "#fbbf24", fontWeight: 700 }}>
                    <Clock size={20} /> Resource Consumption
                  </h4>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{totalHours} Total Units</div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: 250, overflowY: "auto", paddingRight: "0.75rem" }}>
                  {logs.map(lg => (
                    <div key={lg.id} style={{ padding: "1.25rem", background: "rgba(255,255,255,0.01)", borderLeft: "4px solid #fbbf24", borderRadius: "0.8rem", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 800 }}>{lg.hours_logged} Units de Work</span>
                        <span style={{ fontSize: "0.8rem", color: "rgba(226, 228, 246, 0.4)" }}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(lg.log_date))}</span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{lg.description}</p>
                    </div>
                  ))}
                  {logs.length === 0 && <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "2rem" }}>No resource consumption data.</p>}
                </div>
              </div>

            </div>

            {/* Right Column: GitHub Commits / Stream Analytics */}
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "2rem", padding: "2.5rem", border: "1px solid rgba(255,255,255,0.05)", height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                  <h4 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.2rem", color: "#66d3ff", fontWeight: 700 }}>
                    <Github size={22} /> Event Stream
                  </h4>
                  {project.github_repo_url && !loadingGit && (
                    <span className="dash-badge" style={{ color: "#4ade80", background: "rgba(74,222,128,0.1)", fontSize: "0.65rem" }}>Live Feed Sync</span>
                  )}
                </div>

                {!project.github_repo_url ? (
                  <div style={{ flex: 1, display: "grid", placeItems: "center", textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
                    <div style={{ maxWidth: 240 }}>
                      <AlertCircle size={48} style={{ margin: "0 auto 1.25rem", opacity: 0.5 }} />
                      <h5 style={{ marginBottom: "0.5rem" }}>No Stream Link</h5>
                      <p style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>The Lead Developer must provide their GitHub identity to start the stream.</p>
                    </div>
                  </div>
                ) : loadingGit ? (
                  <div style={{ flex: 1, display: "grid", placeItems: "center", textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
                    <div>
                      <Loader2 size={42} className="spin" style={{ margin: "0 auto 1.25rem" }} />
                      <p style={{ fontSize: "1rem", fontWeight: 600 }}>Syncing branch state...</p>
                    </div>
                  </div>
                ) : commits.length === 0 ? (
                  <div style={{ flex: 1, display: "grid", placeItems: "center", textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
                    <div style={{ maxWidth: 220 }}>
                      <p style={{ fontSize: "0.9rem" }}>No activity detected from authorized contributors yet.</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", paddingRight: "1rem" }}>
                    {commits.map((c, idx) => (
                      <motion.div key={c.sha} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                        style={{ display: "flex", gap: "1.5rem", position: "relative" }}>
                        
                        {/* Timeline Architecture */}
                        <div style={{ position: "absolute", left: 9, top: 24, bottom: -24, width: 2, background: "linear-gradient(to bottom, rgba(102,211,255,0.3), transparent)" }} />
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#66d3ff", marginTop: 4, zIndex: 1, flexShrink: 0, boxShadow: "0 0 10px rgba(102,211,255,0.4)" }} />
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#66d3ff" }}>@{c.author}</span>
                            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(c.date))}</span>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.02)", padding: "1.25rem", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.85)", marginBottom: "0.75rem", lineHeight: 1.6 }}>{c.message}</p>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textDecoration: "none", fontFamily: "monospace", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                                {c.sha.slice(0, 7)}
                              </a>
                              <CheckCircle2 size={12} color="#4ade80" style={{ opacity: 0.6 }} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
