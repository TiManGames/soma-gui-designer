import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { useStore } from "./state/store";
import { useGfx } from "./state/gfxStore";
import { useGfxBrowse } from "./state/gfxBrowseStore";
import { onHostMessage, postToHost } from "./vscodeApi";
import "../styles/app.css";

// Bridge host <-> store: apply init/docChanged into the store, feed gfx replies
// into the gfx cache, and track the WYSIWYG config flag.
onHostMessage((msg) => {
  switch (msg.type) {
    case "init":
    case "docChanged":
      useStore.getState().setDocFromHost(msg.text);
      break;
    case "gfxConfig":
      useStore.getState().setWysiwygEnabled(msg.config.wysiwygEnabled);
      break;
    case "gfxConfigChanged":
      useStore.getState().setWysiwygEnabled(msg.config.wysiwygEnabled);
      useGfx.getState().reset();
      break;
    case "gfxResolved":
      useGfx.getState().onResolved(msg.requestId, msg.result);
      break;
    case "gfxBrowseResult":
      useGfxBrowse.getState().resolve(msg.requestId, msg.path);
      break;
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

postToHost({ type: "ready" });
