import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import Header from '@/components/layout/Header';
import { motion } from 'framer-motion';
import { Calendar, Play, Clock, ChevronLeft, ChevronRight, Video, BookOpen } from 'lucide-react';

interface ScheduledLesson {
  id: number;
  title: string;
  description: string;
  release_date: string;
  duration_minutes: number | null;
  course_id: number;
  course_title: string;
  category: string;
  thumbnail_url: string | null;
  module_name: string;
  video_url: string | null;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekDay = DAY_NAMES[date.getDay()];
  return `${weekDay}, ${day} de ${MONTH_NAMES[month - 1]}`;
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

function isPast(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date < today;
}

export default function Agenda() {
  const [lessons, setLessons] = useState<ScheduledLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    api.get<ScheduledLesson[]>(`/lessons/calendar?month=${currentMonth + 1}&year=${currentYear}`)
      .then(setLessons)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentMonth, currentYear]);

  const navigateMonth = (direction: -1 | 1) => {
    setLoading(true);
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Agrupar aulas por data
  const lessonsByDate = lessons.reduce<Record<string, ScheduledLesson[]>>((acc, lesson) => {
    const date = lesson.release_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(lesson);
    return acc;
  }, {});

  // Gerar dias do mês para o calendário
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getDateStr = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <Calendar className="inline-block mr-3 text-red-500" size={32} />
            Agenda de <span className="gradient-text">Conteúdo</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Acompanhe as próximas aulas e mentorias programadas
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendário Visual */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="card p-5">
              {/* Navegação do mês */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft size={18} className="text-gray-400" />
                </button>
                <h3 className="font-bold text-lg">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h3>
                <button
                  onClick={() => navigateMonth(1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <ChevronRight size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Dias do mês */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} />;
                  const dateStr = getDateStr(day);
                  const hasLessons = lessonsByDate[dateStr]?.length > 0;
                  const todayClass = isToday(dateStr);
                  const pastClass = isPast(dateStr);

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (hasLessons) {
                          document.getElementById(`date-${dateStr}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className={`
                        relative w-full aspect-square rounded-lg flex items-center justify-center text-sm transition-all
                        ${todayClass ? 'bg-red-600 text-white font-bold' : ''}
                        ${hasLessons && !todayClass ? 'bg-red-600/20 text-red-400 font-semibold' : ''}
                        ${!hasLessons && !todayClass ? (pastClass ? 'text-gray-600' : 'text-gray-400') : ''}
                        ${hasLessons ? 'cursor-pointer hover:bg-red-600/30' : 'cursor-default'}
                      `}
                    >
                      {day}
                      {hasLessons && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600" />
                  <span>Hoje</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600/30" />
                  <span>Dia com aula programada</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Lista de Aulas do Mês */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card p-5 animate-pulse">
                    <div className="h-5 w-1/3 rounded mb-3" style={{ background: 'hsl(var(--muted))' }} />
                    <div className="h-16 rounded" style={{ background: 'hsl(var(--muted))' }} />
                  </div>
                ))}
              </div>
            ) : Object.keys(lessonsByDate).length === 0 ? (
              <div className="card p-12 text-center">
                <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  Nenhuma aula programada
                </h3>
                <p className="text-gray-500">
                  Não há aulas agendadas para {MONTH_NAMES[currentMonth]} {currentYear}.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(lessonsByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, dateLessons]) => (
                    <div key={date} id={`date-${date}`}>
                      {/* Data Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`
                          px-3 py-1.5 rounded-lg text-sm font-semibold
                          ${isToday(date) ? 'bg-red-600 text-white' : isPast(date) ? 'bg-white/5 text-gray-500' : 'bg-red-600/20 text-red-400'}
                        `}>
                          {isToday(date) ? 'HOJE' : formatDate(date)}
                        </div>
                        {isToday(date) && (
                          <span className="text-gray-400 text-sm">{formatDate(date)}</span>
                        )}
                        {isPast(date) && !isToday(date) && (
                          <span className="text-xs text-gray-600 uppercase tracking-wider">Disponível</span>
                        )}
                      </div>

                      {/* Aulas do dia */}
                      <div className="space-y-3">
                        {dateLessons.map((lesson, i) => (
                          <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <Link
                              to={lesson.video_url ? `/courses/${lesson.course_id}/lesson/${lesson.id}` : `/courses/${lesson.course_id}`}
                              className={`
                                card p-4 flex gap-4 group hover:shadow-glow transition-all duration-300
                                ${isPast(date) && lesson.video_url ? 'cursor-pointer' : ''}
                              `}
                            >
                              {/* Thumbnail */}
                              <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden relative" style={{ background: 'hsl(var(--muted))' }}>
                                {lesson.thumbnail_url ? (
                                  <img
                                    src={lesson.thumbnail_url}
                                    alt={lesson.course_title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <BookOpen size={24} className="text-gray-600" />
                                  </div>
                                )}
                                {lesson.video_url && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play size={20} className="text-white" />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-600/20 text-red-400">
                                    {lesson.category}
                                  </span>
                                  <span className="text-xs text-gray-500 truncate">
                                    {lesson.course_title}
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm sm:text-base leading-tight group-hover:text-red-400 transition-colors line-clamp-2">
                                  {lesson.title}
                                </h4>
                                {lesson.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 hidden sm:block">
                                    {lesson.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  {lesson.duration_minutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock size={12} /> {lesson.duration_minutes}min
                                    </span>
                                  )}
                                  {lesson.video_url ? (
                                    <span className="flex items-center gap-1 text-green-500">
                                      <Video size={12} /> Disponível
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-yellow-500">
                                      <Calendar size={12} /> Em breve
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
