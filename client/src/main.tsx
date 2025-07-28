import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Provider } from "@/components/ui/provider";
import {
  RouterProvider,
} from "react-router-dom";
import { router } from "./Router/router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider>
      <RouterProvider router={router} />{" "}
      {/* ✅ Alles läuft im Routing-Kontext */}
    </Provider>
  </StrictMode>
);
