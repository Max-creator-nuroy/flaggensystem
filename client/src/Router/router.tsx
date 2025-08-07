import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "../MainLayout";
import Login from "../pages/Login";
import DashboardUser from "../pages/User/DashboardUser";
import DashboardAdmin from "../pages/Admin/Dashboard";
import DashboardCoach from "../pages/Coach/DashboardCoach";
import Requirement from "../pages/Coach/Requirement";
import RoleProtectedRoute from "./RoleProtectedRoute";
import { Unauthorized } from "@/pages/Unauthorized";
import CreateQuestions from "@/pages/CoachAdmin/CreateQuestions";
import Survey from "@/pages/CoachAdmin/Survey";
import SurveyAnswers from "@/pages/CoachAdmin/SurveyAnswers";
import AdminCustomerList from "@/pages/Admin/AdminCustomerList";
import FlagList from "@/pages/User/FlagList";
import CustomerFlags from "@/pages/CoachAdmin/CustomerFlags";
import CurrentSurvey from "@/components/ui/CurrentSurvey";
import CustomerList from "@/components/ui/CustomerList";
import LeadList from "@/components/ui/LeadList";
import CreateUser from "@/pages/Coach/createUser";
import CreateCoach from "@/pages/Admin/CreateCoach";
import ProfilePage from "@/pages/ProfilPage";
import CoachStats from "@/pages/Admin/CoachStats";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "",
    element: <Navigate to="/login" replace />, // Leerer Pfad leitet zu Login weiter
  },
  { path: "unauthorized", element: <Unauthorized /> },
  {
    path: "/",
    element: <MainLayout />, // 🧠 Layout mit Navbar & Sidebar
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        element: (
          <RoleProtectedRoute allowedRoles={["COACH", "ADMIN", "CUSTOMER"]} />
        ),
        children: [
          { path: "dashboard/CUSTOMER", element: <DashboardUser /> },
          { path: "profilePage", element: <ProfilePage /> },
          { path: "flagList", element: <FlagList /> },
          { path: "customerFlags", element: <CustomerFlags /> },
          { path: "survey", element: <CurrentSurvey /> },
        ],
      },
      {
        element: <RoleProtectedRoute allowedRoles={["COACH", "ADMIN"]} />,
        children: [
          { path: "dashboard/CUSTOMER", element: <DashboardUser /> },
          { path: "dashboard/COACH", element: <DashboardCoach /> },
          { path: "flagList", element: <FlagList /> },
          { path: "customerFlags", element: <CustomerFlags /> },
          {
            path: "survey",
            element: <Survey />,
            children: [
              { path: "currentSurvey", element: <CurrentSurvey /> },
              { path: "questions", element: <CreateQuestions /> },
              { path: "surveyAnswers", element: <SurveyAnswers /> },
            ],
          },
        ],
      },
      {
        element: <RoleProtectedRoute allowedRoles={["ADMIN"]} />,
        children: [
          { path: "dashboard/ADMIN", element: <DashboardAdmin /> },
          { path: "statistic", element: <CoachStats /> },
          { path: "dashboard/COACH", element: <DashboardCoach /> },
          { path: "dashboard/CUSTOMER", element: <DashboardUser /> },
          { path: "customerList/ADMIN", element: <AdminCustomerList /> },
          { path: "createCoach", element: <CreateCoach /> },
        ],
      },
      {
        element: <RoleProtectedRoute allowedRoles={["COACH"]} />,
        children: [
          { path: "customerList", element: <CustomerList /> },
          { path: "dashboard/COACH", element: <DashboardCoach /> },
          { path: "dashboard/CUSTOMER", element: <DashboardUser /> },
          { path: "requirement", element: <Requirement /> },
          { path: "createUser", element: <CreateUser /> },
        ],
      },
      {
        element: <RoleProtectedRoute allowedRoles={["CUSTOMER"]} />,
        children: [
          { path: "dashboard/CUSTOMER", element: <DashboardUser /> },
          { path: "survey", element: <CurrentSurvey /> },
          { path: "leadList", element: <LeadList /> },
          { path: "flagList", element: <FlagList /> },
        ],
      },
    ],
  },
]);
