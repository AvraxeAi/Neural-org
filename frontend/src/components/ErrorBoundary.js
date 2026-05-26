import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            {this.props.title || 'Something went wrong'}
          </h2>
          <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'IBM Plex Mono' }}>
            Check the console for details.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}
          >
            <RefreshCw size={13} />Retry
          </button>
        </div>
      </div>
    );
  }
}
