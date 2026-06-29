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

function parseNote(text) {
  const lines = trimEmptyEdge(splitLines(text))
  if (lines.length === 0) return { type: 'plain', lines: [] }

  const nonEmpty = lines.filter((line) => line.trim() !== '')
  const dashRe = /^-\s+(.+)$/
  const numRe = /^\d+(?:[.)])?\s+(.+)$/

  const isAllDash = nonEmpty.length > 0 && nonEmpty.every((line) => dashRe.test(line.trim()))
  if (isAllDash) {
    return {
      type: 'ul',
      items: nonEmpty.map((line) => line.trim().replace(dashRe, '$1').trim()),
    }
  }

  const isAllNumbered = nonEmpty.length > 0 && nonEmpty.every((line) => numRe.test(line.trim()))
  if (isAllNumbered) {
    return {
      type: 'ol',
      items: nonEmpty.map((line) => line.trim().replace(numRe, '$1').trim()),
    }
  }

  return { type: 'plain', lines }
}

export default function NoteContent({ text, className = '' }) {
  const parsed = parseNote(text)
  if (parsed.type === 'ul') {
    return (
      <ul className={`list-disc pl-5 space-y-1 ${className}`.trim()}>
        {parsed.items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    )
  }

  if (parsed.type === 'ol') {
    return (
      <ol className={`list-decimal pl-5 space-y-1 ${className}`.trim()}>
        {parsed.items.map((item, index) => <li key={index}>{item}</li>)}
      </ol>
    )
  }

  return (
    <p className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {parsed.lines.join('\n')}
    </p>
  )
}