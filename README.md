# Minecraft Whitelist Bot & Web Control Center

[繁體中文](#繁體中文) | [English](#english)

---

## 繁體中文

模組化 Discord Minecraft 白名單審核機器人與 Web 視覺化控制中心。支援雙端互通跨平台 (Geyser / Floodgate)、純基岩版專屬服 (BDS) 與純 Java 版伺服器，具備 MCSManager 多節點指令派發、Google 試算表自動化雙向同步、Discord 身分組與暱稱自動化管理。

### 核心功能

* 視覺化 Web 控制中心：支援繁體中文、簡體中文、English、日本語四國語言，內建深色與淺色主題。
* 零代碼後台設定：所有 Discord 金鑰、頻道 ID、MCSManager 連線參數、伺服器節點與問卷題目皆可在網頁直接配置並即時生效。
* 三大伺服器架構模式：
  * 雙端互通 (Geyser / Floodgate)：申請時提供玩家版本選擇按鈕，後端自動清洗 ID 並於派發時補綴前綴與空格引號。
  * 純基岩版專屬服 (BDS)：原生相容 Xbox Gamertag（含空格自動包裹雙引號），支援 allowlist add 與 whitelist add。
  * 純 Java 版伺服器：標準 Java 版白名單排程與驗證。
* 獨立 1 對 1 動態申請頻道：點擊「開始申請」按鈕即時建立隔離文字頻道進行問答，作答完畢後提供總覽與單題修改選單。
* MCSManager 多節點路由：可綁定任意數量的伺服器實例與 Daemon 節點，審核通過後依據版本目標 (ALL / Java / Bedrock) 自動派發指令。
* Google 試算表自動化同步：採用通用型 Apps Script，開新空白表格即可自動建立表頭，隨後台題庫動態擴充欄位，審核結果自動回寫狀態。
* Discord 成員狀態連動：審核通過自動修改玩家伺服器暱稱為 名稱 (遊戲ID) 並發放指定已驗證身分組。

### 快速開始指南

#### 第一步：專案下載與依賴安裝

確保系統已安裝 Node.js (v18.x 或 v20.x+)，在終端機中依序執行以下指令：

git clone https://github.com/your-username/mc-whitelist-bot.git

cd mc-whitelist-bot

npm install

node index.js

啟動後，瀏覽器打開 http://localhost:3000 進入 Web 控制中心。

#### 第二步：Discord 機器人建立與特權意圖

1. 前往 Discord Developer Portal 建立 Application 並進入 Bot 頁面。
2. 開啟特權意圖 (Privileged Gateway Intents)：將 PRESENCE INTENT、SERVER MEMBERS INTENT、MESSAGE CONTENT INTENT 全部開啟。
3. 邀請機器人：OAuth2 範圍勾選 bot，權限給予 Administrator 或管理頻道、身分組、暱稱等權限。
4. 身分組順序：在 Discord 伺服器身分組清單中，務必將機器人的身分組拖曳至「已驗證」身分組之上。

#### 第三步：Google 試算表 (GAS) 部署

1. 於 Google Drive 建立一份全新的空白試算表。
2. 點選頂部選單 擴充功能 > Apps Script。
3. 將專案目錄下的 Code.gs 原始碼完整複製並貼入編輯器，點擊儲存。
4. 點擊右上角 部署 > 新增部署作業：
   * 類型選擇：網頁應用程式 (Web App)
   * 誰可以存取：所有人 (Anyone)
5. 複製產生的網頁應用程式網址 (URL)。

#### 第四步：MCSManager 面板 API 串接

1. 取得 API Key：登入 MCSManager 面板，前往 使用者管理 複製管理員 API Key。
2. 取得實例 UUID 與 Daemon ID：進入伺服器實例終端介面，在網址列或設定中找到 uuid 與 daemonId。

#### 第五步：於 Web 控制中心完成配置

進入 http://localhost:3000 填入以下欄位後點擊「儲存設定」：

1. API 金鑰與環境變數：
   * DISCORD_TOKEN：Discord 機器人 Token。
   * CLIENT_ID：Discord Application ID。
   * GUILD_ID：目標 Discord 伺服器 ID。
   * APPLY_PANEL_CHANNEL_ID：發布申請按鈕的文字頻道 ID。
   * ADMIN_REVIEW_CHANNEL_ID：接收審核卡片的管理員頻道 ID。
   * CATEGORY_ID：動態建立 1 對 1 申請頻道的類別目錄 ID。
   * VERIFIED_ROLE_ID：審核通過後發放的身分組 ID。
   * MCSM_URL：MCSManager 主面板網址 (例如 http://192.168.1.100:23333)。
   * MCSM_API_KEY：MCSManager 管理員 API 金鑰。
   * GAS_WEBHOOK_URL：第三步複製的 Google Apps Script 部署網址。
2. 伺服器與節點設定：
   * 選擇伺服器架構模式 (雙端互通 / 純基岩版 / 純 Java)。
   * 點擊「新增伺服器節點」填入實例 UUID 與節點 Daemon ID (本機可留空)，並設定派發目標。
   * 自訂問卷題目內容。
3. 發布申請面板：
   * 點擊頂部「發布申請面板」按鈕，機器人即會將申請介面發布至指定頻道。

### 伺服器核心配置建議

* 純基岩版服 (BDS)：請確保 server.properties 中的 white-list=true 或 allow-list=true。
* 雙端互通跨平台服：Java 核心 (Paper / Purpur / Fabric) 需安裝 Geyser 與 Floodgate。
* Discord 身分組順序：在 Discord 伺服器身分組設定中，務必將機器人的身分組拖曳至「已驗證」身分組之上，以確保改暱稱與發身分組權限正常運行。

### 開源授權

本專案採用 MIT License 授權開源。

---

## English

Modular Discord Minecraft whitelist verification bot with a visual Web control dashboard. Supports Crossplay (Geyser / Floodgate), Bedrock Dedicated Server (BDS), and Java Edition servers with multi-node MCSManager command routing, Google Sheets synchronization, and Discord role/nickname management.

### Features

* Visual Web Control Panel: Multi-language support (Traditional Chinese, Simplified Chinese, English, Japanese) with dark and light themes.
* Zero-Code Configuration: Configure Discord credentials, channel IDs, MCSManager API parameters, server nodes, and custom questions directly via the web dashboard.
* Three Server Architecture Modes:
  * Crossplay (Geyser / Floodgate): Interactive platform selection buttons, automated ID sanitization, prefix handling, and command execution.
  * Bedrock Dedicated Server (BDS): Native support for Xbox Gamertags with spaces.
  * Java Edition: Standard whitelist command syntax and verification workflow.
* Dynamic Ticket Channels: Dedicated 1-on-1 application channels with confirmation overview and single-question modification select menus.
* MCSManager Multi-Node Routing: Route whitelist commands dynamically across multiple daemons and instances based on platform targets (ALL / JAVA_ONLY / BEDROCK_ONLY).
* Google Sheets Integration: Automatic header initialization for new spreadsheets, dynamic questionnaire field mapping, and status callback.
* Discord Member Sync: Automatic nickname updates to Name (GameID) and verified role assignment upon approval.

### Quick Start Guide

#### Step 1: Download & Install Dependencies

Ensure Node.js (v18.x or v20.x+) is installed, then run the following commands:

git clone https://github.com/your-username/mc-whitelist-bot.git

cd mc-whitelist-bot

npm install

node index.js

Open http://localhost:3000 in your web browser to access the control panel.

#### Step 2: Discord Bot Creation & Privileged Intents

1. Go to Discord Developer Portal, create an Application, and navigate to the Bot tab.
2. Enable Privileged Gateway Intents: Toggle on PRESENCE INTENT, SERVER MEMBERS INTENT, and MESSAGE CONTENT INTENT.
3. Invite Bot: Under OAuth2 check the bot scope with Administrator or Manage Channels/Roles/Nicknames permissions.
4. Role Hierarchy: In Discord Server Settings, drag the bot's role above the Verified role.

#### Step 3: Google Apps Script Setup

1. Create a new blank Google Sheet.
2. Open Extensions > Apps Script.
3. Paste the contents of Code.gs into the editor and save.
4. Click Deploy > New deployment:
   * Type: Web App
   * Who has access: Anyone
5. Copy the generated Web App URL.

#### Step 4: MCSManager API Integration

1. Obtain API Key: Log into MCSManager, go to User Management, and copy the Admin API Key.
2. Locate Instance UUID & Daemon ID: In the server console URL or instance settings, find uuid and daemonId.

#### Step 5: Web Dashboard Configuration

Open http://localhost:3000, configure the following fields, and click Save Config:

1. API Credentials & Environment:
   * DISCORD_TOKEN: Discord Bot Token.
   * CLIENT_ID: Discord Application Client ID.
   * GUILD_ID: Target Discord Server Guild ID.
   * APPLY_PANEL_CHANNEL_ID: Channel ID for posting the apply button.
   * ADMIN_REVIEW_CHANNEL_ID: Channel ID for receiving admin review cards.
   * CATEGORY_ID: Category ID where 1-on-1 ticket channels are created.
   * VERIFIED_ROLE_ID: Role ID granted upon whitelist approval.
   * MCSM_URL: MCSManager panel URL (e.g., http://192.168.1.100:23333).
   * MCSM_API_KEY: MCSManager Admin API Key.
   * GAS_WEBHOOK_URL: Web App URL copied from Step 3.
2. Server & Node Settings:
   * Select the architecture mode (Crossplay / Bedrock Only / Java Only).
   * Click Add Server Node to configure instance UUIDs, Daemon IDs, and target filters.
   * Customize questionnaire questions.
3. Deploy Application Panel:
   * Click the Deploy Panel button on the navigation bar to post the apply embed to Discord.

### Server Core Recommendations

* Bedrock Server (BDS): Ensure white-list=true or allow-list=true in server.properties.
* Crossplay Server: Java core (Paper / Purpur / Fabric) with Geyser and Floodgate installed.
* Discord Role Hierarchy: Position the bot's role above the verified role in Discord settings to allow nickname and role modifications.

### License

This project is licensed under the MIT License.
