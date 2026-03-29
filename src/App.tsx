import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
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
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Student (protected) */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
            <Route path="/courses/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/courses/:courseId/learn" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
            <Route path="/courses/:courseId/quiz/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
            <Route path="/courses/:courseId/quiz/:quizId/result" element={<ProtectedRoute><QuizResult /></ProtectedRoute>} />
            <Route path="/courses/:courseId/vocab" element={<ProtectedRoute><VocabPage /></ProtectedRoute>} />
            <Route path="/courses/:courseId/listening/:quizId" element={<ProtectedRoute><ListeningPage /></ProtectedRoute>} />
            <Route path="/courses/:courseId/fulltest" element={<ProtectedRoute><FullTestList /></ProtectedRoute>} />
            <Route path="/courses/:courseId/fulltest/:testId" element={<ProtectedRoute><FullTestExam /></ProtectedRoute>} />
            <Route path="/courses/:courseId/fulltest/:testId/result" element={<ProtectedRoute><FullTestResult /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin (role-protected) */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
            <Route path="/admin/courses/new" element={<AdminRoute><AdminCourseNew /></AdminRoute>} />
            <Route path="/admin/courses/:courseId" element={<AdminRoute><AdminCourseDetail /></AdminRoute>} />
            <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
            <Route path="/admin/students/:userId" element={<AdminRoute><AdminStudentDetail /></AdminRoute>} />
            <Route path="/admin/enrollments" element={<AdminRoute><AdminEnrollments /></AdminRoute>} />
            <Route path="/admin/materials" element={<AdminRoute><AdminMaterials /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
