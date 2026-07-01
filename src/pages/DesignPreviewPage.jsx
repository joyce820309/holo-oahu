import { useState, useRef, useCallback } from 'react'
import { GripVertical, Plus, ArrowLeftRight, X, Check, SlidersHorizontal, PencilLine, LayoutList } from 'lucide-react'

// ─── Day Selector variants ─────────────────────────────────────────────────

const DAYS_DATA = [
  { n:1, md:'7/18', wd:'Sat', wdZh:'六' },
  { n:2, md:'7/19', wd:'Sun', wdZh:'日' },
  { n:3, md:'7/20', wd:'Mon', wdZh:'一' },
  { n:4, md:'7/21', wd:'Tue', wdZh:'二' },
  { n:5, md:'7/22', wd:'Wed', wdZh:'三' },
  { n:6, md:'7/23', wd:'Thu', wdZh:'四' },
  { n:7, md:'7/24', wd:'Fri', wdZh:'五' },
  { n:8, md:'7/25', wd:'Sat', wdZh:'六' },
  { n:9, md:'7/26', wd:'Sun', wdZh:'日' },
]

// 日選器 V1：橫向捲動，日期大字 + D{n} + 星期
function DayTabsV1({ active, setActive }) {
  return (
    <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
      <button onClick={() => setActive('all')}
        style={{
          flexShrink:0, padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer',
          border: active==='all' ? '1.5px solid var(--accent)' : '1px solid var(--mini-border)',
          background: active==='all' ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--mini-bg)',
          color: active==='all' ? 'var(--accent)' : 'var(--text-secondary)',
          fontWeight: active==='all' ? 600 : 400,
        }}>全部</button>
      {DAYS_DATA.map(d => {
        const isActive = active === d.n
        return (
          <button key={d.n} onClick={() => setActive(d.n)}
            style={{
              flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center',
              padding:'5px 10px', borderRadius:20, cursor:'pointer', minWidth:44,
              border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--mini-border)',
              background: isActive ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--mini-bg)',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
            <span style={{ fontSize:13, fontWeight: isActive?700:500, lineHeight:1.3 }}>{d.md}</span>
            <span style={{ fontSize:9, opacity:0.7, lineHeight:1.2 }}>D{d.n} {d.wd}</span>
          </button>
        )
      })}
    </div>
  )
}

// 日選器 V2：2行 header — 上排日期數字大+星期，下排 D{n} label + scroll indicator
function DayTabsV2({ active, setActive }) {
  return (
    <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none', alignItems:'stretch' }}>
      <button onClick={() => setActive('all')}
        style={{
          flexShrink:0, padding:'0 12px', borderRadius:16, fontSize:12, cursor:'pointer', minHeight:52,
          border: active==='all' ? '1.5px solid var(--accent)' : '1px solid var(--mini-border)',
          background: active==='all' ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--mini-bg)',
          color: active==='all' ? 'var(--accent)' : 'var(--text-secondary)',
          fontWeight: active==='all' ? 600 : 400,
        }}>全部</button>
      {DAYS_DATA.map(d => {
        const isActive = active === d.n
        const isWeekend = d.wd === 'Sat' || d.wd === 'Sun'
        return (
          <button key={d.n} onClick={() => setActive(d.n)}
            style={{
              flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              padding:'6px 8px', borderRadius:16, cursor:'pointer', minWidth:40, minHeight:52,
              border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--mini-border)',
              background: isActive ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--mini-bg)',
            }}>
            <span style={{ fontSize:8, color: isActive ? 'var(--accent)' : 'var(--text-secondary)', opacity:0.6, lineHeight:1.2, fontWeight:500 }}>D{d.n}</span>
            <span style={{ fontSize:14, fontWeight:700, lineHeight:1.2, color: isActive ? 'var(--accent)' : isWeekend ? 'var(--weekend-color)' : 'var(--text-primary)' }}>{d.md.split('/')[1]}</span>
            <span style={{ fontSize:8, color: isActive ? 'var(--accent)' : isWeekend ? 'var(--weekend-color)' : 'var(--text-secondary)', opacity: isActive ? 0.8 : 0.65, lineHeight:1.2 }}>{d.wd}</span>
          </button>
        )
      })}
    </div>
  )
}

// 日選器 V3：段落式 chip，週末紅字，較寬 padding，2 行橫向捲動
function DayTabsV3({ active, setActive }) {
  return (
    <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
      <button onClick={() => setActive('all')}
        style={{
          flexShrink:0, alignSelf:'center', padding:'8px 14px', borderRadius:12, fontSize:13, cursor:'pointer',
          border: active==='all' ? '1.5px solid var(--accent)' : '1px solid var(--mini-border)',
          background: active==='all' ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--mini-bg)',
          color: active==='all' ? 'var(--accent)' : 'var(--text-secondary)',
          fontWeight: active==='all' ? 600 : 400,
        }}>全部</button>
      {DAYS_DATA.map(d => {
        const isActive = active === d.n
        const isWeekend = d.wd === 'Sat' || d.wd === 'Sun'
        const accentColor = isWeekend ? 'var(--weekend-color)' : 'var(--accent)'
        return (
          <button key={d.n} onClick={() => setActive(d.n)}
            style={{
              flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center',
              padding:'7px 10px', borderRadius:12, cursor:'pointer', minWidth:46, gap:1,
              border: isActive ? `1.5px solid ${accentColor}` : '1px solid var(--mini-border)',
              background: isActive ? `color-mix(in srgb, ${accentColor} 10%, transparent)` : 'var(--mini-bg)',
            }}>
            <span style={{ fontSize:11, fontWeight:700, lineHeight:1.2, color: isActive ? accentColor : isWeekend ? 'var(--weekend-color)' : 'var(--text-primary)', letterSpacing:'0.3px' }}>{d.md}</span>
            <span style={{ fontSize:9, lineHeight:1.2, color: isActive ? accentColor : 'var(--text-secondary)', opacity: isActive ? 1 : 0.6 }}>D{d.n} · {d.wd}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Swipe-to-close Bottom Sheet ───────────────────────────────────────────

function useSwipeClose(onClose) {
  const startY = useRef(null)
  const startTime = useRef(null)
  const dragY = useRef(0)
  const sheetRef = useRef(null)

  const onPointerDown = useCallback(e => {
    startY.current = e.clientY
    startTime.current = Date.now()
    dragY.current = 0
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }, [])

  const onPointerMove = useCallback(e => {
    if (startY.current === null) return
    const dy = e.clientY - startY.current
    if (dy < 0) return
    dragY.current = dy
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`
  }, [])

  const onPointerUp = useCallback(() => {
    if (startY.current === null) return
    const elapsed = Date.now() - startTime.current
    const velocity = dragY.current / elapsed
    const shouldClose = dragY.current > 120 || velocity > 0.5
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.25s ease'
      sheetRef.current.style.transform = shouldClose ? 'translateY(100%)' : 'translateY(0)'
    }
    if (shouldClose) setTimeout(onClose, 200)
    startY.current = null
  }, [onClose])

  return { sheetRef, onPointerDown, onPointerMove, onPointerUp }
}

// ─── Icon options for edit button ─────────────────────────────────────────

const ICON_OPTIONS = [
  { id:'sliders', icon: <SlidersHorizontal size={15}/>, label:'SlidersHorizontal', desc:'調整/控制，語義：自訂設定' },
  { id:'pencil',  icon: <PencilLine size={15}/>,        label:'PencilLine',        desc:'編輯，語義：修改模式' },
  { id:'layout',  icon: <LayoutList size={15}/>,        label:'LayoutList',        desc:'排列清單，語義：順序管理' },
]

// ─── Improved Scheme B ─────────────────────────────────────────────────────

function SchemeBImproved({ iconId, dayVariant }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mode, setMode] = useState(null)
  const [dayActive, setDayActive] = useState(4)
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const { sheetRef, onPointerDown, onPointerMove, onPointerUp } = useSwipeClose(closeSheet)
  const iconOpt = ICON_OPTIONS.find(o => o.id === iconId) || ICON_OPTIONS[0]

  const DayComponent = dayVariant === 'v1' ? DayTabsV1 : dayVariant === 'v2' ? DayTabsV2 : DayTabsV3

  return (
    <div style={{ padding:'16px 16px 0' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h2 className="text-primary" style={{ fontSize:18, fontWeight:600 }}>活動行程</h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {mode && (
            <span style={{ fontSize:11, color:'var(--accent)', fontWeight:500 }}>
              {mode==='reorder' ? '排序模式' : '換日模式'}
            </span>
          )}
          {mode
            ? <button onClick={() => setMode(null)} className="btn-ghost" style={{ padding:'6px 10px', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                <Check size={14}/> 完成
              </button>
            : <>
                <button onClick={() => setSheetOpen(true)} className="btn-ghost"
                  style={{ padding:'7px 10px', fontSize:13, display:'flex', alignItems:'center', gap:4 }}>
                  {iconOpt.icon}
                </button>
                <button className="btn-primary" style={{ padding:'7px 12px', fontSize:13, display:'flex', alignItems:'center', gap:4 }}>
                  <Plus size={14}/> 新增
                </button>
              </>
          }
        </div>
      </div>

      <DayComponent active={dayActive} setActive={setDayActive} />

      {mode && (
        <div className="glass-mini" style={{ padding:'8px 12px', margin:'8px 0', display:'flex', alignItems:'center', gap:6 }}>
          {mode==='reorder' ? <GripVertical size={14} style={{ color:'var(--accent)' }}/> : <ArrowLeftRight size={14} style={{ color:'var(--accent)' }}/>}
          <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
            {mode==='reorder' ? '長按卡片可拖曳排序' : '點選要互換的兩天'}
          </span>
        </div>
      )}

      <div style={{ marginTop:12 }}>
        {[{time:'07:30', title:'Hanauma Bay', sub:'07:30–11:30'},{time:'13:00', title:'東海岸自駕', sub:'13:00–17:00'}].map((c,i) => (
          <div key={i} style={{ display:'flex', gap:10, marginBottom:12 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:11, color:'var(--text-secondary)', width:36, textAlign:'right' }}>{c.time}</span>
              <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:11, display:'flex',alignItems:'center',justifyContent:'center', fontWeight:600 }}>{i+1}</div>
              {i<1 && <div style={{ width:2, height:32, background:'var(--mini-border)' }} />}
            </div>
            <div className="glass-mini" style={{ flex:1, padding:'10px 12px' }}>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{c.title}</p>
              <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sheet — z-index 200 to stay above bottom nav */}
      {sheetOpen && (
        <>
          <div onClick={closeSheet}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:190 }} />
          <div
            ref={sheetRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              position:'fixed', bottom:0, left:0, right:0, zIndex:200,
              borderRadius:'20px 20px 0 0',
              background:'rgba(255,255,255,0.97)',
              boxShadow:'0 -8px 32px rgba(30,61,79,0.14)',
              padding:'12px 16px 48px',
              animation:'sheet-up 0.25s cubic-bezier(0.32,0.72,0,1)',
              touchAction:'none',
              userSelect:'none',
            }}>
            {/* Drag handle — touch target */}
            <div style={{ display:'flex', justifyContent:'center', padding:'0 0 12px', cursor:'grab' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:'#cbd5e1' }} />
            </div>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:14, textAlign:'center', fontWeight:500 }}>選擇編輯模式</p>
            {[
              { icon:<GripVertical size={22}/>, title:'排序活動', desc:'長按並拖曳，調整當日活動順序', val:'reorder' },
              { icon:<ArrowLeftRight size={22}/>, title:'交換日期', desc:'選取兩天，互換所有活動', val:'swap' },
            ].map(opt => (
              <button key={opt.val}
                onClick={() => { setMode(opt.val); setSheetOpen(false) }}
                style={{
                  display:'flex', alignItems:'center', gap:16, width:'100%',
                  padding:'16px 14px', marginBottom:10,
                  background:'rgba(42,122,155,0.06)',
                  border:'1px solid rgba(42,122,155,0.15)',
                  borderRadius:16, cursor:'pointer',
                  textAlign:'left',
                }}>
                <div style={{
                  width:44, height:44, borderRadius:12,
                  background:'color-mix(in srgb, var(--accent) 12%, transparent)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--accent)', flexShrink:0,
                }}>
                  {opt.icon}
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{opt.title}</p>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.4 }}>{opt.desc}</p>
                </div>
              </button>
            ))}
            <button onClick={closeSheet}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:'12px', marginTop:4, background:'transparent', border:'1px solid var(--mini-border)', borderRadius:12, cursor:'pointer', fontSize:13, color:'var(--text-secondary)' }}>
              <X size={14} style={{ marginRight:6 }}/> 取消
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Preview Page ──────────────────────────────────────────────────────

const DAY_VARIANTS = [
  { id:'v1', name:'日期版 V1', desc:'月/日大字 + D{n}+星期 小字' },
  { id:'v2', name:'日期版 V2', desc:'日期數字最大 + 週末紅字' },
  { id:'v3', name:'日期版 V3', desc:'月/日粗體 + D{n}·星期 + 週末紅字' },
]

export default function DesignPreviewPage() {
  const [iconId, setIconId] = useState('sliders')
  const [dayVariant, setDayVariant] = useState('v1')

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg, #c8dce8 0%, #d4e8e0 45%, #e0ecd8 100%)', paddingBottom:32 }}>
      {/* Sticky control bar */}
      <div style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(255,255,255,0.9)', backdropFilter:'blur(14px)',
        borderBottom:'0.5px solid rgba(180,220,240,0.6)',
        padding:'10px 16px',
      }}>
        {/* Icon picker */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#64748b', fontWeight:600, minWidth:64 }}>編輯按鈕</span>
          {ICON_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setIconId(opt.id)}
              style={{
                display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, fontSize:11, cursor:'pointer',
                border: iconId===opt.id ? '1.5px solid #2a7a9b' : '1px solid rgba(180,220,240,0.6)',
                background: iconId===opt.id ? 'rgba(42,122,155,0.12)' : 'rgba(255,255,255,0.6)',
                color: iconId===opt.id ? '#2a7a9b' : '#3d6478',
                fontWeight: iconId===opt.id ? 600 : 400,
              }}>
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
        {/* Day selector picker */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#64748b', fontWeight:600, minWidth:64 }}>日期選器</span>
          {DAY_VARIANTS.map(v => (
            <button key={v.id} onClick={() => setDayVariant(v.id)}
              style={{
                padding:'5px 12px', borderRadius:20, fontSize:11, cursor:'pointer',
                border: dayVariant===v.id ? '1.5px solid #2a7a9b' : '1px solid rgba(180,220,240,0.6)',
                background: dayVariant===v.id ? 'rgba(42,122,155,0.12)' : 'rgba(255,255,255,0.6)',
                color: dayVariant===v.id ? '#2a7a9b' : '#3d6478',
                fontWeight: dayVariant===v.id ? 600 : 400,
              }}>
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div style={{ padding:'8px 16px 4px', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:12, color:'#64748b' }}>↑ 切換上方選項組合 · 底部 Sheet 可向下滑動關閉</span>
      </div>

      {/* Phone frame */}
      <div style={{ display:'flex', justifyContent:'center', padding:'12px 16px 0' }}>
        <div style={{
          width:375, minHeight:700,
          background:'linear-gradient(145deg, #c8dce8 0%, #d4e8e0 45%, #e0ecd8 100%)',
          borderRadius:32, overflow:'hidden',
          boxShadow:'0 24px 64px rgba(30,61,79,0.20)',
          border:'6px solid rgba(255,255,255,0.65)',
          position:'relative',
        }}>
          {/* Status bar */}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 18px 6px', fontSize:12, color:'#3d6478', fontWeight:600 }}>
            <span>9:41</span><span>● ● ▶</span>
          </div>
          {/* App header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 16px 10px', borderBottom:'0.5px solid rgba(180,220,240,0.4)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>≋</span>
              <span style={{ fontSize:15, fontWeight:600, color:'#1e3d4f' }}>Holo</span>
              <span style={{ fontSize:13, color:'#3d6478' }}>小喬</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.45)', border:'0.5px solid rgba(180,220,240,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>中</div>
              <div style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.45)', border:'0.5px solid rgba(180,220,240,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>≋</div>
            </div>
          </div>

          <SchemeBImproved iconId={iconId} dayVariant={dayVariant} />

          {/* Mock bottom nav */}
          <div style={{
            position:'sticky', bottom:0,
            background:'rgba(255,255,255,0.88)', backdropFilter:'blur(12px)',
            borderTop:'0.5px solid rgba(180,220,240,0.5)',
            display:'flex', padding:'8px 0 4px',
          }}>
            {['總覽','行程','旅遊','清單','費用','更多'].map((label, i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <div style={{ width:20, height:20, borderRadius:6, background: i===1 ? 'var(--accent)' : 'rgba(42,122,155,0.15)', opacity: i===1 ? 1 : 0.6 }} />
                <span style={{ fontSize:9, color: i===1 ? 'var(--accent)' : '#64748b', fontWeight: i===1 ? 600 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ maxWidth:375, margin:'16px auto 0', padding:'0 16px' }}>
        {/* Icon info */}
        <div className="glass-card" style={{ padding:'14px 16px', marginBottom:10 }}>
          <p style={{ fontSize:12, fontWeight:600, color:'#1e3d4f', marginBottom:6 }}>目前選擇的編輯按鈕</p>
          {(() => { const o = ICON_OPTIONS.find(x=>x.id===iconId); return (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(42,122,155,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#2a7a9b' }}>{o.icon}</div>
              <div>
                <p style={{ fontSize:12, fontWeight:500, color:'#1e3d4f' }}>{o.label}</p>
                <p style={{ fontSize:11, color:'#64748b' }}>{o.desc}</p>
              </div>
            </div>
          )})()}
        </div>
        {/* Day variant info */}
        <div className="glass-card" style={{ padding:'14px 16px', marginBottom:10 }}>
          <p style={{ fontSize:12, fontWeight:600, color:'#1e3d4f', marginBottom:6 }}>日期選器設計說明</p>
          {dayVariant==='v1' && <ul style={{ fontSize:11, color:'#3d6478', lineHeight:1.8, paddingLeft:14 }}>
            <li>月/日作為主視覺，D{'{n}'} + 星期作輔助</li>
            <li>pill 寬度稍寬（44px）但資訊密度低，易閱讀</li>
            <li>全部按鈕獨立樣式不擠壓</li>
          </ul>}
          {dayVariant==='v2' && <ul style={{ fontSize:11, color:'#3d6478', lineHeight:1.8, paddingLeft:14 }}>
            <li>「日」數字最大（14px），月份去掉讓每格最窄（40px）</li>
            <li>週末（Sat/Sun）自動顯示紅色，一眼辨識休假日</li>
            <li>D{'{n}'} 標籤在最上方，視覺層次：行程日 → 日期 → 星期</li>
          </ul>}
          {dayVariant==='v3' && <ul style={{ fontSize:11, color:'#3d6478', lineHeight:1.8, paddingLeft:14 }}>
            <li>月/日以較大字體主導（11px bold），兼顧可讀性與寬度</li>
            <li>D{'{n}'} · 星期合併一行節省高度，視覺更緊湊</li>
            <li>週末整顆 pill 邊框變紅，active 狀態也尊重週末色</li>
          </ul>}
        </div>
        {/* Gesture info */}
        <div className="glass-card" style={{ padding:'14px 16px' }}>
          <p style={{ fontSize:12, fontWeight:600, color:'#1e3d4f', marginBottom:6 }}>Bottom Sheet 改善項目</p>
          <ul style={{ fontSize:11, color:'#3d6478', lineHeight:1.8, paddingLeft:14 }}>
            <li>z-index: 200（高於 bottom nav 的 z-index 層級）</li>
            <li>drag handle 支援手勢下滑關閉（位移 {'>'} 120px 或速度 {'>'} 0.5px/ms）</li>
            <li>選項 icon 改為帶背景色圓框，視覺更清晰</li>
            <li>新增「取消」按鈕（Tap outside 或滑下也可關閉）</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
