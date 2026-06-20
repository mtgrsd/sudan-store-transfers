import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import TransferReceipt from "@/components/TransferReceipt";
import {
  ArrowRight, XCircle, Printer, MessageCircle, Copy, CheckCircle2,
  Paperclip, Upload, ScrollText, Phone, Globe, Calendar, Building2,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  pending_deposit: "بانتظار الإيداع",
  received: "مستلم",
  cancelled: "ملغى",
  expired: "منتهي الصلاحية",
  draft: "مسودة",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_deposit: "secondary",
  received: "default",
  cancelled: "destructive",
  expired: "outline",
  draft: "outline",
};

const auditActionLabels: Record<string, string> = {
  create: "إنشاء الإيصال",
  confirm_deposit: "تأكيد استلام الإيداع",
  confirm_received: "تأكيد الاستلام (رمز سري)",
  cancel: "إلغاء الإيصال",
  add_attachment: "إضافة مرفق",
  update: "تعديل",
};

export default function AdminTransferDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const receiptId = parseInt(params.id || "0");

  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showPrint, setShowPrint] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const utils = trpc.useUtils();
  const { data: receipt, isLoading } = trpc.receipt.getById.useQuery(
    { id: receiptId }, { enabled: !!user && receiptId > 0 }
  );

  const confirmPinMutation = trpc.receipt.confirmWithPin.useMutation({
    onSuccess: () => {
      toast.success("تم تأكيد الاستلام بالرقم السري بنجاح");
      utils.receipt.getById.invalidate({ id: receiptId });
      setShowConfirmPin(false);
      setPinInput("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cancelMutation = trpc.receipt.cancel.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الإيصال");
      utils.receipt.getById.invalidate({ id: receiptId });
      setShowCancel(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const confirmMutation = trpc.receipt.confirmDeposit.useMutation({
    onSuccess: () => {
      toast.success("تم تأكيد استلام الإيداع وتحديث رصيد المكتب");
      utils.receipt.getById.invalidate({ id: receiptId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const attachMutation = trpc.receipt.addAttachment.useMutation({
    onSuccess: () => {
      toast.success("تم رفع المرفق بنجاح");
      utils.receipt.getById.invalidate({ id: receiptId });
      setUploadFile(null);
    },
    onError: (err: any) => toast.error("فشل رفع المرفق: " + err.message),
  });

  if (!user) return null;

  const verifyUrl = receipt ? `${window.location.origin}/verify/${receipt.notificationNumber}` : "";

  const copyVerifyLink = () => {
    navigator.clipboard.writeText(verifyUrl).then(() => toast.success("تم نسخ رابط التحقق"));
  };

  const shareWhatsApp = () => {
    if (!receipt) return;
    const text = encodeURIComponent(
      `مرحباً ${receipt.payerName}،\nإيصالك جاهز.\nرقم الإشعار: ${receipt.notificationNumber}\nالمبلغ: ${receipt.amount} ${receipt.currencyCode}\nللتحقق: ${verifyUrl}`
    );
    const phone = receipt.payerPhone ? receipt.payerPhone.replace(/[^\d]/g, "") : "";
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const handleUpload = () => {
    if (!uploadFile || !receipt) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      attachMutation.mutate({
        receiptId: receipt.id,
        fileBase64: base64,
        fileName: uploadFile.name,
        mimeType: uploadFile.type || "application/octet-stream",
      });
    };
    reader.readAsDataURL(uploadFile);
  };

  return (
    <AdminLayout title="تفاصيل الإيصال">
      <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/transfers")} className="-mr-2">
        <ArrowRight className="w-4 h-4 ml-1" />
        رجوع إلى قائمة الإيصالات
      </Button>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : !receipt ? (
        <Card><CardContent className="py-16 text-center text-slate-400">لم يتم العثور على الإيصال</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="font-mono text-lg">{receipt.notificationNumber}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    تم الإنشاء {new Date(receipt.createdAt).toLocaleString("ar-SA")}
                  </p>
                </div>
                <Badge variant={statusVariants[receipt.status] ?? "outline"} className="text-sm">
                  {statusLabels[receipt.status] ?? receipt.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="amount-display">
                  <div className="amount-display-label">المبلغ</div>
                  <div className="amount-display-value">{parseFloat(receipt.amount).toLocaleString("ar-SA")}</div>
                  <div className="amount-display-currency">{receipt.currencyCode}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="اسم الدافع" value={receipt.payerName} />
                  {receipt.payerPhone && <InfoRow icon={<Phone className="w-4 h-4" />} label="رقم الهاتف" value={receipt.payerPhone} mono />}
                  {receipt.payerCountry && <InfoRow icon={<Globe className="w-4 h-4" />} label="الدولة" value={receipt.payerCountry} />}
                  <InfoRow icon={<Building2 className="w-4 h-4" />} label="المكتب" value={(receipt as any).office?.name ?? "—"} />
                  <InfoRow icon={<Calendar className="w-4 h-4" />} label="صلاحية حتى" value={receipt.expiresAt ? new Date(receipt.expiresAt).toLocaleDateString("ar-SA") : "—"} />
                  {receipt.receivedAt && <InfoRow icon={<CheckCircle2 className="w-4 h-4" />} label="تاريخ الاستلام" value={new Date(receipt.receivedAt).toLocaleString("ar-SA")} />}
                </div>

                {/* بيانات المستفيد */}
                {((receipt as any).beneficiaryName || (receipt as any).beneficiaryPhone) && (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 mt-2">
                    <p className="text-xs font-semibold text-green-800 mb-2">بيانات المستفيد</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {(receipt as any).beneficiaryName && <InfoRow label="الاسم" value={(receipt as any).beneficiaryName} />}
                      {(receipt as any).beneficiaryPhone && <InfoRow label="الهاتف" value={(receipt as any).beneficiaryPhone} mono />}
                      {(receipt as any).beneficiaryId && <InfoRow label="رقم الهوية" value={(receipt as any).beneficiaryId} mono />}
                    </div>
                  </div>
                )}

                {receipt.notes && (
                  <div className="bg-slate-50 border rounded-lg p-3 text-sm text-slate-700">
                    <span className="font-semibold">ملاحظات: </span>{receipt.notes}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {receipt.status === "pending_deposit" && (
                    <>
                      <Button size="sm" onClick={() => confirmMutation.mutate({ receiptId: receipt.id })} disabled={confirmMutation.isPending}>
                        <CheckCircle2 className="w-4 h-4 ml-1" />
                        {confirmMutation.isPending ? "جاري التأكيد..." : "تأكيد استلام الإيداع"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowConfirmPin(true)}>
                        🔐 تأكيد بالرقم السري
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setShowCancel(true)}>
                        <XCircle className="w-4 h-4 ml-1" />
                        إلغاء الإيصال
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setShowPrint(true)}>
                    <Printer className="w-4 h-4 ml-1" />
                    طباعة / PDF
                  </Button>
                  {receipt.payerPhone && (
                    <Button size="sm" variant="outline" onClick={shareWhatsApp}>
                      <MessageCircle className="w-4 h-4 ml-1" />
                      مشاركة واتساب
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  المرفقات ({receipt.attachments?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {receipt.attachments?.length ? (
                  <ul className="space-y-2">
                    {receipt.attachments.map((a: any) => (
                      <li key={a.id} className="flex items-center justify-between text-sm border rounded-lg p-2">
                        <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline truncate">
                          {a.fileName || a.fileKey}
                        </a>
                        <span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString("ar-SA")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">لا توجد مرفقات بعد</p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="text-sm flex-1"
                  />
                  <Button size="sm" variant="outline" disabled={!uploadFile || attachMutation.isPending} onClick={handleUpload}>
                    <Upload className="w-4 h-4 ml-1" />
                    {attachMutation.isPending ? "جاري الرفع..." : "رفع"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Audit trail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ScrollText className="w-4 h-4" />
                  سجل العمليات على هذا الإيصال
                </CardTitle>
              </CardHeader>
              <CardContent>
                {receipt.auditLogs?.length ? (
                  <ul className="space-y-3">
                    {receipt.auditLogs.map((log: any) => (
                      <li key={log.id} className="flex gap-3 text-sm border-r-2 border-blue-200 pr-3">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">
                            {auditActionLabels[log.action] ?? log.action}
                            {log.actorName && <span className="text-slate-500 font-normal"> — {log.actorName}</span>}
                          </p>
                          {log.notes && <p className="text-slate-500 text-xs mt-0.5">{log.notes}</p>}
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("ar-SA")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">لا توجد عمليات مسجلة</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* QR / verification */}
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-base">رمز التحقق QR</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <div className="border-2 border-blue-100 rounded-xl p-3 bg-white">
                  <QRCodeSVG value={verifyUrl} size={170} level="M" />
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={copyVerifyLink}>
                  <Copy className="w-4 h-4 ml-1" />
                  نسخ رابط التحقق
                </Button>
                <p className="text-xs text-slate-400 text-center break-all" dir="ltr">{verifyUrl}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">أكواد سرية</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="كود التحقق" value={receipt.verificationCode} mono highlight />
                <InfoRow label="الرقم السري" value={receipt.secretPin} mono highlight />
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                  ⚠️ شارك هذه الأكواد مع المستلم بشكل آمن فقط.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Confirm with PIN dialog */}
      <Dialog open={showConfirmPin} onOpenChange={(v) => { setShowConfirmPin(v); if (!v) setPinInput(""); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>🔐 تأكيد بالرقم السري</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              اطلب من المستفيد الرقم السري الموجود على إيصاله الورقي للتأكيد.
            </p>
            <div>
              <Label>الرقم السري</Label>
              <Input
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="أدخل الرقم السري المكون من 4 أرقام"
                type="text"
                maxLength={8}
                dir="ltr"
                className="text-center text-xl font-mono tracking-widest"
                onKeyDown={(e) => e.key === "Enter" && receipt && confirmPinMutation.mutate({ receiptId: receipt.id, secretPin: pinInput })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowConfirmPin(false); setPinInput(""); }}>إلغاء</Button>
              <Button
                disabled={pinInput.length < 4 || confirmPinMutation.isPending}
                onClick={() => receipt && confirmPinMutation.mutate({ receiptId: receipt.id, secretPin: pinInput })}
              >
                {confirmPinMutation.isPending ? "جاري التحقق..." : "تأكيد"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إلغاء الإيصال</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">هل أنت متأكد من إلغاء هذا الإيصال؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div>
              <Label>سبب الإلغاء</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCancel(false)}>تراجع</Button>
              <Button variant="destructive" disabled={cancelMutation.isPending}
                onClick={() => receipt && cancelMutation.mutate({ receiptId: receipt.id, cancelReason: cancelReason || undefined })}>
                {cancelMutation.isPending ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print dialog */}
      {receipt && (
        <Dialog open={showPrint} onOpenChange={setShowPrint}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <TransferReceipt
              transfer={{
                notificationNumber: receipt.notificationNumber,
                secretCode: receipt.verificationCode,
                amount: receipt.amount,
                currencyCode: receipt.currencyCode,
                status: receipt.status,
                notes: receipt.notes,
                createdAt: receipt.createdAt,
                senderName: receipt.payerName,
                agentName: (receipt as any).office?.name,
                beneficiaryName: (receipt as any).beneficiaryName,
                beneficiaryPhone: (receipt as any).beneficiaryPhone,
                beneficiaryId: (receipt as any).beneficiaryId,
              }}
              onClose={() => setShowPrint(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}

function InfoRow({ icon, label, value, mono, highlight }: { icon?: React.ReactNode; label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-slate-500 flex items-center gap-1.5">{icon}{label}</span>
      <span className={`font-semibold ${mono ? "font-mono tracking-wider" : ""} ${highlight ? "text-blue-800" : "text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}
