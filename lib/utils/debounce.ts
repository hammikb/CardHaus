export function debounce<Args extends any[]>(
  fn: (...args: Args) => void | Promise<void>,
  delay: number
): (...args: Args) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Args) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}
