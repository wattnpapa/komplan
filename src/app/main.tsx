import "@fontsource-variable/archivo";
import "./stil-basis.css";
import "./stil.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
