import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("As variáveis SUPABASE_URL ou SUPABASE_ANON_KEY não foram definidas.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ valid: false, message: 'Token não fornecido.' });
    }

    // Consulta o banco de dados
    const { data: convite, error: dbError } = await supabase
      .from('visitantes') // ⬅️ 
      .select('nome, fingerprint')
      .eq('id_hash', token)
      .single();

    if (dbError && dbError.code === 'PGRST116') {
      return res.status(404).json({ valid: false, message: 'Convite inválido ou não encontrado.' });
    }
    
    if (dbError) {
        console.error("Erro do Supabase:", dbError);
        return res.status(500).json({ valid: false, message: "Erro ao consultar o banco de dados." });
    }

    if (convite.fingerprint) {
      return res.status(403).json({ valid: false, message: 'Este convite já foi utilizado.' });
    }

    return res.status(200).json({
      valid: true,
      nome: convite.nome
    });

  } catch (error) {
    console.error('Erro inesperado na função da API:', error);
    return res.status(500).json({ valid: false, message: 'Erro interno no servidor.' });
  }
}
