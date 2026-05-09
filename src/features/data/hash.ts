export function stableHash(input: string | Uint8Array) {
  const text =
    typeof input === 'string'
      ? input
      : Array.from(input, (byte) => String.fromCharCode(byte)).join('')
  let hash = 0x811c9dc5

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}
