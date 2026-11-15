import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";

// T9 replaces this with the React shift sheet.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main style={{ padding: 24 }}>
      <h1>Offload nurse schedule</h1>
      <p>Coming in T9.</p>
    </main>
  </StrictMode>,
);
