/**
 * Entrega de vídeo pelo Cloudflare R2.
 *
 * O bucket é PRIVADO: nada nele é acessível por URL direta. Cada aula vira uma
 * URL assinada, de validade curta, gerada no momento em que um aluno autenticado
 * abre a aula. O vídeo trafega do R2 para o browser sem passar pela VPS — por
 * isso a migração não consome disco nem banda do servidor.
 *
 * Substitui o iframe do Google Drive, que falhava para quem não tinha sessão
 * Google no navegador (Safari/iOS bloqueia cookies de terceiros por padrão):
 * o endpoint de playback do Drive respondia 401 e o aluno via "Não foi possível
 * carregar o vídeo".
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_URL_TTL_SECONDS,
} = process.env;

// Validade da URL assinada. Precisa cobrir a aula mais longa com folga (a maior
// hoje tem 8h de duração declarada) sem virar um link que circula por dias.
// Se o aluno deixar a página aberta além disso, um F5 gera uma URL nova.
const TTL = Number(R2_URL_TTL_SECONDS) || 6 * 60 * 60; // 6 horas

let cliente = null;

export function r2Configurado() {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
}

function obterCliente() {
  if (cliente) return cliente;
  if (!r2Configurado()) return null;
  cliente = new S3Client({
    region: 'auto', // o R2 não tem regiões; 'auto' é o valor que ele espera
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return cliente;
}

/**
 * Gera a URL assinada de um objeto do bucket.
 * A assinatura é calculada localmente (nenhuma chamada de rede ao R2), então
 * pode ser feita a cada request sem custo perceptível.
 *
 * @param {string} chave  caminho do objeto no bucket, ex.: "aulas/1.mp4"
 * @returns {Promise<string|null>} URL assinada, ou null se o R2 não estiver configurado
 */
export async function urlAssinada(chave) {
  const c = obterCliente();
  if (!c || !chave) return null;
  const comando = new GetObjectCommand({ Bucket: R2_BUCKET, Key: chave });
  return getSignedUrl(c, comando, { expiresIn: TTL });
}

/** Prefixo que marca uma aula hospedada no R2: "r2://aulas/7.mp4" */
const PREFIXO = 'r2://';

export function ehVideoR2(videoUrl) {
  return typeof videoUrl === 'string' && videoUrl.startsWith(PREFIXO);
}

/**
 * Converte o video_url guardado no banco na URL que o player vai consumir.
 *
 * A aula migrada guarda `r2://<chave>` em video_url e mantém video_type
 * 'external'. O tipo NÃO vira 'r2' no banco porque a coluna tem
 * CHECK(video_type IN ('youtube','gdrive','local','external')) — mudar isso
 * exigiria recriar a tabela `lessons` em produção, risco desnecessário para
 * ganhar um rótulo. O 'r2' é atribuído aqui, só no JSON que o front recebe.
 *
 * Aula não migrada (Drive, YouTube, upload local) passa adiante intacta, o que
 * permite migrar uma a uma sem quebrar as demais.
 */
export async function resolverVideo(lesson) {
  if (!lesson || !ehVideoR2(lesson.video_url)) return lesson;
  const chave = lesson.video_url.slice(PREFIXO.length);
  const url = await urlAssinada(chave);
  // Sem R2 configurado a assinatura falha: devolvemos a aula sem URL em vez de
  // entregar a chave crua, que o player não sabe abrir e exporia o caminho interno.
  return { ...lesson, video_url: url || '', video_type: 'r2', video_indisponivel: !url };
}
