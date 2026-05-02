// Register GSAP Plugins
gsap.registerPlugin(TextPlugin);

// Initial Page Entry
window.addEventListener("DOMContentLoaded", () => {
    const tl = gsap.timeline();
    
    tl.to(".header-anim", { opacity: 1, duration: 1, ease: "power2.out" })
      .to(".input-card", { opacity: 1, y: 0, duration: 1, ease: "back.out(1.2)" }, "-=0.5");
});

const auditBtn = document.getElementById("audit-btn");
const articleInput = document.getElementById("article-input");
const urlInput = document.getElementById("url-input");
const inputSection = document.getElementById("input-section");
const progressSection = document.getElementById("progress-section");
const resultsSection = document.getElementById("results-section");
const statusText = document.getElementById("status-text");
const progressText = document.getElementById("progress-text");
const neuralLineProgress = document.querySelector(".neural-line-progress");

let ws;

auditBtn.addEventListener("click", () => {
    const article = articleInput.value.trim();
    if (!article) {
        gsap.to(articleInput, { x: 10, duration: 0.1, yoyo: true, repeat: 3 });
        return;
    }

    // High-fidelity transition out
    const tl = gsap.timeline({
        onComplete: () => {
            inputSection.classList.add("hidden");
            startAudit(article, urlInput.value.trim());
        }
    });

    tl.to(".header-anim", { opacity: 0.5, scale: 0.9, duration: 0.8, ease: "power2.inOut" })
      .to(inputSection, { opacity: 0, y: -50, filter: "blur(10px)", duration: 0.6, ease: "power2.in" }, "-=0.4");
});

function startAudit(article, url) {
    progressSection.classList.remove("hidden");
    gsap.from(progressSection, { opacity: 0, y: 50, duration: 1, ease: "power3.out" });
    
    // Connect WS
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${protocol}//${window.location.host}/ws/audit`);
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            article: article,
            url: url,
            thread_id: "audit-" + Math.random().toString(36).substr(2, 9)
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "status") {
            updateNeuralMap(data.progress, data.message);
        }
        else if (data.type === "result") {
            renderResults(data);
        }
        else if (data.type === "error") {
            statusText.innerText = `ERROR: ${data.message}`;
            statusText.style.color = "#ef4444";
        }
    };
}

function updateNeuralMap(progress, message) {
    // Update progress text with count-up
    const currentPct = parseInt(progressText.innerText);
    gsap.to({val: currentPct}, {
        val: progress,
        duration: 1,
        ease: "power1.out",
        onUpdate: function() {
            progressText.innerText = Math.round(this.targets()[0].val) + "% COMPLETE";
        }
    });

    // Update status text with typewriter
    gsap.to(statusText, { text: message, duration: 0.5 });

    // Update neural line
    gsap.to(neuralLineProgress, { width: `${progress}%`, duration: 1, ease: "power2.inOut" });

    // Activate neural steps
    const steps = ["claim_extractor", "rag_retriever", "web_search", "nli_verifier", "report_writer"];
    // Note: the backend may send custom steps, we map them
    steps.forEach((stepId, idx) => {
        const stepEl = document.querySelector(`[data-step="${stepId}"]`);
        if (!stepEl) return;

        const threshold = (idx) * 20; 
        if (progress > threshold) {
            if (progress >= threshold + 20) {
                stepEl.classList.add("completed");
                stepEl.classList.remove("active");
            } else {
                stepEl.classList.add("active");
            }
        }
    });
}

function renderResults(data) {
    const tl = gsap.timeline({
        onComplete: () => {
            progressSection.classList.add("hidden");
            resultsSection.classList.remove("hidden");
            buildResultsUI(data);
        }
    });

    tl.to(progressSection, { opacity: 0, scale: 0.9, filter: "blur(10px)", duration: 0.8, ease: "power2.in" });
}

function buildResultsUI(data) {
    const { score, verified_claims, report } = data;
    
    // 1. Header & Score Animation
    gsap.from(".header-anim", { opacity: 0, scale: 1.1, duration: 1 });
    gsap.to(".header-anim", { opacity: 1, scale: 1, duration: 1 });

    const scoreVal = (score * 10).toFixed(1);
    const scorePct = (score * 100);
    const dashOffset = 264 - (264 * score);

    let color = "#6366f1"; // Default Indigo
    if (score < 0.35) color = "#ef4444"; // Red
    else if (score <= 0.65) color = "#f59e0b"; // Amber
    else color = "#10b981"; // Emerald

    document.getElementById("score-circle").style.stroke = color;
    document.getElementById("final-score").style.color = color;

    // Animate radial score
    gsap.to("#score-circle", { strokeDashoffset: dashOffset, duration: 2, ease: "expo.out", delay: 0.5 });
    
    // Count up number
    const scoreObj = { val: 0 };
    gsap.to(scoreObj, {
        val: scoreVal,
        duration: 2,
        ease: "expo.out",
        delay: 0.5,
        onUpdate: () => {
            document.getElementById("final-score").innerText = scoreObj.val.toFixed(1);
        }
    });

    // 2. Render Claims
    const container = document.getElementById("claims-container");
    container.innerHTML = "";
    document.getElementById("claim-count").innerText = `${verified_claims.length} CLAIMS`;

    verified_claims.forEach((c, i) => {
        const card = document.createElement("div");
        card.className = `claim-card-hifi opacity-0 translate-y-12 v-${c.verdict.replace(/ /g, '')}`;
        card.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
                <div class="badge-pill b-${c.verdict.replace(/ /g, '')}">${c.verdict}</div>
                <div class="text-xs font-black text-slate-300 tracking-widest font-mono">NEURAL CONFIDENCE: ${Math.round(c.confidence*100)}%</div>
            </div>
            <h4 class="text-xl font-bold text-slate-900 mb-4 leading-snug">"${c.claim}"</h4>
            <div class="text-slate-600 text-sm leading-relaxed mb-4">${c.explanation}</div>
            ${c.evidence_snippets ? `
                <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div class="text-[10px] font-black text-slate-400 mb-2 tracking-widest uppercase">Primary Evidence Snippet</div>
                    <div class="text-xs text-slate-500 italic line-clamp-2">${c.evidence_snippets[0]}</div>
                </div>
            ` : ''}
        `;
        container.appendChild(card);
    });

    // Staggered reveal
    gsap.to(".claim-card-hifi", {
        opacity: 1,
        y: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power4.out",
        delay: 1
    });

    // 3. Report Synthesis
    document.getElementById("report-content").innerHTML = marked.parse(report);
    gsap.from("#report-container", { opacity: 0, y: 50, duration: 1.2, ease: "power3.out", delay: 1.5 });
}
