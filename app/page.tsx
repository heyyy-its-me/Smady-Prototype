"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/testing/Sidebar";
import TopBar from "@/components/testing/TopBar";
import AgentPipeline, { agents, type AgentInfo } from "@/components/testing/AgentPipeline";
import AgentHeader from "@/components/testing/AgentHeader";
import LeadForm from "@/components/testing/LeadForm";
import AgentProgress from "@/components/testing/AgentProgress";
import PortalBackdrop from "@/components/testing/PortalBackdrop";

type LeadFormData = {
  industry: string;
  roles: string;
  region: string;
  cities: string;
  states: string;
  company_size: string;
  business_context: string;
};

const initialLeadForm: LeadFormData = {
  industry: "Logistics & Supply Chain",
  roles: "Fleet Manager, Director of Operations",
  region: "Canada",
  cities: "Toronto",
  states: "",
  company_size: "51-200",
  business_context: "",
};

const split = (value: string) =>
  value.split(",").map((part) => part.trim()).filter(Boolean);

export default function Home() {
  const [active, setActive] = useState("leads");
  const [manual, setManual] = useState(true);
  const [leadForm, setLeadForm] = useState<LeadFormData>(initialLeadForm);
  const [run, setRun] = useState(false);
  const [sidebarView, setSidebarView] = useState("studio");
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  const agent = agents.find((item) => item.id === active) ?? agents[1];

  const leadPayload = useMemo(
    () => ({
      request_id: crypto.randomUUID(),
      industry: split(leadForm.industry),
      roles: split(leadForm.roles),
      region: split(leadForm.region),
      cities: split(leadForm.cities),
      states: split(leadForm.states),
      company_size: split(leadForm.company_size),
      business_context: leadForm.business_context,
    }),
    [leadForm]
  );

  const updateLead = (key: keyof LeadFormData, value: string) =>
    setLeadForm((current) => ({ ...current, [key]: value }));

  const handleAgentSelect = (id: string) => {
    setActive(id);
  };

  const handleRunningChange = (isRunning: boolean) => {
    setRun(isRunning);
    setRunningAgent(isRunning ? active : null);
  };

  return (
    <div className="app-shell">
      <PortalBackdrop />
      <Sidebar activeView={sidebarView} onViewChange={setSidebarView} />

      <div className="main-area">
        <TopBar
          agentTitle={agent.title}
          status={agent.status}
          isRunning={run}
        />

        <div className="main-content">
          {/* Agent Pipeline */}
          <AgentPipeline
            active={active}
            onSelect={handleAgentSelect}
            runningAgent={runningAgent}
          />

          {/* Agent Header */}
          <AgentHeader
            agent={agent}
            runStatus={run ? "running" : "idle"}
          />

          {/* Input + Execution grid */}
          <div className="workspace-grid">
            {/* Left: Input area */}
            <div className="input-panel card">
              <div className="input-panel-header">
                <div className="input-panel-title">
                  <span className="input-badge">INPUT</span>
                  <h3>Test configuration</h3>
                </div>
                <div className="input-mode-switch">
                  <button
                    className={!manual ? "active" : ""}
                    onClick={() => setManual(false)}
                  >
                    ⚡ Upstream
                  </button>
                  <button
                    className={manual ? "active" : ""}
                    onClick={() => setManual(true)}
                  >
                    ✎ Manual
                  </button>
                </div>
              </div>

              {manual && active === "leads" ? (
                <div className="input-body">
                  <LeadForm
                    values={leadForm}
                    onChange={updateLead}
                    payload={leadPayload}
                  />
                  <div className="input-footer">
                    <div className="source-drop">
                      <span className="source-icon">↑</span>
                      <div>
                        <strong>Upload CSV</strong>
                        <small>Attach a lead seed file</small>
                      </div>
                    </div>
                    <div className="source-drop">
                      <span className="source-icon">◴</span>
                      <div>
                        <strong>Previous output</strong>
                        <small>Choose a saved test result</small>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="automatic-mode">
                  <div className="auto-icon">↯</div>
                  <div>
                    <strong>
                      {manual
                        ? "Manual test input"
                        : "Waiting for upstream output"}
                    </strong>
                    <p>
                      {manual
                        ? "This agent retains its configured test controls."
                        : "The next run will use the preceding agent's real output."}
                    </p>
                  </div>
                  <button className="btn-secondary">Configure input</button>
                </div>
              )}

              <div className="input-status-bar">
                <span className="status-note">
                  ⌁ Lead Management stays RUNNING until n8n returns its final
                  workflow response.
                </span>
              </div>
            </div>

            {/* Right: Execution area */}
            <div className="execution-panel">
              <div className="execution-label-bar">
                <span>LIVE EXECUTION</span>
                <span className={run ? "status-running" : "status-idle"}>
                  {run ? "ACTIVE" : "IDLE"}
                </span>
              </div>
              <div className="card execution-card">
                <AgentProgress
                  agentId={active}
                  payload={active === "leads" ? leadPayload : undefined}
                  onRunningChange={handleRunningChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: transparent;
          position: relative;
          isolation: isolate;
        }

        .main-area {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .main-content {
          flex: 1;
          padding: 28px 32px 40px;
          max-width: 1680px;
          width: 100%;
          margin: 0 auto;
          overflow-y: auto;
        }

        /* Workspace grid */
        .workspace-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 380px;
          gap: 20px;
          align-items: start;
        }

        /* Input panel */
        .input-panel {
          overflow: hidden;
        }

        .input-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .input-panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .input-badge {
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(124, 92, 255, 0.1);
          color: var(--violet-bright);
          font-size: 9px;
          font-family: var(--font-mono);
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .input-panel-title h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .input-mode-switch {
          display: flex;
          gap: 2px;
          padding: 3px;
          border-radius: var(--radius-sm);
          background: rgba(6, 11, 30, 0.4);
          border: 1px solid var(--border-subtle);
        }

        .input-mode-switch button {
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-tertiary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--duration-fast) ease;
        }

        .input-mode-switch button.active {
          background: var(--bg-hover);
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
        }

        .input-mode-switch button:hover:not(.active) {
          color: var(--text-secondary);
        }

        .input-body {
          padding: 20px;
        }

        .input-footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }

        .source-drop {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 1px dashed var(--border-strong);
          border-radius: var(--radius-sm);
          background: rgba(6, 11, 30, 0.3);
          cursor: pointer;
          transition: all var(--duration-fast) ease;
        }

        .source-drop:hover {
          border-color: var(--violet);
          background: rgba(124, 92, 255, 0.04);
        }

        .source-icon {
          font-size: 16px;
          color: var(--violet-bright);
          flex-shrink: 0;
        }

        .source-drop strong {
          display: block;
          font-size: 10px;
          color: var(--text-secondary);
        }

        .source-drop small {
          display: block;
          font-size: 9px;
          color: var(--text-muted);
          margin-top: 1px;
        }

        .input-status-bar {
          padding: 12px 20px;
          border-top: 1px solid var(--border-subtle);
          background: rgba(6, 11, 30, 0.3);
        }

        .status-note {
          font-size: 10px;
          color: var(--text-tertiary);
        }

        /* Automatic mode */
        .automatic-mode {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px;
          padding: 16px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(124, 92, 255, 0.2);
          background: rgba(124, 92, 255, 0.04);
        }

        .auto-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(124, 92, 255, 0.1);
          color: var(--violet-bright);
          font-size: 18px;
          flex-shrink: 0;
        }

        .automatic-mode strong {
          font-size: 12px;
          color: var(--text-primary);
        }

        .automatic-mode p {
          margin: 3px 0 0;
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .btn-secondary {
          margin-left: auto;
          padding: 7px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-default);
          background: transparent;
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-fast) ease;
          flex-shrink: 0;
        }

        .btn-secondary:hover {
          border-color: var(--violet);
          background: rgba(124, 92, 255, 0.06);
          color: var(--violet-bright);
        }

        /* Execution panel */
        .execution-panel {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .execution-label-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px;
          font-size: 9px;
          font-family: var(--font-mono);
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-tertiary);
        }

        .execution-label-bar .status-running {
          color: var(--violet-bright);
          font-size: 8px;
        }

        .execution-label-bar .status-idle {
          color: var(--text-muted);
          font-size: 8px;
        }

        .execution-card {
          padding: 20px;
        }

        /* Responsive */
        @media (max-width: 1100px) {
          .main-content {
            padding: 24px 20px;
          }
          .workspace-grid {
            grid-template-columns: minmax(0, 1fr) 340px;
          }
        }

        @media (max-width: 860px) {
          .workspace-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .main-content {
            padding: 16px;
          }
          .input-footer {
            grid-template-columns: 1fr;
          }
          .input-panel-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}

