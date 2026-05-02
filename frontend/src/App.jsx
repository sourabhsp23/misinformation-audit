import React, { useState, useEffect, useRef } from 'react';
import { Shield, Search, Zap, CheckCircle, AlertTriangle, FileText, Globe, Cpu, Database, Activity, Lock, Hash, Clock, BarChart3, Fingerprint, Terminal, Scale, Layers, Hammer } from 'lucide-react';
import gsap from 'gsap';
import ReactMarkdown from 'react-markdown';

// --- Neo-Brutalist Components ---

const BrutalCard = ({ children, className = "", color = "bg-white", id = "" }) => (
  <div id={id} className={`brutal-border brutal-shadow ${color} ${className}`}>
    {children}
  </div>
);

const Header = ({ view, setView }) => (
  <header className="border-b-2 border-black p-3 px-6 flex justify-between items-center bg-white sticky top-0 z-50 text-black">
    <div className="flex items-center gap-2">
      <div className="bg-black text-white p-1 brutal-border border-[1px]">
        <Shield size={16} />
      </div>
      <span className="font-bold text-base tracking-tighter uppercase text-black">NEURAL_AUDIT</span>
    </div>
    <nav className="flex gap-6 font-bold text-[8px] tracking-[0.2em] uppercase">
      <button onClick={() => setView('dashboard')} className={`border-b-2 transition-all ${view === 'dashboard' ? 'border-black text-black scale-110' : 'border-transparent text-slate-400 hover:text-black'}`}>Dashboard</button>
      <button onClick={() => setView('protocol')} className={`border-b-2 transition-all ${view === 'protocol' ? 'border-black text-black scale-110' : 'border-transparent text-slate-400 hover:text-black'}`}>Protocol_Docs</button>
      <div className="flex items-center gap-1.5 ml-4">
        <div className="w-1.5 h-1.5 bg-brand-green animate-pulse rounded-full"></div>
        <span className="text-black">LIVE</span>
      </div>
    </nav>
  </header>
);

const AuditTerminal = ({ logs }) => {
  const scrollRef = useRef();
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <BrutalCard color="bg-black" className="p-4 h-48 overflow-hidden flex flex-col font-mono text-[10px] text-brand-green">
      <div className="flex justify-between items-center border-b border-brand-green/20 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <Terminal size={10} />
          <span className="uppercase tracking-widest font-bold">STREAM</span>
        </div>
        <span className="opacity-30 text-[8px]">SECURE</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar scroll-smooth text-brand-green">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-1.5 leading-snug">
            <span className="opacity-20">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
            <span className={log.includes('✓') ? 'text-brand-cyan' : ''}>{log}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="animate-pulse opacity-50 italic">Awaiting sync...</div>}
      </div>
    </BrutalCard>
  );
};

// --- App Component ---

function App() {
  const [view, setView] = useState('dashboard');
  const [article, setArticle] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Standby');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  
  const ws = useRef(null);

  const startAudit = () => {
    if (!article.trim()) return;
    setLoading(true);
    setResults(null);
    setProgress(0);
    setLogs(["INIT_SEQ...", "SYNC_NODES..."]);
    setStatus("Syncing");

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8001' : window.location.host;
    ws.current = new WebSocket(`${protocol}//${host}/ws/audit`);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') {
        setStatus(data.message);
        setProgress(data.progress);
        setLogs(prev => [...prev, `✓ NODE: ${data.message}`]);
      } else if (data.type === 'result') {
        setResults(data);
        setLoading(false);
        setLogs(prev => [...prev, "✓ COMPLETE"]);
        setTimeout(() => {
          const resultsEl = document.getElementById('results');
          if (resultsEl) {
            resultsEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 200);
      }
    };

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({
        article: article,
        url: url,
        thread_id: "audit-" + Math.random().toString(36).substr(2, 9)
      }));
    };
  };

  return (
    <div className="min-h-screen bg-brand-beige selection:bg-brand-cyan text-black">
      <Header view={view} setView={setView} />
      
      <main className="max-w-5xl mx-auto px-8 pt-4 pb-20 text-black">
        
        {view === 'dashboard' ? (
          <>
            {/* Dashboard Intro */}
            <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-2 px-2">
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-bold tracking-tighter uppercase">
                  Neural <span className="text-brand-red">Verification</span>_Protocol
                </h1>
                <div className="h-2.5 w-[1.5px] bg-black opacity-20 hidden md:block"></div>
                <p className="text-[7px] font-bold uppercase text-slate-400 tracking-widest hidden md:block">
                  [ Deep-Block Extraction // Cross-Node Validation ]
                </p>
              </div>
              <div className="font-mono text-[7px] font-bold text-brand-green uppercase opacity-60">
                [ NODE_SYNC_OK ]
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Input Terminal */}
              <div className="lg:col-span-8 space-y-6">
                <BrutalCard className="p-0 overflow-hidden" color="bg-white">
                   <div className="bg-brand-cyan border-b-2 border-black p-2 flex justify-between items-center px-4">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-black rounded-full" />
                        <div className="w-2 h-2 bg-black rounded-full opacity-20" />
                      </div>
                      <span className="font-bold text-[8px] uppercase tracking-widest">INPUT_TERMINAL</span>
                   </div>
                   <div className="p-6 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 text-black">
                            <Globe size={10} className="text-brand-red" /> Target URL
                          </label>
                          <input 
                            type="text" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://..." 
                            className="brutal-input text-xs" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 text-black">
                            <Fingerprint size={10} className="text-brand-green" /> Audit Hash
                          </label>
                          <input 
                            type="text" 
                            readOnly
                            value={`AUD_ID_${Math.floor(Math.random()*1000)}`}
                            className="brutal-input text-xs bg-slate-50 cursor-not-allowed opacity-50" 
                          />
                        </div>
                      </div>

                      <div className="space-y-1 relative">
                        <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 text-black">
                          <FileText size={10} className="text-brand-yellow" /> Text Content
                        </label>
                        <textarea 
                          value={article}
                          onChange={(e) => setArticle(e.target.value)}
                          placeholder="Paste text block..." 
                          className="brutal-input h-48 text-sm resize-none leading-relaxed"
                        />
                        {loading && <div className="scan-line" />}
                      </div>

                      <button 
                        onClick={startAudit}
                        disabled={loading || !article}
                        className="w-full brutal-btn bg-black text-white text-base py-3 flex items-center justify-center gap-3 disabled:opacity-40"
                      >
                        <Zap size={16} fill="currentColor" />
                        <span>Run Audit</span>
                      </button>
                   </div>
                </BrutalCard>

                {loading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                    <BrutalCard className="p-4 space-y-4 flex flex-col justify-center">
                      <div className="flex justify-between items-end">
                         <div>
                           <div className="text-[8px] font-bold uppercase text-slate-400">NODE</div>
                           <h3 className="font-bold text-base uppercase text-brand-red truncate max-w-[120px]">{status}</h3>
                         </div>
                         <div className="font-mono font-bold text-2xl text-black">{progress}%</div>
                      </div>
                      <div className="brutal-border border-[1.5px] h-6 bg-slate-100 p-0.5">
                         <div 
                          className="h-full bg-brand-green transition-all duration-1000 ease-out" 
                          style={{ width: `${progress}%` }} 
                         />
                      </div>
                    </BrutalCard>
                    <AuditTerminal logs={logs} />
                  </div>
                )}
              </div>

              {/* Right: Technical Stats */}
              <div className="lg:col-span-4 space-y-6">
                <BrutalCard color="bg-brand-yellow" className="p-5">
                   <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-4">
                      <Cpu size={16} />
                      <h3 className="font-bold text-xs uppercase tracking-tighter">Backend_D9</h3>
                   </div>
                   <div className="space-y-2">
                      {[
                        { node: "claim", title: "Extraction", desc: "Atomic block sync." },
                        { node: "rag", title: "RAG Search", desc: "Authority lookup." },
                        { node: "web", title: "Live Search", desc: "Global validation." },
                        { node: "nli", title: "Verification", desc: "NLI inference." }
                      ].map((item, i) => (
                        <div key={i} className={`flex gap-2 p-2 border-[1.5px] border-black transition-all ${status.toLowerCase().includes(item.node) ? 'bg-black text-white' : 'bg-white/40'}`}>
                           <div className={`p-1 brutal-border border-[1px] self-start ${status.toLowerCase().includes(item.node) ? 'bg-brand-green' : 'bg-white'}`}>
                              {i === 0 ? <Search size={10} /> : i === 1 ? <Database size={10} /> : i === 2 ? <Globe size={10} /> : <Scale size={10} />}
                           </div>
                           <div className={status.toLowerCase().includes(item.node) ? 'text-white' : 'text-black'}>
                              <div className="font-bold text-[9px] uppercase leading-none">{item.title}</div>
                              <div className="text-[8px] leading-tight mt-0.5 opacity-60">{item.desc}</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </BrutalCard>

                <BrutalCard className="p-5 space-y-4" color="bg-white">
                   <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-2">
                      <Layers size={16} />
                      <h3 className="font-bold text-xs uppercase tracking-tighter">Metadata</h3>
                   </div>
                   <div className="space-y-2 font-bold text-[9px] uppercase tracking-wider">
                      <div className="flex justify-between text-slate-400 text-black"><span>V_DIMS</span><span className="text-black">384</span></div>
                      <div className="flex justify-between text-slate-400 text-black"><span>AGENTS</span><span className="text-brand-red">06</span></div>
                      <div className="flex justify-between text-slate-400 text-black"><span>KERNEL</span><span className="text-brand-green">1.4.2</span></div>
                   </div>
                </BrutalCard>
              </div>
            </div>

            {/* Results Section */}
            {results && (
              <div id="results" className="mt-20 space-y-12 animate-in slide-in-from-bottom-4 duration-1000">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <BrutalCard className="md:col-span-3 p-8 bg-white relative overflow-hidden text-black">
                    <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none text-black">
                       <Shield size={180} />
                    </div>
                    <div className="flex justify-between items-center mb-6">
                       <div className="bg-black text-white px-2 py-0.5 font-mono text-[8px] uppercase tracking-tighter">SIG: {Math.random().toString(16).substr(2, 6)}</div>
                       <div className="brutal-border border-[1.5px] px-2 py-0.5 text-[8px] font-bold uppercase bg-brand-cyan text-black">SECURE_RESULT</div>
                    </div>
                    <h2 className="text-3xl font-bold uppercase tracking-tighter mb-3 text-black">Forensic Audit Summary</h2>
                    <p className="text-slate-500 text-[10px] font-bold leading-relaxed max-w-xl uppercase text-black">
                       {results.verified_claims.length} claims scanned. {results.verified_claims.filter(c => c.verdict === 'REFUTED').length} refuted statements found in submitted data.
                    </p>
                  </BrutalCard>
                  
                  <BrutalCard color="bg-brand-yellow" className="p-6 flex flex-col justify-center text-center">
                     <div className="text-[8px] font-bold uppercase mb-2 text-slate-600 text-black">SCORE</div>
                     <div className="text-7xl font-bold leading-none mb-4 tabular-nums tracking-tighter text-black">{(results.score * 10).toFixed(0)}</div>
                     <div className="brutal-border border-[1.5px] h-4 bg-white p-0.5">
                        <div className="h-full bg-black transition-all duration-[1500ms]" style={{ width: `${results.score * 100}%` }} />
                     </div>
                  </BrutalCard>
                </div>

                <div className="space-y-8">
                   <h3 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-3 text-black">
                      <div className="w-8 h-2.5 bg-brand-red"></div>
                      Verification_Matrix
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {results.verified_claims.map((claim, i) => (
                        <BrutalCard key={i} className="p-0 overflow-hidden flex flex-col group hover:translate-y-[-3px] transition-all">
                           <div className={`h-3 border-b-2 border-black ${claim.verdict === 'SUPPORTED' ? 'bg-brand-green' : claim.verdict === 'REFUTED' ? 'bg-brand-red' : 'bg-brand-yellow'}`}></div>
                           <div className="p-6 space-y-4 flex-1 text-black">
                              <div className="flex justify-between items-center text-black">
                                 <div className="brutal-border border-[1.5px] px-1.5 py-0 text-[8px] font-bold uppercase bg-white text-black">{claim.verdict}</div>
                                 <div className="font-mono text-[8px] opacity-20 uppercase text-black">BLK_{i+1}</div>
                              </div>
                              <h4 className="text-base font-bold leading-tight tracking-tight uppercase line-clamp-2 text-black">"{claim.claim}"</h4>
                              <div className="bg-brand-beige brutal-border border-[1.5px] p-3 space-y-2 shadow-inner text-black text-black">
                                 <div className="text-[7px] font-black uppercase text-slate-400 flex items-center gap-1.5 tracking-widest text-black">
                                    <Activity size={8} className="text-black" /> Neural_Rationale
                                 </div>
                                 <p className="text-[10px] font-bold leading-snug text-slate-700 uppercase italic line-clamp-3 text-black">{claim.explanation}</p>
                              </div>
                           </div>
                        </BrutalCard>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   <BrutalCard className="lg:col-span-2 p-8 bg-white prose prose-xs prose-slate max-w-none prose-headings:uppercase prose-strong:text-brand-red leading-relaxed text-black text-black">
                      <div className="flex items-center gap-3 mb-6 border-b-2 border-black pb-4 text-black text-black">
                        <FileText size={20} className="text-black text-black" />
                        <h3 className="text-2xl font-bold uppercase tracking-tighter m-0 text-black text-black">Full_Synthesis_Log</h3>
                      </div>
                      <ReactMarkdown>{results.report}</ReactMarkdown>
                   </BrutalCard>
                   
                   <div className="space-y-6">
                      <BrutalCard className="p-6 bg-black text-white text-center space-y-4 text-black">
                        <CheckCircle size={24} className="mx-auto text-brand-cyan" />
                        <div>
                          <div className="text-[8px] font-bold text-brand-cyan uppercase tracking-[0.2em] mb-1">Authenticity</div>
                          <h4 className="text-base font-bold uppercase italic tracking-tighter text-white text-black">Verified_Forensics</h4>
                        </div>
                      </BrutalCard>
                      
                      <BrutalCard className="p-6 space-y-3" color="bg-brand-cyan">
                        <h4 className="font-bold uppercase tracking-tighter text-[11px] text-black">Actions</h4>
                        <button className="w-full brutal-btn bg-white text-[9px] py-2 text-black">Download_Forensics</button>
                        <button className="w-full brutal-btn bg-brand-red text-white text-[9px] py-2 border-black shadow-none mt-2 text-black">Purge_Archive</button>
                      </BrutalCard>
                   </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Protocol Documentation View */
          <div className="animate-in fade-in duration-500 space-y-8 pt-4 text-black text-black text-black">
            <div className="border-b-2 border-black pb-3 text-black text-black text-black">
              <h2 className="text-2xl font-bold tracking-tighter uppercase mb-1 text-slate-800 text-black text-black text-black">SYSTEM_PROTOCOL_DOCUMENTATION</h2>
              <p className="text-slate-400 font-bold uppercase text-[7px] tracking-[0.3em] text-black text-black text-black">Core_Operations // NeuralAudit v1.4.2</p>
            </div>

            {/* NEW: Primary System Description */}
            <BrutalCard color="bg-brand-yellow" className="p-8 text-black">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-black">
                  <div className="md:col-span-2 space-y-4 text-black text-black">
                     <h3 className="text-3xl font-black uppercase tracking-tighter italic border-b-4 border-black inline-block pb-1 text-black text-black">Mission_Objective</h3>
                     <p className="text-sm font-bold leading-relaxed uppercase text-slate-900 text-black text-black text-black">
                        NeuralAudit is a high-precision forensic engine designed to dismantle digital deception. 
                        By leveraging a decentralized node-based architecture, the system isolates individual assertions within any text and subjects them to multi-layered cross-verification against authoritative global datasets.
                     </p>
                     <div className="flex gap-4 pt-2 text-black text-black">
                        <div className="bg-white brutal-border border-[1.5px] px-3 py-1 text-[8px] font-black uppercase text-black text-black">Forensic_Grade</div>
                        <div className="bg-white brutal-border border-[1.5px] px-3 py-1 text-[8px] font-black uppercase text-black text-black">Zero_Bias_Protocol</div>
                        <div className="bg-white brutal-border border-[1.5px] px-3 py-1 text-[8px] font-black uppercase text-black text-black text-black">Tamper_Proof</div>
                     </div>
                  </div>
                  <div className="bg-black text-brand-green p-6 brutal-border border-[2px] font-mono text-[10px] space-y-2 text-black">
                     <div className="flex justify-between border-b border-brand-green/30 pb-1 mb-2 uppercase font-bold text-xs italic text-black">System_Logic</div>
                     <div className="text-brand-green">// STATUS: NOMINAL</div>
                     <div className="text-brand-green">// LOGIC: BOOLEAN_NLI</div>
                     <div className="text-brand-green">// GROUNDING: RAG_ACTIVE</div>
                     <div className="pt-4 text-brand-cyan animate-pulse">&gt; READY_FOR_DECONSTRUCTION</div>
                  </div>
               </div>
            </BrutalCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black text-black text-black">
              <div className="space-y-6 text-black text-black text-black text-black">
                 <BrutalCard className="p-6 space-y-4 text-black text-black text-black text-black" color="bg-white">
                    <h3 className="text-lg font-bold uppercase tracking-tighter flex items-center gap-2 border-b border-black pb-2 text-black text-black text-black text-black">
                       <Cpu size={18} className="text-brand-red text-black text-black text-black" /> 01. Atomic Extraction
                    </h3>
                    <p className="text-[11px] leading-relaxed text-slate-600 font-medium text-black text-black text-black text-black">
                       The system feeds raw article text into an LLM agent that decomposes narratives into atomic factual assertions, removing bias and adjectives.
                    </p>
                    <ul className="text-[7px] font-bold uppercase space-y-1 text-slate-400 text-black text-black text-black text-black">
                       <li className="flex gap-2 text-black text-black text-black text-black text-black"><span className="text-brand-red text-black text-black text-black">✓</span> Isolates metric-based claims</li>
                       <li className="flex gap-2 text-black text-black text-black text-black text-black text-black text-black text-black text-black"><span className="text-brand-red text-black text-black text-black">✓</span> Identifies temporal markers</li>
                       <li className="flex gap-2 text-black text-black text-black text-black text-black text-black text-black text-black text-black text-black text-black"><span className="text-brand-red text-black text-black text-black">✓</span> Assigns Block_ID mapping</li>
                    </ul>
                 </BrutalCard>

                 <BrutalCard className="p-6 space-y-4 text-black text-black text-black text-black" color="bg-brand-cyan">
                    <h3 className="text-lg font-bold uppercase tracking-tighter flex items-center gap-2 border-b border-black pb-2 text-black text-black text-black text-black text-black">
                       <Database size={18} className="text-black text-black text-black text-black" /> 02. RAG Grounding
                    </h3>
                    <p className="text-[11px] leading-relaxed text-black font-bold uppercase italic text-black text-black text-black text-black text-black text-black text-black text-black text-black">
                       Each claim block is converted into a vector embedding and queried against our Authority Corpus (WHO, PubMed, Snopes) in ChromaDB.
                    </p>
                    <div className="bg-black text-brand-green brutal-border border-[1px] p-3 font-mono text-[7px] leading-tight text-brand-green text-black text-black text-black text-black">
                       &gt; SEARCHING_VERIFIED_CORPUS... <br />
                       &gt; HASH_MATCH: SN_4022-X <br />
                       &gt; FETCHING_EVIDENCE_STREAM...
                    </div>
                 </BrutalCard>
              </div>

              <div className="space-y-6 text-black text-black text-black text-black">
                 <BrutalCard className="p-6 space-y-4 text-black text-black text-black text-black" color="bg-brand-yellow">
                    <h3 className="text-lg font-bold uppercase tracking-tighter flex items-center gap-2 border-b border-black pb-2 text-black text-black text-black text-black text-black">
                       <Globe size={18} className="text-brand-red text-black text-black text-black text-black text-black" /> 03. Live Web Sync
                    </h3>
                    <p className="text-[11px] leading-relaxed text-black font-bold uppercase text-black text-black text-black text-black text-black text-black text-black">
                       When static records are insufficient, agents bridge to the live web using Serper (Google) and Wikipedia APIs for real-time corroboration.
                    </p>
                    <div className="flex gap-2 text-black text-black text-black text-black text-black text-black">
                       <div className="bg-white brutal-border border-[1px] p-2 flex-1 text-center font-bold text-[7px] text-black text-black text-black">SIGNAL_REALTIME</div>
                       <div className="bg-white brutal-border border-[1px] p-2 flex-1 text-center font-bold text-[7px] text-black text-black text-black">CROSS_REF_WIKI</div>
                    </div>
                 </BrutalCard>

                 <BrutalCard className="p-6 space-y-4 text-white text-black text-black text-black text-black" color="bg-black">
                    <h3 className="text-lg font-bold uppercase tracking-tighter flex items-center gap-2 border-b border-white/20 pb-2 text-brand-green text-brand-green text-black text-black">
                       <Scale size={18} className="text-white text-black text-black text-black" /> 04. NLI Inference
                    </h3>
                    <p className="text-[11px] leading-relaxed text-slate-300 font-medium italic text-white text-slate-300 text-black text-black text-black">
                       A finetuned DeBERTa-v3 model acts as the "Neutral Judge," calculating the logical alignment between claims and retrieved evidence.
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-black text-black text-black text-black">
                       <div className="bg-brand-green/20 text-brand-green text-[6px] font-bold p-1 text-center brutal-border border-white/20 text-black text-black">SUPPORTED</div>
                       <div className="bg-brand-red/20 text-brand-red text-[6px] font-bold p-1 text-center brutal-border border-white/20 text-black text-black">REFUTED</div>
                       <div className="bg-brand-yellow/20 text-brand-yellow text-[6px] font-bold p-1 text-center brutal-border border-white/20 text-brand-yellow text-black">NEI_LEVEL</div>
                    </div>
                 </BrutalCard>
              </div>
            </div>

            <BrutalCard className="p-8 text-black text-black text-black" color="bg-white">
               <div className="flex items-center gap-4 mb-6 border-b-2 border-black pb-4 text-black text-black">
                  <Activity size={24} className="text-brand-cyan text-black text-black" />
                  <h3 className="text-2xl font-bold uppercase tracking-tighter text-black text-black">Forensic Synthesis Engine</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-bold uppercase text-[9px] text-slate-400 text-black text-black">
                  <div className="space-y-1 text-black text-black">
                    <div className="text-xl text-black font-black italic underline decoration-brand-yellow decoration-4 text-black text-black">SCORE_CALC</div>
                    <p className="text-black text-black">Weighted confidence averaging of all claim-blocks.</p>
                  </div>
                  <div className="space-y-1 text-black text-black text-black">
                    <div className="text-xl text-black font-black italic underline decoration-brand-cyan decoration-4 text-black text-black">REPORT_GEN</div>
                    <p className="text-black text-black">Journalistic agent summary with authority citations.</p>
                  </div>
                  <div className="space-y-1 text-black text-black text-black">
                    <div className="text-xl text-black font-black italic underline decoration-brand-red decoration-4 text-black text-black">LEDGER_STAMP</div>
                    <p className="text-black text-black">Tamper-proof forensic session hashing for auditing.</p>
                  </div>
               </div>
            </BrutalCard>
          </div>
        )}

      </main>

      {/* Retro Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-1.5 text-[6px] font-mono flex justify-between uppercase tracking-[0.4em] z-50 px-6 text-black text-black">
        <div className="flex gap-6 text-black text-black">
          <span className="text-white">// STATUS: {loading ? 'AUDITING' : 'STANDBY'}</span>
          <span className="hidden md:inline text-white">// CORE_LATENCY: 24MS</span>
        </div>
        <div className="text-black text-black">
          <span className="text-white">© 2026 AUDIT_KERNEL // NO_DATA_LEAK</span>
        </div>
      </div>
    </div>
  );
}

export default App;
