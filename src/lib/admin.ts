// ADMIN_USERNAMES に列挙したユーザー名は、Stripeの購読状態に関係なく
// 常にPro扱いにする(開発者本人が無料で使うためのバイパス)。
// 例: ADMIN_USERNAMES="yasu,yasu_test"
export function isAdminUser(username: string | null | undefined): boolean {
  if (!username) return false;
  const list = (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(username);
}
