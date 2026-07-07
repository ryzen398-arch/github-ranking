"use client";
import type { Repo, ExplainState } from "@/types";

const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));

export function RepoCard({
  repo,
  rank,
  isTop1,
  maxStars,
  isFavorited,
  explainState,
  animDelay,
  onToggleFavorite,
  onExplain,
  onUpgrade,
}: {
  repo: Repo;
  rank: number;
  isTop1: boolean;
  maxStars: number;
  isFavorited: boolean;
  explainState?: ExplainState;
  animDelay: number;
  onToggleFavorite: () => void;
  onExplain: () => void;
  onUpgrade: () => void;
}) {
  const pct = Math.max(3, Math.round((repo.stargazers_count / Math.max(maxStars, 1)) * 100));
  const showPanel = !!explainState && (explainState.open || explainState.loading || explainState.paywall);

  return (
    <article className={`card ${isTop1 ? "top1" : ""}`} style={{ animationDelay: `${animDelay}ms` }}>
      <div className="rankcol">
        <span className="num">{String(rank).padStart(2, "0")}</span>
        <span className="lbl">RANK</span>
      </div>
      <div className="body">
        <div className="titleline">
          <div className="repo-name">
            <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
              <span className="owner">{repo.owner?.login}/</span>
              {repo.name}
            </a>
          </div>
          <div className="stars">
            ★ {fmt(repo.stargazers_count)}
            <small>stars</small>
          </div>
        </div>
        {repo.description && <p className="desc">{repo.description}</p>}
        <div className="badges">
          {repo.language && <span className="chip">{repo.language}</span>}
          <span>fork {fmt(repo.forks_count)}</span>
          {repo.created_at && <span>{repo.created_at.slice(0, 10)} 作成</span>}
        </div>
        <div className="bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <div className="actions">
          <button
            className={`mini fav-btn ${isFavorited ? "fav-on" : ""}`}
            aria-pressed={isFavorited}
            onClick={onToggleFavorite}
          >
            {isFavorited ? "★ 登録済み" : "☆ お気に入り"}
          </button>
          <button className="mini ai" onClick={onExplain}>✦ AI解説</button>
        </div>
        {showPanel && (
          <div className="ai-panel show">
            <div className="tag">CLAUDEによる解説</div>
            <div className="ai-body">
              {explainState?.loading && <span className="loading">Claudeが解説を生成中</span>}
              {!explainState?.loading && explainState?.paywall && (
                <>
                  AI解説は <strong>Proプラン(月額980円)</strong> の機能です。登録すると全リポジトリの日本語解説が読み放題になります。
                  <br /><br />
                  <button className="btn primary paywall-btn" onClick={onUpgrade}>¥980/月でProに登録</button>
                </>
              )}
              {!explainState?.loading && !explainState?.paywall && explainState?.error && (
                <span className="err">{explainState.error}</span>
              )}
              {!explainState?.loading && !explainState?.paywall && !explainState?.error && explainState?.text}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
