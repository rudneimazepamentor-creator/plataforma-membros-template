import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Play, Check, Clock, ChevronRight, BookOpen, Lock } from 'lucide-react';
import Header from '@/components/layout/Header';
import UpgradeModal from '@/components/lesson/UpgradeModal';

interface LessonItem {
  id: number;
  title: string;
  description: string;
  video_url: string;
  video_type: string;
  duration_minutes: number;
  module_name: string;
  order_index: number;
  locked?: boolean;
  effective_tier?: 'basic' | 'premium';
}

interface ProgressItem {
  lesson_id: number;
  progress_percentage: number;
  completed_at: string | null;
}

interface CourseData {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  category: string;
  duration: string;
  lessons: LessonItem[];
  progress: ProgressItem[];
}

export default function Course() {
  const { courseId } = useParams();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockedLesson, setLockedLesson] = useState<LessonItem | null>(null);

  useEffect(() => {
    api.get<CourseData>(`/courses/${courseId}`)
      .then(setCourse)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading || !course) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="bg-dark-3 h-8 w-1/2 rounded" />
          <div className="bg-dark-3 h-4 w-3/4 rounded" />
          <div className="space-y-3 mt-8">
            {[1, 2, 3, 4].map((i) => <div key={i} className="bg-dark-2 h-20 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  // Agrupar aulas por módulo
  const modules = course.lessons.reduce<Record<string, LessonItem[]>>((acc, lesson) => {
    const mod = lesson.module_name || 'Sem módulo';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(lesson);
    return acc;
  }, {});

  const completedMap = new Map(course.progress.map((p) => [p.lesson_id, p]));
  const totalLessons = course.lessons.length;
  const completedLessons = course.progress.filter((p) => p.completed_at).length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <>
    <Header />
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header do curso */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/" className="hover:text-red-600">Cursos</Link>
          <ChevronRight size={14} />
          <span className="text-gray-300">{course.title}</span>
        </div>

        <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
        {course.description && (
          <p className="text-gray-400 text-lg mb-6">{course.description}</p>
        )}

        {/* Progress bar */}
        <div className="card flex items-center gap-6">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Progresso do curso</span>
              <span className="text-sm font-semibold text-red-600">{progressPct}%</span>
            </div>
            <div className="h-2 bg-dark-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{completedLessons}/{totalLessons}</div>
            <div className="text-xs text-gray-500">aulas concluídas</div>
          </div>
        </div>
      </div>

      {/* Módulos e aulas */}
      <div className="space-y-6">
        {Object.entries(modules).map(([moduleName, lessons]) => (
          <div key={moduleName}>
            <div className="flex items-center gap-3 mb-3">
              <BookOpen size={18} className="text-red-600" />
              <h2 className="text-lg font-bold">{moduleName}</h2>
              <span className="text-xs text-gray-500">{lessons.length} aulas</span>
            </div>

            <div className="space-y-2">
              {lessons.map((lesson, idx) => {
                const prog = completedMap.get(lesson.id);
                const isCompleted = !!prog?.completed_at;
                const isLocked = !!lesson.locked;

                const baseClasses = `flex items-center gap-4 p-4 rounded-xl border transition-all group ${
                  isLocked
                    ? 'bg-dark-2/40 border-dark-3 hover:border-red-600/40 cursor-pointer'
                    : isCompleted
                      ? 'bg-red-600/5 border-red-600/20 hover:border-red-600/30'
                      : 'bg-dark-2 border-dark-3 hover:border-red-600/30'
                }`;

                const inner = (
                  <>
                    {/* Número/status */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isLocked
                        ? 'bg-red-600/10 text-red-500'
                        : isCompleted
                          ? 'bg-red-600 text-white'
                          : 'bg-dark-3 text-gray-400 group-hover:bg-red-600/20 group-hover:text-red-600'
                    }`}>
                      {isLocked ? <Lock size={16} /> : isCompleted ? <Check size={18} /> : <span className="text-sm font-medium">{idx + 1}</span>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium truncate ${
                          isLocked ? 'text-gray-400' : isCompleted ? 'text-red-400' : 'text-white group-hover:text-red-400'
                        }`}>
                          {lesson.title}
                        </h3>
                        {isLocked && (
                          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-red-600/20 text-red-400 flex-shrink-0">
                            PREMIUM
                          </span>
                        )}
                      </div>
                      {lesson.description && (
                        <p className="text-sm text-gray-500 truncate">{lesson.description}</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {lesson.duration_minutes && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} /> {lesson.duration_minutes} min
                        </span>
                      )}
                      {isLocked ? (
                        <Lock size={16} className="text-red-500/70" />
                      ) : (
                        <Play size={16} className="text-gray-500 group-hover:text-red-600" />
                      )}
                    </div>
                  </>
                );

                if (isLocked) {
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => setLockedLesson(lesson)}
                      className={`${baseClasses} text-left w-full`}
                    >
                      {inner}
                    </button>
                  );
                }

                return (
                  <Link
                    key={lesson.id}
                    to={`/courses/${courseId}/lesson/${lesson.id}`}
                    className={baseClasses}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
    <UpgradeModal
      open={!!lockedLesson}
      onClose={() => setLockedLesson(null)}
      lessonTitle={lockedLesson?.title}
      courseTitle={course.title}
    />
    </>
  );
}
