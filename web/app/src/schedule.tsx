import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ScheduleSheet } from "./schedule/ScheduleSheet";
import "./styles/tokens.css";
import "./styles/ui.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ScheduleSheet />
  </StrictMode>,
);
