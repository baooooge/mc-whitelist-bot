# MCSManager x Discord Minecraft 白名單自動化審核系統

> 一套專為 Minecraft 伺服器打造的高彈性自動化白名單審核系統。透過 Discord 機器人引導玩家進行 1 對 1 互動式問答與作答確認，提交後即時寫入 Google 試算表存檔；管理員於 Discord 審核頻道一鍵批准後，系統將透過 MCSManager API 自動發送原生白名單指令至指定伺服器實例（支援單服、多服分流及 Floodgate 基岩版），並自動完成 Discord 暱稱標準化修改、發放已驗證身分組與私訊開通通知。

---

## 🌟 核心特色

* **高自由度模組化配置**：題目數量、伺服器實例清單、基岩版支援開關皆可在 `config.json` 自由定義，完全無需修改程式碼。
* **1 對 1 獨立問答頻道**：點擊申請按鈕即時動態建立私密頻道，以循序問答引導填表，防止公頻洗版與玩家隱私洩漏。
* **作答總覽與單題修改**：全部作答完成後提供總覽預覽，可隨時透過下拉選單退回特定題目重新作答。
* **MCSManager 多節點與多服調度**：
  * 支援任意數量的伺服器實例派發。
  * 可為個別伺服器指定分流規則（`ALL` 全版本 / `JAVA_ONLY` 僅限 Java / `BEDROCK_ONLY` 僅限基岩版）。
* **Floodgate 基岩版相容**：自動辨識基岩版 ID 特徵（`.` 開頭），自動將指令精準投遞至支援基岩版的實例，阻斷無效派發。
* **Google 試算表雙向同步**：
  * 提交時即時新增「待審核」紀錄。
  * 審核完成後以 Discord ID 倒序鎖定最新紀錄，同步更新「已批准 / 已拒絕」、審核管理員與拒絕原因。
* **Discord 成員狀態聯動**：審核通過自動發放身分組，並將伺服器暱稱標準化為 `名稱 (遊戲ID)`（內建 32 字元長度截斷防呆）。

---

## 🛠️ 環境需求

* **Node.js**：`18.x` 或更高版本
* **Minecraft 伺服器**：Vanilla / Fabric / Paper / Purpur（若支援基岩版需安裝 Floodgate）
* **MCSManager 面板**：v9 / v10（需啟用 API Key）
* **Google 帳號**：用於部署 Google Apps Script 與 Google Sheets

---

## 🚀 快速開始

### 1. 取得專案原始碼

```bash
git clone [https://github.com/baooooge/mc-whitelist-bot.git](https://github.com/baooooge/mc-whitelist-bot.git)
cd mc-whitelist-bot
npm install
```

### 2. 設定環境變數 (`.env`)

在專案根目錄建立 `.env` 檔案並填入設定值：

```ini
# Discord 設定
DISCORD_TOKEN=你的BotToken
CLIENT_ID=你的應用程式ID
GUILD_ID=你的Discord伺服器ID
APPLY_PANEL_CHANNEL_ID=放置申請面板按鈕的頻道ID
ADMIN_REVIEW_CHANNEL_ID=管理員接收審核卡片的頻道ID
CATEGORY_ID=申請頻道建立的目錄ID
VERIFIED_ROLE_ID=通過審核後發放的身分組ID

# Google Apps Script Webhook
GAS_WEBHOOK_URL=你的GAS部署網址

# MCSManager API 設定
MCSM_URL=http://你的面板IP:23333
MCSM_API_KEY=你的API金鑰

# 伺服器實例設定（變數名稱須與 config.json 對應）
MCSM_SURVIVAL_DAEMON_ID=生存服節點DaemonID
MCSM_SURVIVAL_INSTANCE_UUID=生存服實例UUID
MCSM_MODDED_DAEMON_ID=模組服節點DaemonID
MCSM_MODDED_INSTANCE_UUID=模組服實例UUID
```

### 3. 設定業務邏輯 (`config.json`)

根據伺服器實際環境編輯 `config.json`：

```json
{
  "serverName": "我的 Minecraft 伺服器",
  "enableBedrockSupport": true,
  "embedColor": "#FFA500",
  "instances": [
    {
      "name": "生存伺服器",
      "daemonIdEnv": "MCSM_SURVIVAL_DAEMON_ID",
      "instanceUuidEnv": "MCSM_SURVIVAL_INSTANCE_UUID",
      "target": "ALL"
    },
    {
      "name": "模組伺服器",
      "daemonIdEnv": "MCSM_MODDED_DAEMON_ID",
      "instanceUuidEnv": "MCSM_MODDED_INSTANCE_UUID",
      "target": "JAVA_ONLY"
    }
  ],
  "questions": [
    { "id": "mcId", "text": "Minecraft 遊戲 ID：" },
    { "id": "age", "text": "你的年齡：" },
    { "id": "rules", "text": "是否同意遵守伺服器規範？" }
  ]
}
```

### 4. 部署 Google Apps Script

1. 建立一份新的 Google 試算表。
2. 點擊頂部選單 **擴充功能 > Apps Script**。
3. 將專案中的 `Code.gs` 代碼完整貼入編輯器中並存檔。
4. 點擊右上角 **部署 > 新增部署作業**。
5. 類型選擇 **網頁應用程式 (Web App)**：
   * **誰可以存取**：選擇 **所有人 (Anyone)**。
6. 複製產生的 Webhook 網址，並填入 `.env` 的 `GAS_WEBHOOK_URL` 欄位。

### 5. 啟動機器人

```bash
node index.js
```

---

## 📄 開源授權

本專案採用 [MIT License](LICENSE) 授權開源。
