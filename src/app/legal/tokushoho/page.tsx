import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | GitHub Ranking",
};

export default function TokushohoPage() {
  return (
    <div className="legal">
      <Link href="/" className="back">← トップに戻る</Link>
      <h1>特定商取引法に基づく表記</h1>
      <div className="updated">最終更新日: 2026年7月8日</div>

      <table>
        <tbody>
          <tr>
            <th>販売事業者</th>
            <td>深見泰仁</td>
          </tr>
          <tr>
            <th>運営責任者</th>
            <td>深見泰仁td>
          </tr>
          <tr>
            <th>所在地</th>
            <td>
              請求があったら遅滞なく開示いたします。
              <br />
              (開示のご請求は下記メールアドレスまでご連絡ください)
            </td>
          </tr>
          <tr>
            <th>電話番号</th>
            <td>
              請求があったら遅滞なく開示いたします。
              <br />
              (開示のご請求は下記メールアドレスまでご連絡ください)
            </td>
          </tr>
          <tr>
            <th>メールアドレス</th>
            <td>ryzen398@gmail.com</td>
          </tr>
          <tr>
            <th>販売価格</th>
            <td>月額980円(税込)— GitHub Ranking Proプラン</td>
          </tr>
          <tr>
            <th>商品代金以外の必要料金</th>
            <td>インターネット接続料金・通信料金はお客様のご負担となります。</td>
          </tr>
          <tr>
            <th>お支払い方法</th>
            <td>クレジットカード決済(Stripe社が提供する決済サービスを利用しています)</td>
          </tr>
          <tr>
            <th>お支払い時期</th>
            <td>
              ご登録手続き完了時に即時課金され、以降は毎月同日に自動更新・自動課金されます。
            </td>
          </tr>
          <tr>
            <th>サービス提供時期</th>
            <td>決済完了後、直ちにProプランの機能(AI解説)をご利用いただけます。</td>
          </tr>
          <tr>
            <th>返品・キャンセルについて</th>
            <td>
              本サービスはデジタルコンテンツ(AI解説機能)の提供であり、その性質上、
              ご購入後・ご利用開始後の返金は原則お受けしておりません。
              定期購読はマイページの「購読管理」からいつでも解約手続きが可能で、
              解約後は次回以降の請求が発生しません(解約時点で発生済みの請求期間分は
              引き続きご利用いただけます)。
            </td>
          </tr>
          <tr>
            <th>動作環境</th>
            <td>最新版のGoogle Chrome、Safari、Firefox、Microsoft Edgeなど主要なモダンブラウザ</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
