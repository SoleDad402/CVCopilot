import { useEffect, useState } from 'react';
import { Container, Typography, Paper, Stack, Divider, Box, Link } from '@mui/material';
import { historyService } from '../services/api';

export default function History() {
  const [grouped, setGrouped] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await historyService.getHistory();
        setGrouped(data.history || {});
      } catch (e) {
        setError(e?.response?.data?.error || e.message || 'Failed to load history');
      }
    })();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Resume History</Typography>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}
      {Object.keys(grouped).length === 0 && (
        <Typography color="text.secondary">No history yet.</Typography>
      )}
      <Stack spacing={3}>
        {Object.entries(grouped).sort((a,b) => b[0].localeCompare(a[0])).map(([date, items]) => (
          <Paper key={date} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>{date}</Typography>
            <Divider />
            <Stack spacing={1} sx={{ mt: 1 }}>
              {items.map(item => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{item.company_name || 'Company'}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.role || ''}</Typography>
                  </Box>
                  <Box>
                    {item.docx_path && (
                      <Link href={`file:///${item.docx_path}`} underline="hover">DOCX</Link>
                    )}
                    {item.pdf_path && (
                      <>
                        <Typography component="span" sx={{ mx: 1 }}>|</Typography>
                        <Link href={`file:///${item.pdf_path}`} underline="hover">PDF</Link>
                      </>
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
}


