import { toast } from "sonner";

/* ══════════════════════════════════════════════════════
   Custom PLN-branded Toast Notifications
   ──────────────────────────────────────────────────────
   Warna utama:
   • Primary   : #125d72
   • Secondary  : #14a2ba
   • Light      : #e7f6f9
   • Accent     : #efe62f
   • Neutral    : #d9d9d9
   ══════════════════════════════════════════════════════ */

const LOGO_SRC = "/Logo_PLN.svg.png";

/**
 * Custom description component rendered as a React element
 * with PLN logo and message text.
 */
function createToastContent(message: string) {
    return {
        __html: `
            <div style="display:flex;align-items:center;gap:10px;">
                <img src="${LOGO_SRC}" alt="PLN" style="width:28px;height:28px;object-fit:contain;flex-shrink:0;" />
                <span style="font-size:13px;line-height:1.4;">${message}</span>
            </div>
        `,
    };
}

/** Base style for all toasts */
const baseStyle: React.CSSProperties = {
    borderRadius: "12px",
    padding: "14px 16px",
    boxShadow: "0 8px 32px rgba(18,93,114,0.18), 0 2px 8px rgba(0,0,0,0.08)",
    fontFamily: "var(--font-geist-sans), sans-serif",
    border: "1px solid",
};

/** Style variants per toast type */
const styles = {
    success: {
        ...baseStyle,
        background: "linear-gradient(135deg, #125d72 0%, #14a2ba 100%)",
        color: "#e7f6f9",
        borderColor: "rgba(20,162,186,0.3)",
    } as React.CSSProperties,
    error: {
        ...baseStyle,
        background: "linear-gradient(135deg, #125d72 0%, #0e4a5b 100%)",
        color: "#e7f6f9",
        borderColor: "rgba(239,230,47,0.3)",
    } as React.CSSProperties,
    info: {
        ...baseStyle,
        background: "linear-gradient(135deg, #14a2ba 0%, #125d72 100%)",
        color: "#e7f6f9",
        borderColor: "rgba(20,162,186,0.3)",
    } as React.CSSProperties,
    warning: {
        ...baseStyle,
        background: "linear-gradient(135deg, #125d72 0%, #14a2ba 100%)",
        color: "#efe62f",
        borderColor: "rgba(239,230,47,0.4)",
    } as React.CSSProperties,
};

/* ══════════════════════════════════════════════════════
   Public API — drop-in replacement for `toast.success` etc.
   ══════════════════════════════════════════════════════ */

export function showToast(
    type: "success" | "error" | "info" | "warning",
    message: string,
) {
    const content = createToastContent(message);

    toast.custom(
        () => (
            <div
                style={styles[type]}
                dangerouslySetInnerHTML={content}
            />
        ),
        {
            duration: 4000,
            position: "bottom-right",
        },
    );
}

/** Shorthand helpers */
showToast.success = (message: string) => showToast("success", message);
showToast.error = (message: string) => showToast("error", message);
showToast.info = (message: string) => showToast("info", message);
showToast.warning = (message: string) => showToast("warning", message);
