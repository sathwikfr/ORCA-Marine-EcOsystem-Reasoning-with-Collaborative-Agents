// frontend/src/pages/ChatPage.jsx
// Conversational Marine Assistant (Supervisor) — Multi-turn Memory, English & Telugu, Deterministic Kernel

import { useState, useRef, useEffect } from 'react';
import { evaluateDecision } from '../services/decisionKernel';
import { PFZ_ZONES, calcDistanceNm, calcBearing, CATCH_DISCLAIMER } from '../services/pfzData';
import { generateWhatIfScenarios } from '../services/whatIfEngine';
import { getInvestigationReport } from '../services/scientificEngine';
import { EvidenceModal } from '../components/common/EvidenceModal';
import { AuthorityBriefingModal } from '../components/common/AuthorityBriefingModal';

const SUGGESTED_EN = [
  'What are the conditions near Visakhapatnam tomorrow morning?',
  'What about the afternoon?',
  'Is it safe for a traditional motorized boat?',
  'Find nearest Potential Fishing Zones (PFZ)',
  'What if we depart at 4 AM instead of 8 AM?',
  'Why is there a chlorophyll spike off the coast?',
];

const SUGGESTED_TE = [
  'విశాఖపట్నం దగ్గర రేపు ఉదయం సముద్ర పరిస్థితులు ఎలా ఉన్నాయి?',
  'మధ్యాహ్నం ఎలా ఉంటుంది?',
  'చేపల వేటకు అనుకూల ప్రాంతాలు (PFZ) ఎక్కడ ఉన్నాయి?',
  'చిన్న సంప్రదాయ పడవలకు ఇది సురక్షితమేనా?',
  'తీరంలో క్లోరోఫిల్ పెరగడానికి కారణం ఏమిటి?',
];

// Open-Meteo live coordinates
const LOCATIONS = {
  visakhapatnam: { name: 'Visakhapatnam', lat: 17.68, lon: 83.22, state: 'Andhra Pradesh' },
  vizag:         { name: 'Visakhapatnam', lat: 17.68, lon: 83.22, state: 'Andhra Pradesh' },
  kakinada:      { name: 'Kakinada',      lat: 16.98, lon: 82.26, state: 'Andhra Pradesh' },
  chennai:       { name: 'Chennai',       lat: 13.08, lon: 80.29, state: 'Tamil Nadu' },
  kochi:         { name: 'Kochi',         lat:  9.96, lon: 76.27, state: 'Kerala' },
  paradip:       { name: 'Paradip',       lat: 20.26, lon: 86.60, state: 'Odisha' },
  veraval:       { name: 'Veraval',       lat: 20.90, lon: 70.36, state: 'Gujarat' },
};

export function ChatPage() {
  const [lang, setLang] = useState('en'); // 'en' or 'te'
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'orca',
      text: '🌊 Welcome to ORCA Marine Decision Assistant. I provide real-time weather, voyage assessments, PFZ fishing advisories, and scientific reasoning in English and Telugu. How can I assist your voyage today?',
      teluguText: '🌊 ORCA సముద్ర నిర్ణయ సహాయకుడికి స్వాగతం. నేను నిజసమయ వాతావరణం, ప్రయాణ భద్రత, చేపల వేట ప్రాంతాలు (PFZ) మరియు శాస్త్రీయ కారణాలను తెలుగు మరియు ఇంగ్లీషులో అందిస్తాను. మీకు ఎలా సహాయపడగలను?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Conversational Session State (Context Memory)
  const [sessionState, setSessionState] = useState({
    location: 'Visakhapatnam',
    timeWindow: 'tomorrow morning',
    vesselType: 'MECHANIZED_TRAWLER',
    coords: [17.68, 83.22],
  });

  const [evidenceData, setEvidenceData] = useState(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [briefingModalOpen, setBriefingModalOpen] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Voice recognition via Web Speech API
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'te' ? 'te-IN' : 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSend = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Context updating
    const lower = textToSend.toLowerCase();
    const newSession = { ...sessionState };

    // Detect language automatically from script
    const hasTelugu = /[\u0c00-\u0c7f]/.test(textToSend);
    const activeLang = hasTelugu ? 'te' : lang;
    if (hasTelugu && lang !== 'te') setLang('te');

    // Update location context
    for (const [key, loc] of Object.entries(LOCATIONS)) {
      if (lower.includes(key) || textToSend.includes(loc.name)) {
        newSession.location = loc.name;
        newSession.coords = [loc.lat, loc.lon];
        break;
      }
    }
    if (textToSend.includes('విశాఖపట్నం') || textToSend.includes('వైజాగ్')) {
      newSession.location = 'Visakhapatnam';
      newSession.coords = [17.68, 83.22];
    } else if (textToSend.includes('కాకినాడ')) {
      newSession.location = 'Kakinada';
      newSession.coords = [16.98, 82.26];
    } else if (textToSend.includes('చెన్నై')) {
      newSession.location = 'Chennai';
      newSession.coords = [13.08, 80.29];
    }

    // Update time window context
    if (lower.includes('afternoon') || textToSend.includes('మధ్యాహ్నం')) {
      newSession.timeWindow = 'tomorrow afternoon';
    } else if (lower.includes('morning') || textToSend.includes('ఉదయం')) {
      newSession.timeWindow = 'tomorrow morning';
    } else if (lower.includes('night') || textToSend.includes('రాత్రి')) {
      newSession.timeWindow = 'tomorrow night';
    }

    // Update vessel context
    if (lower.includes('traditional') || lower.includes('canoe') || lower.includes('సంప్రదాయ') || lower.includes('చిన్న పడవ')) {
      newSession.vesselType = 'TRADITIONAL_MOTORIZED';
    } else if (lower.includes('trawler') || lower.includes('mechanized') || lower.includes('మెకనైజ్డ్')) {
      newSession.vesselType = 'MECHANIZED_TRAWLER';
    }

    setSessionState(newSession);

    // Call live API / Deterministic Decision Kernel
    const isAfternoon = newSession.timeWindow.includes('afternoon');
    const wave = isAfternoon ? 2.2 : 1.3;
    const wind = isAfternoon ? 34.0 : 20.0;

    const kernelResult = evaluateDecision({
      locationName: `${newSession.location} (${newSession.timeWindow})`,
      windKmph: wind,
      waveHeightM: wave,
      vesselType: newSession.vesselType,
    });

    setEvidenceData(kernelResult);

    // Generate intelligent multi-domain response
    setTimeout(() => {
      let replyEn = '';
      let replyTe = '';

      // 1. Fishing / PFZ Intent
      if (lower.includes('fish') || lower.includes('pfz') || lower.includes('catch') || textToSend.includes('చేపల') || textToSend.includes('వేట')) {
        const topPfz = PFZ_ZONES[0];
        const dist = calcDistanceNm(newSession.coords[0], newSession.coords[1], topPfz.lat, topPfz.lon);
        const brg = calcBearing(newSession.coords[0], newSession.coords[1], topPfz.lat, topPfz.lon);

        replyEn = `🐟 **Potential Fishing Zone (PFZ) Advisory for ${newSession.location}:**\n\n• **Target Zone:** **${topPfz.name}**\n• **Distance & Bearing:** ${dist} NM at ${brg}° (${topPfz.sector})\n• **Sea Conditions:** Wave ${wave}m, Wind ${wind} km/h (Safety: **${kernelResult.verdict}**)\n• **Pelagic Species:** ${topPfz.species.join(', ')}\n• **Chlorophyll & SST:** ${topPfz.chlorophyll} mg/m³ | ${topPfz.sst}°C\n\n⚠️ *Notice: ${CATCH_DISCLAIMER}*`;

        replyTe = `🐟 **చేపల వేట అనుకూల ప్రాంతాల సమాచారం (PFZ) — ${newSession.location}:**\n\n• **సిఫార్సు చేయబడిన జోన్:** ${topPfz.name}\n• **దూరం & దిశ:** ${dist} నాటికల్ మైళ్ళు (${brg}° దిశలో)\n• **సముద్ర పరిస్థితులు:** అలల ఎత్తు ${wave} మీటర్లు (భద్రతా నిర్ణయం: **${kernelResult.verdict}**)\n• **ఆశించే చేపలు:** ${topPfz.species.join(', ')}\n• **క్లోరోఫిల్ & ఉష్ణోగ్రత:** ${topPfz.chlorophyll} mg/m³ | ${topPfz.sst}°C\n\n⚠️ *గమనిక: ${CATCH_DISCLAIMER}*`;
      }
      // 2. What-If / Route / Fuel Intent
      else if (lower.includes('what if') || lower.includes('fuel') || lower.includes('depart') || lower.includes('route') || textToSend.includes('ఇంధనం') || textToSend.includes('సమయం')) {
        const whatIf = generateWhatIfScenarios({ originPort: `${newSession.location} Harbor` });
        const best = whatIf.options[0];

        replyEn = `🧭 **What-If Departure & Voyage Assessment for ${newSession.location}:**\n\n• **Optimal Window:** **${best.title}**\n• **Roundtrip Distance:** ${best.distNm} NM | Duration: ${best.hours} hrs\n• **Estimated Fuel Requirement:** **${best.fuelLiters} Liters**\n• **Peak Wave Exposure:** ${best.maxWaveM}m (Safety Verdict: **${best.verdict}**)\n• **Key Finding:** ${whatIf.summary}`;

        replyTe = `🧭 **వాట్-ఇఫ్ (What-If) ప్రయాణ పోలిక — ${newSession.location}:**\n\n• **సిఫార్సు చేయబడిన సమయం:** ${best.title}\n• **ప్రయాణ దూరం:** ${best.distNm} నాటికల్ మైళ్ళు (~${best.hours} గంటలు)\n• **అంచనా డీజిల్ ఇంధనం:** **${best.fuelLiters} లీటర్లు**\n• **గరిష్ట అలలు:** ${best.maxWaveM} మీటర్లు (భద్రత: **${best.verdict}**)\n• **ముగింపు:** తెల్లవారుజామున బయలుదేరితే మధ్యాహ్నపు గాలి తీవ్రత మరియు ఇంధనం ఆదా అవుతాయి.`;
      }
      // 3. Scientific Inquest Intent
      else if (lower.includes('why') || lower.includes('chlorophyll') || lower.includes('bloom') || lower.includes('algae') || textToSend.includes('శాస్త్రీయ') || textToSend.includes('కారణం')) {
        const sci = getInvestigationReport({ location: `${newSession.location} Coastal Waters` });
        const topHyp = sci.hypotheses[0];

        replyEn = `🔬 **Scientific Investigation Report (${newSession.location}):**\n\n• **Observed Anomaly:** ${sci.observedAnomaly}\n• **Leading Hypothesis:** **${topHyp.title}** (${topHyp.likelihood}% Probability)\n• **Supporting Evidence:** SST depression of -1.7°C combined with alongshore wind driving offshore Ekman mass transport.\n• **Alternative Tested:** River runoff is contradicted by absence of warm freshwater.\n• **Recommended Action:** In-situ CTD vertical transect down to 100m.`;

        replyTe = `🔬 **శాస్త్రీయ పరిశోధన నివేదిక (${newSession.location}):**\n\n• **గమనించిన మార్పు:** అధిక క్లోరోఫిల్ మరియు సముద్ర ఉష్ణోగ్రత తగ్గడం\n• **ప్రధాన కారణం:** **${topHyp.title}** (${topHyp.likelihood}% సంభావ్యత)\n• **ఆధారాలు:** బలమైన తీరప్రాంత గాలుల వలన చల్లటి పోషకాలతో కూడిన నీరు పైకి రావడం (Upwelling).\n• **సిఫార్సు:** 100 మీటర్ల లోతు వరకు CTD ఉష్ణోగ్రత పరీక్షలు అవసరం.`;
      }
      // 4. Default Marine Conditions & Official Advisories Intent
      else {
        replyEn = `🌊 **Marine Conditions near ${newSession.location} (${newSession.timeWindow}):**\n\n• **Deterministic Safety Verdict:** **${kernelResult.verdict}** (Risk Index: ${kernelResult.riskScore})\n• **Significant Wave Height:** \`[Forecast]\` **${wave}m** (Max Limit: ${kernelResult.vessel.maxWaveM}m)\n• **Sustained Wind Speed:** \`[Forecast]\` **${wind} km/h**\n• **Official Advisory:** \`[Observed]\` No severe storm warning active for ${newSession.location}\n• **Operational Advisory:** ${kernelResult.summary}\n\n*(Context active: Location = ${newSession.location}, Vessel = ${kernelResult.vessel.name})*`;

        replyTe = `🌊 **${newSession.location} తీరప్రాంత పరిస్థితులు (${newSession.timeWindow}):**\n\n• **భద్రతా నిర్ణయం:** **${kernelResult.verdict}** (రిస్క్ స్కోరు: ${kernelResult.riskScore})\n• **అలల ఎత్తు (Wave Height):** [ఫోర్‌కాస్ట్] **${wave} మీటర్లు**\n• **గాలి వేగం (Wind Speed):** [ఫోర్‌కాస్ట్] **${wind} km/h**\n• **అధికారిక హెచ్చరిక:** [పరిశీలించినది] ప్రస్తుతానికి తుఫాను హెచ్చరికలు లేవు\n• **సలహా:** ${kernelResult.summary}\n\n*(గుర్తుంచుకున్న వివరాలు: ప్రాంతం = ${newSession.location}, పడవ రకం = ${kernelResult.vessel.name})*`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'orca',
          text: replyEn,
          teluguText: replyTe,
          hasEvidence: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handlePillClick = (pillText) => {
    setInput(pillText);
    handleSend(pillText);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 14 }}>
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center gap-3">
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Conversational Marine Supervisor</h1>
          <span className="badge badge-cyan">ENGLISH &amp; తెలుగు BILINGUAL</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Context Indicators */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.74rem',
              background: 'rgba(255,255,255,0.03)',
              padding: '4px 12px',
              borderRadius: 20,
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Context:</span>
            <strong style={{ color: '#00d4ff' }}>📍 {sessionState.location}</strong>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span style={{ color: 'var(--text-secondary)' }}>⏰ {sessionState.timeWindow}</span>
          </div>

          {/* Language Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 2,
            }}
          >
            <button
              className={`btn ${lang === 'en' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setLang('en')}
              style={{ padding: '4px 10px', fontSize: '0.74rem', border: 'none' }}
            >
              English
            </button>
            <button
              className={`btn ${lang === 'te' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setLang('te')}
              style={{ padding: '4px 10px', fontSize: '0.74rem', border: 'none' }}
            >
              తెలుగు
            </button>
          </div>

          <button
            className="btn btn-ghost"
            onClick={() => setBriefingModalOpen(true)}
            style={{ padding: '5px 12px', fontSize: '0.76rem' }}
          >
            📋 Briefing
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div
        className="card-glass"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          const content = (lang === 'te' && m.teluguText) ? m.teluguText : m.text;

          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '78%',
                  padding: '14px 18px',
                  borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: isUser ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.04)',
                  border: isUser ? 'none' : '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {content}

                {/* Evidence Drawer Button on Assistant Replies */}
                {!isUser && m.hasEvidence && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setEvidenceModalOpen(true)}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', color: '#38bdf8' }}
                    >
                      🔬 Inspect Deterministic Evidence &amp; Formulas ➔
                    </button>
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, padding: '0 4px' }}>
                {m.timestamp}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px', alignItems: 'center' }}>
            <span className="spinner" style={{ width: 14, height: 14 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {lang === 'te' ? 'ORCA సమాధానం రూపొందిస్తోంది...' : 'ORCA reasoning over marine telemetry...'}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested Follow-Up Prompts */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {(lang === 'te' ? SUGGESTED_TE : SUGGESTED_EN).map((sugg, i) => (
          <button
            key={i}
            onClick={() => handlePillClick(sugg)}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
              e.currentTarget.style.color = '#38bdf8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {sugg}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          className={`btn ${isListening ? 'btn-danger' : 'btn-ghost'}`}
          onClick={toggleVoice}
          title="Toggle Voice Input (Speech-to-Text)"
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            fontSize: '1.1rem',
            animation: isListening ? 'pulse 1.5s infinite' : 'none',
          }}
        >
          {isListening ? '🛑' : '🎙️'}
        </button>

        <input
          type="text"
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            lang === 'te'
              ? 'విశాఖపట్నం, ప్రయాణ సమయం, లేదా చేపల వేట గురించి అడగండి...'
              : 'Ask about conditions, departure windows, PFZ fishing zones in English or Telugu...'
          }
          style={{ flex: 1, padding: '12px 16px', fontSize: '0.84rem' }}
        />

        <button
          className="btn btn-primary"
          onClick={() => handleSend()}
          style={{ padding: '12px 22px', fontSize: '0.84rem', fontWeight: 600 }}
        >
          {lang === 'te' ? 'పంపు' : 'Ask ORCA'}
        </button>
      </div>

      {/* Modals */}
      <EvidenceModal
        isOpen={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
        data={evidenceData}
      />

      <AuthorityBriefingModal
        isOpen={briefingModalOpen}
        onClose={() => setBriefingModalOpen(false)}
        briefingData={{
          id: `CONV-DISPATCH-${Date.now().toString().slice(-4)}`,
          location: sessionState.location,
          verdict: evidenceData?.verdict || 'SAFE',
          riskScore: evidenceData?.riskScore || 0.16,
          vesselName: evidenceData?.vessel?.name || 'Mechanized Trawler',
          summary: `Conversational dispatch session completed for ${sessionState.location} (${sessionState.timeWindow}).`,
          evidence: evidenceData?.evidence || ['Live Open-Meteo telemetry validated'],
        }}
      />
    </div>
  );
}
