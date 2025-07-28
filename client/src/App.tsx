import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./pages/Login";
import NotFoundPage from "./pages/NotFoundPage";
import Dashboard from "./pages/Coach/DashboardCoach";
import { Toaster } from "./components/ui/toaster";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Login />,
      errorElement: <NotFoundPage />,
    },
    {
      path: "/dashboard",
      element: <Dashboard />,
    },
    {
      path: "/toaster",
      element: <Toaster />,
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
