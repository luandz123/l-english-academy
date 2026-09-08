import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import ThemeToggle from "@/components/ThemeToggle";

const CoursesRedirect = () => {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter");
  const hash =
    filter === "fulltest"
      ? "#section-fulltest"
      : filter === "listening"
      ? "#section-listening"
      : filter === "video_quiz" || filter === "video"
      ? "#section-video"
      : "";
  return <Navigate to={`/${hash}`} replace />;
};

const CourseDetailRedirect = () => {
  const { courseId } = useParams();
  const cId = Number(courseId);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-detail-redirect", cId],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("course_type")
        .eq("id", cId)
        .maybeSingle();
      return data;
    },
    enabled: !isNaN(cId) && cId > 0,
  });

  if (isNaN(cId)) return <Navigate to="/" replace />;
  if (isLoading) return null;

  if (course?.course_type === "fulltest") {
    return <Navigate to={`/courses/${cId}/fulltest`} replace />;
  }
  if (course?.course_type === "flashcard") {
    return <Navigate to={`/courses/${cId}/vocab`} replace />;
  }
  return <Navigate to={`/courses/${cId}/learn`} replace />;
};

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const QuizResult = lazy(() => import("./pages/QuizResult"));
const VocabPage = lazy(() => import("./pages/VocabPage"));
const DictationPage = lazy(() => import("./pages/DictationPage"));
const FullTestList = lazy(() => import("./pages/FullTestList"));
const FullTestExam = lazy(() => import("./pages/FullTestExam"));
const FullTestResult = lazy(() => import("./pages/FullTestResult"));
const Profile = lazy(() => import("./pages/Profile"));
const VocabLessonPage = lazy(() => import("./pages/VocabLessonPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminCourseNew = lazy(() => import("./pages/admin/AdminCourseNew"));
const AdminCourseDetail = lazy(() => import("./pages/admin/AdminCourseDetail"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents"));
const AdminStudentDetail = lazy(() => import("./pages/admin/AdminStudentDetail"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminEnrollments = lazy(() => import("./pages/admin/AdminEnrollments"));
const AdminMaterials = lazy(() => import("./pages/admin/AdminMaterials"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminFullTestManager = lazy(() => import("./pages/admin/AdminFullTestManager"));
const AdminFullTestQuestions = lazy(() => import("./pages/admin/AdminFullTestQuestions"));
const AdminCourseJsonImport = lazy(() => import("./pages/admin/AdminCourseJsonImport"));


const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeToggle />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Student (protected) */}
                <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
                <Route path="/courses" element={<CoursesRedirect />} />
                <Route path="/courses/:courseId" element={<CourseDetailRedirect />} />
                <Route path="/courses/:courseId/learn" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/quiz/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/quiz/:quizId/result" element={<ProtectedRoute><QuizResult /></ProtectedRoute>} />
                <Route path="/courses/:courseId/vocab" element={<ProtectedRoute><VocabPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/vocab-lesson/:lessonId" element={<ProtectedRoute><VocabLessonPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/dictation/:quizId" element={<ProtectedRoute><DictationPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/fulltest" element={<ProtectedRoute><FullTestList /></ProtectedRoute>} />
                <Route path="/courses/:courseId/fulltest/:testId" element={<ProtectedRoute><FullTestExam /></ProtectedRoute>} />
                <Route path="/courses/:courseId/fulltest/:testId/result" element={<ProtectedRoute><FullTestResult /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                {/* Admin (role-protected) */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
                <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
                <Route path="/admin/courses/new" element={<AdminRoute><AdminCourseNew /></AdminRoute>} />
                <Route path="/admin/courses/:courseId" element={<AdminRoute><AdminCourseDetail /></AdminRoute>} />
                <Route path="/admin/fulltests" element={<AdminRoute><AdminFullTestManager /></AdminRoute>} />
                <Route path="/admin/fulltests/:testId/questions" element={<AdminRoute><AdminFullTestQuestions /></AdminRoute>} />
                <Route path="/admin/import-json" element={<AdminRoute><AdminCourseJsonImport /></AdminRoute>} />
                <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
                <Route path="/admin/students/:userId" element={<AdminRoute><AdminStudentDetail /></AdminRoute>} />
                <Route path="/admin/enrollments" element={<AdminRoute><AdminEnrollments /></AdminRoute>} />
                <Route path="/admin/materials" element={<AdminRoute><AdminMaterials /></AdminRoute>} />
                <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
                <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
