import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import LearnPage from "./pages/LearnPage";
import QuizPage from "./pages/QuizPage";
import QuizResult from "./pages/QuizResult";
import VocabPage from "./pages/VocabPage";
import ListeningPage from "./pages/ListeningPage";
import FullTestList from "./pages/FullTestList";
import FullTestExam from "./pages/FullTestExam";
import FullTestResult from "./pages/FullTestResult";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminCourseNew from "./pages/admin/AdminCourseNew";
import AdminCourseDetail from "./pages/admin/AdminCourseDetail";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminStudentDetail from "./pages/admin/AdminStudentDetail";
import AdminEnrollments from "./pages/admin/AdminEnrollments";
import AdminMaterials from "./pages/admin/AdminMaterials";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/courses/:courseId/learn" element={<LearnPage />} />
          <Route path="/courses/:courseId/quiz/:quizId" element={<QuizPage />} />
          <Route path="/courses/:courseId/quiz/:quizId/result" element={<QuizResult />} />
          <Route path="/courses/:courseId/vocab" element={<VocabPage />} />
          <Route path="/courses/:courseId/listening/:quizId" element={<ListeningPage />} />
          <Route path="/courses/:courseId/fulltest" element={<FullTestList />} />
          <Route path="/courses/:courseId/fulltest/:testId" element={<FullTestExam />} />
          <Route path="/courses/:courseId/fulltest/:testId/result" element={<FullTestResult />} />
          <Route path="/profile" element={<Profile />} />

          {/* Admin */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/courses/new" element={<AdminCourseNew />} />
          <Route path="/admin/courses/:courseId" element={<AdminCourseDetail />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/students/:userId" element={<AdminStudentDetail />} />
          <Route path="/admin/enrollments" element={<AdminEnrollments />} />
          <Route path="/admin/materials" element={<AdminMaterials />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
