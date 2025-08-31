import express from 'express'
import cors from 'cors'
import { nanoid } from 'nanoid'

const app = express()
app.use(cors({ origin: '*'}))
app.use(express.json())

// In-memory data — swap with a real DB later
const makeId = (p) => `${p}_${nanoid(8)}`
const seedCards = (n) => Array.from({ length: n }).map((_, i) => ({
  id: makeId('card'),
  name: ["Adani Wilmar Limited","VIP Industries Ltd","Voltas Limited","Kamdhenu Limited","Hero Motors Ltd","Eureka Forbes Ltd","Cadbury India Ltd"][i % 7],
  summary: "Lorem Ipsum is simply dummy text of the printing and typesetting ind…",
  minutesAgo: (i + 1) * 4,
  assignee: ["Barkha Barad","Shaan Luthra","Aalap Bhatnagar","Ravi Rege","Leela Magadum"][i % 5],
  statuses: ["Open"],
  tags: ["bulk","upload","engaged","custom","support","intent"].slice(0, (i % 5) + 1),
}))

const db = {
  funnels: [
    { id: 'f_marketing', name: 'Marketing', order_index: 0 },
    { id: 'f_sales', name: 'Sales', order_index: 1 },
    { id: 'f_conversations', name: 'Conversations', order_index: 2 },
  ],
  groups: [
    { id: makeId('g'), funnel_id: 'f_marketing', name: 'New Lead', description: '', mode: 'manual', color: '#5b9cf3', order_index: 0 },
    { id: makeId('g'), funnel_id: 'f_marketing', name: 'Warm', description: '', mode: 'manual', color: '#f59f00', order_index: 1 },
    { id: makeId('g'), funnel_id: 'f_marketing', name: 'Activated', description: '', mode: 'manual', color: '#22c55e', order_index: 2 },
    { id: makeId('g'), funnel_id: 'f_marketing', name: 'Cold', description: '', mode: 'manual', color: '#94a3b8', order_index: 3 },
    { id: makeId('g'), funnel_id: 'f_sales', name: 'Prospecting', description: '', mode: 'manual', color: '#6366f1', order_index: 0 },
    { id: makeId('g'), funnel_id: 'f_sales', name: 'Negotiation', description: '', mode: 'manual', color: '#eab308', order_index: 1 },
    { id: makeId('g'), funnel_id: 'f_conversations', name: 'Open', description: '', mode: 'manual', color: '#0ea5e9', order_index: 0 },
    { id: makeId('g'), funnel_id: 'f_conversations', name: 'Closed', description: '', mode: 'manual', color: '#10b981', order_index: 1 },
  ],
  cards: []
}
// seed some cards
db.groups.forEach(g => {
  seedCards(3).forEach(c => db.cards.push({ ...c, group_id: g.id }))
})

// Helper: build funnels with nested groups+cards
const materialize = () => db.funnels
  .sort((a,b) => a.order_index - b.order_index)
  .map(f => ({
    id: f.id,
    name: f.name,
    groups: db.groups
      .filter(g => g.funnel_id === f.id)
      .sort((a,b) => a.order_index - b.order_index)
      .map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        mode: g.mode,
        color: g.color,
        visibleCount: 3,
        cards: db.cards.filter(c => c.group_id === g.id)
      }))
  }))

// Routes
app.get('/funnels', (_req, res) => { res.json(materialize()) })

app.post('/groups', (req, res) => {
  const { name, description = '', mode = 'manual', color = '#94a3b8', funnelId } = req.body || {}
  if (!name || !funnelId) return res.status(400).json({ error: 'name and funnelId required' })
  const order_index = db.groups.filter(g => g.funnel_id === funnelId).length
  const g = { id: makeId('g'), funnel_id: funnelId, name, description, mode, color, order_index }
  db.groups.push(g)
  res.json({ id: g.id, ...g })
})

app.patch('/groups/:id', (req, res) => {
  const id = req.params.id
  const g = db.groups.find(x => x.id === id)
  if (!g) return res.sendStatus(404)

  const { name, funnelId, cardOrder } = req.body || {}
  if (typeof name === 'string') g.name = name
  if (typeof funnelId === 'string') g.funnel_id = funnelId
  if (Array.isArray(cardOrder)) {
    // reorder cards for this group according to array of ids
    const current = db.cards.filter(c => c.group_id === id)
    const idPos = Object.fromEntries(cardOrder.map((cid, i) => [cid, i]))
    current.sort((a, b) => (idPos[a.id] ?? 9999) - (idPos[b.id] ?? 9999))
    // Replace in db in that order
    db.cards = db.cards.filter(c => c.group_id !== id).concat(current)
  }
  res.json({ ok: true })
})

app.delete('/groups/:id', (req, res) => {
  const id = req.params.id
  db.cards = db.cards.filter(c => c.group_id !== id)
  db.groups = db.groups.filter(g => g.id !== id)
  res.json({ ok: true })
})

app.patch('/cards/:id', (req, res) => {
  const id = req.params.id
  const card = db.cards.find(c => c.id === id)
  if (!card) return res.sendStatus(404)
  const { groupId, position } = req.body || {}
  if (groupId) card.group_id = groupId
  // reorder within new group if position provided
  if (typeof position === 'number') {
    const groupCards = db.cards.filter(c => c.group_id === card.group_id && c.id !== card.id)
    groupCards.splice(position, 0, card)
    db.cards = db.cards.filter(c => c.group_id !== card.group_id || c.id === card.id)
    db.cards = db.cards.filter(c => c.id !== card.id).concat(groupCards)
  }
  res.json({ ok: true })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`API listening on ${PORT}`))

