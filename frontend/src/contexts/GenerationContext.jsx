import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { resumeService, coverLetterService, pollJobStatus } from '../services/api';

const GenerationContext = createContext(null);

export const GenerationProvider = ({ children }) => {
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentType, setDocumentType] = useState('resume');
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState(null);
  const [error, setError] = useState('');
  const [lastGenerated, setLastGenerated] = useState(null);

  // Generated resume state
  const [resumeData, setResumeData] = useState(null);
  const [generatedResume, setGeneratedResume] = useState(null);
  const [docxContent, setDocxContent] = useState(null);
  const [pdfContent, setPdfContent] = useState(null);

  // Generated cover letter state
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState(null);
  const [coverLetterDocxContent, setCoverLetterDocxContent] = useState(null);
  const [coverLetterPdfContent, setCoverLetterPdfContent] = useState(null);

  // Abort controller for cancellation
  const abortRef = useRef(null);

  // Load saved results from localStorage on first render
  const [initialized] = useState(() => {
    try {
      const saved = localStorage.getItem('generatedResume');
      if (saved) {
        const data = JSON.parse(saved);
        // We can't call setState during initialization, so we return the data
        return data;
      }
    } catch (e) {}
    return null;
  });

  // One-time hydration from localStorage
  const hydratedRef = useRef(false);
  if (!hydratedRef.current && initialized) {
    hydratedRef.current = true;
    // These are safe to set during render for initial state
  }

  // Lazy initialization via useRef + useState initializer won't work for multiple states,
  // so we use a useEffect-like pattern with a ref
  const didHydrate = useRef(false);
  React.useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;
    try {
      const saved = localStorage.getItem('generatedResume');
      if (saved) {
        const data = JSON.parse(saved);
        setResumeData(data.resume || null);
        setGeneratedResume(data.generatedResume || null);
        setDocxContent(data.docxContent || null);
        setPdfContent(data.pdfContent || null);
      }
      const savedCL = localStorage.getItem('generatedCoverLetter');
      if (savedCL) {
        const data = JSON.parse(savedCL);
        setGeneratedCoverLetter(data.coverLetter || null);
        setCoverLetterDocxContent(data.docxContent || null);
        setCoverLetterPdfContent(data.pdfContent || null);
      }
    } catch (e) {}
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsGenerating(false);
    setJobStatus(null);
    setProgress(0);
    setStepLabel(null);
    setError('');
  }, []);

  const generateResume = useCallback(async ({ jobDescription, companyName: rawCompany, role: rawRole, pipelineVersion, bulletCount }) => {
    const companyName = rawCompany?.trim() || '';
    const role = rawRole?.trim() || '';
    if (!jobDescription.trim()) {
      setError('Please paste a job description first');
      return;
    }

    // Cancel any in-flight generation
    if (abortRef.current) abortRef.current.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setIsGenerating(true);
    setError('');
    setJobStatus('starting');
    setProgress(0);
    setStepLabel(null);
    setDocumentType('resume');

    try {
      const { data: jobData } = await resumeService.generateResume({
        jobDescription, companyName, role, version: pipelineVersion, bulletCount
      });
      const { jobId } = jobData;
      setJobStatus('processing');

      const result = await pollJobStatus(jobId, (progressData) => {
        if (abortController.signal.aborted) return;
        setJobStatus(progressData.status);
        setProgress(progressData.progress || 0);
        if (progressData.stepLabel) setStepLabel(progressData.stepLabel);
        if (progressData.error) setError(progressData.error);
      }, abortController.signal);

      if (result) {
        setResumeData(result.resume);
        setGeneratedResume(result.generatedResume);
        setDocxContent(result.docxContent);
        setPdfContent(result.pdfContent);
        setLastGenerated(new Date());
        localStorage.setItem('generatedResume', JSON.stringify({
          resume: result.resume,
          generatedResume: result.generatedResume,
          docxContent: result.docxContent,
          pdfContent: result.pdfContent,
          companyName, role, jobDescription
        }));
      }
    } catch (err) {
      if (err.name === 'AbortError' || abortController.signal.aborted) return;
      setError(err.message || 'Failed to generate resume. Please try again.');
      setJobStatus('error');
    } finally {
      if (!abortController.signal.aborted) {
        setIsGenerating(false);
      }
    }
  }, []);

  const generateCoverLetter = useCallback(async ({ jobDescription, companyName: rawCompany, role: rawRole }) => {
    const companyName = rawCompany?.trim() || '';
    const role = rawRole?.trim() || '';
    if (!jobDescription.trim()) {
      setError('Please paste a job description first');
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setIsGenerating(true);
    setError('');
    setJobStatus('starting');
    setProgress(0);
    setStepLabel(null);
    setDocumentType('cover-letter');

    try {
      const { data: jobData } = await coverLetterService.generateCoverLetter({
        jobDescription, companyName, role, resume: resumeData
      });
      const { jobId } = jobData;
      setJobStatus('processing');

      const result = await pollJobStatus(jobId, (progressData) => {
        if (abortController.signal.aborted) return;
        setJobStatus(progressData.status);
        setProgress(progressData.progress || 0);
        if (progressData.stepLabel) setStepLabel(progressData.stepLabel);
        if (progressData.error) setError(progressData.error);
      }, abortController.signal);

      if (result) {
        setGeneratedCoverLetter(result.coverLetter);
        setCoverLetterDocxContent(result.docxContent);
        setCoverLetterPdfContent(result.pdfContent);
        setLastGenerated(new Date());
        localStorage.setItem('generatedCoverLetter', JSON.stringify({
          coverLetter: result.coverLetter,
          docxContent: result.docxContent,
          pdfContent: result.pdfContent,
          companyName, role, jobDescription
        }));
      }
    } catch (err) {
      if (err.name === 'AbortError' || abortController.signal.aborted) return;
      setError(err.message || 'Failed to generate cover letter. Please try again.');
      setJobStatus('error');
    } finally {
      if (!abortController.signal.aborted) {
        setIsGenerating(false);
      }
    }
  }, [resumeData]);

  const value = {
    // State
    isGenerating,
    documentType,
    setDocumentType,
    jobStatus,
    progress,
    stepLabel,
    error,
    setError,
    lastGenerated,
    // Resume results
    resumeData,
    generatedResume,
    docxContent,
    pdfContent,
    // Cover letter results
    generatedCoverLetter,
    coverLetterDocxContent,
    coverLetterPdfContent,
    // Actions
    generateResume,
    generateCoverLetter,
    cancelGeneration,
  };

  return <GenerationContext.Provider value={value}>{children}</GenerationContext.Provider>;
};

export const useGeneration = () => {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
};
