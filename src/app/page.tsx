"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { RepoCard } from "@/components/RepoCard";
import type { Repo, ExplainState } from "@/types";

type Period = "daily" | "weekly" | "monthly" | "favorites";

const PERIOD_LABEL: Record<Exclude<Period, "favorites">, string> = {
  daily: "created:>過去24時間",
  weekly: "created:>過去7日間",
  monthly: "created:>過去30日間",
};

const LANGS = [
  "JavaScript", "TypeScript", "Python", "Rust", "Go", "Ruby", "Dart",
  "Swift", "Kotlin", "Java", "C++", "C#", "PHP", "HTML", "Shell",
];

export default function Page() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const [period, setPeriod] = useState<Period>("daily");
  const [lang, setLang] = useState("");
  const [items, setItems] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [explainMap, setExplainMap] = useState<Record<string, ExplainState>>({});

  const [me, setMe] = useState<{ pro: boolean; stripeEnabled: boolean }>({ pro: false, stripeEnabled: false });
  const [authOpen, setAuthOpen] = useState(false);

  const refreshMe = useCallback(async () => {
    try {
      const r = await fetch("/api/me");
      const d = await r.json();
      setMe({ pro: !!d.pro, stripeEnabled: !!d.stripeEnabled });
    } catch {}
  }, []);

  const loadFavorites = useCallback(async () => {
    if (!isLoggedIn) { setFavSet(new Set()); return; }
    try {
      const r = await fetch("/api/favorites");
      const d = await r.json();
      setFavSet(new Set((d.items as Repo[]).map((i) => i.full_name)));
    } catch {}
  }, [isLoggedIn]);

  const loadRanking = useCallback(async () => {
    if (period === "favorites") {
      setLoading(true);
      setErrorMsg("");
      try {
        const r = await fetch("/api/favorites");
        const d = await r.json();
        const list = (d.items as Repo[]).sort((a, b) => b.stargazers_count - a.stargazers_count);
        setItems(list);
      } catch {
        setErrorMsg("お気に入りの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const r = await fetch(`/api/ranking?period=${period}&lang=${encodeURIComponent(lang)}`);
      if (r.status === 429) { setErrorMsg("rate_limited"); setItems([]); return; }
      if (!r.ok) { setErrorMsg("network"); setItems([]); return; }
      const d = await r.json();
      setItems(d.items || []);
      setUpdatedAt(new Date().toLocaleTimeString("ja-JP"));
    } catch {
      setErrorMsg("network");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [period, lang]);

  useEffect(() => { loadRanking(); }, [loadRanking]);
  useEffect(() => { loadFavorites(); }, [loadFavorites]);
  useEffect(() => { if (isLoggedIn) refreshMe(); else setMe({ pro: false, stripeEnabled: me.stripeEnabled }); }, [isLoggedIn]); // eslint-disable-line

  // 起動時にサーバーのstripeEnabledだけ先に把握しておく(未ログインでもボタン出し分けに使う)
  useEffect(() => { refreshMe(); }, [refreshMe]);

  // Stripe決済から戻ってきた場合の処理
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      refreshMe().then(() => alert("Proプランへの登録が完了しました!AI解説をお楽しみください。"));
      window.history.replaceState(null, "", window.location.pathname);
    } else if (params.get("checkout") === "cancel") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [refreshMe]);

  async function toggleFavorite(repo: Repo) {
    if (!isLoggedIn) { setAuthOpen(true); return; }
    const has = favSet.has(repo.full_name);
    const next = new Set(favSet);
    if (has) next.delete(repo.full_name); else next.add(repo.full_name);
    setFavSet(next);
    try {
      if (has) {
        await fetch("/api/favorites", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: repo.full_name }),
        });
        if (period === "favorites") loadRanking();
      } else {
        await fetch("/api/favorites", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(repo),
        });
      }
    } catch {
      setFavSet(favSet); // ロールバック
    }
  }

  async function startCheckout() {
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST" });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else alert(d.error || "決済ページを開けませんでした。");
    } catch {
      alert("決済ページを開けませんでした。");
    }
  }

  async function openPortal() {
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST" });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else alert(d.error || "購読管理ページを開けませんでした。");
    } catch {
      alert("購読管理ページを開けませんでした。");
    }
  }

  async function explain(repo: Repo) {
    const key = repo.full_name;
    setExplainMap((m) => ({ ...m, [key]: { open: true, loading: false, text: "", error: "", paywall: false } }));

    if (!isLoggedIn) { setAuthOpen(true); setExplainMap((m) => ({ ...m, [key]: { ...m[key], open: false } })); return; }
    if (me.stripeEnabled && !me.pro) {
      setExplainMap((m) => ({ ...m, [key]: { open: true, loading: false, text: "", error: "", paywall: true } }));
      return;
    }

    setExplainMap((m) => ({ ...m, [key]: { open: true, loading: true, text: "", error: "", paywall: false } }));
    try {
      const r = await fetch("/api/explain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      if (r.status === 402) {
        setExplainMap((m) => ({ ...m, [key]: { open: true, loading: false, text: "", error: "", paywall: true } }));
        return;
      }
      const d = await r.json();
      if (!r.ok || !d.text) throw new Error(d.error || "failed");
      setExplainMap((m) => ({ ...m, [key]: { open: true, loading: false, text: d.text, error: "", paywall: false } }));
    } catch {
      setExplainMap((m) => ({
        ...m,
        [key]: { open: true, loading: false, text: "", error: "解説を生成できませんでした。時間をおいて再度お試しください。", paywall: false },
      }));
    }
  }

  function toggleExplainPanel(repo: Repo) {
    const key = repo.full_name;
    const cur = explainMap[key];
    if (cur?.open && (cur.text || cur.error || cur.paywall)) {
      setExplainMap((m) => ({ ...m, [key]: { ...m[key], open: false } }));
      return;
    }
    explain(repo);
  }

  const noteText =
    period === "favorites"
      ? isLoggedIn ? `@${session?.user?.name} のお気に入り` : "お気に入り(ログインが必要です)"
      : PERIOD_LABEL[period] + (lang ? ` language:${lang}` : "");

  const maxStars = Math.max(1, ...items.map((r) => r.stargazers_count || 0));

  return (
    <>
      <header className="wrap">
        <div className="topline">
          <div className="brand">
            <div className="eyebrow">daily / weekly / monthly</div>
            <h1>GitHub <em>Ranking</em></h1>
            <div className="sub">期間内に生まれた注目リポジトリをスター数でライブ集計。AIが日本語で解説します。</div>
          </div>
          <div className="auth">
            {isLoggedIn ? (
              <>
                <span className="whoami">@{session?.user?.name}</span>
                {me.pro && me.stripeEnabled && <span className="pro-badge">PRO</span>}
                {me.stripeEnabled && !me.pro && (
                  <button className="btn primary" onClick={startCheckout}>Pro登録 ¥980/月</button>
                )}
                {me.pro && me.stripeEnabled && (
                  <button className="btn" onClick={openPortal}>購読管理</button>
                )}
                <button className="btn" onClick={() => signOut()}>ログアウト</button>
              </>
            ) : (
              <button className="btn primary" onClick={() => setAuthOpen(true)}>ログイン</button>
            )}
          </div>
        </div>

        <div className="controls">
          <nav className="tabs" role="tablist" aria-label="集計期間">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                className={`tab ${period === p ? "active" : ""}`}
                role="tab"
                aria-selected={period === p}
                onClick={() => setPeriod(p)}
              >
                {p === "daily" ? "今日" : p === "weekly" ? "今週" : "今月"}
                <span className="en">{p === "daily" ? "24h" : p === "weekly" ? "7d" : "30d"}</span>
              </button>
            ))}
            <button
              className={`tab ${period === "favorites" ? "active" : ""}`}
              role="tab"
              aria-selected={period === "favorites"}
              onClick={() => setPeriod("favorites")}
            >
              ★ お気に入り
            </button>
          </nav>
          {period !== "favorites" && (
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="言語で絞り込む">
              <option value="">すべての言語</option>
              {LANGS.map((l) => <option key={l}>{l}</option>)}
            </select>
          )}
        </div>
      </header>

      <main className="wrap">
        <div className="meta">
          <span>{noteText}</span>
          <span>{period !== "favorites" && updatedAt ? `取得: ${updatedAt}` : ""}</span>
        </div>

        {loading && (
          <div className="state"><div className="spinner" aria-hidden="true" />
            {period === "favorites" ? "お気に入りを読み込み中…" : "GitHubから集計中…"}
          </div>
        )}

        {!loading && period === "favorites" && !isLoggedIn && (
          <div className="state">
            <strong>ログインが必要です</strong>
            お気に入りを保存・表示するにはログインしてください。<br /><br />
            <button className="btn primary" onClick={() => setAuthOpen(true)}>ログイン</button>
          </div>
        )}

        {!loading && errorMsg && period !== "favorites" && (
          <div className="state">
            <strong>読み込みエラー</strong>
            {errorMsg === "rate_limited"
              ? "GitHub APIのレート制限に達しました。1分ほど待ってから再試行してください。"
              : "データを取得できませんでした。ネットワーク環境を確認してください。"}
            <br /><br />
            <button className="btn primary" onClick={loadRanking}>再試行</button>
          </div>
        )}

        {!loading && !errorMsg && (period !== "favorites" || isLoggedIn) && items.length === 0 && (
          <div className="state">
            {period === "favorites"
              ? <><strong>お気に入りはまだありません</strong>ランキングの「☆ お気に入り」ボタンで追加できます。</>
              : <><strong>該当するリポジトリが見つかりませんでした</strong>期間や言語を変えて試してください。</>}
          </div>
        )}

        {!loading && (period !== "favorites" || isLoggedIn) && items.length > 0 && (
          <div>
            {items.map((repo, i) => (
              <RepoCard
                key={repo.full_name}
                repo={repo}
                rank={i + 1}
                isTop1={i === 0 && period !== "favorites"}
                maxStars={maxStars}
                isFavorited={favSet.has(repo.full_name)}
                explainState={explainMap[repo.full_name]}
                animDelay={Math.min(i * 30, 450)}
                onToggleFavorite={() => toggleFavorite(repo)}
                onExplain={() => toggleExplainPanel(repo)}
                onUpgrade={startCheckout}
              />
            ))}
          </div>
        )}

        <footer>
          データ: GitHub Search API(各期間に作成されたリポジトリをスター数順に取得)。未認証相当のため連続切替でレート制限がかかることがあります。
          AI解説はClaude APIで生成された参考情報です。
          <br />
          <Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>
          {" ・ "}
          <Link href="/legal/privacy">プライバシーポリシー</Link>
        </footer>
      </main>

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={() => { setAuthOpen(false); refreshMe(); loadFavorites(); }}
        />
      )}
    </>
  );
}
