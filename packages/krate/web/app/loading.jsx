'use client';
import { useState, useEffect } from 'react';

const STATUS_MESSAGES = [
  'Reticulating splines...',
  'Warming up the flux capacitor...',
  'Consulting the oracle...',
  'Aligning quantum registers...',
  'Negotiating with Kubernetes...',
  'Indexing the knowledge graph...',
  'Compiling agent stacks...',
  'Calibrating the deployment pipeline...',
  'Synchronizing workspaces...',
  'Resolving merge conflicts in the matrix...',
  'Training the hamsters...',
  'Defragmenting the cloud...',
  'Polishing the CRDs...',
  'Hydrating the resource cache...',
  'Establishing secure handshake...',
  'Spinning up micro-agents...',
  'Brewing fresh data...',
  'Untangling dependency graphs...',
  'Asking the cluster nicely...',
  'Almost there...',
];

export default function Loading() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(msgInterval);
  }, []);

  useEffect(() => {
    const progInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return 92 + Math.random() * 2;
        return p + (92 - p) * 0.08 + Math.random() * 3;
      });
    }, 150);
    return () => clearInterval(progInterval);
  }, []);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(dotInterval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      gap: '1.5rem',
    }}>
      {/* Animated logo */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)',
        backgroundSize: '200% 200%',
        animation: 'krateGradient 3s ease infinite, kratePulse 2s ease-in-out infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: '1.25rem',
        fontFamily: 'var(--font-mono, monospace)',
        letterSpacing: '-0.05em',
      }}>
        K
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        maxWidth: 320,
        height: 4,
        borderRadius: 2,
        background: 'var(--color-border, rgba(0,0,0,0.1))',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${Math.min(progress, 98)}%`,
          borderRadius: 2,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
          backgroundSize: '200% 100%',
          animation: 'krateBarShimmer 2s linear infinite',
          transition: 'width 0.15s ease-out',
        }} />
      </div>

      {/* Status message */}
      <p style={{
        color: 'var(--color-neutral, #9ca3af)',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-mono, monospace)',
        minHeight: '1.25rem',
        transition: 'opacity 0.3s',
        opacity: 0.9,
      }}>
        {STATUS_MESSAGES[messageIndex]}{dots}
      </p>

      {/* Percentage */}
      <p style={{
        color: 'var(--color-neutral, #6b7280)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-mono, monospace)',
        opacity: 0.6,
      }}>
        {Math.round(Math.min(progress, 98))}%
      </p>

      <style>{`
        @keyframes krateGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes kratePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.2); }
        }
        @keyframes krateBarShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
