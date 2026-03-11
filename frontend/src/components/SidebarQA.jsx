import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Button, TextField, Typography, IconButton, Fab, Drawer, Tooltip, Snackbar, Alert, CircularProgress
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { qaService } from '../services/api';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PersonIcon from '@mui/icons-material/Person';
import { colors, gradients, NAVBAR_HEIGHT } from '../theme';

const SidebarQA = ({ jobDescription, resume, open: externalOpen, onClose: externalOnClose }) => {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const handleClose = externalOnClose ? externalOnClose : () => setInternalOpen(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, loading]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;

    setConversation(prev => [...prev, { type: 'question', text: q }]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await qaService.askQuestion(q, jobDescription, resume);
      const ans = res.data.answer || 'No answer received.';
      setConversation(prev => [...prev, { type: 'answer', text: ans }]);
    } catch {
      setConversation(prev => [...prev, { type: 'answer', text: 'Failed to get answer. Please try again.', error: true }]);
    }
    setLoading(false);
    // Re-focus input after answer
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleCopy = async (text, idx) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback: create a temporary visible textarea
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '0';
        textarea.style.top = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      setSnackbar({ open: true, message: 'Failed to copy text', severity: 'error' });
    }
  };

  const drawerWidth = 380;

  const answers = conversation.filter(m => m.type === 'answer');

  return (
    <>
      {/* FAB — only when not externally controlled */}
      {externalOpen === undefined && !open && (
        <Fab
          aria-label="Ask about the job"
          onClick={() => setInternalOpen(true)}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 32,
            zIndex: 1301,
            background: gradients.primary,
            color: '#fff',
            boxShadow: `0 4px 20px ${alpha(colors.primary, 0.4)}`,
            '&:hover': {
              background: gradients.primaryHover,
              boxShadow: `0 6px 24px ${alpha(colors.primary, 0.5)}`,
            },
          }}
        >
          <QuestionAnswerIcon />
        </Fab>
      )}

      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: isMobile ? '100vw' : drawerWidth,
            height: isMobile ? '70vh' : '100vh',
            p: 0,
            bgcolor: colors.bg,
            borderTopLeftRadius: isMobile ? 16 : 0,
            borderTopRightRadius: isMobile ? 16 : 0,
            boxShadow: `0 0 40px ${alpha(colors.dark, 0.15)}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }
        }}
      >
        {/* ── Header ── */}
        <Box sx={{
          background: gradients.heroHeader,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 2,
          flexShrink: 0,
        }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
            flexShrink: 0,
          }}>
            <AutoAwesomeIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              Interview Prep
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>
              Ask anything about this role
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
            {isMobile ? <ExpandLessIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>

        {/* ── Conversation area ── */}
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 2,
            py: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: colors.border, borderRadius: 3 },
            scrollbarWidth: 'thin',
            scrollbarColor: `${colors.border} transparent`,
          }}
        >
          {conversation.length === 0 && !loading && (
            <Box sx={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', px: 3, py: 6,
            }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: 3,
                background: alpha(colors.primary, 0.08),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mb: 2.5,
              }}>
                <QuestionAnswerIcon sx={{ fontSize: 26, color: colors.primary }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.dark, mb: 0.75 }}>
                Ask about the job
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6, maxWidth: 240 }}>
                Get tailored answers about the role, company, or how your experience aligns with the job description.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 2.5, justifyContent: 'center' }}>
                {[
                  'What skills are most important?',
                  'How should I prepare?',
                  'What\'s the company culture like?',
                ].map((prompt) => (
                  <Box
                    key={prompt}
                    onClick={() => { setQuestion(prompt); inputRef.current?.focus(); }}
                    sx={{
                      px: 1.5, py: 0.75, borderRadius: 2,
                      border: `1px solid ${colors.border}`,
                      bgcolor: '#fff',
                      fontSize: '0.75rem', fontWeight: 500,
                      color: 'text.secondary',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      '&:hover': {
                        borderColor: colors.primary,
                        color: colors.primary,
                        bgcolor: alpha(colors.primary, 0.04),
                      },
                    }}
                  >
                    {prompt}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {conversation.map((msg, i) => (
            <Box key={i} sx={{
              display: 'flex',
              flexDirection: msg.type === 'question' ? 'row-reverse' : 'row',
              gap: 1,
              alignItems: 'flex-start',
            }}>
              {/* Avatar */}
              <Box sx={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, mt: 0.25,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...(msg.type === 'question'
                  ? { background: gradients.primary, color: '#fff' }
                  : { bgcolor: alpha(colors.primary, 0.1), color: colors.primary }),
              }}>
                {msg.type === 'question'
                  ? <PersonIcon sx={{ fontSize: 16 }} />
                  : <AutoAwesomeIcon sx={{ fontSize: 14 }} />}
              </Box>

              {/* Bubble */}
              <Box sx={{
                maxWidth: '82%',
                position: 'relative',
                ...(msg.type === 'question' ? {
                  bgcolor: colors.primary,
                  color: '#fff',
                  borderRadius: '14px 14px 4px 14px',
                  px: 2, py: 1.25,
                } : {
                  bgcolor: '#fff',
                  color: colors.dark,
                  borderRadius: '14px 14px 14px 4px',
                  px: 2, py: 1.25,
                  border: `1px solid ${colors.border}`,
                  ...(msg.error && { borderColor: colors.error, bgcolor: alpha(colors.error, 0.04) }),
                }),
              }}>
                <Typography variant="body2" sx={{
                  whiteSpace: 'pre-line',
                  fontSize: '0.8125rem',
                  lineHeight: 1.65,
                  wordBreak: 'break-word',
                  ...(msg.error && { color: colors.error }),
                }}>
                  {msg.text}
                </Typography>

                {/* Copy button for answers */}
                {msg.type === 'answer' && !msg.error && (
                  <Tooltip title={copiedIdx === i ? 'Copied!' : 'Copy'} placement="left">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(msg.text, i)}
                      sx={{
                        position: 'absolute',
                        top: 6, right: 6,
                        opacity: 0.4,
                        transition: 'opacity 0.15s',
                        '&:hover': { opacity: 1 },
                        width: 26, height: 26,
                      }}
                    >
                      {copiedIdx === i
                        ? <CheckIcon sx={{ fontSize: 14, color: colors.success }} />
                        : <ContentCopyIcon sx={{ fontSize: 13 }} />}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          ))}

          {/* Loading indicator */}
          {loading && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Box sx={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                bgcolor: alpha(colors.primary, 0.1), color: colors.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AutoAwesomeIcon sx={{ fontSize: 14 }} />
              </Box>
              <Box sx={{
                bgcolor: '#fff', border: `1px solid ${colors.border}`,
                borderRadius: '14px 14px 14px 4px',
                px: 2, py: 1.5,
                display: 'flex', alignItems: 'center', gap: 1,
              }}>
                <CircularProgress size={14} thickness={5} sx={{ color: colors.primary }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Thinking…
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* ── Input area ── */}
        <Box sx={{
          p: 2, pt: 1.5,
          borderTop: `1px solid ${colors.border}`,
          bgcolor: '#fff',
          flexShrink: 0,
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            bgcolor: colors.bg,
            borderRadius: 2.5,
            border: `1px solid ${colors.border}`,
            px: 1.5,
            py: 0.75,
            transition: 'border-color 0.2s',
            '&:focus-within': { borderColor: colors.primary },
          }}>
            <TextField
              inputRef={inputRef}
              placeholder="Ask a question…"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              multiline
              maxRows={3}
              fullWidth
              variant="standard"
              InputProps={{ disableUnderline: true }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  py: 0.5,
                },
              }}
            />
            <IconButton
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              size="small"
              sx={{
                width: 32, height: 32,
                background: question.trim() ? gradients.primary : 'transparent',
                color: question.trim() ? '#fff' : 'text.disabled',
                borderRadius: 1.5,
                transition: 'all 0.2s',
                '&:hover': {
                  background: question.trim() ? gradients.primaryHover : 'transparent',
                },
                '&.Mui-disabled': {
                  color: 'text.disabled',
                },
              }}
            >
              <SendIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.75, display: 'block', textAlign: 'center', fontSize: '0.6875rem' }}>
            Press Enter to send · Shift+Enter for new line
          </Typography>
        </Box>
      </Drawer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SidebarQA;
