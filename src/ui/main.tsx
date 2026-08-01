import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { useStore } from "./state/store";
import { onHostMessage, postToHost } from "./vscodeApi";
import "../styles/app.css";

// Bridge host <-> store: apply init/docChanged into the store, and announce
// readiness so the host sends the initial document.
onHostMessage((msg) => {
  if (msg.type === "init" || msg.type === "docChanged") {
    useStore.getState().setDocFromHost(msg.text);
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

postToHost({ type: "ready" });
