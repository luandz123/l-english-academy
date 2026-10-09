import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import ThemeToggle from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";

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

const FullTestDirectRedirect = () => {
  const { testId } = useParams();
  const tId = Number(testId);

  const { data: test, isLoading } = useQuery({
    queryKey: ["fulltest-direct-redirect", tId],
    queryFn: async () => {
      const { data } = await supabase
        .from("full_tests")
        .select("course_id")
        .eq("id", tId)
        .maybeSingle();
      return data;
    },
    enabled: !isNaN(tId) && tId > 0,
  });

  if (isNaN(tId)) return <Navigate to="/fulltests" replace />;
  if (isLoading) return null;

  if (test?.course_id) {
    return <Navigate to={`/courses/${test.course_id}/fulltest/${tId}`} replace />;
  }
  return <Navigate to="/fulltests" replace />;
};

// Lazy-loaded pages with automatic recovery from stale chunks (deploy updates)
const Index = lazyWithRetry(() => import("./pages/Index"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const AuthCallback = lazyWithRetry(() => import("./pages/AuthCallback"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const LearnPage = lazyWithRetry(() => import("./pages/LearnPage"));
const QuizPage = lazyWithRetry(() => import("./pages/QuizPage"));
const QuizResult = lazyWithRetry(() => import("./pages/QuizResult"));
const VocabPage = lazyWithRetry(() => import("./pages/VocabPage"));
const DictationPage = lazyWithRetry(() => import("./pages/DictationPage"));
const Part2CoachPage = lazyWithRetry(() => import("./pages/Part2CoachPage"));
const FullTestsPage = lazyWithRetry(() => import("./pages/FullTestsPage"));
const ListeningPage = lazyWithRetry(() => import("./pages/ListeningPage"));
const LibraryPage = lazyWithRetry(() => import("./pages/LibraryPage"));
const MyCoursesPage = lazyWithRetry(() => import("./pages/MyCoursesPage"));
const FullTestList = lazyWithRetry(() => import("./pages/FullTestList"));
const FullTestExam = lazyWithRetry(() => import("./pages/FullTestExam"));
const FullTestResult = lazyWithRetry(() => import("./pages/FullTestResult"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const VocabLessonPage = lazyWithRetry(() => import("./pages/VocabLessonPage"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminCourses = lazyWithRetry(() => import("./pages/admin/AdminCourses"));
const AdminCourseNew = lazyWithRetry(() => import("./pages/admin/AdminCourseNew"));
const AdminCourseDetail = lazyWithRetry(() => import("./pages/admin/AdminCourseDetail"));
const AdminStudents = lazyWithRetry(() => import("./pages/admin/AdminStudents"));
const AdminStudentDetail = lazyWithRetry(() => import("./pages/admin/AdminStudentDetail"));
const AdminCategories = lazyWithRetry(() => import("./pages/admin/AdminCategories"));
const AdminEnrollments = lazyWithRetry(() => import("./pages/admin/AdminEnrollments"));
const AdminMaterials = lazyWithRetry(() => import("./pages/admin/AdminMaterials"));
const AdminReports = lazyWithRetry(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminVocabPacks = lazyWithRetry(() => import("./pages/admin/AdminVocabPacks"));
const AdminFullTestManager = lazyWithRetry(() => import("./pages/admin/AdminFullTestManager"));
const AdminFullTestQuestions = lazyWithRetry(() => import("./pages/admin/AdminFullTestQuestions"));
const AdminCourseJsonImport = lazyWithRetry(() => import("./pages/admin/AdminCourseJsonImport"));
const WordShooterGame = lazyWithRetry(() => import("./pages/WordShooterGame"));
const WordDefenseGame = lazyWithRetry(() => import("./pages/WordDefenseGame"));
const GamesHub = lazyWithRetry(() => import("./pages/GamesHub"));


const PageLoader = () => (
  <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
    <div className="flex items-center justify-between py-2 border-b border-border/40">
      <Skeleton className="h-8 w-36 rounded-xl" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
    <Skeleton className="h-56 sm:h-72 w-full rounded-2xl" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
    </div>
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
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/courses" element={<CoursesRedirect />} />
                <Route path="/courses/:courseId" element={<CourseDetailRedirect />} />
                <Route path="/courses/:courseId/learn" element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/quiz/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/quiz/:quizId/result" element={<ProtectedRoute><QuizResult /></ProtectedRoute>} />
                <Route path="/courses/:courseId/vocab" element={<ProtectedRoute><VocabPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/vocab-lesson/:lessonId" element={<ProtectedRoute><VocabLessonPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/dictation/:quizId" element={<ProtectedRoute><DictationPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/part2-coach/:clusterId" element={<Navigate to="/part2-coach" replace />} />
                <Route path="/courses/:courseId/part2-coach" element={<Navigate to="/part2-coach" replace />} />
                <Route path="/part2-coach" element={<ProtectedRoute><Part2CoachPage /></ProtectedRoute>} />
                <Route path="/part2-coach/:clusterId" element={<ProtectedRoute><Part2CoachPage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/fulltest" element={<ProtectedRoute><FullTestList /></ProtectedRoute>} />
                <Route path="/courses/:courseId/fulltest/:testId" element={<ProtectedRoute><FullTestExam /></ProtectedRoute>} />
                <Route path="/courses/:courseId/fulltest/:testId/result" element={<ProtectedRoute><FullTestResult /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/fulltests" element={<ProtectedRoute><FullTestsPage /></ProtectedRoute>} />
                <Route path="/fulltests/:testId" element={<ProtectedRoute><FullTestDirectRedirect /></ProtectedRoute>} />
                <Route path="/listening" element={<ProtectedRoute><ListeningPage /></ProtectedRoute>} />
                <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
                <Route path="/my-courses" element={<ProtectedRoute><MyCoursesPage /></ProtectedRoute>} />
                <Route path="/games" element={<GamesHub />} />
                <Route path="/games/word-shooter" element={<WordShooterGame />} />
                <Route path="/games/word-defense" element={<WordDefenseGame />} />
                <Route path="/word-defense" element={<Navigate to="/games/word-defense" replace />} />
                <Route path="/game" element={<Navigate to="/games" replace />} />

                {/* Admin (role-protected) */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/vocab-packs" element={<AdminRoute><AdminVocabPacks /></AdminRoute>} />
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
