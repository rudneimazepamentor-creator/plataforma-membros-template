const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  getToken() {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    // 401 só significa "sessão expirada" quando MANDAMOS um token e ele foi
    // recusado. Em /login e /forgot-password o 401 é resposta legítima da rota
    // ("Email ou senha incorretos") — engoli-la mandava o aluno (e o suporte)
    // investigar sessão quando o problema era a senha.
    const hadToken = Boolean(headers['Authorization']);
    if (res.status === 401 && hadToken) {
      this.setToken(null);
      throw new ApiError('Sessão expirada', 401, {});
    }

    // Respostas de erro nem sempre são JSON (ex.: 429 do rate limiter, 502 do
    // proxy). Sem esta guarda, o .json() lançava SyntaxError e o erro real
    // sumia atrás de uma mensagem genérica.
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      if (res.ok) throw new ApiError('Resposta inválida do servidor', res.status, {});
    }

    if (res.status === 429) {
      throw new ApiError(
        (data && data.error) || 'Muitas requisições. Aguarde alguns minutos.',
        429,
        data || {},
      );
    }

    if (!res.ok) {
      throw new ApiError(
        (data && typeof data === 'object' && 'error' in data ? String(data.error) : null) || 'Erro na requisição',
        res.status,
        data || {},
      );
    }

    return data as T;
  }

  // Versão para upload de arquivos (sem Content-Type, deixa o browser setar)
  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro no upload');
    return data as T;
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body?: unknown) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  put<T>(path: string, body?: unknown) { return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) }); }
  del<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

export const api = new ApiClient();
