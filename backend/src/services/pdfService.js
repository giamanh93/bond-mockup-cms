const PDFDocument = require('pdfkit')
const Minio = require('minio')
const { minioClient, BUCKETS } = require('../config/minio')

// Separate client for presigned URL generation — uses public hostname
const minioPublicClient = new Minio.Client({
  endPoint: process.env.MINIO_PUBLIC_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PUBLIC_PORT) || 9003,
  useSSL: false,
  accessKey: process.env.MINIO_USER,
  secretKey: process.env.MINIO_PASS,
})

// Noto Sans hỗ trợ tiếng Việt đầy đủ
const FONT_REGULAR = '/usr/share/fonts/noto/NotoSans-Regular.ttf'
const FONT_BOLD    = '/usr/share/fonts/noto/NotoSans-Bold.ttf'

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN').format(Number(amount)) + ' đ'
}

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

async function generateInvoicePDF(order, shopConfig = {}) {
  return new Promise((resolve, reject) => {
    // margin: 0 — tự quản lý toàn bộ padding
    const doc = new PDFDocument({ size: 'A5', margin: 0, compress: true })
    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const PW = doc.page.width   // A5 = 419.53 pt
    const L  = 14               // left padding nhỏ
    const R  = PW - 14          // right bound
    const W  = R - L            // usable width ≈ 391 pt
    let y    = 14               // top padding nhỏ

    // helper: vẽ text tại tọa độ tuyệt đối, KHÔNG wrap (lineBreak: false)
    function t(text, x, ty, opts = {}) {
      doc.text(String(text), x, ty, { lineBreak: false, ...opts })
    }

    // ── Header cửa hàng ──────────────────────────────────────────────────────
    if (shopConfig.name) {
      doc.fontSize(11).font(FONT_BOLD).fillColor('#111827')
      t(shopConfig.name, L, y, { width: W, align: 'center' })
      y += 14
    }
    if (shopConfig.phone || shopConfig.address) {
      doc.fontSize(7.5).font(FONT_REGULAR).fillColor('#6b7280')
      const shopMeta = [shopConfig.phone, shopConfig.address].filter(Boolean).join('  |  ')
      t(shopMeta, L, y, { width: W, align: 'center' })
      y += 11
    }
    y += 3

    // ── Tiêu đề ──────────────────────────────────────────────────────────────
    doc.fontSize(15).font(FONT_BOLD).fillColor('#1e40af')
    t('HÓA ĐƠN BÁN HÀNG', L, y, { width: W, align: 'center' })
    y += 20

    // Số đơn + Ngày trên cùng 1 dòng
    doc.fontSize(8).font(FONT_REGULAR).fillColor('#374151')
    const meta = `Số đơn: ${order.orderNo}     Ngày: ${formatDate(order.orderDate)}`
    t(meta, L, y, { width: W, align: 'center' })
    y += 13

    // Kẻ ngang
    doc.moveTo(L, y).lineTo(R, y).strokeColor('#94a3b8').lineWidth(0.7).stroke()
    y += 6

    // ── Khách hàng ───────────────────────────────────────────────────────────
    doc.fontSize(8.5).font(FONT_BOLD).fillColor('#374151')
    t('KHÁCH HÀNG:', L, y)
    y += 12
    doc.font(FONT_REGULAR)
    t(`Tên: ${order.customer?.name || '—'}`, L, y)
    y += 11
    if (order.customer?.phone) { t(`SĐT: ${order.customer.phone}`, L, y); y += 11 }
    if (order.customer?.address) { t(`Địa chỉ: ${order.customer.address}`, L, y); y += 11 }
    y += 4

    // ── Bảng sản phẩm ────────────────────────────────────────────────────────
    // Cột (pt): STT=22 | Tên hàng=fill | SL=26 | Đơn giá=80 | T.Tiền=72
    const cStt   = L
    const wStt   = 22
    const cTotal = R - 72
    const wTotal = R - cTotal
    const cPrice = cTotal - 80
    const wPrice = cTotal - cPrice
    const cQty   = cPrice - 26
    const wQty   = cPrice - cQty
    const cName  = cStt + wStt
    const wName  = cQty - cName

    const ROW_H = 15  // chiều cao mỗi row
    const PAD   = 3   // padding ngang

    function drawRowBorder(rowY, h, fillColor) {
      if (fillColor) {
        doc.rect(L, rowY, W, h).fillColor(fillColor).fill()
      }
      doc.rect(L, rowY, W, h).strokeColor('#94a3b8').lineWidth(0.5).stroke()
      for (const cx of [cName, cQty, cPrice, cTotal]) {
        doc.moveTo(cx, rowY).lineTo(cx, rowY + h).strokeColor('#94a3b8').lineWidth(0.4).stroke()
      }
    }

    // Header row
    drawRowBorder(y, ROW_H, '#f1f5f9')
    doc.fontSize(8).font(FONT_BOLD).fillColor('#1e293b')
    const tY = y + ROW_H / 2 - 4
    t('STT',      cStt   + PAD, tY, { width: wStt   - PAD * 2, align: 'center' })
    t('Tên hàng', cName  + PAD, tY, { width: wName  - PAD })
    t('SL',       cQty   + PAD, tY, { width: wQty   - PAD * 2, align: 'right' })
    t('Đơn giá',  cPrice + PAD, tY, { width: wPrice - PAD * 2, align: 'right' })
    t('T.Tiền',   cTotal + PAD, tY, { width: wTotal - PAD * 2, align: 'right' })
    y += ROW_H

    // ── Rows ─────────────────────────────────────────────────────────────────
    doc.fontSize(8).font(FONT_REGULAR).fillColor('#374151')
    order.items?.forEach((item, i) => {
      const qty      = Number(item.quantity)
      const price    = Number(item.unitPrice)
      const disc     = Number(item.discount || 0)
      const sub      = Math.round(qty * price * (1 - disc / 100))
      const priceStr = disc > 0 ? `${formatVND(price)} (-${disc}%)` : formatVND(price)
      const nameStr  = `${item.product?.name || ''} (${item.product?.unit || ''})`

      drawRowBorder(y, ROW_H, i % 2 === 1 ? '#f8fafc' : null)
      doc.fillColor('#374151')  // reset sau khi drawRowBorder đổi fillColor
      const rY = y + ROW_H / 2 - 4
      t(String(i + 1), cStt   + PAD, rY, { width: wStt   - PAD * 2, align: 'center' })
      t(nameStr,        cName  + PAD, rY, { width: wName  - PAD })
      t(String(qty),    cQty   + PAD, rY, { width: wQty   - PAD * 2, align: 'right' })
      t(priceStr,       cPrice + PAD, rY, { width: wPrice - PAD * 2, align: 'right' })
      t(formatVND(sub), cTotal + PAD, rY, { width: wTotal - PAD * 2, align: 'right' })
      y += ROW_H
    })

    y += 6

    // ── Tổng tiền (căn phải) ─────────────────────────────────────────────────
    const sumLabelX = cPrice - 80
    const sumLabelW = 78

    function summaryRow(label, value, color) {
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor(color || '#374151')
      t(label, sumLabelX, y, { width: sumLabelW, align: 'right' })
      doc.font(FONT_BOLD)
      t(value, cTotal, y, { width: wTotal, align: 'right' })
      y += 13
    }

    summaryRow('Tổng tiền hàng:', formatVND(Number(order.totalAmount)))
    summaryRow('Đã thanh toán:',  formatVND(Number(order.paidAmount)),  '#16a34a')
    if (Number(order.debtAmount) > 0) {
      summaryRow('Còn nợ lại:', formatVND(Number(order.debtAmount)), '#dc2626')
    }

    // ── Ghi chú ──────────────────────────────────────────────────────────────
    if (order.note) {
      y += 2
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor('#6b7280')
      t(`Ghi chú: ${order.note}`, L, y)
      y += 11
    }

    // ── Ký tên ───────────────────────────────────────────────────────────────
    y += 12
    const mid = L + W / 2
    doc.font(FONT_BOLD).fontSize(8.5).fillColor('#374151')
    t('Người mua hàng', L,   y, { width: W / 2, align: 'center' })
    t('Người bán hàng', mid, y, { width: W / 2, align: 'center' })
    y += 11
    doc.font(FONT_REGULAR).fontSize(7.5).fillColor('#9ca3af')
    t('(Ký, ghi rõ họ tên)', L,   y, { width: W / 2, align: 'center' })
    t('(Ký, ghi rõ họ tên)', mid, y, { width: W / 2, align: 'center' })
    y += 48
    doc.moveTo(L + 15, y).lineTo(mid - 15, y).strokeColor('#9ca3af').lineWidth(0.5).stroke()
    doc.moveTo(mid + 15, y).lineTo(R - 15, y).stroke()

    doc.end()
  })
}

async function uploadInvoicePDF(orderId, orderNo, pdfBuffer) {
  const objectName = `invoices/${orderNo}-${orderId}.pdf`
  await minioClient.putObject(BUCKETS.ORDERS, objectName, pdfBuffer, pdfBuffer.length, {
    'Content-Type': 'application/pdf',
  })
  const url = await minioPublicClient.presignedGetObject(BUCKETS.ORDERS, objectName, 3600)
  return { objectName, url }
}

module.exports = { generateInvoicePDF, uploadInvoicePDF }
