function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];

    if (sheet.getLastRow() === 0 && data.headers && data.headers.length > 0) {
      sheet.getRange(1, 1, 1, data.headers.length).setValues([data.headers]);
      sheet.getRange(1, 1, 1, data.headers.length).setFontWeight("bold");
    }

    if (data.action === "SYNC_HEADERS") {
      if (sheet.getLastRow() === 0 && data.headers && data.headers.length > 0) {
        sheet.getRange(1, 1, 1, data.headers.length).setValues([data.headers]);
        sheet.getRange(1, 1, 1, data.headers.length).setFontWeight("bold");
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "SYNC_HEADERS" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "SUBMIT" || !data.action) {
      var timestamp = Utilities.formatDate(new Date(), "GMT+8", "yyyy/MM/dd a h:mm");
      var baseRow = [
        timestamp,
        "待審核",
        data.discordUser || "",
        "'" + (data.discordId || ""),
        data.mcId || "",
        "-",
        "-"
      ];
      var finalRowData = baseRow.concat(data.answers || []);
      sheet.appendRow(finalRowData);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "SUBMIT" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "UPDATE_STATUS") {
      var values = sheet.getDataRange().getValues();
      for (var i = values.length - 1; i >= 1; i--) {
        var rowDiscordId = String(values[i][3]).replace(/^'/, '').trim();
        if (rowDiscordId === String(data.discordId).trim()) {
          sheet.getRange(i + 1, 2).setValue(data.status);
          sheet.getRange(i + 1, 6).setValue(data.reviewer || "-");
          if (data.reason) {
            sheet.getRange(i + 1, 7).setValue(data.reason);
          }
          return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "UPDATE_STATUS", row: i + 1 })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "not_found" })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "invalid_action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}