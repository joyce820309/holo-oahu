function splitLines(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
}

function trimEmptyEdge(lines) {
  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() === '') start += 1
  while (end > start && lines[end - 1].trim() === '') end -= 1
  return lines.slice(start, end)
}

const dashRe    = /^-\s+(.+)$/
const numRe     = /^\d+(?:[.)])?\s+(.+)$/

// 把連續行分組成 segments：{ type: 'ul'|'ol'|'text', lines/items }
function parseSegments(lines) {
  const segments = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    if (trimmed === '') {
      // 空行當分隔，不單獨輸出
      i++
      continue
    }

    if (dashRe.test(trimmed)) {
      const items = []
      while (i < lines.length && (dashRe.test(lines[i].trim()) || lines[i].trim() === '')) {
        if (lines[i].trim() !== '') items.push(lines[i].trim().replace(dashRe, '$1').trim())
        i++
      }
      segments.push({ type: 'ul', items })
      continue
    }

    if (numRe.test(trimmed)) {
      const items = []
      while (i < lines.length && (numRe.test(lines[i].trim()) || lines[i].trim() === '')) {
        if (lines[i].trim() !== '') items.push(lines[i].trim().replace(numRe, '$1').trim())
        i++
      }
      segments.push({ type: 'ol', items })
      continue
    }

    // 普通文字行：把連續的非列表行收成一個 text segment
    const textLines = []
    while (i < lines.length && !dashRe.test(lines[i].trim()) && !numRe.test(lines[i].trim())) {
      textLines.push(lines[i])
      i++
    }
    segments.push({ type: 'text', lines: textLines })
  }

  return segments
}

export default function NoteContent({ text, className = '' }) {
  const lines = trimEmptyEdge(splitLines(text))
  if (lines.length === 0) return null

  const segments = parseSegments(lines)

  if (segments.length === 1) {
    const s = segments[0]
    if (s.type === 'ul') {
      return (
        <ul className={`list-disc pl-5 space-y-1 ${className}`.trim()}>
          {s.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )
    }
    if (s.type === 'ol') {
      return (
        <ol className={`list-decimal pl-5 space-y-1 ${className}`.trim()}>
          {s.items.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      )
    }
    return (
      <p className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {s.lines.join('\n')}
      </p>
    )
  }

  // 混合內容
  return (
    <div className={className}>
      {segments.map((s, si) => {
        if (s.type === 'ul') {
          return (
            <ul key={si} className="list-disc pl-5 space-y-1" style={{ marginTop: si > 0 ? 6 : 0 }}>
              {s.items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )
        }
        if (s.type === 'ol') {
          return (
            <ol key={si} className="list-decimal pl-5 space-y-1" style={{ marginTop: si > 0 ? 6 : 0 }}>
              {s.items.map((item, i) => <li key={i}>{item}</li>)}
            </ol>
          )
        }
        return (
          <p key={si} style={{ whiteSpace: 'pre-wrap', marginTop: si > 0 ? 6 : 0 }}>
            {s.lines.join('\n')}
          </p>
        )
      })}
    </div>
  )
}
