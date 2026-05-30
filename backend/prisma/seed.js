const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// ── Helpers ────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function orderNo(date, seq) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `DH${y}${m}${d}${String(seq).padStart(3, '0')}`
}

async function main() {
  // ── 1. Categories ─────────────────────────────────────────────────────────
  const catNames = ['Cát & Đá', 'Xi măng', 'Thép & Sắt', 'Gạch & Đá', 'Tôn & Ống thép', 'Ống nhựa & Phụ kiện', 'Sơn & Chống thấm', 'Khác']
  const catMap = {}
  for (const name of catNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    catMap[name] = c.id
  }

  // ── 2. Users ──────────────────────────────────────────────────────────────
  const hashes = {
    admin:  await bcrypt.hash('Admin@2026', 10),
    staff:  await bcrypt.hash('Staff@2026', 10),
    staff2: await bcrypt.hash('Staff@2026', 10),
    wh:     await bcrypt.hash('Staff@2026', 10),
  }

  const uAdmin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: hashes.admin, fullName: 'Quản trị viên', role: 'OWNER', dailyRate: 400000 },
    create: { username: 'admin', passwordHash: hashes.admin, fullName: 'Quản trị viên', role: 'OWNER', dailyRate: 400000 },
  })
  const uStaff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: { passwordHash: hashes.staff, fullName: 'Nguyễn Văn Bình', role: 'STAFF', dailyRate: 280000 },
    create: { username: 'staff', passwordHash: hashes.staff, fullName: 'Nguyễn Văn Bình', role: 'STAFF', dailyRate: 280000 },
  })
  const uStaff2 = await prisma.user.upsert({
    where: { username: 'staff2' },
    update: { passwordHash: hashes.staff2, fullName: 'Trần Thị Hoa', role: 'STAFF', dailyRate: 260000 },
    create: { username: 'staff2', passwordHash: hashes.staff2, fullName: 'Trần Thị Hoa', role: 'STAFF', dailyRate: 260000 },
  })
  const uWH = await prisma.user.upsert({
    where: { username: 'warehouse' },
    update: { passwordHash: hashes.wh, fullName: 'Lê Văn Kho', role: 'WAREHOUSE', dailyRate: 250000 },
    create: { username: 'warehouse', passwordHash: hashes.wh, fullName: 'Lê Văn Kho', role: 'WAREHOUSE', dailyRate: 250000 },
  })

  // ── 3. Products ───────────────────────────────────────────────────────────
  await prisma.product.createMany({
    skipDuplicates: true,
    data: [
      // Xi măng
      { code: 'VL001', name: 'Xi măng Hà Tiên PCB40',    categoryId: catMap['Xi măng'],         unit: 'Bao',  sellPrice: 95000,   costPrice: 82000,  stockQty: 500, minStock: 50 },
      { code: 'VL006', name: 'Xi măng INSEE PCB40',       categoryId: catMap['Xi măng'],         unit: 'Bao',  sellPrice: 93000,   costPrice: 80000,  stockQty: 300, minStock: 50 },
      { code: 'VL007', name: 'Xi măng Nghi Sơn PCB40',   categoryId: catMap['Xi măng'],         unit: 'Bao',  sellPrice: 91000,   costPrice: 78000,  stockQty: 200, minStock: 30 },
      // Cát & Đá
      { code: 'VL002', name: 'Cát xây dựng',             categoryId: catMap['Cát & Đá'],        unit: 'm³',   sellPrice: 350000,  costPrice: 280000, stockQty: 80,  minStock: 20 },
      { code: 'VL008', name: 'Cát san lấp',              categoryId: catMap['Cát & Đá'],        unit: 'm³',   sellPrice: 200000,  costPrice: 150000, stockQty: 120, minStock: 30 },
      { code: 'VL003', name: 'Đá 1×2',                   categoryId: catMap['Cát & Đá'],        unit: 'm³',   sellPrice: 420000,  costPrice: 340000, stockQty: 60,  minStock: 15 },
      { code: 'VL009', name: 'Đá 4×6',                   categoryId: catMap['Cát & Đá'],        unit: 'm³',   sellPrice: 390000,  costPrice: 310000, stockQty: 40,  minStock: 10 },
      { code: 'VL010', name: 'Đá mi bụi',                categoryId: catMap['Cát & Đá'],        unit: 'm³',   sellPrice: 180000,  costPrice: 130000, stockQty: 30,  minStock: 10 },
      // Thép & Sắt
      { code: 'VL004', name: 'Thép phi 10',              categoryId: catMap['Thép & Sắt'],      unit: 'Cây',  sellPrice: 145000,  costPrice: 125000, stockQty: 200, minStock: 30 },
      { code: 'VL011', name: 'Thép phi 12',              categoryId: catMap['Thép & Sắt'],      unit: 'Cây',  sellPrice: 205000,  costPrice: 178000, stockQty: 150, minStock: 30 },
      { code: 'VL012', name: 'Thép phi 16',              categoryId: catMap['Thép & Sắt'],      unit: 'Cây',  sellPrice: 360000,  costPrice: 315000, stockQty: 80,  minStock: 20 },
      { code: 'VL013', name: 'Thép phi 6',               categoryId: catMap['Thép & Sắt'],      unit: 'Cây',  sellPrice: 68000,   costPrice: 58000,  stockQty: 300, minStock: 50 },
      { code: 'VL014', name: 'Sắt hộp 20×40',           categoryId: catMap['Thép & Sắt'],      unit: 'Cây',  sellPrice: 185000,  costPrice: 160000, stockQty: 100, minStock: 20 },
      // Gạch & Đá
      { code: 'VL005', name: 'Gạch thẻ 4 lỗ',           categoryId: catMap['Gạch & Đá'],       unit: 'Viên', sellPrice: 2800,    costPrice: 2200,   stockQty: 5000,minStock: 500 },
      { code: 'VL015', name: 'Gạch ống 2 lỗ',           categoryId: catMap['Gạch & Đá'],       unit: 'Viên', sellPrice: 2500,    costPrice: 1900,   stockQty: 8000,minStock: 1000 },
      { code: 'VL016', name: 'Gạch đặc xây tường',      categoryId: catMap['Gạch & Đá'],       unit: 'Viên', sellPrice: 3200,    costPrice: 2600,   stockQty: 3000,minStock: 300 },
      // Tôn & Ống thép
      { code: 'VL017', name: 'Tôn lạnh 0.3mm',          categoryId: catMap['Tôn & Ống thép'],  unit: 'Tấm',  sellPrice: 125000,  costPrice: 105000, stockQty: 200, minStock: 30 },
      { code: 'VL018', name: 'Sắt hộp 40×60',           categoryId: catMap['Tôn & Ống thép'],  unit: 'Cây',  sellPrice: 320000,  costPrice: 275000, stockQty: 60,  minStock: 15 },
      // Ống nhựa
      { code: 'VL019', name: 'Ống nhựa PVC Ø 27mm',     categoryId: catMap['Ống nhựa & Phụ kiện'], unit: 'Cây', sellPrice: 32000, costPrice: 26000, stockQty: 500, minStock: 50 },
      { code: 'VL020', name: 'Ống nhựa PVC Ø 42mm',     categoryId: catMap['Ống nhựa & Phụ kiện'], unit: 'Cây', sellPrice: 58000, costPrice: 48000, stockQty: 300, minStock: 30 },
      // Sơn & Chống thấm
      { code: 'VL021', name: 'Sơn chống thấm Kova',     categoryId: catMap['Sơn & Chống thấm'], unit: 'Thùng', sellPrice: 680000, costPrice: 560000, stockQty: 50, minStock: 10 },
      { code: 'VL022', name: 'Keo chà ron Mapei',        categoryId: catMap['Sơn & Chống thấm'], unit: 'Túi',   sellPrice: 45000,  costPrice: 36000,  stockQty: 200, minStock: 20 },
    ],
  })

  const allProducts = await prisma.product.findMany({ where: { isActive: true } })
  const pByCode = Object.fromEntries(allProducts.map((p) => [p.code, p]))

  // ── 4. Customers ──────────────────────────────────────────────────────────
  const customerData = [
    { name: 'Nguyễn Văn An',     phone: '0901234567', address: 'Công trình Quận 1, TP.HCM' },
    { name: 'Trần Thị Bình',     phone: '0912345678', address: 'Công trình Bình Dương' },
    { name: 'Lê Hoàng Cường',    phone: '0923456789', address: 'Biệt thự Thủ Đức' },
    { name: 'Phạm Minh Đức',     phone: '0934567890', address: 'Nhà xưởng Long An' },
    { name: 'Hoàng Văn Em',      phone: '0945678901', address: 'Khu dân cư Bình Chánh' },
    { name: 'Vũ Thị Phương',     phone: '0956789012', address: 'Căn hộ Quận 7' },
    { name: 'Đặng Quốc Hùng',   phone: '0967890123', address: 'Công trình Đồng Nai' },
    { name: 'Bùi Thị Lan',      phone: '0978901234', address: 'Nhà ở Hóc Môn' },
    { name: 'Ngô Văn Minh',     phone: '0989012345', address: 'Kho bãi Quận 12' },
    { name: 'Trương Thị Nga',   phone: '0990123456', address: 'Nhà xưởng Củ Chi' },
    { name: 'Đinh Văn Phúc',    phone: '0901111222', address: 'Biệt thự Quận 9' },
    { name: 'Lý Thị Quyên',     phone: '0912222333', address: 'Công trình Tân Bình' },
    { name: 'Hồ Văn Sơn',       phone: '0923333444', address: 'Nhà ở Bình Thạnh' },
    { name: 'Dương Thị Thu',    phone: '0934444555', address: 'Khu công nghiệp Tân Phú' },
    { name: 'Cao Văn Uy',       phone: '0945555666', address: 'Đại lý vật liệu Gò Vấp' },
  ]

  for (const c of customerData) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } })
    if (!existing) await prisma.customer.create({ data: c })
  }

  const allCustomers = await prisma.customer.findMany()
  const customers = allCustomers

  // ── 5. Stock entries ──────────────────────────────────────────────────────
  const stockSeed = [
    { code: 'VL001', supplier: 'Công ty Xi măng Hà Tiên',   qty: 300, cost: 82000,  daysBack: 45 },
    { code: 'VL001', supplier: 'Công ty Xi măng Hà Tiên',   qty: 200, cost: 83000,  daysBack: 15 },
    { code: 'VL002', supplier: 'Vật liệu Miền Nam',         qty: 50,  cost: 280000, daysBack: 40 },
    { code: 'VL003', supplier: 'Vật liệu Miền Nam',         qty: 30,  cost: 340000, daysBack: 40 },
    { code: 'VL004', supplier: 'Đại lý thép Phú Mỹ',        qty: 100, cost: 125000, daysBack: 35 },
    { code: 'VL004', supplier: 'Đại lý thép Phú Mỹ',        qty: 150, cost: 126000, daysBack: 10 },
    { code: 'VL005', supplier: 'Gạch Đồng Nai',             qty: 3000,cost: 2200,   daysBack: 30 },
    { code: 'VL005', supplier: 'Gạch Đồng Nai',             qty: 2000,cost: 2250,   daysBack: 8  },
    { code: 'VL006', supplier: 'Công ty INSEE VN',          qty: 300, cost: 80000,  daysBack: 25 },
    { code: 'VL011', supplier: 'Đại lý thép Phú Mỹ',        qty: 100, cost: 178000, daysBack: 20 },
    { code: 'VL017', supplier: 'Tôn Hoa Sen',               qty: 150, cost: 105000, daysBack: 18 },
    { code: 'VL019', supplier: 'Nhựa Tiền Phong',           qty: 300, cost: 26000,  daysBack: 12 },
    { code: 'VL021', supplier: 'Sơn Kova',                  qty: 30,  cost: 560000, daysBack: 20 },
  ]

  for (const s of stockSeed) {
    const product = pByCode[s.code]
    if (!product) continue
    await prisma.stockEntry.create({
      data: {
        productId:    product.id,
        supplierName: s.supplier,
        quantity:     s.qty,
        costPrice:    s.cost,
        entryDate:    daysAgo(s.daysBack),
      },
    }).catch(() => {}) // ignore if already exists
  }

  // ── 6. Orders + Items + Payments ──────────────────────────────────────────
  const existingOrderCount = await prisma.order.count()
  if (existingOrderCount === 0) {
    const users = [uAdmin, uStaff, uStaff2]
    const orderDefs = [
      // [daysBack, custIdx, status, items: [[code, qty]], paidFraction]
      [28, 0, 'COMPLETED',  [['VL001',20],['VL002',5]],   1.0 ],
      [27, 1, 'COMPLETED',  [['VL004',30],['VL013',50]],  1.0 ],
      [26, 2, 'COMPLETED',  [['VL005',500],['VL003',3]],  1.0 ],
      [25, 3, 'COMPLETED',  [['VL006',15],['VL007',10]],  0.5 ],
      [24, 4, 'COMPLETED',  [['VL011',20],['VL012',5]],   1.0 ],
      [22, 5, 'COMPLETED',  [['VL001',30],['VL002',8]],   0.7 ],
      [21, 6, 'COMPLETED',  [['VL015',300],['VL016',100]],1.0 ],
      [20, 7, 'DELIVERED',  [['VL017',50],['VL018',10]],  0.6 ],
      [19, 8, 'DELIVERED',  [['VL019',100],['VL020',50]], 1.0 ],
      [18, 9, 'DELIVERED',  [['VL021',5],['VL022',20]],   0.0 ],
      [17, 10,'DELIVERED',  [['VL001',25],['VL003',4]],   0.8 ],
      [15, 11,'PROCESSING', [['VL004',40],['VL005',200]], 0.5 ],
      [14, 12,'PROCESSING', [['VL006',20],['VL008',10]], 0.3 ],
      [13, 0, 'PROCESSING', [['VL011',15],['VL014',10]], 0.0 ],
      [12, 1, 'PROCESSING', [['VL002',6],['VL009',3]],   0.6 ],
      [10, 2, 'NEW',        [['VL001',10],['VL007',15]], 0.0 ],
      [ 9, 3, 'NEW',        [['VL005',1000]],            0.0 ],
      [ 8, 4, 'NEW',        [['VL017',30],['VL019',80]], 0.0 ],
      [ 7, 5, 'NEW',        [['VL012',8],['VL013',100]], 0.0 ],
      [ 6, 6, 'CANCELLED',  [['VL003',5]],               0.0 ],
      [ 5, 7, 'COMPLETED',  [['VL001',50],['VL002',10]], 1.0 ],
      [ 4, 8, 'COMPLETED',  [['VL015',500],['VL016',200]],0.5],
      [ 3, 9, 'DELIVERED',  [['VL021',8],['VL022',30]],  0.0 ],
      [ 2,10, 'NEW',        [['VL004',25],['VL011',10]], 0.0 ],
      [ 1,11, 'NEW',        [['VL006',30],['VL007',20]], 0.0 ],
    ]

    let seq = 1
    for (const [dBack, cIdx, status, itemDefs, paidFrac] of orderDefs) {
      const date     = daysAgo(dBack)
      const customer = customers[cIdx % customers.length]
      const user     = users[seq % users.length]
      const no       = orderNo(date, seq++)

      const items = itemDefs.map(([code, qty]) => {
        const p = pByCode[code]
        const subtotal = Number(p.sellPrice) * qty
        return { productId: p.id, quantity: qty, unitPrice: Number(p.sellPrice), discount: 0, subtotal }
      })

      const totalAmount = items.reduce((s, i) => s + i.subtotal, 0)
      const paidAmount  = Math.round(totalAmount * paidFrac)
      const debtAmount  = totalAmount - paidAmount

      const order = await prisma.order.create({
        data: {
          orderNo:     no,
          customerId:  customer.id,
          userId:      user.id,
          orderDate:   date,
          totalAmount,
          paidAmount,
          debtAmount,
          status,
          items: { create: items },
        },
      })

      if (paidAmount > 0) {
        await prisma.payment.create({
          data: {
            customerId:    customer.id,
            orderId:       order.id,
            amount:        paidAmount,
            paymentDate:   date,
            paymentMethod: 'cash',
          },
        })
      }
    }

    // Recalculate totalDebt for each customer
    for (const c of customers) {
      const agg = await prisma.order.aggregate({
        where:   { customerId: c.id, status: { not: 'CANCELLED' } },
        _sum:    { debtAmount: true },
      })
      await prisma.customer.update({
        where: { id: c.id },
        data:  { totalDebt: agg._sum.debtAmount ?? 0 },
      })
    }
  }

  // ── 7. Attendance (last 30 days for all staff) ────────────────────────────
  const staffUsers = [uAdmin, uStaff, uStaff2, uWH]
  const statusPool = ['PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','HALF_DAY','LEAVE_PAID','LEAVE_UNPAID']

  for (let i = 30; i >= 1; i--) {
    const date = daysAgo(i)
    const dow  = date.getDay()
    if (dow === 0) continue // skip Sunday

    for (const u of staffUsers) {
      const status = dow === 6
        ? (Math.random() > 0.5 ? 'PRESENT' : 'LEAVE_PAID')
        : statusPool[Math.floor(Math.random() * statusPool.length)]

      await prisma.attendance.upsert({
        where:  { userId_date: { userId: u.id, date } },
        update: {},
        create: { userId: u.id, date, status },
      })
    }
  }

  // ── 8. Shop config ────────────────────────────────────────────────────────
  await prisma.shopConfig.upsert({
    where:  { id: 1 },
    update: {},
    create: { id: 1, name: 'Cửa hàng vật liệu xây dựng Thanh Hương', phone: '0869199320', address: 'Xóm 4, Phù Yên, Phú Nghĩa, Hà Nội' },
  })

  console.log('Seed hoàn thành! admin/Admin@2026 — staff/Staff@2026 — staff2/Staff@2026 — warehouse/Staff@2026')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
