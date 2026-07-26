import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Variáveis de ambiente do Supabase não configuradas');
      return res.status(500).json({ error: 'Erro de configuração do servidor.' });
    }

    const { id_hash, fingerprint, latitude, longitude } = req.body;

    if (!id_hash || !fingerprint) {
      return res.status(400).json({ error: 'id_hash e fingerprint são obrigatórios.' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });

    const { data: convite, error } = await supabase
      .from('visitantes')
      .select('id, fingerprint, utilizado, nome')
      .eq('id_hash', id_hash)
      .single();

    if (error || !convite) {
      console.warn('Convite não encontrado para o hash:', id_hash);
      return res.status(404).json({ error: 'Convite inválido.' });
    }
    
    if (convite.utilizado === true) {
      console.warn(`Tentativa de reuso: Convite ${id_hash} já está marcado como utilizado.`);
      return res.status(403).json({ error: 'Este link já foi usado para um cadastro.' });
    }

    if (convite.fingerprint && convite.fingerprint !== fingerprint) {
        console.warn(`Tentativa de uso em outro dispositivo: Convite ${id_hash}.`);
        return res.status(403).json({ error: 'Este link já foi acessado e está vinculado a outro dispositivo por motivos de segurança.' });
    }

    const { error: updateError } = await supabase
      .from('visitantes')
      .update({
        fingerprint: fingerprint, 
        latitude: latitude,
        longitude: longitude
      })
      .eq('id_hash', id_hash);
      
    if (updateError) {
        console.error('Erro ao salvar o fingerprint inicial:', updateError);
        return res.status(500).json({ error: 'Erro ao processar o convite. Tente novamente.' });
    }

    const responseData = {
      success: true,
      idFromDatabase: convite.id,
      nome: convite.nome || 'Usuário',
      message: 'Sessão iniciada com sucesso!',
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('💥 Erro inesperado em iniciar-sessao:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
