import { Component, type ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import Room from "./pages/Room";
import PostContest from "./pages/PostContest";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-medium">Something went wrong</h1>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#ededed] text-[#0a0a0a] rounded text-sm font-medium"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/results/:code" element={<PostContest />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
