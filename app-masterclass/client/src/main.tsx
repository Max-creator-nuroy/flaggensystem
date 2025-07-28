import React from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider, defaultSystem,defaultBaseConfig } from "@chakra-ui/react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import Login from "./pages/Login";
import Dashboard from "./pages/TestPages/Dashboard";
import NotFoundPage from "./pages/TestPages/NotFoundPage";
import ProfilesPage from "./pages/TestPages/ProfilesPage";
import ProfilePage from "./pages/TestPages/ProfilePage";

const router = createBrowserRouter([
   {
    path: "/",
    element: <Login />,
    errorElement: <NotFoundPage />,
  },
  {
    path: "/login",
    element: <Login />,
    errorElement: <NotFoundPage />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/profilesPage",
    element: <ProfilesPage />,
    children: [
      {
        path: "/profilesPage/:profileId",
        element: <ProfilePage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <RouterProvider router={router} />
    </ChakraProvider>
  </React.StrictMode>
);
