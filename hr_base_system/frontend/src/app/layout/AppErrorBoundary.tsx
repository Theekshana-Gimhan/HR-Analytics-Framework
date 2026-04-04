import React from 'react';
import ServerErrorPage from '../../components/common/ServerErrorPage';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled application error', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ServerErrorPage
          errorCode={500}
          errorMessage={this.state.error?.message}
          onRetry={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
