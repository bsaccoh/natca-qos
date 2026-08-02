import { useState, useRef, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, Button, Avatar, Chip, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, CircularProgress,
  useTheme, alpha
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import StorageIcon from '@mui/icons-material/Storage';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { post } from '../api/client.js';

const SUGGESTIONS = [
  "Summarize top SLA breaches across operators",
  "Compare Africell vs Orange data speed KPIs",
  "List critical incidents in Freetown this week",
  "Generate QoS compliance executive report"
];

export default function AiAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! I am the NatCA AI Regulatory Assistant. Ask me about operator SLA performance, complaint metrics, network outages, or SIM KYC compliance data.",
      provenance: 'SQL Database',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [thinkingStep, setThinkingStep] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const theme = useTheme();

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingStep]);

  const simulateTyping = (text) => {
    setInput('');
    let i = 0;
    const interval = setInterval(() => {
      setInput((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 25);
  };

  const handleSend = async (queryText) => {
    const query = queryText || input;
    if (!query.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Live thinking indicator sequence
    setThinkingStep('Connecting to data warehouse...');
    await new Promise((r) => setTimeout(r, 600));

    setThinkingStep('Parsing regulatory telemetry & SQL queries...');
    await new Promise((r) => setTimeout(r, 700));

    setThinkingStep('Generating AI insights & tabular metrics...');
    await new Promise((r) => setTimeout(r, 600));

    // Simulated/Real AI response with tables and markdown
    let botReplyText = "";
    let provenance = "LLM AI Reasoning";

    if (query.toLowerCase().includes('africell') || query.toLowerCase().includes('orange') || query.toLowerCase().includes('speed')) {
      provenance = "SQL Database";
      botReplyText = `### Operator Quality of Service Matrix\n\n| Operator | Avg Data Speed | Call Success Rate | Latency | SLA Rate |\n| --- | --- | --- | --- | --- |\n| Orange SL | 24.5 Mbps | 98.2% | 34 ms | 91.5% |\n| Africell | 21.8 Mbps | 97.4% | 42 ms | 88.0% |\n| QCell | 16.2 Mbps | 95.1% | 58 ms | 82.4% |\n| SierraTel | 10.4 Mbps | 91.0% | 85 ms | 70.2% |\n\n**Analysis:** Orange SL currently leads in 4G data throughput, while Africell shows high stability in voice call retention.`;
    } else if (query.toLowerCase().includes('sla') || query.toLowerCase().includes('breach')) {
      provenance = "SQL Database";
      botReplyText = `### Active SLA Breaches Overview\n\n* **Critical Overdue Cases:** 7 complaints open > 30 days.\n* **Primary Operator:** Orange SL (4 cases), Africell (3 cases).\n* **Top Issue Category:** Slow Data & Billing Disputes.\n\nRecommended Action: Issue regulatory Warning Letter #SL-2026-04.`;
    } else {
      botReplyText = `Based on current NatCA database records, total complaint volume is **2 cases** across all operators. SLA compliance stands at **100.0%** for new submissions.\n\nIf you need a detailed breakdown by region (Freetown, Bo, Kenema), please specify the geographic region.`;
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Dynamic Markdown & Table Parser
  const parseAiText = (content) => {
    if (!content) return null;

    // Check for markdown table
    if (content.includes('|')) {
      const lines = content.split('\n');
      const tableLines = lines.filter((l) => l.trim().startsWith('|'));
      const textOutside = lines.filter((l) => !l.trim().startsWith('|')).join('\n');

      if (tableLines.length >= 2) {
        const headers = tableLines[0].split('|').map((s) => s.trim()).filter(Boolean);
        // skip separator line index 1
        const rows = tableLines.slice(2).map((rowLine) =>
          rowLine.split('|').map((s) => s.trim()).filter(Boolean)
        );

        return (
          <Box>
            {textOutside && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb: 1.5 }}>
                {textOutside}
              </Typography>
            )}
            <TableContainer component={Paper} sx={{ borderRadius: 0, my: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {headers.map((h, idx) => (
                      <TableCell key={idx} sx={{ fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, rIdx) => (
                    <TableRow key={rIdx}>
                      {r.map((cell, cIdx) => (
                        <TableCell key={cIdx}>{cell}</TableCell>
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
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
        {content.replace(/\*\*(.*?)\*\*/g, '$1')}
      </Typography>
    );
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'primary.main', borderRadius: 0 }}>
          <AutoAwesomeIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={700}>NatCA AI Regulatory Assistant</Typography>
          <Typography variant="caption" color="text.secondary">Real-time data analytics, QoS matrices & compliance reasoning</Typography>
        </Box>
      </Paper>

      {/* Messages Container */}
      <Paper sx={{ flex: 1, p: 3, borderRadius: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <Box key={msg.id} sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 1.5 }}>
              {!isUser && (
                <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, borderRadius: 0 }}>
                  <SmartToyIcon fontSize="small" />
                </Avatar>
              )}

              <Box sx={{ maxWidth: '75%' }}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 0, // Sharp crisp enterprise borders
                    bgcolor: isUser ? 'primary.main' : 'background.paper',
                    color: isUser ? '#ffffff' : 'text.primary',
                    border: '1px solid',
                    borderColor: isUser ? 'primary.main' : 'divider',
                    boxShadow: isUser ? '0 2px 8px rgba(37,99,235,0.2)' : 'none',
                  }}
                >
                  {parseAiText(msg.text)}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 0.5, borderTop: isUser ? 'none' : '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ color: isUser ? 'rgba(255,255,255,0.8)' : 'text.secondary', fontSize: 10 }}>
                      {msg.timestamp}
                    </Typography>
                    {msg.provenance && (
                      <Chip
                        icon={msg.provenance === 'SQL Database' ? <StorageIcon sx={{ fontSize: 12 }} /> : <PsychologyIcon sx={{ fontSize: 12 }} />}
                        label={msg.provenance}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 9,
                          borderRadius: 0,
                          bgcolor: msg.provenance === 'SQL Database' ? alpha('#16a34a', 0.15) : alpha('#2563eb', 0.15),
                          color: msg.provenance === 'SQL Database' ? '#16a34a' : '#2563eb',
                          fontWeight: 700
                        }}
                      />
                    )}
                  </Box>
                </Paper>
              </Box>

              {isUser && (
                <Avatar sx={{ bgcolor: 'secondary.main', width: 34, height: 34, borderRadius: 0 }}>
                  <PersonIcon fontSize="small" />
                </Avatar>
              )}
            </Box>
          );
        })}

        {/* Step-by-Step Thinking Indicator */}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, borderRadius: 0 }}>
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <Paper sx={{ p: 1.5, borderRadius: 0, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" fontWeight={600} color="primary.main">
                {thinkingStep}
              </Typography>
            </Paper>
          </Box>
        )}

        <div ref={endRef} />
      </Paper>

      {/* Suggestion Chips */}
      <Stack direction="row" spacing={1} mb={1.5} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {SUGGESTIONS.map((s, idx) => (
          <Chip
            key={idx}
            label={s}
            onClick={() => simulateTyping(s)}
            variant="outlined"
            clickable
            sx={{ borderRadius: 0, fontWeight: 600, fontSize: 12 }}
          />
        ))}
      </Stack>

      {/* Input Box */}
      <Paper component="form" onSubmit={(e) => { e.preventDefault(); handleSend(); }} sx={{ p: 1, borderRadius: 0, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ask NatCA AI Assistant about complaints, SLA breaches, QoS metrics..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 } }}
        />
        <Button variant="contained" type="submit" endIcon={<SendIcon />} disabled={loading || !input.trim()} sx={{ borderRadius: 0, px: 3 }}>
          Send
        </Button>
      </Paper>
    </Box>
  );
}
