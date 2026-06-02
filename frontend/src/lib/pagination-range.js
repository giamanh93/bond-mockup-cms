/**
 * Build a list of page items for shadcn Pagination.
 * Output: array of numbers or 'ellipsis' string.
 * - Always include first + last
 * - Include `siblings` pages on each side of current
 * - Insert 'ellipsis' where there's a gap
 *
 * @param {number} totalPages
 * @param {number} currentPage   1-based
 * @param {number} siblings      default 1 → shows e.g. [1, '...', 4, 5, 6, '...', 10]
 */
export function paginationRange(totalPages, currentPage, siblings = 1) {
  const totalSlots = siblings * 2 + 5 // first + last + current + 2 ellipsis + siblings*2
  if (totalPages <= totalSlots) return Array.from({ length: totalPages }, (_, i) => i + 1)

  const leftSibling = Math.max(currentPage - siblings, 1)
  const rightSibling = Math.min(currentPage + siblings, totalPages)
  const showLeftEllipsis = leftSibling > 2
  const showRightEllipsis = rightSibling < totalPages - 1

  const out = []
  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + 2 * siblings
    for (let i = 1; i <= leftCount; i++) out.push(i)
    out.push('ellipsis', totalPages)
  } else if (showLeftEllipsis && !showRightEllipsis) {
    out.push(1, 'ellipsis')
    const rightCount = 3 + 2 * siblings
    for (let i = totalPages - rightCount + 1; i <= totalPages; i++) out.push(i)
  } else {
    out.push(1, 'ellipsis')
    for (let i = leftSibling; i <= rightSibling; i++) out.push(i)
    out.push('ellipsis', totalPages)
  }
  return out
}
