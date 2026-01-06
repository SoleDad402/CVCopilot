import React, { useState, useRef } from 'react';
import {
  Box, Button, TextField, Typography, Stack, Divider, useMediaQuery, IconButton, Fab, Drawer, Paper, Tooltip, Snackbar, Alert
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { qaService } from '../services/api';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const SidebarQA = ({ jobDescription, resume, open: externalOpen, onClose: externalOnClose }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Use external open/close if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const handleClose = externalOnClose ? externalOnClose : () => setInternalOpen(false);
  const answerRef = useRef(null); // For fallback copy
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await qaService.askQuestion(question, jobDescription, resume);
      setAnswer(res.data.answer || 'No answer received.');
    } catch (err) {
      setAnswer('Failed to get answer.');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (answer) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(answer);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else if (answerRef.current) {
        answerRef.current.value = answer;
        answerRef.current.style.display = 'block';
        answerRef.current.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch (err) {
          // Could not copy
        }
        answerRef.current.style.display = 'none';
      }
    }
  };

  const drawerWidth = 370;

  return (
    <>
      {/* Floating FAB to open the drawer - only show if not controlled externally */}
      {externalOpen === undefined && !open && (
        <Fab
          color="primary"
          aria-label="Ask about the job"
          onClick={() => setInternalOpen(true)}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 32,
            zIndex: 1301,
            boxShadow: 6
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
            height: isMobile ? '55vh' : '100vh',
            p: 0,
            bgcolor: 'background.default',
            borderTopLeftRadius: isMobile ? 3 : 0,
            borderTopRightRadius: isMobile ? 3 : 0,
            boxShadow: 6,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }
        }}
      >
        {/* Header */}
        <Box sx={{
          p: 0,
          background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e0e0e0',
          minHeight: 64,
        }}>
          <Typography variant="h6" fontWeight={700} sx={{ pl: 3, letterSpacing: 1 }}>
            Job Q&A Assistant
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: '#fff', mr: 1 }}>
            {isMobile ? <ExpandLessIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Box>
        {/* Content */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          bgcolor: 'linear-gradient(135deg, #f8fafc 0%, #e3e8ee 100%)',
          height: '0%',
        }}>
          <Stack spacing={2} flex={1} sx={{ height: '100%' }}>
            <Paper elevation={0} sx={{
              p: 2,
              bgcolor: '#fff',
              borderRadius: 2,
              boxShadow: '0 1px 4px 0 rgba(30,41,59,0.06)',
              border: '1px solid #e0e0e0',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}>
              <Typography variant="subtitle1" fontWeight={600} color="primary.main" sx={{ mb: 1 }}>
                Ask a Question
              </Typography>
              <TextField
                label="Type your question..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                multiline
                minRows={2}
                maxRows={4}
                fullWidth
                variant="outlined"
                sx={{ mb: 1, flex: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleAsk}
                disabled={loading || !question.trim()}
                size="large"
                sx={{ fontWeight: 600, borderRadius: 2, boxShadow: 'none', mt: 1 }}
                fullWidth
              >
                {loading ? 'Generating...' : 'Get Answer'}
              </Button>
            </Paper>
            <Divider sx={{ my: 1 }} />
            <Paper elevation={0} sx={{
              flex: 1,
              p: 2,
              bgcolor: '#f1f5f9',
              borderRadius: 2,
              minHeight: 0,
              border: '1px solid #e0e0e0',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 4 },
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f1f5f9',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, letterSpacing: 0.5, flex: 1 }}>
                  Answer
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'} placement="left">
                  <IconButton size="small" onClick={handleCopy} sx={{ ml: 1 }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', fontSize: 16, color: '#222', flex: 1 }}>
                {answer}
              </Typography>
              {/* Hidden textarea for fallback copy */}
              <textarea
                ref={answerRef}
                style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 0, height: 0, width: 0, pointerEvents: 'none', display: 'none' }}
                tabIndex={-1}
                aria-hidden="true"
                readOnly
              />
            </Paper>
          </Stack>
        </Box>
      </Drawer>
      <Snackbar
        open={copied}
        autoHideDuration={1200}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Answer copied!
        </Alert>
      </Snackbar>
    </>
  );
};

export default SidebarQA; 