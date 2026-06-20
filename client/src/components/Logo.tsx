import { useState } from "react";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

export default function Logo({ className = "h-10 w-auto", iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // بديل نصي/أيقوني عند تعذر تحميل الشعار (مثلاً تخزين Manus غير مُهيّأ على بيئة النشر)
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-white/15 font-extrabold text-white ${className}`}
        style={{ aspectRatio: "1 / 1", minWidth: "2.25rem" }}
      >
        {iconOnly ? "🏦" : "متجر السودان"}
      </div>
    );
  }

  return (
    <img
      src={LOGO_URL}
      alt="متجر السودان"
      className={className}
      style={{ objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}
