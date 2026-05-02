import React, { useState, useEffect, useRef } from 'react';
import { Shield, Search, Zap, CheckCircle, AlertTriangle, FileText, Globe, Cpu, Database, Activity, Lock, Hash, Clock, BarChart3, Fingerprint, Terminal, Scale, Layers, HelpCircle, GitGraph } from 'lucide-react';
import gsap from 'gsap';
import ReactMarkdown from 'react-markdown';

// --- Neo-Brutalist Components ---

const BrutalCard = ({ children, className = "", color = "bg-white", id = "" }) => (
  <div id={id} className={`brutal-border brutal-shadow ${color} ${className}`}>
    {children}
  </div>
);

const Header = ({ view, setView }) => (
  <header className="border-b-4 border-black p-4 flex justify-between items-center bg-white sticky top-0 z-50">
    <div className="flex items-center gap-2">
      <div className="bg-black text-white p-1">
        <Shield size={24} />
      </div>
      <span className="font-bold text-xl tracking-tighter uppercase">NEURAL_AUDIT.ai</span>
    </div>
    
    <nav className="hidden md:flex gap-6 font-bold text-[10px] tracking-[0.2em] uppercase">
      <button 
        onClick={() => setView('dashboard')} 
        className={`flex items-center gap-2 px-3 py-1 transition-all ${view === 'dashboard' ? 'bg-black text-white' : 'hover:bg-slate-100'}`}
      >
        Dashboard
      </button>
      <button 
        onClick={() => setView('protocol')} 
        className={`flex items-center gap-2 px-3 py-1 transition-all ${view === 'protocol' ? 'bg-black text-white' : 'hover:bg-slate-100'}`}
      >
        <HelpCircle size={14} /> System_Protocol
      </button>
      <div className="flex items-center gap-2 ml-4">
        <div className="w-2 h-2 bg-brand-green animate-pulse"></div>
        <span className="opacity-60 text-[8px]">Backend: Active</span>
      </div>
    </nav>
  </header>
);

const LogicVisualisation = () => (
  <BrutalCard color="bg-white" className="p-8">
    <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 border-b-4 border-black pb-2 flex items-center gap-3">
      <GitGraph size={24} className="text-brand-red" /> LangGraph_Architecture
    </h3>
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="brutal-border px-4 py-2 bg-brand-cyan font-bold text-[10px] uppercase shadow-[2px_2px_0_0_#000]">Raw_Article_Input</div>
      <div className="w-1 h-8 bg-black"></div>
      
      <div className="brutal-border p-4 bg-white font-bold text-sm uppercase text-center w-64 shadow-[4px_4px_0_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform">
        <div className="text-brand-red text-[8px] mb-1">NODE_01</div>
        Claim_Extractor
      </div>
      
      <div className="w-1 h-8 bg-black"></div>
      
      <div className="flex gap-12 items-center relative">
         <div className="absolute top-[-16px] left-1/2 w-48 h-1 bg-black translate-x-[-50%]"></div>
         <div className="absolute top-[-16px] left-0 w-1 h-4 bg-black"></div>
         <div className="absolute top-[-16px] right-0 w-1 h-4 bg-black"></div>
         
         <div className="flex flex-col items-center">
            <div className="brutal-border p-4 bg-brand-yellow font-bold text-sm uppercase text-center w-44 shadow-[4px_4px_0_0_#000]">
               <div className="text-[8px] mb-1 opacity-60">NODE_02</div>
               RAG_Retriever
            </div>
            <div className="w-1 h-8 bg-black"></div>
         </div>
         
         <div className="flex flex-col items-center">
            <div className="brutal-border p-4 bg-brand-red text-white font-bold text-sm uppercase text-center w-44 shadow-[4px_4px_0_0_#000]">
               <div className="text-[8px] mb-1 opacity-60 text-white/60">NODE_03</div>
               Web_Search_Sync
            </div>
            <div className="w-1 h-8 bg-black"></div>
         </div>
      </div>

      <div className="absolute translate-y-[200px] w-48 h-1 bg-black"></div>
      <div className="w-1 h-2 bg-black"></div>

      <div className="brutal-border p-4 bg-white font-bold text-sm uppercase text-center w-64 shadow-[4px_4px_0_0_#000]">
        <div className="text-brand-cyan text-[8px] mb-1">NODE_04</div>
        NLI_Neural_Verifier
      </div>
      
      <div className="w-1 h-8 bg-black"></div>
      
      <div className="brutal-border p-4 bg-brand-green font-bold text-sm uppercase text-center w-64 shadow-[4px_4px_0_0_#000]">
        <div className="text-[8px] mb-1 opacity-60">NODE_05</div>
        Forensic_Report_Writer
      </div>
      
      <div className="w-1 h-8 bg-black"></div>
      
      <div className="brutal-border px-6 py-2 bg-black text-white font-bold text-[10px] uppercase">Validated_Output_Stream</div>
    </div>
  </BrutalCard>
);

const AuditTerminal = ({ logs }) => {
  const scrollRef = useRef();
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <BrutalCard color="bg-black" className="p-6 h-64 overflow-hidden flex flex-col font-mono text-xs text-brand-green">
      <div className="flex justify-between items-center border-b border-brand-green/30 pb-2 mb-4">
        <div className="flex items-center gap-2">
          <Terminal size={14} />
          <span className="uppercase tracking-widest font-bold">Live_Audit_Stream</span>
        </div>
        <span className="opacity-50">UTF-8 // SECURE_LINK</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 custom-scrollbar scroll-smooth">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="opacity-40">[{new Date().toLocaleTimeString()}]</span>
            <span className={log.includes('✓') ? 'text-brand-cyan' : ''}>{log}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="animate-pulse">Awaiting neural input...</div>}
      </div>
    </BrutalCard>
  );
};

// --- App ---

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
    setLogs(["INITIATING_AUDIT_SEQUENCE...", "CONNECTING_TO_LANGGRAPH_NODES..."]);
    setStatus("Establishing Link");

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8001' : window.location.host;
    ws.current = new WebSocket(`${protocol}//${host}/ws/audit`);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') {
        setStatus(data.message);
        setProgress(data.progress);
        setLogs(prev => [...prev, `✓ NODE_SYNC: ${data.message}`]);
      } else if (data.type === 'result') {
        setResults(data);
        setLoading(false);
        setLogs(prev => [...prev, "✓ ANALYSIS_COMPLETE", "✓ COMPILING_FORENSIC_REPORT"]);
        setTimeout(() => {
          const resultsEl = document.getElementById('results');
          if (resultsEl) {
             resultsEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      } else if (data.type === 'error') {
        setLogs(prev => [...prev, `✖ ERROR: ${data.message}`]);
        setLoading(false);
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
    <div className="min-h-screen bg-brand-beige selection:bg-brand-cyan">
      <Header view={view} setView={setView} />
      
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-32">
        
        {view === 'dashboard' ? (
          <>
            {/* Intro Section */}
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase leading-none mb-4">
                  Neural <br /> <span className="text-brand-red">Verification</span> <br /> Protocol.
                </h1>
                <p className="max-w-xl text-sm font-bold uppercase leading-tight border-l-8 border-black pl-4">
                  Deep-block claim extraction and cross-node validation. 
                  Powered by LangGraph, ChromaDB, and Finetuned NLI Models.
                </p>
              </div>
              <button 
                onClick={() => setView('protocol')}
                className="brutal-btn bg-brand-cyan hover:bg-black hover:text-white transition-colors flex items-center gap-2 mb-2"
              >
                <HelpCircle size={18} /> System_Description
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left: Input Terminal */}
              <div className="lg:col-span-8 space-y-8">
                <BrutalCard className="p-0 overflow-hidden" color="bg-white">
                   <div className="bg-brand-cyan border-b-4 border-black p-3 flex justify-between items-center">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-black rounded-full" />
                        <div className="w-3 h-3 bg-black rounded-full opacity-30" />
                        <div className="w-3 h-3 bg-black rounded-full opacity-10" />
                      </div>
                      <span className="font-bold text-[10px] uppercase tracking-widest">Input_Stream_Interface</span>
                   </div>
                   <div className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <Globe size={14} className="text-brand-red" /> Target Source URL
                          </label>
                          <input 
                            type="text" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://..." 
                            className="brutal-input font-mono" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            <Fingerprint size={14} className="text-brand-green" /> Session Signature
                          </label>
                          <input 
                            type="text" 
                            readOnly
                            value={`AUDIT_ID_${Math.floor(Math.random()*10000)}`}
                            className="brutal-input font-mono bg-slate-100 cursor-not-allowed" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2 relative">
                        <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                          <FileText size={14} className="text-brand-yellow" /> Article Body Content
                        </label>
                        <textarea 
                          value={article}
                          onChange={(e) => setArticle(e.target.value)}
                          placeholder="Paste text for decomposition..." 
                          className="brutal-input h-96 text-lg resize-none font-mono"
                        />
                        {loading && <div className="scan-line" />}
                      </div>

                      <button 
                        onClick={startAudit}
                        disabled={loading || !article}
                        className="w-full brutal-btn bg-black text-white text-2xl py-6 flex items-center justify-center gap-4 group disabled:opacity-50"
                      >
                        <Zap size={28} className="group-hover:text-brand-yellow transition-colors" fill="currentColor" />
                        <span>Run Neural Audit</span>
                      </button>
                   </div>
                </BrutalCard>

                {loading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                    <BrutalCard className="p-8 space-y-6">
                      <div className="flex justify-between items-end">
                         <div>
                           <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Active Node</div>
                           <h3 className="font-bold text-2xl uppercase tracking-tighter text-brand-red">{status}</h3>
                         </div>
                         <div className="font-mono font-bold text-4xl text-black">{progress}%</div>
                      </div>
                      <div className="brutal-border h-10 bg-slate-100 p-1">
                         <div 
                          className="h-full bg-brand-green transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,230,118,0.5)]" 
                          style={{ width: `${progress}%` }} 
                         />
                      </div>
                    </BrutalCard>
                    <AuditTerminal logs={logs} />
                  </div>
                )}
              </div>

              {/* Right: Technical Stats */}
              <div className="lg:col-span-4 space-y-8">
                <BrutalCard color="bg-brand-yellow" className="p-8">
                   <div className="flex items-center gap-3 border-b-4 border-black pb-4 mb-8">
                      <Cpu size={24} />
                      <h3 className="font-bold text-xl uppercase tracking-tighter">Backend_Logic</h3>
                   </div>
                   <div className="space-y-8">
                      {[
                        { node: "claim_extractor", title: "Atomic Extraction", desc: "LLM isolates verifiable factual claims." },
                        { node: "rag_retriever", title: "RAG Evidence", desc: "ChromaDB search over snopes/WHO/PubMed." },
                        { node: "web_search", title: "Live Validation", desc: "Serper + Wikipedia real-time search." },
                        { node: "nli_verifier", title: "NLI Inference", desc: "Finetuned DeBERTa-v3 cross-verification." }
                      ].map((item, i) => (
                        <div key={i} className={`flex gap-4 p-4 border-2 border-black transition-all ${status.toLowerCase().includes(item.node.split('_')[0]) ? 'bg-black text-white translate-x-2' : 'bg-white/50'}`}>
                           <div className={`p-2 brutal-border self-start ${status.toLowerCase().includes(item.node.split('_')[0]) ? 'bg-brand-green' : 'bg-white'}`}>
                              {i === 0 ? <Search size={16} /> : i === 1 ? <Database size={16} /> : i === 2 ? <Globe size={16} /> : <Scale size={16} />}
                           </div>
                           <div>
                              <div className="font-bold text-xs uppercase">{item.title}</div>
                              <div className="text-[10px] leading-tight mt-1 opacity-70">{item.desc}</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </BrutalCard>

                <BrutalCard className="p-8 space-y-6" color="bg-white">
                   <div className="flex items-center gap-3 border-b-4 border-black pb-4 mb-4">
                      <Layers size={24} />
                      <h3 className="font-bold text-xl uppercase tracking-tighter">Corpus_Stats</h3>
                   </div>
                   <div className="space-y-4 font-bold text-sm">
                      <div className="flex justify-between"><span>Vector_Dimensions</span><span className="font-mono">384</span></div>
                      <div className="flex justify-between text-brand-red"><span>Active_Agents</span><span className="font-mono">06</span></div>
                      <div className="flex justify-between"><span>Model_v</span><span className="font-mono text-brand-green">1.0.4-stable</span></div>
                   </div>
                </BrutalCard>
              </div>
            </div>

            {/* Results: Forensic Report */}
            {results && (
              <div id="results" className="mt-32 space-y-16 animate-in slide-in-from-bottom duration-1000">
                
                {/* Summary Banner */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <BrutalCard className="md:col-span-3 p-10 bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                       <Shield size={200} />
                    </div>
                    <div className="flex justify-between items-center mb-8">
                       <div className="bg-black text-white px-4 py-2 font-mono text-xs">HASH: {Math.random().toString(16).substr(2, 16)}</div>
                       <div className="brutal-border px-4 py-2 text-xs font-bold uppercase bg-brand-cyan">Verified_Status</div>
                    </div>
                    <h2 className="text-5xl font-bold uppercase tracking-tighter mb-4">Audit Forensic Summary</h2>
                    <p className="text-slate-600 text-lg font-medium leading-tight max-w-2xl">
                       Analysis of {results.verified_claims.length} atomic claims detected {results.verified_claims.filter(c => c.verdict === 'REFUTED').length} refuted statements. 
                       Logical consistency remains within the {(results.score * 10).toFixed(1)} percentile.
                    </p>
                  </BrutalCard>
                  
                  <BrutalCard color="bg-brand-yellow" className="p-8 flex flex-col justify-center text-center">
                     <div className="text-xs font-bold uppercase mb-4 tracking-widest text-slate-700">Credibility_Score</div>
                     <div className="text-[8rem] font-bold leading-none mb-4 tabular-nums">{(results.score * 10).toFixed(0)}</div>
                     <div className="brutal-border h-6 bg-white p-1">
                        <div 
                          className="h-full bg-black transition-all duration-[2000ms]" 
                          style={{ width: `${results.score * 100}%` }} 
                        />
                     </div>
                     <div className="mt-6 font-bold uppercase text-sm">Rating: {results.score > 0.6 ? 'A+ High Trust' : results.score > 0.3 ? 'B- Mixed' : 'F- Compromised'}</div>
                  </BrutalCard>
                </div>

                {/* Claims Matrix */}
                <div className="space-y-8">
                   <h3 className="text-4xl font-bold uppercase tracking-tighter flex items-center gap-4">
                      <div className="w-12 h-4 bg-brand-red"></div>
                      Verification Matrix
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {results.verified_claims.map((claim, i) => (
                        <BrutalCard key={i} className="p-0 overflow-hidden flex flex-col group hover:scale-[1.02] transition-transform">
                           <div className={`h-6 border-b-4 border-black ${claim.verdict === 'SUPPORTED' ? 'bg-brand-green' : claim.verdict === 'REFUTED' ? 'bg-brand-red' : 'bg-brand-yellow'}`}></div>
                           <div className="p-8 space-y-6 flex-1">
                              <div className="flex justify-between items-center">
                                 <div className="brutal-border px-3 py-1 text-[10px] font-bold uppercase bg-white">{claim.verdict}</div>
                                 <div className="font-mono text-[10px] opacity-30">BLOCK_{i+1}</div>
                              </div>
                              <h4 className="text-2xl font-bold leading-[1.1] tracking-tight">"{claim.claim}"</h4>
                              <div className="bg-brand-beige brutal-border p-5 space-y-3 shadow-inner">
                                 <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                                    <Activity size={12} /> Neural_Rationale
                                 </div>
                                 <p className="text-sm font-bold leading-snug">{claim.explanation}</p>
                              </div>
                              <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
                                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conf: {(claim.confidence * 100).toFixed(0)}%</div>
                                 <Fingerprint size={16} className="opacity-10" />
                              </div>
                           </div>
                        </BrutalCard>
                      ))}
                   </div>
                </div>

                {/* Detailed Markdown Report */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <BrutalCard className="lg:col-span-2 p-12 bg-white">
                      <div className="flex items-center gap-4 mb-10 border-b-4 border-black pb-6">
                        <FileText size={32} />
                        <h3 className="text-4xl font-bold uppercase tracking-tighter">Full_Synthesis_Log</h3>
                      </div>
                      <div className="prose prose-slate max-w-none prose-headings:uppercase prose-headings:tracking-tighter prose-strong:text-brand-red">
                        <ReactMarkdown>{results.report}</ReactMarkdown>
                      </div>
                   </BrutalCard>
                   
                   <div className="space-y-8">
                      <BrutalCard className="p-8 bg-black text-white text-center space-y-6">
                        <div className="w-20 h-20 brutal-border bg-white mx-auto flex items-center justify-center">
                           <CheckCircle size={40} className="text-black" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-brand-cyan uppercase tracking-[0.3em] mb-2">Authenticity_Stamp</div>
                          <h4 className="text-xl font-bold uppercase italic">Report_Validated</h4>
                        </div>
                      </BrutalCard>
                      
                      <BrutalCard className="p-8 space-y-4" color="bg-brand-cyan">
                        <h4 className="font-bold uppercase tracking-tighter text-black">Export Options</h4>
                        <button className="w-full brutal-btn bg-white text-xs text-black">Download_PDF</button>
                        <button className="w-full brutal-btn bg-white text-xs text-black">Share_Verification</button>
                        <button className="w-full brutal-btn bg-brand-red text-white text-xs border-black shadow-none mt-4">Purge_Session</button>
                      </BrutalCard>
                   </div>
                </div>

              </div>
            )}
          </>
        ) : (
          /* Protocol & Logic View */
          <div className="animate-in fade-in duration-500 space-y-12">
            <div className="flex justify-between items-center border-b-4 border-black pb-4">
              <div>
                <h2 className="text-4xl font-black tracking-tighter uppercase mb-1">System_Protocol_Documentation</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Core_Operations // NeuralAudit v1.4.2</p>
              </div>
              <button 
                onClick={() => setView('dashboard')}
                className="brutal-btn bg-black text-white px-6 py-2"
              >
                Return_To_Dashboard
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="space-y-8">
                  <BrutalCard color="bg-brand-yellow" className="p-8">
                     <h3 className="text-3xl font-black uppercase tracking-tighter italic border-b-4 border-black inline-block pb-1 mb-6">Mission_Objective</h3>
                     <p className="text-lg font-bold leading-tight uppercase mb-6">
                        NeuralAudit is a high-precision forensic engine designed to dismantle digital deception. 
                        By leveraging a decentralized node-based architecture, the system isolates individual assertions within any text and subjects them to multi-layered cross-verification against authoritative global datasets.
                     </p>
                     <div className="flex gap-4">
                        <div className="bg-white brutal-border border-[2px] px-4 py-2 text-[10px] font-black uppercase">Forensic_Grade</div>
                        <div className="bg-white brutal-border border-[2px] px-4 py-2 text-[10px] font-black uppercase">Zero_Bias_Protocol</div>
                     </div>
                  </BrutalCard>

                  <BrutalCard className="p-8" color="bg-white">
                     <h3 className="text-2xl font-bold uppercase tracking-tighter mb-6 border-b-2 border-black pb-2">Technical_Foundation</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <div className="font-black text-[10px] text-brand-red uppercase">LLM_Backbone</div>
                           <div className="font-bold">Llama-3.3-70B</div>
                        </div>
                        <div className="space-y-2">
                           <div className="font-black text-[10px] text-brand-green uppercase">Vector_DB</div>
                           <div className="font-bold">ChromaDB (MMR)</div>
                        </div>
                        <div className="space-y-2">
                           <div className="font-black text-[10px] text-brand-cyan uppercase">NLI_Model</div>
                           <div className="font-bold">DeBERTa-v3-Base</div>
                        </div>
                        <div className="space-y-2">
                           <div className="font-black text-[10px] text-brand-yellow uppercase">Orchestrator</div>
                           <div className="font-bold">LangGraph</div>
                        </div>
                     </div>
                  </BrutalCard>
               </div>

               <LogicVisualisation />
            </div>

            <BrutalCard className="p-8" color="bg-brand-cyan">
               <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Operational_Flow</h3>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold uppercase">
                  <div className="p-4 bg-white brutal-border">
                     <div className="mb-2 text-brand-red">01. Extract</div>
                     Decomposes narrative into atomic factual assertions.
                  </div>
                  <div className="p-4 bg-white brutal-border">
                     <div className="mb-2 text-brand-red">02. Ground</div>
                     MMR Search across WHO, Snopes, PubMed archives.
                  </div>
                  <div className="p-4 bg-white brutal-border">
                     <div className="mb-2 text-brand-red">03. Sync</div>
                     Live web verification via Serper API + Wikipedia.
                  </div>
                  <div className="p-4 bg-white brutal-border">
                     <div className="mb-2 text-brand-red">04. Judge</div>
                     Neural NLI calculates Support/Refute alignment.
                  </div>
               </div>
            </BrutalCard>
          </div>
        )}

      </main>

      {/* Retro Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black text-white p-2 text-[8px] font-mono flex justify-between uppercase tracking-widest z-50 px-8">
        <div className="flex gap-8">
          <span>// STATUS: {loading ? 'AUDITING' : 'STANDBY'}</span>
          <span className="hidden md:inline">// KERNEL_V: 1.4.2</span>
          <span className="hidden md:inline">// LATENCY: {loading ? '42MS' : '0MS'}</span>
        </div>
        <div>
          <span>© 2026 AUDIT_KERNEL // NO_DATA_LEAK</span>
        </div>
      </div>
    </div>
  );
}

export default App;
