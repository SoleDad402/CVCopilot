import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Stack,
  Chip, Alert, Switch, IconButton, Tooltip, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Skeleton, Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Psychology as LearnedIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  ArrowBack as BackIcon,
  AutoFixHigh as AutoGenIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { NAVBAR_HEIGHT, colors, gradients } from '../theme';
import { autoBidService } from '../services/api';

const CATEGORY_COLORS = {
  motivation: { bg: '#dbeafe', text: '#1e40af', label: 'Motivation' },
  role_fit: { bg: '#ede9fe', text: '#5b21b6', label: 'Role Fit' },
  experience: { bg: '#fef3c7', text: '#92400e', label: 'Experience' },
  salary: { bg: '#dcfce7', text: '#166534', label: 'Salary' },
  availability: { bg: '#e0f2fe', text: '#075985', label: 'Availability' },
  source: { bg: '#f1f5f9', text: '#475569', label: 'Source' },
  custom: { bg: '#fce7f3', text: '#9d174d', label: 'Custom' },
};

export default function LearnedQuestions() {
  const navigate = useNavigate();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialog, setEditDialog] = useState(null); // pattern being edited
  const [editAnswer, setEditAnswer] = useState('');
  const [editThreshold, setEditThreshold] = useState(3);

  const fetchPatterns = async () => {
    try {
      const resp = await autoBidService.getPatterns();
      setPatterns(resp.data.patterns || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatterns(); }, []);

  const handleToggleLearned = async (pattern) => {
    try {
      await autoBidService.updatePattern(pattern.id, { is_learned: !pattern.is_learned });
      setPatterns(prev => prev.map(p => p.id === pattern.id ? { ...p, is_learned: !p.is_learned } : p));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await autoBidService.deletePattern(id);
      setPatterns(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditOpen = (pattern) => {
    setEditDialog(pattern);
    setEditAnswer(pattern.last_answer || '');
    setEditThreshold(pattern.threshold || 3);
  };

  const handleEditSave = async () => {
    if (!editDialog) return;
    try {
      await autoBidService.updatePattern(editDialog.id, {
        last_answer: editAnswer,
        threshold: editThreshold,
      });
      setPatterns(prev => prev.map(p =>
        p.id === editDialog.id ? { ...p, last_answer: editAnswer, threshold: editThreshold } : p
      ));
      setEditDialog(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const learnedCount = patterns.filter(p => p.is_learned).length;
  const totalAutoGens = patterns.reduce((sum, p) => sum + p.auto_gen_count, 0);

  return (
    <Box sx={{ pt: `${NAVBAR_HEIGHT + 24}px`, pb: 6, px: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{
        background: gradients.heroHeader,
        borderRadius: 3,
        p: { xs: 3, md: 4 },
        mb: 3,
        color: '#fff',
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
          <LearnedIcon sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700}>Learned Questions</Typography>
        </Stack>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          The auto-bid engine learns from your choices. After you approve auto-generated answers {'>'}3 times for a question pattern, it auto-fills by default. Manage your learned patterns here.
        </Typography>
        <Stack direction="row" spacing={2} mt={2}>
          <Chip
            label={`${learnedCount} learned`}
            sx={{ bgcolor: alpha('#fff', 0.2), color: '#fff', fontWeight: 600 }}
          />
          <Chip
            label={`${patterns.length} total patterns`}
            sx={{ bgcolor: alpha('#fff', 0.15), color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}
          />
          <Chip
            label={`${totalAutoGens} auto-gens`}
            sx={{ bgcolor: alpha('#fff', 0.15), color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}
          />
        </Stack>
      </Box>

      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/autobid')}
        sx={{ mb: 2, textTransform: 'none' }}
      >
        Back to Auto-Bid Test
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={80} />)}
        </Stack>
      ) : patterns.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <LearnedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No patterns yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Use the Auto-Bid test page to generate answers for custom questions. The system will learn from your choices.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AutoGenIcon />}
              onClick={() => navigate('/autobid')}
              sx={{ mt: 3 }}
            >
              Go to Auto-Bid
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: colors.bgAlt }}>
                    <TableCell sx={{ fontWeight: 600, width: '35%' }}>Question Pattern</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '15%' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '10%' }}>Auto / Manual</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '10%' }}>Learned</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '20%' }}>Last Answer</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '10%' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patterns.map((p) => {
                    const cat = CATEGORY_COLORS[p.category] || CATEGORY_COLORS.custom;
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-word' }}>
                            {p.pattern}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={cat.label}
                            size="small"
                            sx={{ bgcolor: cat.bg, color: cat.text, fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Chip
                              label={p.auto_gen_count}
                              size="small"
                              sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 700, fontSize: '0.75rem', minWidth: 28 }}
                            />
                            <Typography variant="caption" color="text.secondary">/</Typography>
                            <Chip
                              label={p.manual_count}
                              size="small"
                              sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: '0.75rem', minWidth: 28 }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={p.is_learned}
                            onChange={() => handleToggleLearned(p)}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={p.last_answer || 'No answer yet'}>
                            <Typography variant="body2" color="text.secondary" sx={{
                              maxWidth: 200, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {p.last_answer || '--'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={() => handleEditOpen(p)}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Pattern</DialogTitle>
        <DialogContent>
          {editDialog && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Pattern: <strong>{editDialog.pattern}</strong>
              </Typography>
              <TextField
                label="Default Answer Template"
                multiline
                rows={4}
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                fullWidth
                helperText="This answer will be used as a template. Company name and role will be filled in automatically."
              />
              <TextField
                label="Auto-learn Threshold"
                type="number"
                value={editThreshold}
                onChange={(e) => setEditThreshold(Math.max(1, Number(e.target.value)))}
                inputProps={{ min: 1, max: 20 }}
                helperText="How many auto-gen approvals before this pattern is considered learned"
                sx={{ maxWidth: 200 }}
              />
              {editDialog.sample_answers?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Previous Answers ({editDialog.sample_answers.length})
                  </Typography>
                  {editDialog.sample_answers.map((s, i) => (
                    <Box key={i} sx={{ p: 1.5, bgcolor: colors.bgAlt, borderRadius: 1, mb: 1, fontSize: '0.85rem' }}>
                      <Typography variant="caption" color="text.secondary">
                        {s.company ? `For ${s.company}` : 'General'} — {s.timestamp ? new Date(s.timestamp).toLocaleDateString() : ''}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{s.answer}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
