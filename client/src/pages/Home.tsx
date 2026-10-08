import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import Header from '@/components/layout/Header';
import SearchBar from '@/components/ui/SearchBar';
import Carousel3D from '@/components/ui/Carousel3D';
import { motion } from 'framer-motion';
import { BookOpen, Play, ChevronLeft, ChevronRight, Users, Calendar, Clock, ArrowRight } from 'lucide-react';

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  category: string;
  duration: string;
  lesson_count: number;
  student_count: number;
}

interface UpcomingLesson {
  id: number;
  title: string;
  description: string;
  release_date: string;
  duration_minutes: number | null;
  course_id: number;
  course_title: string;
  category: string;
  thumbnail_url: string | null;
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function formatUpcomingDate(dateStr: string): { day: string; month: string; weekday: string } {
  const [year, month, dayNum] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, dayNum);
  return {
    day: String(dayNum),
    month: MONTH_NAMES_SHORT[month - 1],
    weekday: DAY_NAMES[date.getDay()],
  };
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<Course[]>('/courses'),
      api.get<UpcomingLesson[]>('/lessons/upcoming').catch(() => []),
    ])
      .then(([coursesData, upcomingData]) => {
        setCourses(coursesData);
        setUpcoming(upcomingData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  };

  useEffect(() => { checkScroll(); }, [courses]);

  return (
    <>
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search bar */}
        <div className="py-8">
          <SearchBar />
        </div>

        {/* Próximas Aulas */}
        {upcoming.length > 0 && (
          <section className="pb-12">
            <div className="flex items-end justify-between mb-6">
              <div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl sm:text-3xl font-bold mb-1"
                >
                  <Calendar className="inline-block mr-2 text-red-500" size={24} />
                  Próximas <span className="gradient-text">Aulas</span>
                </motion.h2>
                <p className="text-gray-400">Confira o que vem por aí na sua jornada</p>
              </div>
              <Link
                to="/agenda"
                className="hidden sm:flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Ver agenda completa <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.slice(0, 6).map((lesson, i) => {
                const dateInfo = formatUpcomingDate(lesson.release_date);
                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      to={`/courses/${lesson.course_id}`}
                      className="card p-4 flex gap-4 group hover:shadow-glow transition-all duration-300"
                    >
                      {/* Data */}
                      <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-red-600/20 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-red-400 leading-none">{dateInfo.day}</span>
                        <span className="text-[10px] text-red-400/70 uppercase">{dateInfo.month}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-600/20 text-red-400">
                            {lesson.category}
                          </span>
                          <span className="text-[10px] text-gray-500 truncate">{dateInfo.weekday}</span>
                        </div>
                        <h4 className="font-semibold text-sm leading-tight group-hover:text-red-400 transition-colors line-clamp-2">
                          {lesson.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{lesson.course_title}</p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Mobile: link para agenda */}
            <Link
              to="/agenda"
              className="sm:hidden flex items-center justify-center gap-2 mt-4 py-3 rounded-lg text-sm text-red-400 hover:bg-white/5 transition-colors"
            >
              Ver agenda completa <ArrowRight size={14} />
            </Link>
          </section>
        )}

        {/* Módulos em Destaque — 3D Carousel */}
        <section className="pb-16">

          {loading ? (
            <div className="flex justify-center gap-4 md:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-[220px]">
                  <div className="aspect-[2/3] rounded-xl animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">Nenhum curso disponível ainda</h3>
              <p className="text-gray-500">Os cursos aparecerão aqui quando forem publicados.</p>
            </div>
          ) : (
            <Carousel3D onItemClick={(i) => navigate(`/courses/${courses[i].id}`)}>
              {courses.map((course) => (
                <div key={course.id} className="group/card block w-[160px]">
                  {/* Thumbnail — Portrait 2:3 */}
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg" style={{ background: 'hsl(var(--muted))' }}>
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={40} className="text-gray-600" />
                      </div>
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Play button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-glow backdrop-blur-sm">
                        <Play size={20} className="text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Category badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-red-600/90 text-white backdrop-blur-sm">
                        {course.category}
                      </span>
                    </div>

                    {/* Title overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-bold text-sm leading-tight text-white line-clamp-2 drop-shadow-lg">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[10px] text-gray-300 mt-1">
                        {course.lesson_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Play size={10} /> {course.lesson_count} aulas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Carousel3D>
          )}
        </section>
      </div>
    </>
  );
}
