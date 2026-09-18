import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ANSAMA ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      if (typeof window !== 'undefined' && 'caches' in window && window.caches) {
        window.caches.keys().then((names) => {
          return Promise.all(names.map((name) => window.caches.delete(name)));
        }).catch(() => {
          // Ignore cache deletion errors
        }).finally(() => {
          window.location.reload();
        });
        return;
      }
    } catch {
      // Fallback
    }

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleResetLocal = () => {
    if (typeof window !== 'undefined') {
      if (window.confirm('¿Deseas restablecer los datos locales para recuperar la aplicación?')) {
        window.localStorage.removeItem('ansama_finance_state_v1');
        window.location.reload();
      }
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 shadow-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-950">
                La aplicación necesita reiniciarse
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Se ha detectado un cambio de versión o actualización de archivos. Pulsa recargar para sincronizar la versión más reciente.
              </p>
            </div>

            {this.state.error && (
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 text-left font-mono truncate max-h-20 overflow-hidden">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-[#0E6A3B] hover:bg-[#0a522d] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Recargar Aplicación
              </button>
              
              <button
                type="button"
                onClick={this.handleResetLocal}
                className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                Restablecer datos
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
