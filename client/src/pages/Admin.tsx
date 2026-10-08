import { useState, useEffect } from 'react';
import { APP_NAME } from '@/lib/config';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { formatDate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, Play, Users, Link2, Radio, Plus, Trash2,
  Eye, EyeOff, Pencil, Copy, ExternalLink, ChevronDown, ChevronRight,
  FileUp, FileText, Upload, X, GripVertical, Bell, Send, CheckCircle, AlertCircle,
  Gift, DollarSign, Phone, Mail, Clock, Download, Filter
} from 'lucide-react';

type Tab = 'dashboard' | 'content' | 'members' | 'invites' | 'recordings' | 'notifications' | 'referrals';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('content');

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'content' as Tab, label: 'Conteúdo', icon: BookOpen },
    { id: 'members' as Tab, label: 'Membros', icon: Users },
    { id: 'invites' as Tab, label: 'Convites', icon: Link2 },
    { id: 'recordings' as Tab, label: 'Gravações', icon: Radio },
    { id: 'referrals' as Tab, label: 'Indicações', icon: Gift },
    { id: 'notifications' as Tab, label: 'Notificações', icon: Bell },
  ];

  return (
    <>
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-6">Painel <span className="text-red-600">Admin</span></h1>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              style={activeTab !== tab.id ? { background: 'hsl(var(--card))' } : {}}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'invites' && <InvitesTab />}
        {activeTab === 'recordings' && <RecordingsTab />}
        {activeTab === 'referrals' && <ReferralsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </div>
    </>
  );
}

// ═══════════ CONTENT TAB (Curso → Aulas → Materiais) ═══════════
function ContentTab() {
  const [courses, setCourses] = useState<any[]>([]);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [courseForm, setCourseForm] = useState<any>(null);
  const [lessonForm, setLessonForm] = useState<any>(null);
  const [materialForm, setMaterialForm] = useState<any>(null);
  const [lessonsData, setLessonsData] = useState<Record<number, any[]>>({});
  const [materialsData, setMaterialsData] = useState<Record<number, any[]>>({});

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = () => api.get<any[]>('/courses').then(setCourses);

  const loadLessons = async (courseId: number) => {
    const data = await api.get<any>(`/courses/${courseId}`);
    setLessonsData(prev => ({ ...prev, [courseId]: data.lessons || [] }));
  };

  const loadMaterials = async (lessonId: number) => {
    const data = await api.get<any[]>(`/materials?lesson_id=${lessonId}`);
    setMaterialsData(prev => ({ ...prev, [lessonId]: data }));
  };

  const toggleCourse = async (courseId: number) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      setExpandedLesson(null);
      if (!lessonsData[courseId]) await loadLessons(courseId);
    }
  };

  const toggleLesson = async (lessonId: number) => {
    if (expandedLesson === lessonId) {
      setExpandedLesson(null);
    } else {
      setExpandedLesson(lessonId);
      if (!materialsData[lessonId]) await loadMaterials(lessonId);
    }
  };

  // CRUD Curso
  const saveCourse = async () => {
    if (!courseForm) return;
    try {
      if (courseForm.id) {
        await api.put(`/courses/${courseForm.id}`, courseForm);
        toast.success('Curso atualizado');
      } else {
        await api.post('/courses', { ...courseForm, is_published: true });
        toast.success('Curso criado');
      }
      setCourseForm(null);
      loadCourses();
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteCourse = async (id: number) => {
    if (!confirm('Deletar este curso e TODAS as aulas/materiais?')) return;
    await api.del(`/courses/${id}`);
    toast.success('Curso removido');
    loadCourses();
  };

  // CRUD Aula
  const saveLesson = async (courseId: number) => {
    if (!lessonForm) return;
    try {
      if (lessonForm.id) {
        await api.put(`/lessons/${lessonForm.id}`, lessonForm);
        toast.success('Aula atualizada');
      } else {
        await api.post('/lessons', { ...lessonForm, course_id: courseId, is_published: true });
        toast.success('Aula criada');
      }
      setLessonForm(null);
      loadLessons(courseId);
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteLesson = async (lessonId: number, courseId: number) => {
    if (!confirm('Deletar esta aula e seus materiais?')) return;
    await api.del(`/lessons/${lessonId}`);
    toast.success('Aula removida');
    loadLessons(courseId);
  };

  // CRUD Material
  const saveMaterial = async (lessonId: number) => {
    if (!materialForm) return;
    try {
      await api.post('/materials/link', { ...materialForm, lesson_id: lessonId });
      toast.success('Material adicionado');
      setMaterialForm(null);
      loadMaterials(lessonId);
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteMaterial = async (materialId: number, lessonId: number) => {
    await api.del(`/materials/${materialId}`);
    toast.success('Material removido');
    loadMaterials(lessonId);
  };

  const uploadThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const result = await api.upload<{ url: string }>('/upload/thumbnail', formData);
    setCourseForm((prev: any) => ({ ...prev, thumbnail_url: result.url }));
    toast.success('Thumbnail enviada');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Cursos ({courses.length})</h2>
        <button
          onClick={() => setCourseForm({ title: '', description: '', category: 'Inteligência Artificial', duration: '', thumbnail_url: '' })}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Novo Curso
        </button>
      </div>

      {/* Form novo curso */}
      <AnimatePresence>
        {courseForm && !courseForm.id && (
          <CourseFormComponent form={courseForm} setForm={setCourseForm} onSave={saveCourse} onCancel={() => setCourseForm(null)} onUploadThumb={uploadThumb} />
        )}
      </AnimatePresence>

      {/* Lista de cursos com accordion */}
      <div className="space-y-3">
        {courses.map((course) => (
          <div key={course.id} className="card !p-0 overflow-hidden">
            {/* Header do curso */}
            <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => toggleCourse(course.id)}>
              <div className="text-gray-500">
                {expandedCourse === course.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} className="w-16 h-10 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-16 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--muted))' }}>
                  <BookOpen size={16} className="text-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{course.title}</h3>
                  {course.is_published ? <Eye size={12} className="text-red-500" /> : <EyeOff size={12} className="text-gray-500" />}
                </div>
                <div className="text-xs text-gray-500">{course.lesson_count || 0} aulas | {course.category}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setCourseForm({ ...course })} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"><Pencil size={14} /></button>
                <button onClick={() => deleteCourse(course.id)} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/5"><Trash2 size={14} /></button>
              </div>
            </div>

            {/* Form edição curso */}
            <AnimatePresence>
              {courseForm?.id === course.id && (
                <CourseFormComponent form={courseForm} setForm={setCourseForm} onSave={saveCourse} onCancel={() => setCourseForm(null)} onUploadThumb={uploadThumb} />
              )}
            </AnimatePresence>

            {/* Aulas expandidas */}
            <AnimatePresence>
              {expandedCourse === course.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                  style={{ borderTop: '1px solid hsl(var(--border))' }}
                >
                  <div className="p-4 pl-12 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Aulas deste curso</span>
                      <button
                        onClick={() => setLessonForm({ title: '', description: '', video_url: '', video_type: 'gdrive', module_name: 'Módulo 1', order_index: 0 })}
                        className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
                      >
                        <Plus size={12} /> Nova Aula
                      </button>
                    </div>

                    {/* Form nova aula */}
                    <AnimatePresence>
                      {lessonForm && !lessonForm.id && (
                        <LessonFormComponent form={lessonForm} setForm={setLessonForm} onSave={() => saveLesson(course.id)} onCancel={() => setLessonForm(null)} />
                      )}
                    </AnimatePresence>

                    {(lessonsData[course.id] || []).length === 0 && !lessonForm && (
                      <p className="text-sm text-gray-500 py-4 text-center">Nenhuma aula. Clique em "+ Nova Aula" para adicionar.</p>
                    )}

                    {(lessonsData[course.id] || []).map((lesson: any, idx: number) => (
                      <div key={lesson.id} className="rounded-lg overflow-hidden" style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                        {/* Header da aula */}
                        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => toggleLesson(lesson.id)}>
                          <div className="text-gray-500">
                            {expandedLesson === lesson.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'hsl(var(--card))' }}>
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{lesson.title}</div>
                            <div className="text-[10px] text-gray-500">{lesson.module_name} | {lesson.video_type || 'sem vídeo'}</div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setLessonForm({ ...lesson })} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/5"><Pencil size={12} /></button>
                            <button onClick={() => deleteLesson(lesson.id, course.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-white/5"><Trash2 size={12} /></button>
                          </div>
                        </div>

                        {/* Form edição aula */}
                        <AnimatePresence>
                          {lessonForm?.id === lesson.id && (
                            <LessonFormComponent form={lessonForm} setForm={setLessonForm} onSave={() => saveLesson(course.id)} onCancel={() => setLessonForm(null)} />
                          )}
                        </AnimatePresence>

                        {/* Materiais expandidos */}
                        <AnimatePresence>
                          {expandedLesson === lesson.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                              style={{ borderTop: '1px solid hsl(var(--border))' }}
                            >
                              <div className="p-3 pl-12 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <FileText size={10} /> Materiais
                                  </span>
                                  <button
                                    onClick={() => setMaterialForm({ title: '', file_url: '', description: '' })}
                                    className="text-[10px] text-red-500 hover:text-red-400 flex items-center gap-1"
                                  >
                                    <Plus size={10} /> Adicionar
                                  </button>
                                </div>

                                {/* Form novo material */}
                                <AnimatePresence>
                                  {materialForm && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(var(--card))' }}>
                                      <input className="input-field text-xs !py-2" placeholder="Título do material" value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} />
                                      <input className="input-field text-xs !py-2" placeholder="URL (Google Drive, etc.)" value={materialForm.file_url} onChange={(e) => setMaterialForm({ ...materialForm, file_url: e.target.value })} />
                                      <div className="flex gap-2">
                                        <button onClick={() => saveMaterial(lesson.id)} className="btn-primary text-xs !py-1.5 !px-3">Salvar</button>
                                        <button onClick={() => setMaterialForm(null)} className="text-xs text-gray-400 hover:text-white">Cancelar</button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {(materialsData[lesson.id] || []).map((mat: any) => (
                                  <div key={mat.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.02] group" style={{ background: 'hsl(var(--card))' }}>
                                    <FileText size={12} className="text-red-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate">{mat.title}</div>
                                      <div className="text-[10px] text-gray-500 truncate">{mat.file_url}</div>
                                    </div>
                                    <a href={mat.file_url} target="_blank" className="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100"><ExternalLink size={12} /></a>
                                    <button onClick={() => deleteMaterial(mat.id, lesson.id)} className="p-1 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                                  </div>
                                ))}

                                {(materialsData[lesson.id] || []).length === 0 && !materialForm && (
                                  <p className="text-[10px] text-gray-500 py-2 text-center">Sem materiais</p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function CourseFormComponent({ form, setForm, onSave, onCancel, onUploadThumb }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 space-y-3" style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(220 13% 10%)' }}>
      <input className="input-field" placeholder="Título do curso" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="input-field" placeholder="Descrição" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <input className="input-field" placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="input-field" placeholder="Duração" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-400 whitespace-nowrap font-medium">Tier de acesso (default das aulas):</label>
        <select className="input-field text-sm flex-1" value={form.required_tier || 'basic'} onChange={(e) => setForm({ ...form, required_tier: e.target.value })}>
          <option value="basic">Básico — todos os alunos veem</option>
          <option value="premium">Premium — apenas alunos premium</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-white">
          <input type="file" accept="image/*" onChange={onUploadThumb} className="hidden" />
          <FileUp size={14} /> Thumbnail
        </label>
        {form.thumbnail_url && <img src={form.thumbnail_url} className="w-16 h-10 object-cover rounded" />}
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="btn-primary text-sm">Salvar</button>
        <button onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
      </div>
    </motion.div>
  );
}

function LessonFormComponent({ form, setForm, onSave, onCancel }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-3 space-y-2" style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(220 13% 9%)' }}>
      <input className="input-field text-sm" placeholder="Título da aula" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="input-field text-sm" placeholder="Descrição" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input className="input-field text-sm" placeholder="URL do vídeo (YouTube ou Google Drive)" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
      <div className="grid grid-cols-3 gap-2">
        <input className="input-field text-sm" placeholder="Módulo" value={form.module_name} onChange={(e) => setForm({ ...form, module_name: e.target.value })} />
        <input className="input-field text-sm" type="number" placeholder="Ordem" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} />
        <select className="input-field text-sm" value={form.video_type} onChange={(e) => setForm({ ...form, video_type: e.target.value })}>
          <option value="gdrive">Google Drive</option>
          <option value="youtube">YouTube</option>
          <option value="local">Local</option>
          <option value="external">Externo</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 whitespace-nowrap">Data de liberação:</label>
        <input className="input-field text-sm flex-1" type="date" value={form.release_date || ''} onChange={(e) => setForm({ ...form, release_date: e.target.value })} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 whitespace-nowrap">Tier desta aula:</label>
        <select
          className="input-field text-sm flex-1"
          value={form.required_tier ?? ''}
          onChange={(e) => setForm({ ...form, required_tier: e.target.value === '' ? null : e.target.value })}
        >
          <option value="">Herdar do curso</option>
          <option value="basic">Básico — todos veem</option>
          <option value="premium">Premium — apenas premium</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="btn-primary text-xs !py-2">Salvar</button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-white">Cancelar</button>
      </div>
    </motion.div>
  );
}

// ═══════════ DASHBOARD ═══════════
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api.get('/admin/stats').then(setStats).catch(console.error); }, []);
  if (!stats) return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="card animate-pulse"><div className="h-8 w-16 mx-auto rounded mb-2" style={{ background: 'hsl(var(--muted))' }} /><div className="h-3 w-20 mx-auto rounded" style={{ background: 'hsl(var(--muted))' }} /></div>)}</div>;

  const cards = [
    { label: 'Cursos', value: stats.total_courses, color: 'text-red-600' },
    { label: 'Aulas', value: stats.total_lessons, color: 'text-blue-400' },
    { label: 'Membros', value: stats.total_members, color: 'text-purple-400' },
    { label: 'Materiais', value: stats.total_materials, color: 'text-orange-400' },
    { label: 'Views Total', value: stats.total_views, color: 'text-yellow-400' },
    { label: 'Gravações', value: stats.pending_recordings, color: 'text-red-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (<div key={c.label} className="card text-center"><div className={`text-3xl font-bold ${c.color}`}>{c.value}</div><div className="text-xs text-gray-500 mt-1">{c.label}</div></div>))}
      </div>
      {stats.top_lessons?.length > 0 && (
        <div className="card"><h3 className="font-semibold mb-4">Top aulas por views</h3><div className="space-y-2">{stats.top_lessons.map((l: any, i: number) => (<div key={l.id} className="flex items-center gap-3 text-sm"><span className="w-6 h-6 bg-red-600/20 rounded-full flex items-center justify-center text-xs text-red-400 font-bold">{i+1}</span><span className="flex-1 truncate text-gray-300">{l.title}</span><span className="text-gray-500">{l.views} views</span></div>))}</div></div>
      )}
    </div>
  );
}

// ═══════════ MEMBERS ═══════════
function MembersTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  useEffect(() => { api.get<any[]>('/admin/members').then(setMembers); }, []);
  const toggleActive = async (id: number) => {
    const result = await api.put<any>(`/admin/members/${id}/toggle-active`);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active: result.is_active } : m));
    toast.success('Status atualizado');
  };
  const changeTier = async (id: number, newTier: 'basic' | 'premium') => {
    try {
      const updated = await api.put<any>(`/admin/members/${id}/tier`, { tier: newTier });
      setMembers(prev => prev.map(m => m.id === id ? { ...m, tier: updated.tier } : m));
      toast.success(`Tier alterado para ${newTier.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar tier');
    }
  };
  const deleteMember = async (id: number) => {
    try {
      const result = await api.del<{ message: string }>(`/admin/members/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
      setConfirmDelete(null);
      toast.success(result.message || 'Aluno excluído');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    }
  };
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Membros ({members.length})</h2>
      {members.map(m => (
        <div key={m.id} className="card flex items-center gap-4 py-3">
          <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center"><span className="text-sm font-bold text-red-600">{m.display_name?.charAt(0).toUpperCase()}</span></div>
          <div className="flex-1 min-w-0"><div className="font-medium">{m.display_name}</div><div className="text-xs text-gray-500">{m.email} | {m.role} | {m.completed_lessons} aulas</div></div>
          <div className="flex items-center gap-2 text-xs">
            {m.role !== 'admin' && (
              <select
                value={m.tier || 'basic'}
                onChange={(e) => changeTier(m.id, e.target.value as 'basic' | 'premium')}
                className={`input-field !py-1 !px-2 text-xs font-bold ${
                  m.tier === 'premium' ? '!text-red-400' : '!text-blue-400'
                }`}
                title="Alterar tier do aluno"
              >
                <option value="basic">Básico</option>
                <option value="premium">Premium</option>
              </select>
            )}
            <span className={`badge ${m.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{m.is_active ? 'Ativo' : 'Inativo'}</span>
            <button onClick={() => toggleActive(m.id)} className="p-2 text-gray-400 hover:text-white" title={m.is_active ? 'Desativar' : 'Ativar'}>{m.is_active ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            {m.role !== 'admin' && (
              confirmDelete === m.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => deleteMember(m.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">Confirmar</button>
                  <button onClick={() => setConfirmDelete(null)} className="p-1 text-gray-400 hover:text-white"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(m.id)} className="p-2 text-gray-400 hover:text-red-400" title="Excluir aluno"><Trash2 size={14} /></button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════ INVITES ═══════════
function InvitesTab() {
  const [invites, setInvites] = useState<any[]>([]);
  const [maxUses, setMaxUses] = useState(10);
  const [tier, setTier] = useState<'basic' | 'premium'>('basic');
  useEffect(() => { loadInvites(); }, []);
  const loadInvites = () => api.get<any[]>('/admin/invites').then(setInvites);
  const createInvite = async () => { await api.post('/admin/invites', { max_uses: maxUses, expires_days: 30, tier }); toast.success(`Convite ${tier.toUpperCase()} criado`); loadInvites(); };
  const copyLink = (token: string) => { navigator.clipboard.writeText(`${window.location.origin}/register/${token}`); toast.success('Link copiado!'); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold flex-1">Convites</h2>
        <select className="input-field w-32 text-sm" value={tier} onChange={e => setTier(e.target.value as 'basic' | 'premium')}>
          <option value="basic">Básico</option>
          <option value="premium">Premium</option>
        </select>
        <input type="number" className="input-field w-24" value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} min={1} title="Usos máximos" />
        <button onClick={createInvite} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Gerar</button>
      </div>
      {invites.map(inv => (
        <div key={inv.id} className="card flex items-center gap-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                inv.tier === 'premium' ? 'bg-red-600/30 text-red-300' : 'bg-blue-600/30 text-blue-300'
              }`}>
                {inv.tier === 'premium' ? 'PREMIUM' : 'BÁSICO'}
              </span>
              <div className="font-mono text-sm text-gray-300 truncate">{inv.token}</div>
            </div>
            <div className="text-xs text-gray-500">{inv.used_count}/{inv.max_uses} usos | {formatDate(inv.created_at)}</div>
          </div>
          <button onClick={() => copyLink(inv.token)} className="p-2 text-gray-400 hover:text-red-500" title="Copiar link"><Copy size={14} /></button>
          <button onClick={async () => { await api.del(`/admin/invites/${inv.id}`); loadInvites(); }} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ═══════════ NOTIFICATIONS ═══════════
function NotificationsTab() {
  const [stats, setStats] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [templates] = useState([
    { label: 'Nova aula', title: 'Nova aula disponível!', body: 'Uma nova aula foi publicada. Acesse agora!', url: '/' },
    { label: 'Mentoria', title: 'Mentoria ao vivo hoje!', body: 'Sua mentoria começa às 20h. Não perca!', url: '/' },
    { label: 'Material', title: 'Novo material de estudo', body: 'Um novo PDF didático foi adicionado ao seu curso.', url: '/' },
    { label: 'Lembrete', title: 'Continue seus estudos!', body: 'Você tem aulas pendentes. Volte e continue sua jornada!', url: '/' },
  ]);

  useEffect(() => { loadStats(); }, []);
  const loadStats = () => api.get('/notifications/admin/stats').then(setStats).catch(console.error);

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Título e mensagem são obrigatórios'); return; }
    setSending(true);
    try {
      const result = await api.post<{ sent: number; failed: number }>('/notifications/admin/send', { title, body, url, type: 'manual' });
      toast.success(`Enviado para ${result.sent} usuários!`);
      setTitle('');
      setBody('');
      setUrl('/');
      loadStats();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (t: typeof templates[0]) => {
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url);
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    manual: { label: 'Manual', color: 'bg-blue-500/20 text-blue-400' },
    new_lesson: { label: 'Nova Aula', color: 'bg-green-500/20 text-green-400' },
    new_course: { label: 'Novo Curso', color: 'bg-purple-500/20 text-purple-400' },
    system: { label: 'Sistema', color: 'bg-gray-500/20 text-gray-400' },
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-red-500">{stats?.subscribers || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Inscritos para push</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-400">{stats?.totalSent || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Total enviadas</div>
        </div>
      </div>

      {/* Composer */}
      <div className="card space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Send size={16} className="text-red-500" /> Enviar Notificação</h3>

        {/* Templates rápidos */}
        <div>
          <span className="text-xs text-gray-500 mb-2 block">Templates rápidos:</span>
          <div className="flex flex-wrap gap-2">
            {templates.map((t, i) => (
              <button key={i} onClick={() => applyTemplate(t)} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <input className="input-field" placeholder="Título da notificação" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        <textarea className="input-field" placeholder="Mensagem" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} />
        <input className="input-field" placeholder="URL ao clicar (ex: /courses/1)" value={url} onChange={(e) => setUrl(e.target.value)} />

        {/* Preview */}
        {(title || body) && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'hsl(220 13% 14%)', border: '1px solid hsl(var(--border))' }}>
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">{APP_NAME.charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-0.5">{APP_NAME}</div>
              <div className="font-semibold text-sm">{title || 'Título...'}</div>
              <div className="text-xs text-gray-400 mt-0.5">{body || 'Mensagem...'}</div>
            </div>
            <span className="text-[10px] text-gray-600 flex-shrink-0">agora</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{stats?.subscribers || 0} inscritos receberão</span>
          <button onClick={send} disabled={sending || !title.trim() || !body.trim()} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
            {sending ? 'Enviando...' : 'Enviar para todos'}
          </button>
        </div>
      </div>

      {/* Histórico */}
      <div>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Bell size={16} className="text-gray-400" /> Histórico de envios</h3>
        {!stats?.logs?.length ? (
          <div className="card text-center py-8"><Bell size={32} className="mx-auto text-gray-600 mb-3" /><p className="text-gray-500 text-sm">Nenhuma notificação enviada ainda.</p></div>
        ) : (
          <div className="space-y-2">
            {stats.logs.map((log: any) => (
              <div key={log.id} className="card !p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${log.failed_count > 0 ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
                  {log.failed_count > 0 ? <AlertCircle size={14} className="text-yellow-400" /> : <CheckCircle size={14} className="text-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{log.title}</div>
                  <div className="text-[10px] text-gray-500">{log.body.substring(0, 60)}...</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`badge text-[10px] ${typeLabels[log.type]?.color || typeLabels.system.color}`}>{typeLabels[log.type]?.label || log.type}</span>
                  <div className="text-[10px] text-gray-500 mt-1">{log.sent_count} ok / {log.failed_count} falha</div>
                </div>
                <div className="text-[10px] text-gray-600 flex-shrink-0">{formatDate(log.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════ REFERRALS (INDICAÇÕES) ═══════════
function ReferralsTab() {
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  useEffect(() => { loadApps(); }, []);
  const loadApps = () => api.get<any[]>('/referrals/admin/all').then(setApps);

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400' },
    contacted: { label: 'Contactado', color: 'bg-blue-500/20 text-blue-400' },
    closed: { label: 'Fechado', color: 'bg-green-500/20 text-green-400' },
    lost: { label: 'Perdido', color: 'bg-gray-500/20 text-gray-400' },
  };

  const commissionLabels: Record<string, { label: string; color: string }> = {
    none: { label: '—', color: 'text-gray-600' },
    pending: { label: 'A pagar', color: 'text-yellow-400' },
    paid: { label: 'Pago', color: 'text-green-400' },
  };

  const changeStatus = async (id: number, status: string) => {
    try {
      await api.put(`/referrals/admin/${id}/status`, { status, notes: notes[id] });
      toast.success(`Status atualizado para ${statusLabels[status]?.label}`);
      loadApps();
    } catch (err: any) { toast.error(err.message); }
  };

  const markPaid = async (id: number) => {
    try {
      await api.put(`/referrals/admin/${id}/pay`);
      toast.success('Comissão marcada como paga!');
      loadApps();
    } catch (err: any) { toast.error(err.message); }
  };

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);
  const stats = {
    total: apps.length,
    pending: apps.filter(a => a.status === 'pending').length,
    contacted: apps.filter(a => a.status === 'contacted').length,
    closed: apps.filter(a => a.status === 'closed').length,
    lost: apps.filter(a => a.status === 'lost').length,
    commissionPending: apps.filter(a => a.commission_status === 'pending').reduce((s, a) => s + (a.commission_amount || 0), 0),
    commissionPaid: apps.filter(a => a.commission_status === 'paid').reduce((s, a) => s + (a.commission_amount || 0), 0),
  };

  const revenueLabels: Record<string, string> = {
    'ainda-nao-faturo': 'Ainda não fatura',
    'ate-5k': 'Até R$5k/mês',
    '5k-15k': 'R$5k-15k/mês',
    '15k-50k': 'R$15k-50k/mês',
    '50k-100k': 'R$50k-100k/mês',
    'acima-100k': '+R$100k/mês',
  };

  const aiLabels: Record<string, string> = {
    'nao': 'Não usa',
    'basico': 'Básico',
    'intermediario': 'Intermediário',
    'avancado': 'Avançado',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-xs text-gray-500">Pendentes</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.closed}</div>
          <div className="text-xs text-gray-500">Fechados</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-lg font-bold text-red-400">R${stats.commissionPending.toLocaleString('pt-BR')}</div>
          <div className="text-xs text-gray-500">Comissões a pagar</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'pending', label: 'Pendentes' },
          { id: 'contacted', label: 'Contactados' },
          { id: 'closed', label: 'Fechados' },
          { id: 'lost', label: 'Perdidos' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.id ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white bg-white/5'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Gift size={40} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Nenhuma indicação {filter !== 'all' ? `com status "${filter}"` : 'ainda'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div key={app.id} className="card !p-0 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{app.full_name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1"><Users size={10} /> {app.referrer_name || 'Desconhecido'}</span>
                    <span>•</span>
                    <span>{formatDate(app.created_at)}</span>
                  </div>
                </div>
                <span className={`badge text-[10px] ${statusLabels[app.status]?.color}`}>
                  {statusLabels[app.status]?.label}
                </span>
                {app.commission_status !== 'none' && (
                  <span className={`text-[10px] font-medium ${commissionLabels[app.commission_status]?.color}`}>
                    <DollarSign size={10} className="inline" /> R${(app.commission_amount || 0).toLocaleString('pt-BR')}
                    {app.commission_status === 'pending' && app.commission_due_date && (
                      <span className="text-gray-600 ml-1">({formatDate(app.commission_due_date)})</span>
                    )}
                  </span>
                )}
                {expanded === app.id ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
              </div>

              {/* Expanded details */}
              {expanded === app.id && (
                <div className="border-t border-white/5 p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {/* Contact info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail size={14} className="text-gray-500" />
                      <a href={`mailto:${app.email}`} className="hover:text-red-400">{app.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone size={14} className="text-gray-500" />
                      <a href={`https://wa.me/55${(app.whatsapp || '').replace(/\D/g, '')}`} target="_blank" className="hover:text-green-400">{app.whatsapp}</a>
                    </div>
                    {app.instagram && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-gray-500 text-xs">IG</span>
                        <a href={`https://instagram.com/${app.instagram.replace('@', '')}`} target="_blank" className="hover:text-purple-400">{app.instagram}</a>
                      </div>
                    )}
                  </div>

                  {/* Business info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-gray-500 text-xs block">Área</span>{app.occupation || '—'}</div>
                    <div><span className="text-gray-500 text-xs block">Faturamento</span>{revenueLabels[app.current_revenue] || app.current_revenue || '—'}</div>
                    <div><span className="text-gray-500 text-xs block">Usa IA</span>{aiLabels[app.main_challenge] || app.main_challenge || '—'}</div>
                  </div>

                  {/* Qualification */}
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500 text-xs block">Objetivo</span><p className="text-gray-300">{app.why_join || '—'}</p></div>
                    <div><span className="text-gray-500 text-xs block">Por que merece a vaga</span><p className="text-gray-300">{app.main_challenge || '—'}</p></div>
                  </div>

                  {/* Payment preference */}
                  <div className="text-sm">
                    <span className="text-gray-500 text-xs block">Pagamento preferido</span>
                    <span className="text-white font-medium">{app.payment_preference === 'avista' ? 'À vista' : 'Parcelado'}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {app.status === 'pending' && (
                      <button onClick={() => changeStatus(app.id, 'contacted')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                        Marcar Contactado
                      </button>
                    )}
                    {(app.status === 'pending' || app.status === 'contacted') && (
                      <>
                        <button onClick={() => changeStatus(app.id, 'closed')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                          <DollarSign size={12} className="inline mr-1" />Fechou! (gerar comissão)
                        </button>
                        <button onClick={() => changeStatus(app.id, 'lost')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors">
                          Perdido
                        </button>
                      </>
                    )}
                    {app.commission_status === 'pending' && (
                      <button onClick={() => markPaid(app.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors">
                        <CheckCircle size={12} className="inline mr-1" />Pagar Comissão (R${(app.commission_amount || 0).toLocaleString('pt-BR')})
                      </button>
                    )}
                    {app.commission_status === 'paid' && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-500">
                        <CheckCircle size={12} className="inline mr-1" />Comissão paga em {formatDate(app.paid_at)}
                      </span>
                    )}
                  </div>

                  {/* WhatsApp direct */}
                  <a href={`https://wa.me/55${(app.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${app.full_name.split(' ')[0]}! Vi que você se inscreveu por indicação. Vamos conversar?`)}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors">
                    <Phone size={14} /> Abrir WhatsApp
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════ RECORDINGS ═══════════
function RecordingsTab() {
  const [recordings, setRecordings] = useState<any[]>([]);
  useEffect(() => { api.get<any[]>('/admin/recordings').then(setRecordings); }, []);
  const statusColors: Record<string, string> = { pending: 'bg-yellow-500/20 text-yellow-400', processing: 'bg-blue-500/20 text-blue-400', ready: 'bg-red-600/20 text-red-400', published: 'bg-purple-500/20 text-purple-400', archived: 'bg-gray-500/20 text-gray-400' };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Gravações ({recordings.length})</h2>
      {recordings.length === 0 ? (
        <div className="card text-center py-12"><Radio size={40} className="mx-auto text-gray-600 mb-4" /><p className="text-gray-400">Nenhuma gravação processada.</p></div>
      ) : recordings.map(rec => (
        <div key={rec.id} className="card flex items-center gap-4">
          <div className="flex-1"><div className="font-medium">{rec.title}</div><div className="text-xs text-gray-500">{rec.type} | {formatDate(rec.recording_date || rec.created_at)}</div></div>
          <span className={`badge ${statusColors[rec.status] || statusColors.pending}`}>{rec.status}</span>
          {rec.pdf_url && <a href={rec.pdf_url} target="_blank" className="p-2 text-gray-400 hover:text-red-500"><ExternalLink size={14} /></a>}
        </div>
      ))}
    </div>
  );
}
