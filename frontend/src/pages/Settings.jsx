import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar
} from '@mui/material';
import { profileService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Settings() {
  const { user, updateUser } = useAuth();
  const [selectedModel, setSelectedModel] = useState('');
  const [maxTokens, setMaxTokens] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const response = await profileService.getOpenAISettings();
        const { openai_model, max_tokens } = response.data;
        setSelectedModel(openai_model || 'gpt-4.1-2025-04-14');
        setMaxTokens(max_tokens || 30000);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');
    try {
      await profileService.updateOpenAISettings({ openai_model: selectedModel, max_tokens: maxTokens });
      // Optionally update local user context if needed
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Loading settings...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, boxShadow: 6, bgcolor: '#fff' }}>
        <Stack spacing={4}>
          <Box textAlign="center">
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
              OpenAI Settings
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Configure your preferred OpenAI model and token limits for resume generation.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth variant="outlined">
            <InputLabel id="model-select-label">Select OpenAI Model</InputLabel>
            <Select
              labelId="model-select-label"
              id="model-select"
              value={selectedModel}
              label="Select OpenAI Model"
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <MenuItem value="gpt-4o">GPT-4o [Moderate, 128K context, 16K output]</MenuItem>
              <MenuItem value="gpt-4o-mini">GPT-4o Mini [Fast: ~111 tokens/s, 128K context, 16K output]</MenuItem>
              <MenuItem value="gpt-4-turbo-preview">GPT-4 Turbo Preview [Moderate, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4.1-2025-04-14">GPT-4.1 (2025-04-14) [Moderate, 1M context, 32K output]</MenuItem>
              <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo [Moderate: ~63 tokens/s, 16K context, 4K output]</MenuItem>
              <MenuItem value="gpt-3.5-turbo-0125">GPT-3.5 Turbo (0125) [Moderate: ~63 tokens/s, 16K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4-0613">GPT-4 (0613) [Slower, 8K context]</MenuItem>
              <MenuItem value="gpt-4">GPT-4 [Slower, 8K context]</MenuItem>
              <MenuItem value="gpt-4o-realtime-preview-2025-06-03">GPT-4o Realtime Preview (2025-06-03) [Very Fast, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-3.5-turbo-instruct">GPT-3.5 Turbo Instruct [Moderate, 4K context]</MenuItem>
              <MenuItem value="gpt-3.5-turbo-instruct-0914">GPT-3.5 Turbo Instruct (0914) [Moderate, 4K context]</MenuItem>
              <MenuItem value="gpt-4-1106-preview">GPT-4 (1106 Preview) [Slower, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-3.5-turbo-1106">GPT-3.5 Turbo (1106) [Moderate, 16K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4-0125-preview">GPT-4 (0125 Preview) [Slower, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4-turbo">GPT-4 Turbo [Moderate, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4-turbo-2024-04-09">GPT-4 Turbo (2024-04-09) [Moderate, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4o-2024-05-13">GPT-4o (2024-05-13) [Moderate: ~64 tokens/s, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4o-mini-2024-07-18">GPT-4o Mini (2024-07-18) [Fast: ~111 tokens/s, 128K context, 16K output]</MenuItem>
              <MenuItem value="gpt-4o-2024-08-06">GPT-4o (2024-08-06) [Moderate: ~41 tokens/s, 128K context, 16K output]</MenuItem>
              <MenuItem value="gpt-4o-realtime-preview-2024-10-01">GPT-4o Realtime Preview (2024-10-01) [Very Fast, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4o-realtime-preview">GPT-4o Realtime Preview [Very Fast, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4o-realtime-preview-2024-12-17">GPT-4o Realtime Preview (2024-12-17) [Very Fast, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4o-mini-realtime-preview-2024-12-17">GPT-4o Mini Realtime Preview (2024-12-17) [Extremely Fast, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4o-mini-realtime-preview">GPT-4o Mini Realtime Preview [Extremely Fast, 128K context, 4K output]</MenuItem>
              <MenuItem value="gpt-4o-2024-11-20">GPT-4o (2024-11-20) [Slower: ~37 tokens/s, 128K context, 16K output]</MenuItem>
              <MenuItem value="gpt-4.5-preview">GPT-4.5 Preview [Fast, 128K context, 16K output]</MenuItem>
              <MenuItem value="gpt-4.5-preview-2025-02-27">GPT-4.5 Preview (2025-02-27) [Fast, 128K context, 16K output]</MenuItem>
              <MenuItem value="gpt-4.1">GPT-4.1 [Moderate, 1M context, 32K output]</MenuItem>
              <MenuItem value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini (2025-04-14) [Fast, 1M context, 32K output]</MenuItem>
              <MenuItem value="gpt-4.1-mini">GPT-4.1 Mini [Fast, 1M context, 32K output]</MenuItem>
              <MenuItem value="gpt-4.1-nano-2025-04-14">GPT-4.1 Nano (2025-04-14) [Very Fast, 1M context, 32K output]</MenuItem>
              <MenuItem value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16k [Moderate, 16K context, 4K output]</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Max Tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            fullWidth
            variant="outlined"
            inputProps={{ min: 100, step: 100 }}
          />

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSaveSettings}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ fontWeight: 700, mt: 3 }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default Settings; 