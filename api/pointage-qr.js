import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { enfant, date, type, action } = req.query;

  // If POST: process the validation
  if (req.method === 'POST') {
    try {
      const { enfantId, pointageDate, actionType } = req.body;
      
      if (actionType === 'arrivee') {
        const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
        await supabase.from('pointages').upsert({
          enfant_id: enfantId,
          date: pointageDate,
          arrivee: heure,
          valide_parent: true,
        }, { onConflict: 'enfant_id,date' });
        
        return res.status(200).json({ success: true, message: `Arrivée enregistrée à ${heure}` });
      }
      
      if (actionType === 'depart') {
        const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
        
        // Get existing pointage for arrival time
        const { data: existing } = await supabase.from('pointages')
          .select('arrivee')
          .eq('enfant_id', enfantId)
          .eq('date', pointageDate)
          .maybeSingle();
        
        const arrivee = existing?.arrivee;
        let totalMinutes = null;
        if (arrivee) {
          const [h1, m1] = arrivee.split(':').map(Number);
          const [h2, m2] = heure.split(':').map(Number);
          totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        }
        
        await supabase.from('pointages').upsert({
          enfant_id: enfantId,
          date: pointageDate,
          depart: heure,
          total_minutes: totalMinutes,
          valide_parent: true,
        }, { onConflict: 'enfant_id,date' });
        
        return res.status(200).json({ success: true, message: `Départ enregistré à ${heure}` });
      }

      return res.status(400).json({ error: 'Action non reconnue' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET: show the scan page
  if (!enfant) {
    return res.status(400).send('QR code invalide');
  }

  // Get enfant info
  const { data: enfantData } = await supabase.from('enfants')
    .select('prenom, emoji')
    .eq('id', enfant)
    .maybeSingle();

  const prenom = enfantData?.prenom || 'Enfant';
  const emoji = enfantData?.emoji || '👶';
  const today = date || new Date().toISOString().slice(0, 10);

  // Check if already pointed today
  const { data: pointage } = await supabase.from('pointages')
    .select('arrivee, depart')
    .eq('enfant_id', enfant)
    .eq('date', today)
    .maybeSingle();

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pointage TiMat - ${prenom}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FDFBF8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#fff;border-radius:20px;padding:32px;max-width:400px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.1);text-align:center}
    .emoji{font-size:64px;margin-bottom:16px}
    h1{font-size:22px;color:#264653;margin-bottom:4px}
    .sub{font-size:13px;color:#8FA3AD;margin-bottom:24px}
    .date{font-size:14px;color:#5F7A86;margin-bottom:20px;background:#F4F7FA;padding:8px 16px;border-radius:10px;display:inline-block}
    .info{background:#F0FAF4;border:1px solid #B7E4C7;border-radius:10px;padding:12px;margin-bottom:20px;font-size:13px;color:#2A9D8F}
    .btn{width:100%;padding:16px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:10px;transition:all .2s}
    .btn-arr{background:#2A9D8F;color:#fff}
    .btn-dep{background:#E76F51;color:#fff}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .btn:active{transform:scale(.98)}
    .result{padding:16px;border-radius:12px;margin-top:16px;font-size:14px;font-weight:600;display:none}
    .result.ok{display:block;background:#F0FAF4;color:#2A9D8F;border:1px solid #B7E4C7}
    .result.err{display:block;background:#FEF2F2;color:#E76F51;border:1px solid #FECACA}
    .logo{font-size:14px;color:#B0BEC5;margin-top:20px}
    .logo span{color:#FF9F63;font-weight:700}
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">${emoji}</div>
    <h1>${prenom}</h1>
    <div class="sub">Pointage TiMat</div>
    <div class="date">📅 ${new Date(today).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
    
    ${pointage?.arrivee ? `<div class="info">✅ Arrivée enregistrée à ${pointage.arrivee}</div>` : ''}
    ${pointage?.depart ? `<div class="info">✅ Départ enregistré à ${pointage.depart}</div>` : ''}
    
    <button class="btn btn-arr" id="btnArr" ${pointage?.arrivee ? 'disabled' : ''} onclick="pointer('arrivee')">
      ${pointage?.arrivee ? '✅ Arrivée déjà enregistrée' : '↗️ Enregistrer l\\'arrivée'}
    </button>
    <button class="btn btn-dep" id="btnDep" ${!pointage?.arrivee || pointage?.depart ? 'disabled' : ''} onclick="pointer('depart')">
      ${pointage?.depart ? '✅ Départ déjà enregistré' : '↘️ Enregistrer le départ'}
    </button>
    
    <div class="result" id="result"></div>
    
    <div class="logo">Propulsé par Ti<span>Mat</span> 🌿</div>
  </div>

  <script>
    async function pointer(action) {
      const btn = document.getElementById(action === 'arrivee' ? 'btnArr' : 'btnDep');
      const result = document.getElementById('result');
      btn.disabled = true;
      btn.textContent = '⏳ Enregistrement...';
      
      try {
        const res = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enfantId: '${enfant}',
            pointageDate: '${today}',
            actionType: action
          })
        });
        const data = await res.json();
        
        if (data.success) {
          result.className = 'result ok';
          result.textContent = '✅ ' + data.message;
          btn.textContent = '✅ ' + (action === 'arrivee' ? 'Arrivée' : 'Départ') + ' enregistré(e)';
          if (action === 'arrivee') {
            document.getElementById('btnDep').disabled = false;
          }
        } else {
          result.className = 'result err';
          result.textContent = '❌ ' + (data.error || 'Erreur');
          btn.disabled = false;
          btn.textContent = action === 'arrivee' ? '↗️ Réessayer' : '↘️ Réessayer';
        }
      } catch (e) {
        result.className = 'result err';
        result.textContent = '❌ Erreur réseau';
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
