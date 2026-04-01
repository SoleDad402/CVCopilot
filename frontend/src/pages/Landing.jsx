import React from 'react';
import {
  Box, Typography, Button, Stack, Card, CardContent, Container
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AutoAwesome as SparkleIcon,
  Description as DocIcon,
  Work as WorkIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { NAVBAR_HEIGHT, colors } from '../theme';

const FEATURES = [
  {
    icon: <SparkleIcon />,
    title: 'AI-Powered Resumes',
    desc: 'Generate tailored resumes that match job descriptions using advanced AI. Every bullet point aligned to what employers are looking for.',
    color: colors.primary,
  },
  {
    icon: <DocIcon />,
    title: 'Professional Templates',
    desc: 'Clean, ATS-friendly DOCX and PDF output ready to submit. No formatting headaches.',
    color: colors.info,
  },
  {
    icon: <WorkIcon />,
    title: 'Application Tracker',
    desc: 'Track every application from applied to offer. Visual pipeline, status updates, and notes all in one place.',
    color: colors.success,
  },
  {
    icon: <SpeedIcon />,
    title: 'Generate in Seconds',
    desc: 'Paste a job description, hit generate. Your tailored resume is ready in under a minute.',
    color: colors.warning,
  },
];

const STEPS = [
  { num: '1', title: 'Build your profile', desc: 'Add your experience, education, and skills once.' },
  { num: '2', title: 'Paste a job description', desc: 'The AI analyzes what the employer needs.' },
  { num: '3', title: 'Get your tailored resume', desc: 'Download a perfectly matched resume in seconds.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, pt: `${NAVBAR_HEIGHT}px` }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <Box sx={{
        background: `linear-gradient(145deg, ${colors.dark} 0%, ${colors.darkAlt} 50%, #4338ca 100%)`,
        color: '#fff',
        py: { xs: 8, md: 12 },
        px: 2,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle background glow */}
        <Box sx={{
          position: 'absolute', top: '20%', left: '60%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 6, px: 2, py: 0.75,
            border: '1px solid rgba(255,255,255,0.1)', mb: 3,
          }}>
            <SparkleIcon sx={{ fontSize: 14, color: '#818cf8' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#c7d2fe', letterSpacing: '0.02em' }}>
              AI-Powered Resume Builder
            </Typography>
          </Box>

          <Typography variant="h2" sx={{
            fontWeight: 800, fontSize: { xs: '2rem', md: '3.25rem' },
            lineHeight: 1.15, mb: 2.5, letterSpacing: '-0.03em',
          }}>
            Land interviews with
            <br />
            <Box component="span" sx={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
              backgroundClip: 'text', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              perfectly tailored resumes
            </Box>
          </Typography>

          <Typography variant="h6" sx={{
            color: 'rgba(255,255,255,0.55)', fontWeight: 400,
            maxWidth: 560, mx: 'auto', mb: 4.5, lineHeight: 1.6,
            fontSize: { xs: '1rem', md: '1.15rem' },
          }}>
            Paste any job description and get a resume that speaks directly to what employers want. Powered by AI, built for results.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            <Button variant="contained" size="large"
              endIcon={<ArrowIcon />}
              onClick={() => navigate('/register')}
              sx={{ px: 4, py: 1.5, fontSize: '1rem', borderRadius: 3 }}>
              Get Started Free
            </Button>
            <Button variant="outlined" size="large"
              onClick={() => navigate('/login')}
              sx={{
                px: 4, py: 1.5, fontSize: '1rem', borderRadius: 3,
                color: '#fff', borderColor: 'rgba(255,255,255,0.2)',
                '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)' },
              }}>
              Sign In
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography variant="overline" sx={{ color: colors.primary, display: 'block', textAlign: 'center', mb: 1 }}>
          How it works
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 5 }}>
          Three steps to your next interview
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {STEPS.map((step, idx) => (
            <Box key={idx} sx={{ flex: 1, textAlign: 'center' }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: '50%', mx: 'auto', mb: 2,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>{step.num}</Typography>
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>{step.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 260, mx: 'auto' }}>
                {step.desc}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: colors.surface, py: { xs: 6, md: 8 }, borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
        <Container maxWidth="lg">
          <Typography variant="overline" sx={{ color: colors.primary, display: 'block', textAlign: 'center', mb: 1 }}>
            Features
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 5 }}>
            Everything you need to land the job
          </Typography>

          <Stack direction="row" flexWrap="wrap" sx={{ mx: -1.5 }}>
            {FEATURES.map((f, idx) => (
              <Box key={idx} sx={{ width: { xs: '100%', sm: '50%' }, p: 1.5 }}>
                <Card sx={{
                  height: '100%', border: '1px solid', borderColor: colors.border,
                  '&:hover': { borderColor: alpha(f.color, 0.3), transform: 'translateY(-2px)' },
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: 2.5, mb: 2,
                      bgcolor: alpha(f.color, 0.08),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {React.cloneElement(f.icon, { sx: { fontSize: 22, color: f.color } })}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>{f.title}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{f.desc}</Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <Box sx={{
        background: `linear-gradient(145deg, ${colors.dark} 0%, ${colors.darkAlt} 100%)`,
        color: '#fff', py: { xs: 6, md: 8 }, textAlign: 'center',
      }}>
        <Container maxWidth="sm">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Ready to stand out?
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.55)', mb: 4 }}>
            Join CV Copilot and start generating tailored resumes that get results.
          </Typography>
          <Button variant="contained" size="large"
            endIcon={<ArrowIcon />}
            onClick={() => navigate('/register')}
            sx={{ px: 5, py: 1.5, fontSize: '1rem', borderRadius: 3 }}>
            Get Started Free
          </Button>
        </Container>
      </Box>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: colors.dark, color: 'rgba(255,255,255,0.35)', py: 3, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant="caption">
          CV Copilot &mdash; AI-powered resume generation
        </Typography>
      </Box>
    </Box>
  );
}
