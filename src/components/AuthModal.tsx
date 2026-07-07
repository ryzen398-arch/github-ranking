"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!username.trim() || !password) {
      setErr("ユーザー名とパスワードを入力してください。");
      return;
    }
    setLoading(true);
    setErr("");
    const res = await signIn("credentials", { username: username.trim(), password, redirect: false });
    setLoading(false);
    if (res?.ok) {
      onSuccess();
    } else {
      setErr("ユーザー名またはパスワードをご確認ください(新規登録の場合、パスワードは4文字以上にしてください)。");
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 id="modalTitle">ログイン / 新規登録</h2>
        <p>未登録のユーザー名なら、そのまま新規アカウントを作成します。</p>
        <div className="field">
          <label htmlFor="inUser">ユーザー名</label>
          <input
            id="inUser"
            autoComplete="username"
            maxLength={24}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="inPass">パスワード</label>
          <input
            id="inPass"
            type="password"
            autoComplete="current-password"
            maxLength={64}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <div className="err" aria-live="assertive">{err}</div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>キャンセル</button>
          <button className="btn primary" onClick={submit} disabled={loading}>
            {loading ? "確認中…" : "ログイン"}
          </button>
        </div>
      </div>
    </div>
  );
}
