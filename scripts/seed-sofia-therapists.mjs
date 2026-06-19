// Adds 3 therapists compatible with Sofia Ribeiro (behavior_score 3, Fortaleza,
// available weekday mornings 09:00–12:00). Requires score < 5 and morning overlap.
// Run: node scripts/seed-sofia-therapists.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.trim() && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const A = (day, start, end) => ({ day_of_week: day, start_time: start, end_time: end })

const therapists = [
  { name: 'Marina Alves',   city: 'Fortaleza', lang: 'Portuguese', score: 4, exp: 3,
    avail: [A(1,'09:00','12:00'), A(3,'09:00','12:00'), A(5,'09:00','12:00')] },
  { name: 'Rafael Souza',   city: 'Fortaleza', lang: 'Portuguese', score: 3, exp: 2,
    avail: [A(1,'09:00','12:00'), A(2,'09:00','12:00'), A(3,'09:00','12:00'), A(4,'09:00','12:00'), A(5,'09:00','12:00')] },
  { name: 'Beatriz Lima',   city: 'Fortaleza', lang: 'Portuguese', score: 2, exp: 1,
    avail: [A(2,'09:00','12:00'), A(4,'09:00','12:00')] },
]

const slug = (name, i) =>
  name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '') + '.sofia' + (i + 1)

for (const [i, t] of therapists.entries()) {
  const email = `terapeuta.${slug(t.name, i)}@matchcare.test`
  const { data, error } = await supabase.auth.admin.createUser({
    email, password: 'Teste@1234', email_confirm: true,
    user_metadata: { full_name: t.name, role: 'therapist' },
  })
  if (error) { console.error(`  ✗ ${t.name}: ${error.message}`); continue }
  const id = data.user.id
  await supabase.from('profiles').update({ approved: true, preferred_language: t.lang }).eq('id', id)
  const { error: tErr } = await supabase.from('therapists').insert({
    id, email, phone: `+5585${91000000 + i}`,
    years_of_experience: t.exp, professional_score: t.score, city: t.city, language: t.lang,
  })
  if (tErr) { console.error(`  ✗ ${t.name} therapists row: ${tErr.message}`); continue }
  await supabase.from('therapist_availability').insert(t.avail.map((s) => ({ therapist_id: id, ...s })))
  console.log(`  ✓ ${t.name} (score ${t.score}, mornings) — ${email}`)
}
console.log('Done.')
