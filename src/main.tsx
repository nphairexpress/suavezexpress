import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { reportClientError } from "@/components/common/ErrorBoundary";
import "./index.css";

// 29/09/2026 (R-09): erro fora da árvore React (handler, promise solta) também vai pra client_errors.
window.onerror = (message, _source, _lineno, _colno, error) => {
  reportClientError(error?.message || String(message), error?.stack);
};
window.onunhandledrejection = (event) => {
  const reason = event.reason;
  reportClientError(reason?.message || String(reason), reason?.stack);
};

createRoot(document.getElementById("root")!).render(<App />);
