"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { API_BASE } from "@/lib/api/client";

type Allocation = {
  id: string;
  orderItemId: string;
  poId: string;
  unit: string;
  required: number;
};
type Receipt = {
  id: string;
  receiptRevision: number;
  manifestRevision: number;
  allocationId: string;
  snapshot: { received: number; accepted: number; rejected: number };
};
type Snapshot = {
  orderId: string;
  hubId: string;
  manifest: null | {
    revision: number;
    receiptRevision: number;
    current: boolean;
    allocations: Allocation[];
  };
  receipts: Receipt[];
  receiptPage: { hasMore: boolean; nextAfter: number | null };
};
type Pending = { kind: "receipts" | "confirm"; body: Record<string, unknown> };
const root = (id: string) => `/consolidation/orders/${encodeURIComponent(id)}`;
async function unpack<T>(result: { success: boolean; data?: T }): Promise<T> {
  if (!result.success || result.data === undefined)
    throw Error("UNACKNOWLEDGED");
  return result.data;
}

export default function ReceiverPage() {
  const { user, isLoading } = useAuth(),
    { language } = useLanguage(),
    ar = language === "ar";
  const tr = (en: string, arabic: string) => (ar ? arabic : en);
  const [order, setOrder] = useState(""),
    [hub, setHub] = useState(""),
    [scope, setScope] = useState<{
      order: string;
      hub: string;
      actor: string;
      token: string;
    } | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [eligible, setEligible] = useState<boolean | null>(null),
    [fresh, setFresh] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [canDiscard, setCanDiscard] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [allocation, setAllocation] = useState(""),
    [received, setReceived] = useState(""),
    [accepted, setAccepted] = useState(""),
    [rejected, setRejected] = useState(""),
    [reason, setReason] = useState(""),
    [reviewed, setReviewed] = useState(false);
  const [reconciled, setReconciled] = useState(false);
  const lock = useRef(false);
  function tokenForActor() {
    const token = localStorage.getItem("accessToken");
    if (!token || !user) throw Error("SESSION_CHANGED");
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (payload.userId !== user.id || payload.sub !== user.id)
      throw Error("SESSION_CHANGED");
    return token;
  }
  async function request<T>(
    path: string,
    params?: Record<string, string>,
    body?: unknown,
  ): Promise<{ success: boolean; data?: T }> {
    if (!scope || tokenForActor() !== scope.token)
      throw Error("SESSION_CHANGED");
    const res = await fetch(
      API_BASE + path + (params ? "?" + new URLSearchParams(params) : ""),
      {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + scope.token,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    const json = await res.json();
    if (tokenForActor() !== scope.token) throw Error("SESSION_CHANGED");
    if (!res.ok)
      throw Object.assign(Error(json.message || "Request failed"), {
        status: res.status,
        code: json.error || json.code || "REQUEST_ERROR",
      });
    return json;
  }
  const enabled =
    process.env.NEXT_PUBLIC_CONSOLIDATION_RECEIPTS_ENABLED === "true";
  const storageKey =
    scope && user
      ? `consolidation-retry-v1:${user.id}:${scope.order}:${scope.hub}`
      : null;
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        if (
          ["receipts", "confirm"].includes(p.kind) &&
          p.body &&
          typeof p.body === "object"
        ) {
          setPending(p);
          setMessage(
            tr(
              "Unresolved request restored. Retry sends the exact saved facts.",
              "تم استرجاع طلب غير محسوم. إعادة المحاولة ترسل نفس البيانات المحفوظة.",
            ),
          );
        } else {
          setStorageBlocked(true);
          setMessage(
            tr(
              "Saved retry is invalid. Do not submit.",
              "بيانات المحاولة المحفوظة غير صالحة. لا ترسل.",
            ),
          );
        }
      }
    } catch {
      setStorageBlocked(true);
      setMessage(
        tr(
          "Retry storage unavailable. Do not submit until storage works.",
          "حفظ المحاولة غير متاح. لا ترسل قبل إصلاح التخزين.",
        ),
      );
    }
  }, [storageKey]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  function save(p: Pending | null) {
    if (!storageKey) throw Error("No scope");
    if (p) sessionStorage.setItem(storageKey, JSON.stringify(p));
    else sessionStorage.removeItem(storageKey);
    setPending(p);
  }
  async function renewSession() {
    if (!scope || scope.actor !== user?.id || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFresh(false);
    setEligible(null);
    setReconciled(false);
    setReviewed(false);
    try {
      const token = tokenForActor();
      const response = await fetch(
        API_BASE +
          root(scope.order) +
          "?" +
          new URLSearchParams({ hubId: scope.hub }),
        { headers: { Authorization: "Bearer " + token } },
      );
      const result = await response.json();
      if (
        !response.ok ||
        !result.success ||
        !result.data ||
        tokenForActor() !== token
      )
        throw Error("SESSION_NOT_VERIFIED");
      setScope({ ...scope, token });
      setMessage(
        tr(
          "Renewed same-actor session verified. Saved request is unchanged and was not sent. Refresh and reconcile, or explicitly retry the saved request.",
          "تم التحقق من الجلسة المجددة لنفس المستخدم. الطلب المحفوظ لم يتغير ولم يُرسل. حدّث وراجع أو أعد نفس الطلب صراحةً.",
        ),
      );
    } catch {
      setMessage(
        tr(
          "Could not verify a renewed same-actor session. Sign in again as the original receiver in another tab, then try this check. Saved request retained.",
          "تعذر التحقق من جلسة مجددة لنفس المستخدم. سجّل الدخول بنفس حساب الاستلام في تبويب آخر ثم أعد الفحص. الطلب المحفوظ باقٍ.",
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function refresh() {
    if (!scope || scope.actor !== user?.id || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFresh(false);
    setEligible(null);
    setReviewed(false);
    setReconciled(false);
    try {
      const data = await unpack(
        await request<Snapshot>(root(scope.order), { hubId: scope.hub }),
      );
      setSnapshot(data);
      setFresh(true);
      setCanDiscard(true);
      if (data.manifest?.current) {
        try {
          const e = await unpack(
            await request<{
              eligible: boolean;
              manifestRevision: number;
              receiptRevision: number;
            }>(root(scope.order) + "/eligibility"),
          );
          if (
            e.manifestRevision === data.manifest.revision &&
            e.receiptRevision === data.manifest.receiptRevision
          )
            setEligible(e.eligible);
          else {
            setFresh(false);
            setMessage(
              tr(
                "Revisions changed during refresh. Refresh again.",
                "تغيرت النسخة أثناء التحديث. حدّث مرة أخرى.",
              ),
            );
          }
        } catch {
          setEligible(null);
          setFresh(false);
          setMessage(
            tr(
              "Eligibility check failed. Refresh before recording or confirming.",
              "فشل فحص الأهلية. حدّث قبل التسجيل أو التأكيد.",
            ),
          );
        }
      }
    } catch {
      setMessage(
        tr(
          "Refresh failed. Previously shown facts are not current. Check access and refresh manually.",
          "فشل التحديث. البيانات المعروضة سابقاً ليست حالية. تحقق من الصلاحية وحدّث يدوياً.",
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function send(p: Pending) {
    try {
      if (!scope || tokenForActor() !== scope.token)
        throw Error("SESSION_CHANGED");
    } catch {
      setFresh(false);
      setMessage(
        tr(
          "Session identity changed. Nothing sent. Reload and reconcile.",
          "تغيرت هوية الجلسة. لم يُرسل شيء. أعد التحميل وراجع السجل.",
        ),
      );
      return;
    }
    if (!scope || scope.actor !== user?.id || lock.current || storageBlocked)
      return;
    lock.current = true;
    setBusy(true);
    setFresh(false);
    setEligible(null);
    setCanDiscard(false);
    setReviewed(false);
    setReconciled(false);
    try {
      save(p);
    } catch {
      setMessage(
        tr(
          "Could not save retry identity. Nothing sent.",
          "تعذر حفظ هوية المحاولة. لم يتم الإرسال.",
        ),
      );
      lock.current = false;
      setBusy(false);
      return;
    }
    try {
      await unpack(
        await request(root(scope.order) + "/" + p.kind, undefined, p.body),
      );
      save(null);
      setMessage(
        tr(
          "Server acknowledged this request. Refresh manually to review current facts. No shipment was created.",
          "أكد الخادم هذا الطلب. حدّث يدوياً لمراجعة البيانات الحالية. لم تُنشأ شحنة.",
        ),
      );
    } catch (e) {
      setMessage(
        (e as { status?: number }).status === 401
          ? tr(
              "Session expired or refused. Saved request retained. Sign in as the same receiver in another tab, then use the renewed-session check. Nothing is replayed automatically.",
              "الجلسة منتهية أو مرفوضة. الطلب محفوظ. سجّل الدخول بنفس المستخدم في تبويب آخر ثم افحص الجلسة المجددة. لا إعادة تلقائية.",
            )
          : (e as { status?: number }).status === 409
            ? tr(
                "Conflict: nothing is assumed saved. Keep the request, refresh, then reconcile before retrying or clearing it.",
                "تعارض: لا نفترض حفظ البيانات. احتفظ بالطلب وحدّث ثم راجع قبل إعادة المحاولة أو مسحه.",
              )
            : tr(
                "Outcome uncertain or refused. Saved request retained. Retry uses the same identity and facts.",
                "النتيجة غير مؤكدة أو مرفوضة. تم الاحتفاظ بالطلب. إعادة المحاولة تستخدم نفس الهوية والبيانات.",
              ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function more() {
    if (
      !scope ||
      scope.actor !== user?.id ||
      !snapshot?.receiptPage.hasMore ||
      lock.current
    )
      return;
    lock.current = true;
    setBusy(true);
    try {
      const next = await unpack(
        await request<Snapshot>(root(scope.order), {
          hubId: scope.hub,
          after: String(snapshot.receiptPage.nextAfter),
        }),
      );
      if (
        !next.manifest?.current ||
        next.manifest.revision !== snapshot.manifest?.revision ||
        next.manifest.receiptRevision !== snapshot.manifest.receiptRevision
      ) {
        setFresh(false);
        setEligible(null);
        setMessage(
          tr("History changed. Refresh manually.", "تغير السجل. حدّث يدوياً."),
        );
        return;
      }
      setSnapshot({
        ...next,
        receipts: [...snapshot.receipts, ...next.receipts],
      });
    } catch {
      setMessage(
        tr(
          "History page failed. No entries were added.",
          "فشل تحميل صفحة السجل. لم تتم إضافة سجلات.",
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const current =
      !storageBlocked &&
      reconciled &&
      fresh &&
      snapshot?.manifest?.current === true,
    m = snapshot?.manifest;
  const complete =
    !!m &&
    m.allocations.length > 0 &&
    !snapshot?.receiptPage.hasMore &&
    m.allocations.every((a) => {
      const r = snapshot?.receipts
        .filter(
          (e) => e.manifestRevision === m.revision && e.allocationId === a.id,
        )
        .at(-1)?.snapshot;
      return (
        r &&
        r.received === a.required &&
        r.accepted === a.required &&
        r.rejected === 0
      );
    });
  const validCounts =
    [received, accepted, rejected].every(
      (v) => /^(0|[1-9][0-9]*)$/.test(v) && Number(v) <= 2147483647,
    ) && Number(accepted) + Number(rejected) <= Number(received);
  const field =
    "w-full min-w-0 rounded-lg border border-slate-300 bg-white p-3 text-slate-950";
  if (!enabled)
    return (
      <section className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">
          {tr("Receiving review is disabled", "مراجعة الاستلام غير مفعّلة")}
        </h1>
        <p>
          {tr(
            "No receiving requests are available here.",
            "طلبات الاستلام غير متاحة هنا.",
          )}
        </p>
      </section>
    );
  if (isLoading)
    return (
      <p className="p-6">{tr("Loading session…", "جارٍ تحميل الجلسة…")}</p>
    );
  if (scope && scope.actor !== user?.id)
    return (
      <p className="p-6">
        {tr(
          "Session identity changed. Reload this page before continuing.",
          "تغيرت هوية الجلسة. أعد تحميل الصفحة قبل المتابعة.",
        )}
      </p>
    );
  if (!user)
    return (
      <p className="p-6">
        {tr(
          "Sign in to request receiver access.",
          "سجّل الدخول لاستخدام صلاحية الاستلام.",
        )}
      </p>
    );
  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-slate-900"
      data-testid="receiver-review"
    >
      <header>
        <p className="text-sm font-semibold text-slate-600">
          PackagePro · {tr("Team receiving", "استلام الفريق")}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {tr("Receive & review parts", "استلام الأجزاء ومراجعتها")}
        </h1>
        <p className="mt-3 text-slate-600">
          {tr(
            "Manual refresh only. This page does not book, release or ship an order.",
            "التحديث يدوي فقط. هذه الصفحة لا تحجز أو تُخرج أو تشحن الطلب.",
          )}
        </p>
      </header>
      {!scope && message && <p role="status">{message}</p>}
      {!scope ? (
        <form
          className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              if (order.trim() && hub.trim())
                setScope({
                  order: order.trim(),
                  hub: hub.trim(),
                  actor: user.id,
                  token: tokenForActor(),
                });
            } catch {
              setMessage(
                tr(
                  "Session identity mismatch. Sign in again.",
                  "هوية الجلسة غير متطابقة. سجّل الدخول مجدداً.",
                ),
              );
            }
          }}
        >
          <label>
            {tr("Order ID", "معرّف الطلب")}
            <input
              className={field}
              required
              maxLength={128}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            />
          </label>
          <label>
            {tr("Hub ID", "معرّف التجميع")}
            <input
              className={field}
              required
              maxLength={128}
              value={hub}
              onChange={(e) => setHub(e.target.value)}
            />
          </label>
          <button className="rounded-lg bg-slate-900 p-3 text-white sm:col-span-2">
            {tr("Open receiver workspace", "فتح مساحة الاستلام")}
          </button>
        </form>
      ) : (
        <>
          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="break-all">
              {tr("Order", "الطلب")}: {scope.order} · {tr("Hub", "التجميع")}:{" "}
              {scope.hub}
            </p>
            <button
              className="mt-3 rounded-lg border bg-white px-4 py-2 disabled:opacity-40"
              disabled={busy}
              onClick={refresh}
            >
              {tr("Refresh current facts", "تحديث البيانات الحالية")}
            </button>
          </div>
          <button
            disabled={busy}
            className="rounded-lg border px-4 py-2"
            onClick={renewSession}
          >
            {tr(
              "Check renewed same-actor session",
              "فحص الجلسة المجددة لنفس المستخدم",
            )}
          </button>
          {message && (
            <p
              role="status"
              className="rounded-lg border border-amber-300 bg-amber-50 p-4"
            >
              {message}
            </p>
          )}
          {pending && (
            <div className="space-y-3 rounded-xl border-2 border-amber-500 p-4">
              <h2 className="font-bold">
                {tr("Saved unresolved request", "طلب محفوظ غير محسوم")}
              </h2>
              <p>
                {tr(
                  "Edits are locked. This request stays in this browser tab session. Do not submit from another tab.",
                  "التعديل مقفول. يبقى الطلب في جلسة هذا التبويب. لا ترسل من تبويب آخر.",
                )}
              </p>
              <button
                disabled={busy}
                className="rounded-lg bg-amber-900 p-3 text-white"
                onClick={() => send(pending)}
              >
                {tr("Retry exact saved request", "إعادة نفس الطلب المحفوظ")}
              </button>
              <details className="break-all">
                <summary>
                  {tr("Saved request facts", "بيانات الطلب المحفوظ")}
                </summary>
                <pre dir="ltr" className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(
                    { kind: pending.kind, ...pending.body },
                    null,
                    2,
                  )}
                </pre>
              </details>
              {canDiscard && (
                <button
                  disabled={busy}
                  className="block rounded-lg border p-3"
                  onClick={() => {
                    if (
                      window.confirm(
                        tr(
                          "Clear this local retry only after checking the refreshed ledger. This does not undo any saved server event.",
                          "امسح المحاولة المحلية فقط بعد مراجعة السجل المحدّث. هذا لا يلغي أي حدث محفوظ بالخادم.",
                        ),
                      )
                    ) {
                      try {
                        save(null);
                        setMessage(
                          tr(
                            "Local retry cleared, no server event undone.",
                            "تم مسح المحاولة المحلية، دون إلغاء أي حدث بالخادم.",
                          ),
                        );
                      } catch {}
                    }
                  }}
                >
                  {tr(
                    "Clear retry after reconciliation",
                    "مسح المحاولة بعد المراجعة",
                  )}
                </button>
              )}
            </div>
          )}
          {snapshot && (
            <>
              <div className="rounded-xl border p-5">
                <h2 className="text-xl font-bold">
                  {tr("Manifest snapshot", "نسخة التجميع")}
                </h2>
                <p className="mt-2">
                  {!fresh
                    ? tr(
                        "Not current. Refresh required.",
                        "ليست حالية. يلزم التحديث.",
                      )
                    : !m
                      ? tr(
                          "No manifest. An authorized planner must prepare it.",
                          "لا توجد خطة تجميع. يلزم إعدادها بواسطة مخطط مخوّل.",
                        )
                      : !m.current
                        ? tr(
                            "Source changed. Replanning required. Receiving and confirmation blocked.",
                            "تغير المصدر. يلزم إعادة التخطيط. الاستلام والتأكيد متوقفان.",
                          )
                        : tr(
                            "Current at last manual read.",
                            "حالية وقت آخر قراءة يدوية.",
                          )}
                </p>
                {m && (
                  <p className="mt-2">
                    {tr("Manifest / receipt revision", "نسخة الخطة / الاستلام")}
                    : {m.revision} / {m.receiptRevision}
                  </p>
                )}
                {m && (
                  <ul className="mt-3 space-y-2">
                    {m.allocations.map((a) => (
                      <li key={a.id} className="break-all rounded border p-2">
                        {a.id} · {tr("Item", "البند")}: {a.orderItemId} · PO:{" "}
                        {a.poId} · {tr("Required", "المطلوب")}: {a.required}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 font-medium">
                  {current && eligible === true
                    ? tr(
                        "Team confirmation observed. Not a shipping reservation.",
                        "تم رصد تأكيد الفريق. هذا ليس حجزاً للشحن.",
                      )
                    : tr(
                        "No current eligibility claim.",
                        "لا يوجد إثبات حالي لإمكانية الخروج.",
                      )}
                </p>
              </div>
              <label className="flex gap-3 rounded-xl border p-4">
                <input
                  type="checkbox"
                  checked={reconciled}
                  disabled={
                    !fresh ||
                    !m?.current ||
                    snapshot.receiptPage.hasMore ||
                    busy ||
                    !!pending
                  }
                  onChange={(e) => setReconciled(e.target.checked)}
                />
                <span>
                  {tr(
                    "I reconciled the refreshed ledger with physical cumulative totals, including any earlier uncertain attempt.",
                    "طابقت السجل المحدّث مع الإجماليات الفعلية، بما فيها أي محاولة سابقة غير محسومة.",
                  )}
                </span>
              </label>
              <form
                className="space-y-4 rounded-xl border p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    current &&
                    m &&
                    !pending &&
                    validCounts &&
                    reason.trim() &&
                    allocation
                  )
                    send({
                      kind: "receipts",
                      body: {
                        manifestRevision: m.revision,
                        receiptRevision: m.receiptRevision,
                        allocationId: allocation,
                        eventKey: crypto.randomUUID(),
                        counts: {
                          received: Number(received),
                          accepted: Number(accepted),
                          rejected: Number(rejected),
                        },
                        reason: reason.trim(),
                      },
                    });
                }}
              >
                <h2 className="text-xl font-bold">
                  {tr("Record cumulative counts", "تسجيل الأعداد التراكمية")}
                </h2>
                <p>
                  {tr(
                    "Enter the complete current totals for this allocation, not the quantity in this delivery. A correction replaces its reviewed totals.",
                    "أدخل الإجمالي الحالي لهذا الجزء، وليس كمية هذه الدفعة. التصحيح يستبدل إجماليات مراجعته.",
                  )}
                </p>
                <fieldset
                  disabled={!current || busy || !!pending}
                  className="space-y-4 disabled:opacity-60"
                >
                  <label className="block">
                    {tr("Allocation", "الجزء")}
                    <select
                      aria-label={tr("Allocation", "الجزء")}
                      className={field}
                      required
                      value={allocation}
                      onChange={(e) => setAllocation(e.target.value)}
                    >
                      <option value="">
                        {tr("Choose allocation", "اختر الجزء")}
                      </option>
                      {m?.allocations.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.id} · {tr("Required", "المطلوب")} {a.required}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      [tr("Received", "المستلم"), received, setReceived],
                      [tr("Accepted", "المقبول"), accepted, setAccepted],
                      [tr("Rejected", "المرفوض"), rejected, setRejected],
                    ].map(([label, value, setter]) => (
                      <label key={String(label)}>
                        {String(label)}
                        <input
                          className={field}
                          inputMode="numeric"
                          value={String(value)}
                          onChange={(e) =>
                            (setter as (v: string) => void)(e.target.value)
                          }
                          required
                        />
                      </label>
                    ))}
                  </div>
                  <label className="block">
                    {tr("Review / correction reason", "سبب المراجعة / التصحيح")}
                    <textarea
                      aria-label={tr(
                        "Review / correction reason",
                        "سبب المراجعة / التصحيح",
                      )}
                      className={field}
                      maxLength={1000}
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={!validCounts || !reason.trim() || !allocation}
                    className="rounded-lg bg-slate-900 p-3 text-white disabled:opacity-40"
                  >
                    {tr("Save receipt review", "حفظ مراجعة الاستلام")}
                  </button>
                </fieldset>
              </form>
              <div className="space-y-3 rounded-xl border p-5">
                <h2 className="text-xl font-bold">
                  {tr("Explicit team confirmation", "تأكيد الفريق الصريح")}
                </h2>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={reviewed}
                    disabled={!current || !complete || busy || !!pending}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  <span>
                    {tr(
                      "I reviewed every allocation and its accepted totals at these revisions. The server will recheck all parts.",
                      "راجعت كل الأجزاء والأعداد المقبولة لهذه النسخ. سيعيد الخادم فحص جميع الأجزاء.",
                    )}
                  </span>
                </label>
                <button
                  disabled={
                    !current || !complete || !reviewed || busy || !!pending
                  }
                  className="rounded-lg border border-slate-900 p-3 disabled:opacity-40"
                  onClick={() =>
                    m &&
                    send({
                      kind: "confirm",
                      body: {
                        manifestRevision: m.revision,
                        receiptRevision: m.receiptRevision,
                      },
                    })
                  }
                >
                  {tr("Confirm reviewed parts", "تأكيد مراجعة الأجزاء")}
                </button>
              </div>
              <div className="space-y-3 rounded-xl border p-5">
                <h2 className="text-xl font-bold">
                  {tr("Receipt history", "سجل الاستلام")}
                </h2>
                {snapshot.receipts.length === 0 ? (
                  <p>
                    {tr(
                      "No receipt rows on this page.",
                      "لا توجد سجلات في هذه الصفحة.",
                    )}
                  </p>
                ) : (
                  snapshot.receipts.map((r) => (
                    <article
                      key={r.id}
                      className="break-words rounded-lg bg-slate-50 p-3"
                    >
                      <p>
                        {r.allocationId} · {tr("Revision", "النسخة")}{" "}
                        {r.receiptRevision}
                      </p>
                      <p>
                        {tr(
                          "Received / accepted / rejected",
                          "المستلم / المقبول / المرفوض",
                        )}
                        : {r.snapshot.received} / {r.snapshot.accepted} /{" "}
                        {r.snapshot.rejected}
                      </p>
                    </article>
                  ))
                )}
                {snapshot.receiptPage.hasMore && (
                  <button
                    disabled={busy || !fresh}
                    className="rounded-lg border p-3"
                    onClick={more}
                  >
                    {tr("Load remaining history", "تحميل بقية السجل")}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
