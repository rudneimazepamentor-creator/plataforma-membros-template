import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { getVideoType, getYoutubeId, getGdriveId, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Check, ChevronRight, Download, MessageSquare, Send, ArrowLeft, ArrowRight, FileText, Lock } from 'lucide-react';
import Header from '@/components/layout/Header';
import UpgradeModal from '@/components/lesson/UpgradeModal';

interface LessonData {
  id: number;
  course_id: number;
  course_title: string;
  title: string;
  description: string;
  video_url: string;
  video_type: string;
  module_name: string;
  materials: Material[];
  siblings: SiblingLesson[];
  progress: { progress_percentage: number; completed_at: string } | null;
}

interface Material {
  id: number;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface SiblingLesson {
  id: number;
  title: string;
  module_name: string;
  order_index: number;
  locked?: boolean;
  effective_tier?: 'basic' | 'premium';
}

interface LockedInfo {
  preview: {
    id: number;
    title: string;
    description: string;
    duration_minutes: number | null;
    module_name: string;
    course_id: number;
    course_title: string;
    course_thumbnail: string | null;
  };
  required_tier: 'basic' | 'premium';
}

interface Comment {
  id: number;
  content: string;
  display_name: string;
  created_at: string;
  parent_id: number | null;
}

export default function Lesson() {
  const { courseId, lessonId } = useParams();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [lockedInfo, setLockedInfo] = useState<LockedInfo | null>(null);
  const isCompleted = !!lesson?.progress?.completed_at;

  useEffect(() => {
    setLoading(true);
    setLockedInfo(null);
    setLesson(null);
    api.get<LessonData>(`/lessons/${lessonId}`)
      .then((lessonData) => {
        setLesson(lessonData);
        return api.get<Comment[]>(`/lessons/${lessonId}/comments`);
      })
      .then((commentsData) => {
        if (commentsData) setComments(commentsData);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403 && err.body?.locked) {
          setLockedInfo({
            preview: err.body.preview as LockedInfo['preview'],
            required_tier: (err.body.required_tier as 'basic' | 'premium') || 'premium',
          });
          return;
        }
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  const markComplete = async () => {
    try {
      await api.post(`/lessons/${lessonId}/progress`, { progress_percentage: 100 });
      setLesson((prev) => prev ? { ...prev, progress: { progress_percentage: 100, completed_at: new Date().toISOString() } } : prev);
      toast.success('Aula concluída!');
    } catch {
      toast.error('Erro ao marcar como concluída');
    }
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    try {
      const comment = await api.post<Comment>(`/lessons/${lessonId}/comments`, { content: newComment });
      setComments([...comments, comment]);
      setNewComment('');
    } catch {
      toast.error('Erro ao enviar comentário');
    }
  };

  if (lockedInfo) {
    const p = lockedInfo.preview;
    return (
      <>
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link to="/" className="hover:text-red-600">Cursos</Link>
            <ChevronRight size={14} />
            <Link to={`/courses/${p.course_id}`} className="hover:text-red-600">{p.course_title}</Link>
            <ChevronRight size={14} />
            <span className="text-gray-300 truncate">{p.title}</span>
          </div>

          <div className="relative aspect-video rounded-xl overflow-hidden bg-dark-2 border border-red-600/30 flex items-center justify-center mb-6">
            {p.course_thumbnail && (
              <img src={p.course_thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
            )}
            <div className="relative z-10 flex flex-col items-center text-center px-6">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mb-3">
                <Lock size={28} className="text-red-500" />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-red-600 text-white mb-3">
                Conteúdo premium
              </span>
              <h2 className="text-2xl font-bold mb-1">{p.title}</h2>
              <p className="text-sm text-gray-400 max-w-md">
                Esta aula faz parte do conteúdo exclusivo para membros premium.
              </p>
            </div>
          </div>

          {p.description && (
            <div className="card mb-6">
              <p className="text-gray-300 whitespace-pre-wrap">{p.description}</p>
            </div>
          )}

          <UpgradeModal
            open={true}
            onClose={() => { /* paywall não fecha — única saída é voltar pro curso */ }}
            lessonTitle={p.title}
            courseTitle={p.course_title}
          />
        </div>
      </>
    );
  }

  if (loading || !lesson) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="bg-dark-3 aspect-video rounded-xl mb-6" />
          <div className="bg-dark-3 h-8 w-2/3 rounded mb-4" />
          <div className="bg-dark-3 h-4 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  // Navegação prev/next
  const currentIdx = lesson.siblings.findIndex((s) => s.id === lesson.id);
  const prevLesson = currentIdx > 0 ? lesson.siblings[currentIdx - 1] : null;
  const nextLesson = currentIdx < lesson.siblings.length - 1 ? lesson.siblings[currentIdx + 1] : null;

  return (
    <>
    <Header />
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-red-600">Cursos</Link>
        <ChevronRight size={14} />
        <Link to={`/courses/${courseId}`} className="hover:text-red-600">{lesson.course_title}</Link>
        <ChevronRight size={14} />
        <span className="text-gray-300 truncate">{lesson.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conteúdo principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video player */}
          <VideoPlayer url={lesson.video_url} tipo={lesson.video_type} />

          {/* Título + ações */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs text-red-600 font-medium">{lesson.module_name}</span>
              <h1 className="text-2xl font-bold mt-1">{lesson.title}</h1>
            </div>
            <button
              onClick={markComplete}
              disabled={isCompleted}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-all ${
                isCompleted
                  ? 'bg-red-600/20 text-red-400 cursor-default'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <Check size={16} />
              {isCompleted ? 'Concluída' : 'Marcar como concluída'}
            </button>
          </div>

          {/* Descrição */}
          {lesson.description && (
            <div className="card">
              <p className="text-gray-300 whitespace-pre-wrap">{lesson.description}</p>
            </div>
          )}

          {/* Materiais */}
          {lesson.materials.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText size={18} className="text-red-600" />
                Materiais complementares
              </h3>
              <div className="space-y-2">
                {lesson.materials.map((mat) => (
                  <a
                    key={mat.id}
                    href={mat.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-dark-3 hover:bg-dark-3/80 transition-colors group"
                  >
                    <Download size={16} className="text-red-600 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{mat.title}</div>
                      <div className="text-xs text-gray-500">
                        {mat.file_type} {mat.file_size ? `— ${(mat.file_size / 1024 / 1024).toFixed(1)} MB` : ''}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between gap-4">
            {prevLesson ? (
              <Link
                to={`/courses/${courseId}/lesson/${prevLesson.id}`}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <ArrowLeft size={16} /> Anterior
              </Link>
            ) : <div />}
            {nextLesson ? (
              <Link
                to={`/courses/${courseId}/lesson/${nextLesson.id}`}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Próxima <ArrowRight size={16} />
              </Link>
            ) : <div />}
          </div>

          {/* Comentários */}
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-red-600" />
              Comentários ({comments.length})
            </h3>

            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                className="input-field flex-1"
                placeholder="Escreva um comentário..."
              />
              <button onClick={submitComment} className="btn-primary px-4">
                <Send size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {comments.filter((c) => !c.parent_id).map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-red-600">
                      {comment.display_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.display_name}</span>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-300">{comment.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum comentário ainda. Seja o primeiro!</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — lista de aulas */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <h3 className="font-semibold mb-4 text-sm text-gray-400 uppercase tracking-wider">Aulas do curso</h3>
            <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
              {lesson.siblings.map((s, i) => (
                <Link
                  key={s.id}
                  to={`/courses/${courseId}/lesson/${s.id}`}
                  className={`flex items-center gap-3 p-2.5 rounded-lg text-sm transition-colors ${
                    s.id === lesson.id
                      ? 'bg-red-600/10 text-red-400 border border-red-600/20'
                      : s.locked
                        ? 'text-gray-500 hover:text-gray-300 hover:bg-dark-3/60'
                        : 'text-gray-400 hover:text-white hover:bg-dark-3'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    s.locked ? 'bg-red-600/10 text-red-500' : 'bg-dark-3'
                  }`}>
                    {s.locked ? <Lock size={12} /> : i + 1}
                  </span>
                  <span className="truncate flex-1">{s.title}</span>
                  {s.locked && (
                    <span className="text-[9px] uppercase font-bold text-red-400/80">PREMIUM</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function VideoPlayer({ url, tipo }: { url: string; tipo?: string }) {
  // Bloquear clique-direito no player (previne "Copiar URL do frame")
  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  if (!url) {
    return (
      <div className="aspect-video bg-dark-2 rounded-xl flex items-center justify-center">
        <p className="text-gray-500">Vídeo não disponível</p>
      </div>
    );
  }

  // Aulas no R2 chegam como URL assinada temporária, que não tem como ser
  // reconhecida pelo formato — por isso o tipo vem do banco, não da URL.
  const type = tipo === 'r2' ? 'r2' : getVideoType(url);

  if (type === 'r2') {
    return (
      <div className="aspect-video rounded-xl overflow-hidden" onContextMenu={handleContextMenu}>
        <video
          src={url}
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
          className="w-full h-full bg-black"
        />
      </div>
    );
  }

  if (type === 'youtube') {
    const videoId = getYoutubeId(url);
    return (
      <div className="aspect-video rounded-xl overflow-hidden" onContextMenu={handleContextMenu}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (type === 'gdrive') {
    const fileId = getGdriveId(url);
    return (
      <div>
        <div className="aspect-video rounded-xl overflow-hidden relative" onContextMenu={handleContextMenu}>
          <iframe
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
          {/* Overlay no canto superior direito — bloqueia botão "abrir em nova aba" do Google Drive */}
          <div className="absolute top-0 right-0 w-16 h-16 z-10 cursor-default" />
          {/* Overlay no canto superior esquerdo — bloqueia logo do Google Drive */}
          <div className="absolute top-0 left-0 w-16 h-16 z-10 cursor-default" />
        </div>

        {/*
          O player do Google Drive só reproduz para quem está logado numa Conta
          Google no navegador — verificado em 17-Set-2026, inclusive abrindo o
          Drive fora do iframe. Sem sessão ele mostra apenas "Não foi possível
          carregar o vídeo", sem dizer o motivo, e o aluno conclui que a
          plataforma está quebrada. Enquanto as aulas não migram para
          hospedagem própria, este aviso transforma um erro mudo em uma
          instrução que o aluno consegue seguir sozinho.
        */}
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <span className="text-amber-200/90">
            O vídeo não aparece? Entre numa <strong>Conta Google</strong> no navegador — o player exige isso.
          </span>
          <a
            href={`https://drive.google.com/file/d/${fileId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto whitespace-nowrap rounded-md bg-amber-500/90 px-3 py-1.5 font-medium text-black hover:bg-amber-400"
          >
            Abrir em nova aba
          </a>
        </div>
      </div>
    );
  }

  if (type === 'local') {
    return (
      <div className="aspect-video rounded-xl overflow-hidden">
        <video src={url} controls className="w-full h-full bg-black" />
      </div>
    );
  }

  // External fallback
  return (
    <div className="aspect-video bg-dark-2 rounded-xl flex items-center justify-center">
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
        Abrir vídeo em nova aba
      </a>
    </div>
  );
}
