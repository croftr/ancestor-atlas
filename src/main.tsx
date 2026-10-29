import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles";
import App from "./App";
import "./film";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
