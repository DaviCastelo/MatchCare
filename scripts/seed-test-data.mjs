// Seed script: 10 random therapists + 10 random clients for testing the Match Tool.
// Run with:  node scripts/seed-test-data.mjs
// Uses the service role key from .env.local (bypasses RLS, creates auth users).

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// ── Load .env.local ────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ADMIN_ID = 'd0e7c0de-7acb-4e88-b175-425a26333cb2' // admin@matchcare.com

// availability shortcut: [day, start, end]  (day 0=Sun … 6=Sat)
const A = (day, start, end) => ({ day_of_week: day, start_time: start, end_time: end })

// ── Therapists (professional_score scale ~1–9, threshold 5) ──────────────────────
const therapists = [
  { name: 'Ana Souza',      city: 'Fortaleza',      lang: 'Portuguese', score: 7, exp: 6, avail: [A(1,'09:00','17:00'),A(2,'09:00','17:00'),A(3,'09:00','17:00'),A(4,'09:00','17:00'),A(5,'09:00','17:00')] },
  { name: 'Bruno Lima',     city: 'Fortaleza',      lang: 'Portuguese', score: 4, exp: 2, avail: [A(1,'13:00','17:00'),A(3,'13:00','17:00'),A(5,'13:00','17:00')] },
  { name: 'Carla Mendes',   city: 'São Paulo',      lang: 'Portuguese', score: 8, exp: 9, avail: [A(1,'09:00','12:00'),A(2,'09:00','12:00'),A(3,'09:00','12:00'),A(4,'09:00','12:00')] },
  { name: 'Diego Torres',   city: 'Rio de Janeiro', lang: 'Spanish',    score: 6, exp: 5, avail: [A(1,'14:00','18:00'),A(2,'14:00','18:00'),A(3,'14:00','18:00'),A(4,'14:00','18:00'),A(5,'14:00','18:00')] },
  { name: 'Elena Faria',    city: 'Fortaleza',      lang: 'English',    score: 3, exp: 1, avail: [A(2,'15:00','18:00'),A(4,'15:00','18:00')] },
  { name: 'Felipe Rocha',   city: 'São Paulo',      lang: 'Portuguese', score: 5, exp: 4, avail: [A(1,'09:00','13:00'),A(3,'09:00','13:00')] },
  { name: 'Gabriela Nunes', city: 'Fortaleza',      lang: 'Portuguese', score: 9, exp: 12, avail: [A(1,'09:00','18:00'),A(2,'09:00','18:00'),A(3,'09:00','18:00'),A(4,'09:00','18:00'),A(5,'09:00','18:00'),A(6,'09:30','14:00')] },
  { name: 'Hugo Castro',    city: 'Recife',         lang: 'Portuguese', score: 2, exp: 1, avail: [A(0,'10:00','14:00'),A(6,'09:30','14:30')] },
  { name: 'Igor Ramos',     city: 'Fortaleza',      lang: 'English',    score: 6, exp: 5, avail: [A(1,'10:00','16:00'),A(2,'10:00','16:00'),A(3,'10:00','16:00'),A(4,'10:00','16:00'),A(5,'10:00','16:00')] },
  { name: 'Julia Pinto',    city: 'São Paulo',      lang: 'Portuguese', score: 7, exp: 7, avail: [A(2,'13:00','19:00'),A(3,'13:00','19:00'),A(4,'13:00','19:00')] },
]

// ── Clients (behavior_score 1–9) ─────────────────────────────────────────────────
const clients = [
  { name: 'Lucas Andrade',  city: 'Fortaleza',      lang: 'Portuguese', score: 8, age: 7,  sex: 'Male',   loc: 'Home',   weekly: 6,  avail: [A(1,'15:00','18:00'),A(2,'15:00','18:00'),A(3,'15:00','18:00'),A(4,'15:00','18:00')] },
  { name: 'Sofia Ribeiro',  city: 'Fortaleza',      lang: 'Portuguese', score: 3, age: 5,  sex: 'Female', loc: 'Clinic', weekly: 9,  avail: [A(1,'09:00','12:00'),A(2,'09:00','12:00'),A(3,'09:00','12:00'),A(4,'09:00','12:00'),A(5,'09:00','12:00')] },
  { name: 'Miguel Costa',   city: 'São Paulo',      lang: 'Portuguese', score: 5, age: 10, sex: 'Male',   loc: 'Clinic', weekly: 12, avail: [A(1,'09:00','17:00'),A(2,'09:00','17:00'),A(3,'09:00','17:00'),A(4,'09:00','17:00'),A(5,'09:00','17:00')] },
  { name: 'Helena Dias',    city: 'Rio de Janeiro', lang: 'Spanish',    score: 6, age: 8,  sex: 'Female', loc: 'School', weekly: 12, avail: [A(1,'13:00','17:00'),A(3,'13:00','17:00'),A(5,'13:00','17:00')] },
  { name: 'Theo Martins',   city: 'Fortaleza',      lang: 'English',    score: 7, age: 9,  sex: 'Male',   loc: 'Home',   weekly: 15, avail: [A(1,'10:00','16:00'),A(2,'10:00','16:00'),A(3,'10:00','16:00'),A(4,'10:00','16:00'),A(5,'10:00','16:00')] },
  { name: 'Laura Gomes',    city: 'Fortaleza',      lang: 'Portuguese', score: 2, age: 4,  sex: 'Female', loc: 'Clinic', weekly: 4,  avail: [A(2,'15:00','16:00'),A(4,'15:00','16:00')] },
  { name: 'Pedro Henrique', city: 'São Paulo',      lang: 'Portuguese', score: 9, age: 12, sex: 'Male',   loc: 'Clinic', weekly: 20, avail: [A(1,'09:00','18:00'),A(2,'09:00','18:00'),A(3,'09:00','18:00'),A(4,'09:00','18:00'),A(5,'09:00','18:00')] },
  { name: 'Alice Barbosa',  city: 'Recife',         lang: 'Portuguese', score: 4, age: 6,  sex: 'Female', loc: 'Home',   weekly: 6,  avail: [A(0,'10:00','14:00'),A(6,'09:30','14:00')] },
  { name: 'Gael Oliveira',  city: 'Fortaleza',      lang: 'Portuguese', score: 6, age: 11, sex: 'Male',   loc: 'School', weekly: 12, avail: [A(1,'09:00','15:00'),A(2,'09:00','15:00'),A(3,'09:00','15:00'),A(4,'09:00','15:00')] },
  { name: 'Maria Clara',    city: 'São Paulo',      lang: 'English',    score: 5, age: 7,  sex: 'Female', loc: 'Clinic', weekly: 9,  avail: [A(1,'09:00','13:00'),A(3,'09:00','13:00'),A(5,'09:00','13:00')] },
]

const slug = (name, i) =>
  name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '') + (i + 1)

async function seedTherapists() {
  console.log('\n=== Therapists ===')
  for (const [i, t] of therapists.entries()) {
    const email = `terapeuta.${slug(t.name, i)}@matchcare.test`
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Teste@1234',
      email_confirm: true,
      user_metadata: { full_name: t.name, role: 'therapist' },
    })
    if (error) { console.error(`  ✗ ${t.name}: ${error.message}`); continue }
    const id = data.user.id

    await supabase.from('profiles').update({ approved: true, preferred_language: t.lang }).eq('id', id)

    const { error: tErr } = await supabase.from('therapists').insert({
      id, email, phone: `+5585${90000000 + i}`,
      years_of_experience: t.exp, professional_score: t.score, city: t.city, language: t.lang,
    })
    if (tErr) { console.error(`  ✗ ${t.name} therapists row: ${tErr.message}`); continue }

    await supabase.from('therapist_availability').insert(t.avail.map((s) => ({ therapist_id: id, ...s })))
    console.log(`  ✓ ${t.name} (${t.city}, ${t.lang}, score ${t.score}) — ${email}`)
  }
}

async function seedClients() {
  console.log('\n=== Clients ===')
  for (const [i, c] of clients.entries()) {
    const { data, error } = await supabase.from('clients').insert({
      full_name: c.name, parent_phone: `+5585${80000000 + i}`,
      behavior_score: c.score, score_description: `Caso de teste (score ${c.score})`,
      age: c.age, sex: c.sex, language: c.lang, city: c.city,
      preferred_session_location: c.loc, weekly_hours: c.weekly,
      health_insurance: null, notes: null, parent_id: null, created_by: ADMIN_ID,
    }).select('id').single()
    if (error) { console.error(`  ✗ ${c.name}: ${error.message}`); continue }

    await supabase.from('client_availability').insert(c.avail.map((s) => ({ client_id: data.id, ...s })))
    console.log(`  ✓ ${c.name} (${c.city}, ${c.lang}, score ${c.score}, ${c.weekly}h/sem, ${c.loc})`)
  }
}

await seedTherapists()
await seedClients()
console.log('\nDone.')
