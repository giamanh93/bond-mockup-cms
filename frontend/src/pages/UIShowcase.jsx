import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { MoreHorizontal, Settings, Trash2, User } from 'lucide-react'
import {
  Button, Input, Textarea, Label,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Separator, Skeleton,
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Sheet, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
  AlertDialog, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
  DatePicker, Calendar,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption,
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext, PaginationEllipsis,
  Tooltip, TooltipTrigger, TooltipContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage,
} from '@/components/ui'

export default function UIShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [pickedDate, setPickedDate] = useState(null)
  const [calendarDate, setCalendarDate] = useState(new Date())

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <div>
        <h1>UI Showcase</h1>
        <p className="text-muted-foreground">Phase 2 — Primitives shadcn-style. Demo nhanh.</p>
      </div>

      {/* Buttons */}
      <section className="space-y-3">
        <h3>Buttons</h3>
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="outline"><Trash2 /></Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <Separator />

      {/* Inputs */}
      <section className="space-y-3">
        <h3>Form inputs</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Họ tên</Label>
            <Input id="name" placeholder="Nguyễn Văn A" />
          </div>
          <div className="space-y-1.5">
            <Label>Vai trò (Radix Select)</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="— Chọn vai trò —" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Quản trị</SelectLabel>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Quản lý</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Nhân viên</SelectLabel>
                  <SelectItem value="staff">Nhân viên</SelectItem>
                  <SelectItem value="intern">Thực tập sinh</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea id="note" placeholder="Nhập ghi chú..." />
          </div>
        </div>
      </section>

      <Separator />

      {/* Date picker */}
      <section className="space-y-3">
        <h3>DatePicker (Popover + Calendar)</h3>
        <div className="grid grid-cols-2 gap-4 max-w-xl">
          <div className="space-y-1.5">
            <Label>Ngày phát hành</Label>
            <DatePicker
              value={pickedDate}
              onChange={setPickedDate}
              placeholder="Chọn ngày phát hành"
            />
            <p className="text-xs text-muted-foreground">Giá trị: <code>{pickedDate ?? 'null'}</code></p>
          </div>
          <div className="space-y-1.5">
            <Label>Disabled</Label>
            <DatePicker disabled placeholder="Không thể chọn" />
          </div>
        </div>
        <div className="space-y-1.5 max-w-xs">
          <Label>Calendar (inline, không Popover)</Label>
          <div className="rounded-md border w-fit">
            <Calendar mode="single" selected={calendarDate} onSelect={setCalendarDate} />
          </div>
        </div>
      </section>

      <Separator />

      {/* Badges */}
      <section className="space-y-3">
        <h3>Badges</h3>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="success">Hoạt động</Badge>
          <Badge variant="warning">Khởi tạo</Badge>
        </div>
      </section>

      <Separator />

      {/* Table */}
      <section className="space-y-3">
        <h3>Table</h3>
        <Card className="overflow-hidden">
          <Table>
            <TableCaption>Sample danh sách trái phiếu — primitive Table</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Mã</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Đơn vị phát hành</TableHead>
                <TableHead className="text-right">Mệnh giá</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { code: 'TP24-001', name: 'Trái phiếu Vingroup 2024 đợt 1', issuer: 'Vingroup',     value: 100_000_000, status: 'Hoạt động', variant: 'success' },
                { code: 'TP24-002', name: 'Trái phiếu Chính phủ 10 năm',     issuer: 'Kho bạc NN',    value: 100_000,      status: 'Hoạt động', variant: 'success' },
                { code: 'TP23-099', name: 'Trái phiếu Masan Group 2023',     issuer: 'Masan',         value: 50_000_000,   status: 'Đáo hạn',   variant: 'warning' },
              ].map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="font-medium tabular-nums">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.issuer}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {new Intl.NumberFormat('vi-VN').format(r.value)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={r.variant}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <Separator />

      {/* Card */}
      <section className="space-y-3">
        <h3>Card</h3>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Trái phiếu TP24-001</CardTitle>
            <CardDescription>Vingroup — phát hành 15/03/2024</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Mệnh giá <strong>100.000.000 VND</strong> · Lãi suất <strong>9.5%</strong></p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm" variant="outline">Xem chi tiết</Button>
            <Button size="sm">Đặt mua</Button>
          </CardFooter>
        </Card>
      </section>

      <Separator />

      {/* Skeleton */}
      <section className="space-y-3">
        <h3>Skeleton (loading state)</h3>
        <div className="space-y-2 max-w-md">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </section>

      <Separator />

      {/* Overlays */}
      <section className="space-y-3">
        <h3>Overlays</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>Mở Dialog</Button>
          <Button variant="outline" onClick={() => setSheetOpen(true)}>Mở Sheet (drawer)</Button>
          <Button variant="destructive" onClick={() => setAlertOpen(true)}>Mở AlertDialog (xóa)</Button>
        </div>
      </section>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>Thêm trái phiếu</DialogTitle>
          <DialogDescription>Nhập thông tin cơ bản. Có thể bổ sung sau.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Mã trái phiếu</Label>
            <Input placeholder="TP25-XXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Tên trái phiếu</Label>
            <Input placeholder="Trái phiếu..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
          <Button onClick={() => setDialogOpen(false)}>Lưu</Button>
        </DialogFooter>
      </Dialog>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetHeader>
          <SheetTitle>Chi tiết trái phiếu</SheetTitle>
          <SheetDescription>Drawer trượt từ phải — tương đương Drawer hiện tại của BondList</SheetDescription>
        </SheetHeader>
        <SheetBody className="bg-muted/30">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Mã</Label>
              <Input defaultValue="TP24-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Tên</Label>
              <Input defaultValue="Trái phiếu Vingroup 2024 đợt 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả</Label>
              <Textarea rows={4} defaultValue="..." />
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => setSheetOpen(false)}>Hủy</Button>
          <Button onClick={() => setSheetOpen(false)}>Lưu thay đổi</Button>
        </SheetFooter>
      </Sheet>

      <Separator />

      {/* Pagination */}
      <section className="space-y-3">
        <h3>Pagination</h3>
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious /></PaginationItem>
            <PaginationItem><PaginationLink>1</PaginationLink></PaginationItem>
            <PaginationItem><PaginationLink isActive>2</PaginationLink></PaginationItem>
            <PaginationItem><PaginationLink>3</PaginationLink></PaginationItem>
            <PaginationItem><PaginationEllipsis /></PaginationItem>
            <PaginationItem><PaginationLink>10</PaginationLink></PaginationItem>
            <PaginationItem><PaginationNext /></PaginationItem>
          </PaginationContent>
        </Pagination>
      </section>

      <Separator />

      {/* Tooltip */}
      <section className="space-y-3">
        <h3>Tooltip</h3>
        <div className="flex gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon"><Settings /></Button>
            </TooltipTrigger>
            <TooltipContent>Cài đặt</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover tôi</Button>
            </TooltipTrigger>
            <TooltipContent side="right">Tooltip bên phải</TooltipContent>
          </Tooltip>
        </div>
      </section>

      <Separator />

      {/* DropdownMenu */}
      <section className="space-y-3">
        <h3>DropdownMenu</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User /> Hồ sơ
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings /> Cài đặt
              <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 /> Xóa tài khoản
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <Separator />

      {/* Tabs */}
      <section className="space-y-3">
        <h3>Tabs</h3>
        <Tabs defaultValue="overview" className="w-full max-w-2xl">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="financial">Tài chính</TabsTrigger>
            <TabsTrigger value="docs">Tài liệu</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle>Tổng quan</CardTitle></CardHeader>
              <CardContent>Thông tin chung của trái phiếu.</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="financial">
            <Card>
              <CardHeader><CardTitle>Tài chính</CardTitle></CardHeader>
              <CardContent>Mệnh giá, lãi suất, kỳ trả lãi.</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="docs">
            <Card>
              <CardHeader><CardTitle>Tài liệu</CardTitle></CardHeader>
              <CardContent>Hợp đồng, prospectus, bản tin.</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* Form (React Hook Form) */}
      <RHFFormDemo />

      <Separator />

      {/* Sonner Toast */}
      <section className="space-y-3">
        <h3>Toast (Sonner)</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast('Thông báo mặc định')}>Default</Button>
          <Button variant="outline" onClick={() => toast.success('Lưu thành công')}>Success</Button>
          <Button variant="outline" onClick={() => toast.error('Có lỗi xảy ra')}>Error</Button>
          <Button variant="outline" onClick={() => toast.info('Có 3 bản ghi mới')}>Info</Button>
          <Button variant="outline" onClick={() => toast.warning('Sắp đáo hạn')}>Warning</Button>
          <Button variant="outline" onClick={() => toast.promise(
            new Promise((r) => setTimeout(r, 2000)),
            { loading: 'Đang lưu...', success: 'Đã lưu', error: 'Lỗi' }
          )}>Promise</Button>
        </div>
      </section>

      {/* AlertDialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa trái phiếu?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này không thể hoàn tác. Bản ghi sẽ bị xóa vĩnh viễn khỏi hệ thống.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setAlertOpen(false)}>Hủy</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => setAlertOpen(false)}>
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  )
}

function RHFFormDemo() {
  const form = useForm({
    defaultValues: { bondCode: '', bondName: '', faceValue: '' },
  })
  function onSubmit(values) {
    toast.success(`Đã submit: ${values.bondCode}`)
    console.log(values)
  }
  return (
    <section className="space-y-3">
      <h3>Form (React Hook Form integration)</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <FormField
            control={form.control}
            name="bondCode"
            rules={{ required: 'Mã trái phiếu là bắt buộc', maxLength: { value: 30, message: 'Tối đa 30 ký tự' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mã trái phiếu</FormLabel>
                <FormControl><Input placeholder="TP25-XXX" {...field} /></FormControl>
                <FormDescription>Bắt buộc, max 30 ký tự.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bondName"
            rules={{ required: 'Tên trái phiếu là bắt buộc' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên trái phiếu</FormLabel>
                <FormControl><Input placeholder="Trái phiếu..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="faceValue"
            rules={{ required: 'Mệnh giá là bắt buộc', min: { value: 1, message: 'Phải > 0' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mệnh giá (VND)</FormLabel>
                <FormControl><Input type="number" placeholder="100000000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2">
            <Button type="submit">Submit</Button>
            <Button type="button" variant="outline" onClick={() => form.reset()}>Reset</Button>
          </div>
        </form>
      </Form>
    </section>
  )
}
