# 白名單自動化審核系統

> 本系統是一套專為 Minecraft 伺服器打造的全自動化白名單審核架構：透過 Discord 機器人動態建立 1 對 1 獨立頻道引導玩家互動問答與作答確認，提交後即時向 Google 試算表（GAS）非同步建檔；管理員於審核專區一鍵裁定後，系統自動透過 MCSManager 多節點 API 將白名單指令精準分流派發至對應伺服器（完美相容 Java 版雙服同步與 Floodgate 基岩版解析），並同步完成 Discord 身分組發放、暱稱格式化修改與玩家私訊結果通知，達成零人工介入的跨平台玩家准入管理。

---

## 特色

* **1 對 1 獨立動態申請頻道**：點擊申請按鈕即刻動態建立私密頻道，以互動問答引導玩家填表，防止公頻洗版與資料洩漏。
* **作答預覽與單題即時更正**：提交前提供作答總覽面板，支援透過下拉選單退回特定題目修改。
* **MCSManager 多節點 API 串接**：審核通過後自動發送原生指令寫入白名單，支援跨守護進程節點（Daemon）調度。
* **跨平台智慧分流（Java / Bedrock）**：
  * **Java 版玩家**：自動同步加入生存服與模組服。
  * **基岩版玩家**（`.` 開頭）：精準鎖定並加入支援 Floodgate 的生存服，自動阻斷無效模組服派發。
* **Google 試算表雙向同步**：填表即時追加「待審核」列；審核後自動以 Discord ID 倒序鎖定最新紀錄，更新「已批准/已拒絕」、審核者及退件原因。
* **Discord 成員狀態聯動**：通過審核自動發放身分組，並將伺服器暱稱標準化為 `名稱 (遊戲ID)`（內建字元長度防呆）。

---

## 環境

* **Node.js**：`18.x` 或更高版本
* **Minecraft 伺服器**：Fabric / Paper / Purpur（若支援基岩版需安裝 Floodgate）
* **MCSManager**：v9 / v10（需啟用 API Key）
* **Google 帳號**：用於部署 Google Apps Script 與 Google Sheets

---

## 開始

### 1. 取得專案原始碼

```bash
git clone [https://github.com/baooooge/mc-whitelist-bot.git](https://github.com/baooooge/mc-whitelist-bot.git)
cd mc-whitelist-bot
npm install

### 2.編輯 .env 填入實際參數
```bash

### 3.Google Apps Script 部署
```bash
開啟目標 Google 試算表，點擊 擴充功能 > Apps Script。
將專案中的 Code.gs 貼入編輯器並儲存。
點擊右上角 部署 > 新增部署作業。
類型選擇 網頁應用程式：
誰可以存取：選擇 所有人 (Anyone)。
將取得的 Webhook 網址複製並填入 .env 的 GAS_WEBHOOK_URL。
