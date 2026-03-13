
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-12 text-center">
          <div className="bg-red-50 border border-red-200 rounded-[2.5rem] p-10 max-w-2xl mx-auto shadow-xl">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-red-800 font-black text-2xl mb-3 tracking-tight">Hệ thống gặp sự cố hiển thị</h3>
            <p className="text-red-600 font-medium mb-8 leading-relaxed">
              Ứng dụng đã gặp một lỗi không mong muốn. Đừng lo lắng, dữ liệu của bạn vẫn an toàn. 
              Vui lòng thử tải lại trang hoặc quay lại Dashboard.
            </p>
            
            <div className="bg-white/50 rounded-2xl p-4 mb-8 border border-red-100 text-left">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Chi tiết lỗi:</p>
              <pre className="text-[11px] text-red-500 font-mono overflow-auto max-h-32 custom-scrollbar">
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </div>

            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                Tải lại trang
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-8 py-3 bg-white border border-red-200 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-50 transition-all active:scale-95"
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
