import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        console.log('💾 Iniciando salvamento de dados...');
        const { idFromDatabase, nome, foto_url, id_hash } = req.body;

        if (!idFromDatabase || !nome || !foto_url || !id_hash) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            return res.status(500).json({ error: 'Configuração do servidor incompleta' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });

        console.log('📝 Salvando dados para ID:', idFromDatabase);
        
        const { error: updateError } = await supabase
            .from('visitantes')
            .update({
                nome: nome,
                foto_url: foto_url,
                utilizado: true,
                created_at: new Date().toISOString(),
                usado_em: new Date().toISOString()
            })
            .eq('id', idFromDatabase);

        if (updateError) {
            console.error('❌ Erro ao salvar no Supabase:', updateError);
            return res.status(500).json({ error: 'Erro ao salvar informações' });
        }

        console.log('✅ Dados salvos com sucesso');

        if (WEBHOOK_URL) {
            try {
                console.log('🌐 Enviando webhook...');
                await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: idFromDatabase,
                        nome: nome,
                        id_hash: id_hash,
                        foto_url: foto_url,
                        timestamp: new Date().toISOString()
                    }),
                });
            } catch (webhookError) {
                console.warn('⚠️ Erro no webhook:', webhookError);
            }
        }

        res.status(200).json({ 
            success: true,
            message: 'Informações salvas com sucesso!'
        });

    } catch (error) {
        console.error('💥 Erro inesperado:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
}
