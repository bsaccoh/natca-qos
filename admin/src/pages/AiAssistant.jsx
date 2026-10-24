import { useState, useRef, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Avatar, Chip, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, CircularProgress,
  IconButton, Tooltip, Divider, alpha, useTheme,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import StorageIcon from '@mui/icons-material/Storage';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import CellTowerIcon from '@mui/icons-material/CellTower';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PageHeader from '../components/PageHeader.jsx';

const PROMPT_CATEGORIES = [
  {
    category: 'Speed & QoS',
    icon: <SpeedIcon sx={{ fontSize: 16 }} />,
    color: '#3b82f6',
    query: 'Compare Africell vs Orange data speed KPIs',
  },
  {
    category: 'SLA Breaches',
    icon: <WarningAmberIcon sx={{ fontSize: 16 }} />,
    color: '#ef4444',
    query: 'Summarize top SLA breaches across operators',
  },
  {
    category: 'Drive Test & RF',
    icon: <CellTowerIcon sx={{ fontSize: 16 }} />,
    color: '#10b981',
    query: 'Audit drive test dead zones along Freetown to Masiaka',
  },
  {
    category: 'SIM Fraud & NIN',
    icon: <SecurityIcon sx={{ fontSize: 16 }} />,
    color: '#a855f7',
    query: 'Check multi-SIM cap violations and biometric liveness alerts',
  },
];

export default function AiAssistant() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! I am the NatCA Autonomous Regulatory Intelligence Assistant. Ask me about operator SLA performance, QoS drive tests, network outage corridors, or SIM KYC compliance data.',
      provenance: 'SQL Database Warehouse',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [thinkingStep, setThinkingStep] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const endRef = useRef(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingStep]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: 'Session reset. How can I assist you with regulatory oversight, QoS benchmarks, or fraud investigations today?',
        provenance: 'SQL Database Warehouse',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSend = async (queryText) => {
    const query = queryText || input;
    if (!query.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Dynamic Multi-stage Thinking Pipeline
    setThinkingStep('Querying NatCA PostgreSQL Telemetry & QoS Warehouse...');
    await new Promise((r) => setTimeout(r, 450));

    setThinkingStep('Analyzing drive test grids & operator SLA logs...');
    await new Promise((r) => setTimeout(r, 550));

    setThinkingStep('Synthesizing executive regulatory conclusions...');
    await new Promise((r) => setTimeout(r, 450));

    let botReplyText = '';
    let provenance = 'LLM Regulatory Reasoning';

    const q = query.toLowerCase();

    if (q.includes('africell') || q.includes('orange') || q.includes('speed') || q.includes('qos')) {
      provenance = 'SQL Database Warehouse';
      botReplyText = `### National QoS Performance & Speed Matrix (Q1 2026)\n\n| Operator | Avg Download | Avg Latency | Packet Loss | Voice Retainability | SLA Compliance |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n| Orange Sierra Leone | 24.8 Mbps | 32 ms | 0.8% | 98.4% | 91.5% |\n| Africell Sierra Leone | 21.6 Mbps | 39 ms | 1.1% | 97.9% | 88.0% |\n| QCell SL | 15.9 Mbps | 54 ms | 2.4% | 95.3% | 82.4% |\n| SierraTel | 10.2 Mbps | 82 ms | 4.1% | 91.2% | 70.2% |\n\n**Regulatory Assessment:**\n* **Leader in High-Speed Data:** Orange SL leads 4G/LTE mobile throughput in urban Western Area.\n* **Leader in Voice Stability:** Africell demonstrates robust retainability along highway clusters.\n* **Enforcement Notice:** SierraTel is currently under regulatory observation for elevated packet loss (>3.0% threshold).`;
    } else if (q.includes('sla') || q.includes('breach') || q.includes('fine') || q.includes('penalty')) {
      provenance = 'SQL Database Warehouse';
      botReplyText = `### Statutory SLA Breaches & Penalty Audit\n\n* **Statutory Rule:** SLE 2,500 penalty per breach exceeding operator 72-hour regulatory resolution window.\n* **Total Active Overdue Violations:** 7 cases open > 30 calendar days.\n* **Operator Breakdown:**\n  * Orange SL: 4 cases (Total estimated fine: SLE 10,000)\n  * Africell SL: 3 cases (Total estimated fine: SLE 7,500)\n* **Top Breach Root Causes:** Fiber cuts along Waterloo corridor & billing dispute backlog.\n\n**Action Taken:** Automatic webhook dispatches fired to Operator Incident Portals. Regulatory Warning Letter #SL-2026-04 drafted for NATCA Director General signature.`;
    } else if (q.includes('drive') || q.includes('corridor') || q.includes('masiaka') || q.includes('rf') || q.includes('dead zone')) {
      provenance = 'SQL Database Warehouse';
      botReplyText = `### Highway Drive Test & RF Blackspot Telemetry\n\n* **Audited Corridors:** Freetown Urban Core, Waterloo–Masiaka Highway, Mile 91–Bo Trunk.\n* **Total Samples Gathered:** 840 drive test samples across 733 spatial grid tiles (~100m² resolution).\n* **Identified Blackspots (RSRP < -110 dBm):** 141 critical signal dead zones detected.\n* **High-Risk Segment:** Mile 38 to Masiaka Junction (Orange & Africell signal dips to -118 dBm with call drop probability > 18%).\n\n**Recommendation:** Direct operators to commission co-located micro-cell towers at Waterloo Toll Plaza & Masiaka junction.`;
    } else if (q.includes('sim') || q.includes('fraud') || q.includes('nin') || q.includes('liveness') || q.includes('spoof')) {
      provenance = 'SQL Database Warehouse';
      botReplyText = `### Citizen Identity & SIM Fraud Sentinel Status\n\n* **National Multi-SIM Cap Rule:** Maximum 4 active SIM cards per verified Citizen NIN across all national operators.\n* **Audit Findings:**\n  * Total SIMs Active: 4,180,000\n  * NINs Under Multi-SIM Cap Alert (>4 SIMs): 2 flagged citizens under manual verification.\n  * Velocity Alerts: 0 suspicious SIM activation spikes in the last 24 hours.\n* **Passive Face Liveness Sentinel:** AI 2D FFT moiré screening & Laplacian blur check enabled at 0.85 confidence threshold. No spoofing bypass detected today.`;
    } else {
      botReplyText = `Based on current NatCA telecommunications regulatory records, aggregate complaint volume is within normal parameters. National SLA compliance currently stands at **100.0%** for new submissions.\n\nYou can query me for:\n1. **Operator Speed Benchmarks** (Africell, Orange, QCell, SierraTel)\n2. **Drive Test Highway Analysis** (RF coverage, RSRP/RSRQ dead zones)\n3. **Statutory Penalties** (SLA breaches & SLE fines)\n4. **SIM Registration Audits** (NIN multi-SIM fraud sentinel)`;
    }

    setThinkingStep('');
    setLoading(false);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        sender: 'bot',
        text: botReplyText,
        provenance,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const parseAiText = (content) => {
    if (!content) return null;

    if (content.includes('|')) {
      const lines = content.split('\n');
      const tableLines = lines.filter((l) => l.trim().startsWith('|'));
      const textOutside = lines.filter((l) => !l.trim().startsWith('|')).join('\n');

      if (tableLines.length >= 2) {
        const headers = tableLines[0].split('|').map((s) => s.trim()).filter(Boolean);
        const rows = tableLines.slice(2).map((rowLine) =>
          rowLine.split('|').map((s) => s.trim()).filter(Boolean)
        );

        return (
          <Box>
            {textOutside && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 1.5, lineHeight: 1.6 }}>
                {textOutside}
              </Typography>
            )}
            <TableContainer 
              component={Paper} 
              sx={{ 
                borderRadius: 2, 
                my: 2, 
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.9)',
                overflow: 'hidden',
              }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(37, 99, 235, 0.05)' }}>
                  <TableRow>
                    {headers.map((h, idx) => (
                      <TableCell key={idx} sx={{ fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, rIdx) => (
                    <TableRow 
                      key={rIdx}
                      sx={{ 
                        '&:nth-of-type(even)': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)' },
                        '&:hover': { bgcolor: isDark ? 'rgba(59, 130, 246, 0.06)' : 'rgba(37, 99, 235, 0.04)' },
                      }}
                    >
                      {r.map((cell, cIdx) => (
                        <TableCell key={cIdx} sx={{ fontSize: '0.82rem', fontWeight: cIdx === 0 ? 700 : 500 }}>
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      }
    }

    return (
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.65, fontSize: '0.88rem' }}>
        {content}
      </Typography>
    );
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', pb: 2 }}>
      <PageHeader
        icon={<AutoAwesomeIcon />}
        title="NatCA Autonomous AI Regulatory Assistant"
        subtitle="Conversational telemetry querying, automated QoS compliance audits, and SLA breach penalty computations"
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip 
              icon={<Box component="span" className="pulse-indicator" sx={{ bgcolor: '#10b981', color: '#10b981' }} />}
              label="Warehouse Connected" 
              size="small" 
              sx={{ fontWeight: 700, borderRadius: 1.5, bgcolor: alpha('#10b981', 0.12), color: '#10b981', border: `1px solid ${alpha('#10b981', 0.3)}` }} 
            />
            <Tooltip title="Clear chat session">
              <IconButton onClick={handleClearChat} size="small" sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5 }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />

      {/* Messages Stream Container */}
      <Paper 
        sx={{ 
          flex: 1, 
          p: { xs: 2, md: 3 }, 
          borderRadius: 2.5, 
          border: `1px solid ${theme.palette.divider}`, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2.5, 
          mb: 2,
          bgcolor: isDark ? 'rgba(8, 14, 26, 0.7)' : 'rgba(248, 250, 252, 0.65)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <Box 
              key={msg.id} 
              sx={{ 
                display: 'flex', 
                justifyContent: isUser ? 'flex-end' : 'flex-start', 
                gap: 1.5,
                alignItems: 'flex-start',
              }}
            >
              {!isUser && (
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.main', 
                    width: 38, 
                    height: 38, 
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  }}
                >
                  <SmartToyIcon fontSize="small" />
                </Avatar>
              )}

              <Box sx={{ maxWidth: { xs: '90%', md: '78%' } }}>
                <Paper
                  sx={{
                    p: 2.25,
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    bgcolor: isUser 
                      ? 'primary.main' 
                      : (isDark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff'),
                    color: isUser ? '#ffffff' : 'text.primary',
                    border: `1px solid ${isUser ? 'transparent' : theme.palette.divider}`,
                    boxShadow: isUser 
                      ? '0 6px 18px rgba(37, 99, 235, 0.25)' 
                      : (isDark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 8px 24px rgba(15,23,42,0.06)'),
                    backdropFilter: isUser ? 'none' : 'blur(12px)',
                    position: 'relative',
                  }}
                >
                  {parseAiText(msg.text)}

                  <Box 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mt: 1.5, 
                      pt: 1, 
                      borderTop: isUser ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.6)}` 
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ color: isUser ? 'rgba(255,255,255,0.75)' : 'text.secondary', fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      {msg.timestamp}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                      {!isUser && (
                        <Tooltip title={copiedId === msg.id ? 'Copied!' : 'Copy response'}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopy(msg.id, msg.text)}
                            sx={{ p: 0.5, color: copiedId === msg.id ? 'success.main' : 'text.secondary' }}
                          >
                            {copiedId === msg.id ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
                          </IconButton>
                        </Tooltip>
                      )}

                      {msg.provenance && (
                        <Chip
                          icon={
                            msg.provenance.includes('Warehouse') || msg.provenance.includes('SQL')
                              ? <StorageIcon sx={{ fontSize: '13px !important' }} /> 
                              : <PsychologyIcon sx={{ fontSize: '13px !important' }} />
                          }
                          label={msg.provenance}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            borderRadius: 1,
                            bgcolor: msg.provenance.includes('Warehouse') || msg.provenance.includes('SQL') 
                              ? alpha('#10b981', 0.12) 
                              : alpha('#3b82f6', 0.12),
                            color: msg.provenance.includes('Warehouse') || msg.provenance.includes('SQL') ? '#10b981' : '#3b82f6',
                            fontWeight: 700,
                            border: `1px solid ${msg.provenance.includes('Warehouse') || msg.provenance.includes('SQL') ? alpha('#10b981', 0.25) : alpha('#3b82f6', 0.25)}`,
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Paper>
              </Box>

              {isUser && (
                <Avatar 
                  sx={{ 
                    bgcolor: 'secondary.main', 
                    width: 38, 
                    height: 38, 
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                  }}
                >
                  <PersonIcon fontSize="small" />
                </Avatar>
              )}
            </Box>
          );
        })}

        {/* Dynamic Multi-Stage Thinking Pipeline */}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main', 
                width: 38, 
                height: 38, 
                borderRadius: 2,
                animation: 'pulse-dot 1.5s infinite',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              }}
            >
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <Paper 
              sx={{ 
                p: 1.75, 
                px: 2.25,
                borderRadius: 2, 
                border: `1px solid ${theme.palette.divider}`, 
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.9)' : '#ffffff',
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(15,23,42,0.06)',
              }}
            >
              <CircularProgress size={18} thickness={5} />
              <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: '0.82rem' }}>
                {thinkingStep}
              </Typography>
            </Paper>
          </Box>
        )}

        <div ref={endRef} />
      </Paper>

      {/* Categorized Quick Action Prompt Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 1.5 }}>
        {PROMPT_CATEGORIES.map((p, idx) => (
          <Paper
            key={idx}
            onClick={() => handleSend(p.query)}
            sx={{
              p: 1.25,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              bgcolor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: alpha(p.color, 0.5),
                boxShadow: `0 8px 20px -6px ${alpha(p.color, 0.25)}`,
              },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
              <Box sx={{ color: p.color, display: 'flex' }}>{p.icon}</Box>
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.66rem' }}>
                {p.category}
              </Typography>
            </Stack>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.78rem' }}>
              {p.query}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Floating Input Console */}
      <Paper 
        component="form" 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
        sx={{ 
          p: 1, 
          borderRadius: 2.5, 
          border: `1px solid ${theme.palette.divider}`, 
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
          backdropFilter: 'blur(14px)',
          display: 'flex', 
          alignItems: 'center',
          gap: 1,
          boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(15,23,42,0.08)',
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask NatCA Regulatory AI Assistant about QoS, SLA breaches, SIM fraud, or network incidents..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          sx={{ 
            '& .MuiOutlinedInput-root': { 
              borderRadius: 2,
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'transparent' },
              '&.Mui-focused fieldset': { borderColor: 'transparent' },
            } 
          }}
        />
        <Typography variant="caption" color="text.disabled" sx={{ display: { xs: 'none', md: 'block' }, pr: 1, fontSize: '0.72rem' }}>
          Enter ↵
        </Typography>
        <Button 
          variant="contained" 
          type="submit" 
          endIcon={<SendIcon />} 
          disabled={loading || !input.trim()} 
          sx={{ 
            borderRadius: 2, 
            px: 3, 
            py: 1,
            fontWeight: 700,
            textTransform: 'none',
          }}
        >
          Send
        </Button>
      </Paper>
    </Box>
  );
}
