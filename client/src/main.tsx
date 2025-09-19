import { createRoot } from "react-dom/client";
import "./index.css";
import { Provider } from "@/components/ui/provider";
import { Toaster } from "@/components/ui/toaster";
import {
  RouterProvider,
} from "react-router-dom";
import { router } from "./Router/router";

createRoot(document.getElementById("root")!).render(
  <Provider>
    <RouterProvider router={router} />
    <Toaster />
  </Provider>
);
