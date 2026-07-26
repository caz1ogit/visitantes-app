import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        console.log('📍 Recebendo atualização de localização...');
        console.log('Conteúdo do req.body recebido:', req.body); // Bom para depuração

        const { idFromDatabase, latitude, longitude } = req.body;

        if (!idFromDatabase || latitude === undefined || longitude === undefined) {
            console.warn('⚠️ Validação falhou. Dados recebidos:', { idFromDatabase, latitude, longitude });
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('❌ Variáveis de ambiente do Supabase não configuradas.');
            return res.status(500).json({ error: 'Configuração do servidor incompleta' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });

        console.log('🔄 Atualizando localização para o ID:', idFromDatabase);
        
        const { error: updateError } = await supabase
            .from('visitantes')
            .update({
                latitude: latitude,
                longitude: longitude,
                usado_em: new Date().toISOString()
            })
            .eq('id', idFromDatabase);

        if (updateError) {
            console.error('❌ Erro ao atualizar no Supabase:', updateError);
            return res.status(500).json({ error: 'Erro ao atualizar localização no banco de dados' });
        }

        console.log('✅ Localização atualizada com sucesso para o ID:', idFromDatabase);
        res.status(200).json({ message: 'Localização atualizada com sucesso!' });

    } catch (error) {
        console.error('💥 Erro inesperado no handler:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
