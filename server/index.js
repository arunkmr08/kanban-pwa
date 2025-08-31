import express from 'express'
import cors from 'cors'
import { nanoid } from 'nanoid'

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

const makeId = (p) => `${p}_${nanoid(8)}`
const db = { funnels: [], groups: [], cards: [] }

// Seed demo data
const funnels = [
  { id: 'f_marketing', name: 'Marketing', order_index: 0 },
  { id: 'f_sales', name: 'Sales', order_index: 1 },
]
db.funnels.push(...funnels)
const g1 = { id: makeId('g'), funnel_id: 'f_marketing', name: 'New Lead', order_index: 0 }
const g2 = { id: makeId('g'), funnel_id: 'f_marketing', name: 'Warm', order_index: 1 }
db.groups.push(g1, g2)
for (let i=0;i<5;i++) db.cards.push({ id: makeId('card'), group_id: g1.id, name: `Customer ${i+1}`, summary: 'Demo', statuses: ['Open'] })

const materialize = () => db.funnels
  .sort((a,b)=>a.order_index-b.order_index)
  .map(f => ({
    id: f.id,
    name: f.name,
    groups: db.groups
      .filter(g=>g.funnel_id===f.id)
      .sort((a,b)=>a.order_index-b.order_index)
      .map(g=>({ id: g.id, name: g.name, color: '#94a3b8', visibleCount: 3, cards: db.cards.filter(c=>c.group_id===g.id) }))
  }))

app.get('/funnels', (_req,res)=>res.json(materialize()))

app.post('/groups', (req,res)=>{
  const { name, funnelId, description='', mode='manual', color='#94a3b8' } = req.body||{}
  if (!name || !funnelId) return res.status(400).json({ error: 'name and funnelId required' })
  const order_index = db.groups.filter(g=>g.funnel_id===funnelId).length
  const g = { id: makeId('g'), funnel_id: funnelId, name, description, mode, color, order_index }
  db.groups.push(g)
  res.json({ id: g.id })
})

app.patch('/groups/:id', (req,res)=>{
  const id = req.params.id
  const g = db.groups.find(x=>x.id===id)
  if (!g) return res.sendStatus(404)
  const { name, funnelId, cardOrder } = req.body||{}
  if (typeof name==='string') g.name = name
  if (typeof funnelId==='string') g.funnel_id = funnelId
  if (Array.isArray(cardOrder)) {
    const current = db.cards.filter(c=>c.group_id===id)
    const pos = Object.fromEntries(cardOrder.map((cid,i)=>[cid,i]))
    current.sort((a,b)=>(pos[a.id]??999)-(pos[b.id]??999))
    db.cards = db.cards.filter(c=>c.group_id!==id).concat(current)
  }
  res.json({ ok: true })
})

app.delete('/groups/:id', (req,res)=>{
  const id = req.params.id
  db.cards = db.cards.filter(c=>c.group_id!==id)
  db.groups = db.groups.filter(g=>g.id!==id)
  res.json({ ok: true })
})

app.patch('/cards/:id', (req,res)=>{
  const id = req.params.id
  const card = db.cards.find(c=>c.id===id)
  if (!card) return res.sendStatus(404)
  const { groupId, position } = req.body||{}
  if (groupId) card.group_id = groupId
  if (typeof position==='number') {
    const arr = db.cards.filter(c=>c.group_id===card.group_id && c.id!==card.id)
    arr.splice(position,0,card)
    db.cards = db.cards.filter(c=>c.group_id!==card.group_id).concat(arr)
  }
  res.json({ ok: true })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, ()=>console.log(`API on ${PORT}`))

