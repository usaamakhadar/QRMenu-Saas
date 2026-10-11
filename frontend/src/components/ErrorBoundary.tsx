'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    }

    private handleReset = () => {
        try {
            // Self-healing: clear potentially corrupted session state if needed
            this.setState({ hasError: false, error: null });
            window.location.reload();
        } catch (e) {
            window.location.href = '/';
        }
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-error-container/20 rounded-full flex items-center justify-center mb-4 text-error animate-pulse">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-on-background mb-2">Something unexpected happened</h2>
                    <p className="text-sm text-on-surface-variant max-w-sm mb-6">
                        {this.props.fallbackMessage || 'The system caught a temporary error and prevented a full app crash.'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="bg-primary text-on-primary font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Recover & Refresh Page</span>
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
