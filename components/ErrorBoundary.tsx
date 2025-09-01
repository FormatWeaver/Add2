import React from 'react';
import { ErrorDisplay } from './ErrorDisplay';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    onReset: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <ErrorDisplay
                    title="Application Error"
                    message="Something went wrong rendering the application. Please try resetting. If the problem persists, check the console for more details."
                    onReset={this.props.onReset}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
