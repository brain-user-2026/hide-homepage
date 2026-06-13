const APP = {
  name: '家計簿',
  sheets: {
    transactions: 'Transactions',
    categories: 'CategoryMaster',
    stores: 'StoreMaster',
    settings: 'Settings'
  },
  headers: {
    transactions: ['日付', '種別', 'カテゴリー', '店名', '内容', '金額', 'メモ', 'レシートURL', '登録日時'],
    categories: ['カテゴリー名', '種別', '表示順', '有効'],
    stores: ['店名', '表示順', '有効'],
    settings: ['項目', '値']
  },
  types: ['収入', '支出'],
  buttons: {
    monthlyGraph: '月次グラフ作成'
  }
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(APP.name)
    .addItem('初期化', 'initializeBook')
    .addSeparator()
    .addItem('スマホ入力URLを開く', 'showInputUrl')
    .addSeparator()
    .addItem('月次集計作成', 'menuCreateMonthlySummary')
    .addItem('月次グラフ作成', 'menuCreateMonthlyGraph')
    .addSeparator()
    .addItem('CSV出力', 'menuExportCsv')
    .addItem('Excel出力', 'menuExportExcel')
    .addSeparator()
    .addItem('年末締め', 'menuCloseYear')
    .addItem('締め解除', 'menuUnlockYear')
    .addItem('翌年家計簿作成', 'menuCreateNextYearBook')
    .addToUi();
}

function doGet() {
  initializeBook();
  return HtmlService.createHtmlOutputFromFile('Input')
    .setTitle('家計簿入力')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function showInputUrl() {
  initializeBook();

  const url = ScriptApp.getService().getUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert(
      'WebアプリURLがまだありません。\n\nApps Script の「デプロイ」から「ウェブアプリ」としてデプロイしてください。\n\nデプロイ後、スマホでは /exec のURLを直接開いてください。'
    );
    return;
  }

  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:20px;line-height:1.7;">' +
      '<h2>スマホ入力URL</h2>' +
      '<p>スマホでは、Google Sheets内ではなく下のWebアプリURLを直接開いてください。</p>' +
      '<p><a href="' + url + '" target="_blank" style="display:block;text-align:center;background:#2563EB;color:#fff;padding:14px 18px;border-radius:10px;text-decoration:none;font-weight:bold;">スマホ入力画面を開く</a></p>' +
      '<p style="word-break:break-all;font-size:13px;color:#64748B;">' + url + '</p>' +
    '</div>'
  );

  SpreadsheetApp.getUi().showModalDialog(html, 'スマホ入力URL');
}

function initializeBook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, APP.sheets.transactions, APP.headers.transactions);
  ensureSheet_(ss, APP.sheets.categories, APP.headers.categories);
  ensureSheet_(ss, APP.sheets.stores, APP.headers.stores);
  ensureSheet_(ss, APP.sheets.settings, APP.headers.settings);
  deleteDefaultSheet_(ss);
  initializeSettings_();
  formatBaseSheets_();

  ss.toast('初期化が完了しました。', APP.name, 3);
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];

  if (current.join('') === '' || current.join('|') !== headers.join('|')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
  return sheet;
}

function deleteDefaultSheet_(ss) {
  ['シート1', 'Sheet1'].forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    if (sheet && ss.getSheets().length > 1) ss.deleteSheet(sheet);
  });
}

function initializeSettings_() {
  const sheet = getSheet_(APP.sheets.settings);
  const values = sheet.getDataRange().getValues();
  const keys = values.map(function(row) { return row[0]; });

  [
    ['bookYear', new Date().getFullYear()],
    ['closed', 'false'],
    ['receiptFolderId', ''],
    ['lastCloseFolderUrl', ''],
    ['nextYearBookUrl', '']
  ].forEach(function(row) {
    if (keys.indexOf(row[0]) === -1) sheet.appendRow(row);
  });
}

function formatBaseSheets_() {
  Object.keys(APP.sheets).forEach(function(key) {
    const sheet = getSheet_(APP.sheets[key]);
    sheet.getRange(1, 1, 1, sheet.getLastColumn())
      .setFontWeight('bold')
      .setBackground('#DBEAFE')
      .setFontColor('#0F172A');
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  });
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error(name + ' シートが見つかりません。');
  return sheet;
}

function getSetting_(key) {
  const sheet = getSheet_(APP.sheets.settings);
  const values = sheet.getDataRange().getValues();

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === key) return values[i][1];
  }
  return '';
}

function setSetting_(key, value) {
  const sheet = getSheet_(APP.sheets.settings);
  const values = sheet.getDataRange().getValues();

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getInputOptions() {
  initializeBook();
  return {
    today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    types: APP.types,
    categories: getActiveCategories_().slice(0, 50),
    stores: getActiveStores_().slice(0, 50),
    storeHints: getStoreHints_()
  };
}

function getActiveCategories_() {
  const sheet = getSheet_(APP.sheets.categories);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, 4).getValues()
    .filter(function(row) { return row[0] && row[3] !== false && row[3] !== 'FALSE'; })
    .sort(function(a, b) { return Number(a[2] || 999) - Number(b[2] || 999); })
    .map(function(row) { return { name: String(row[0]), type: String(row[1] || '') }; });
}

function getActiveStores_() {
  const sheet = getSheet_(APP.sheets.stores);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, 3).getValues()
    .filter(function(row) { return row[0] && row[2] !== false && row[2] !== 'FALSE'; })
    .sort(function(a, b) { return Number(a[1] || 999) - Number(b[1] || 999); })
    .map(function(row) { return String(row[0]); });
}

function getStoreHints_() {
  const sheet = getSheet_(APP.sheets.transactions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};

  const startRow = Math.max(2, lastRow - 49);
  const values = sheet.getRange(startRow, 1, lastRow - startRow + 1, APP.headers.transactions.length).getValues();
  const hints = {};

  values.reverse().forEach(function(row) {
    const store = String(row[3] || '').trim();
    if (!store || hints[store]) return;
    hints[store] = { category: String(row[2] || ''), description: String(row[4] || '') };
  });

  return hints;
}

function saveTransaction(data) {
  initializeBook();

  if (String(getSetting_('closed')) === 'true') {
    throw new Error('この家計簿は締め済みです。締め解除してから保存してください。');
  }
  if (!data.date) throw new Error('日付を入力してください。');
  if (!data.type) throw new Error('種別を選択してください。');
  if (!data.amount) throw new Error('金額を入力してください。');

  const amount = Number(data.amount);
  if (!amount || amount <= 0) throw new Error('金額は1円以上で入力してください。');

  const receiptUrl = saveReceiptFile_(data);
  const sheet = getSheet_(APP.sheets.transactions);
  sheet.appendRow([
    data.date,
    data.type,
    data.category || '',
    data.store || '',
    data.description || '',
    amount,
    data.memo || '',
    receiptUrl,
    new Date()
  ]);

  registerCategory_(data.category, data.type);
  registerStore_(data.store);
  updateMonthlySummaryAfterSave_(data.date);

  return { ok: true, message: '保存しました。', options: getInputOptions() };
}

function registerCategory_(category, type) {
  const name = String(category || '').trim();
  if (!name) return;

  const sheet = getSheet_(APP.sheets.categories);
  const lastRow = sheet.getLastRow();
  const values = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 2).getValues() : [];
  const exists = values.some(function(row) {
    return String(row[0]) === name && String(row[1]) === String(type || '');
  });

  if (!exists) sheet.appendRow([name, type || '', lastRow, true]);
}

function registerStore_(store) {
  const name = String(store || '').trim();
  if (!name) return;

  const sheet = getSheet_(APP.sheets.stores);
  const lastRow = sheet.getLastRow();
  const values = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues() : [];
  const exists = values.some(function(row) { return String(row[0]) === name; });

  if (!exists) sheet.appendRow([name, lastRow, true]);
}

function saveReceiptFile_(data) {
  if (!data || !data.receipt || !data.receipt.base64) return '';

  const folder = getReceiptFolder_();
  const bytes = Utilities.base64Decode(data.receipt.base64);
  const safeDate = safeFileName_(data.date || '日付なし');
  const safeStore = safeFileName_(data.store || '店名なし');
  const safeAmount = safeFileName_(data.amount || '0');
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const extension = getReceiptExtension_(data.receipt.mimeType, data.receipt.name);
  const fileName = safeDate + '_' + safeStore + '_' + safeAmount + '_' + timestamp + extension;
  const blob = Utilities.newBlob(bytes, data.receipt.mimeType || 'image/jpeg', fileName);
  const file = folder.createFile(blob);

  return file.getUrl();
}

function getReceiptFolder_() {
  const savedId = getSetting_('receiptFolderId');
  if (savedId) {
    try {
      return DriveApp.getFolderById(savedId);
    } catch (error) {
      Logger.log('レシートフォルダ取得失敗: ' + error.message);
    }
  }

  const folder = DriveApp.createFolder('家計簿レシート');
  setSetting_('receiptFolderId', folder.getId());
  return folder;
}

function getReceiptExtension_(mimeType, originalName) {
  const name = String(originalName || '').toLowerCase();
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return name.substring(name.lastIndexOf('.'));
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/gif') return '.gif';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

function safeFileName_(value) {
  return String(value || '').replace(/[\/\\:*?"<>|]/g, '-').trim() || '未入力';
}

function updateMonthlySummaryAfterSave_(dateValue) {
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const sheetName = getMonthlySummarySheetName_(year, month);
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName)) return;

  createMonthlySummary(year, month);
}

function menuCreateMonthlySummary() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('月次集計作成', '対象年月を YYYY-MM 形式で入力してください。', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const match = response.getResponseText().trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!match) {
    ui.alert('YYYY-MM 形式で入力してください。例: 2026-06');
    return;
  }

  createMonthlySummary(Number(match[1]), Number(match[2]));
  ui.alert('月次集計を作成しました。');
}

function menuCreateMonthlyGraph() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const match = sheet.getName().match(/^(\d{4})-(\d{2})月次集計$/);
  if (!match) {
    ui.alert('月次集計シートを開いてから実行してください。');
    return;
  }

  createMonthlyGraph(Number(match[1]), Number(match[2]));
  ui.alert('月次グラフを作成しました。');
}

function createMonthlySummary(year, month) {
  initializeBook();

  const sheetName = getMonthlySummarySheetName_(year, month);
  const sheet = resetSheet_(sheetName);
  const rows = getTransactions_().filter(function(tx) {
    return tx.year === Number(year) && tx.month === Number(month);
  });

  sheet.getRange(1, 1).setValue(year + '年' + month + '月 月次集計')
    .setFontSize(18)
    .setFontWeight('bold');

  if (!rows.length) {
    sheet.getRange(3, 1).setValue('データなし');
    addMonthlyGraphButton_(sheet);
    formatSummarySheet_(sheet);
    return { ok: true, count: 0 };
  }

  const totals = summarizeTotals_(rows);
  const categoryRows = summarizeByKey_(rows, 'category');
  const storeRows = summarizeByKey_(rows, 'store');

  sheet.getRange(3, 1, 4, 2).setValues([
    ['収入合計', totals.income],
    ['支出合計', totals.expense],
    ['残高', totals.balance],
    ['件数', rows.length]
  ]);

  sheet.getRange(8, 1, 1, 4).setValues([['カテゴリー', '収入', '支出', '残高']]);
  if (categoryRows.length) sheet.getRange(9, 1, categoryRows.length, 4).setValues(categoryRows);

  const storeStartRow = 10 + categoryRows.length;
  sheet.getRange(storeStartRow, 1, 1, 4).setValues([['店名', '収入', '支出', '残高']]);
  if (storeRows.length) sheet.getRange(storeStartRow + 1, 1, storeRows.length, 4).setValues(storeRows);

  addMonthlyGraphButton_(sheet);
  formatSummarySheet_(sheet);
  return { ok: true, count: rows.length };
}

function addMonthlyGraphButton_(sheet) {
  const row = Math.max(sheet.getLastRow() + 3, 16);
  const range = sheet.getRange(row, 1, 1, 4);

  range.merge();
  range.setValue(APP.buttons.monthlyGraph)
    .setBackground('#2563EB')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(row, 42);
}

function onSelectionChange(e) {
  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    const value = getSelectedButtonText_(e.range);
    if (value !== APP.buttons.monthlyGraph) return;

    const match = sheet.getName().match(/^(\d{4})-(\d{2})月次集計$/);
    if (!match) return;

    createMonthlyGraph(Number(match[1]), Number(match[2]));
    SpreadsheetApp.getActiveSpreadsheet().toast('月次グラフを作成しました。', APP.name, 3);
  } catch (error) {
    Logger.log('ボタンクリック処理エラー: ' + error.message);
    SpreadsheetApp.getActiveSpreadsheet().toast(error.message, APP.name, 5);
  }
}

function getSelectedButtonText_(range) {
  const directValue = String(range.getDisplayValue() || range.getValue() || '').trim();
  if (directValue) return directValue;

  const mergedRanges = range.getMergedRanges();
  if (mergedRanges && mergedRanges.length) {
    return String(mergedRanges[0].getCell(1, 1).getDisplayValue() || '').trim();
  }
  return '';
}

function createMonthlyGraph(year, month) {
  const sheet = getSheet_(getMonthlySummarySheetName_(year, month));
  const rows = getTransactions_().filter(function(tx) {
    return tx.year === Number(year) && tx.month === Number(month);
  });
  createMonthlyCharts_(sheet, rows, summarizeTotals_(rows));
}

function createMonthlyCharts_(sheet, rows, totals) {
  clearCharts_(sheet);

  const categoryChartRows = buildChartRows_('カテゴリー', '支出', summarizeExpenseOnly_(rows, 'category'));
  const storeChartRows = buildChartRows_('店名', '支出', summarizeExpenseOnly_(rows, 'store'));
  const totalChartRows = [
    ['項目', '金額'],
    ['収入', Number(totals.income) || 0],
    ['支出', Number(totals.expense) || 0],
    ['残高', Number(totals.balance) || 0]
  ];
  const helperColumn = 27;

  sheet.getRange(1, helperColumn, sheet.getMaxRows(), 9).clearContent();
  sheet.getRange(2, helperColumn, categoryChartRows.length, 2).setValues(categoryChartRows);
  sheet.getRange(2, helperColumn + 3, storeChartRows.length, 2).setValues(storeChartRows);
  sheet.getRange(2, helperColumn + 6, totalChartRows.length, 2).setValues(totalChartRows);

  sheet.insertChart(sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(sheet.getRange(2, helperColumn, categoryChartRows.length, 2))
    .setOption('title', 'カテゴリー別支出グラフ')
    .setPosition(2, 8, 0, 0)
    .build());
  sheet.insertChart(sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(sheet.getRange(2, helperColumn + 3, storeChartRows.length, 2))
    .setOption('title', '店名別支出グラフ')
    .setPosition(18, 8, 0, 0)
    .build());
  sheet.insertChart(sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(sheet.getRange(2, helperColumn + 6, totalChartRows.length, 2))
    .setOption('title', '収入・支出・残高グラフ')
    .setPosition(34, 8, 0, 0)
    .build());
}

function clearCharts_(sheet) {
  sheet.getCharts().forEach(function(chart) { sheet.removeChart(chart); });
}

function buildChartRows_(label, valueLabel, rows) {
  const positiveRows = rows.filter(function(row) { return Number(row[1]) > 0; });
  return [[label, valueLabel]].concat(positiveRows.length ? positiveRows : [['データなし', 1]]);
}

function getMonthlySummarySheetName_(year, month) {
  return year + '-' + ('0' + month).slice(-2) + '月次集計';
}

function getTransactions_() {
  const sheet = getSheet_(APP.sheets.transactions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, APP.headers.transactions.length).getValues();
  return values.map(function(row) {
    const date = new Date(row[0]);
    return {
      date: date,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      type: String(row[1] || ''),
      category: String(row[2] || '未入力'),
      store: String(row[3] || '未入力'),
      description: String(row[4] || ''),
      amount: Number(row[5]) || 0,
      memo: String(row[6] || ''),
      receiptUrl: String(row[7] || ''),
      createdAt: row[8]
    };
  }).filter(function(tx) { return !isNaN(tx.date.getTime()); });
}

function summarizeTotals_(rows) {
  return rows.reduce(function(total, row) {
    if (row.type === '収入') total.income += row.amount;
    if (row.type === '支出') total.expense += row.amount;
    total.balance = total.income - total.expense;
    return total;
  }, { income: 0, expense: 0, balance: 0 });
}

function summarizeByKey_(rows, key) {
  const map = {};
  rows.forEach(function(row) {
    const name = row[key] || '未入力';
    if (!map[name]) map[name] = { income: 0, expense: 0, balance: 0 };
    if (row.type === '収入') map[name].income += row.amount;
    if (row.type === '支出') map[name].expense += row.amount;
    map[name].balance = map[name].income - map[name].expense;
  });
  return Object.keys(map).sort().map(function(name) {
    return [name, map[name].income, map[name].expense, map[name].balance];
  });
}

function summarizeExpenseOnly_(rows, key) {
  const map = {};
  rows.forEach(function(row) {
    if (row.type !== '支出') return;
    const name = row[key] || '未入力';
    map[name] = (map[name] || 0) + row.amount;
  });
  return Object.keys(map).sort().map(function(name) { return [name, map[name]]; });
}

function resetSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existing = ss.getSheetByName(name);
  if (existing) {
    existing.clear();
    clearCharts_(existing);
    return existing;
  }
  return ss.insertSheet(name);
}

function formatSummarySheet_(sheet) {
  sheet.getDataRange().setVerticalAlignment('middle');
  sheet.autoResizeColumns(1, Math.max(sheet.getLastColumn(), 4));
  if (sheet.getLastRow() >= 1) {
    sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 4))
      .setBackground('#DBEAFE')
      .setFontColor('#0F172A')
      .setFontWeight('bold');
  }
}

function menuExportCsv() {
  const url = createCsvFile_(new Date().getFullYear()).getUrl();
  SpreadsheetApp.getUi().alert('CSVを作成しました。\n' + url);
}

function menuExportExcel() {
  const url = createExcelCopy_().getUrl();
  SpreadsheetApp.getUi().alert('Excel出力用コピーを作成しました。\n' + url);
}

function createCsvFile_(year) {
  const rows = getTransactions_().filter(function(tx) { return tx.year === Number(year); });
  const csvRows = [APP.headers.transactions];

  rows.forEach(function(tx) {
    csvRows.push([formatDate_(tx.date), tx.type, tx.category, tx.store, tx.description, tx.amount, tx.memo, tx.receiptUrl, tx.createdAt]);
  });

  const csv = csvRows.map(function(row) { return row.map(csvCell_).join(','); }).join('\r\n');
  return DriveApp.createFile(Utilities.newBlob('\uFEFF' + csv, 'text/csv', year + '年家計簿.csv'));
}

function createExcelCopy_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + '_Excel出力用コピー');
}

function menuCloseYear() {
  const ui = SpreadsheetApp.getUi();
  const year = Number(getSetting_('bookYear')) || new Date().getFullYear();
  const result = ui.alert('年末締め', year + '年を締めます。\n年間集計・年間グラフ・CSV・保存フォルダ・翌年家計簿を作成します。', ui.ButtonSet.OK_CANCEL);
  if (result !== ui.Button.OK) return;

  const closeResult = closeYear_(year);
  ui.alert('年末締めが完了しました。\n保存フォルダ:\n' + closeResult.folderUrl);
}

function closeYear_(year) {
  const annualSummary = createAnnualSummary(year);
  createAnnualGraphs(year);
  const csvFile = createCsvFile_(year);
  const folder = DriveApp.createFolder(year + '年家計簿');
  folder.addFile(csvFile);

  try {
    DriveApp.getRootFolder().removeFile(csvFile);
  } catch (error) {
    Logger.log(error.message);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const copiedFile = DriveApp.getFileById(ss.getId()).makeCopy(year + '年家計簿_締め済みコピー', folder);
  const nextBook = createNextYearBook_(year + 1);

  setSetting_('closed', 'true');
  setSetting_('lastCloseFolderUrl', folder.getUrl());
  setSetting_('nextYearBookUrl', nextBook.getUrl());
  return { folderUrl: folder.getUrl(), copyUrl: copiedFile.getUrl(), nextBookUrl: nextBook.getUrl(), annualSummary: annualSummary };
}

function menuUnlockYear() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('締め解除', '締め状態を解除しますか？', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  setSetting_('closed', 'false');
  ui.alert('締め解除しました。');
}

function menuCreateNextYearBook() {
  const year = (Number(getSetting_('bookYear')) || new Date().getFullYear()) + 1;
  const file = createNextYearBook_(year);
  SpreadsheetApp.getUi().alert('翌年家計簿を作成しました。\n' + file.getUrl());
}

function createNextYearBook_(year) {
  const file = SpreadsheetApp.create(year + '年家計簿');
  const ss = SpreadsheetApp.openById(file.getId());

  ensureSheet_(ss, APP.sheets.transactions, APP.headers.transactions);
  ensureSheet_(ss, APP.sheets.categories, APP.headers.categories);
  ensureSheet_(ss, APP.sheets.stores, APP.headers.stores);
  ensureSheet_(ss, APP.sheets.settings, APP.headers.settings);
  deleteDefaultSheet_(ss);
  copyMasterSheet_(APP.sheets.categories, ss);
  copyMasterSheet_(APP.sheets.stores, ss);

  const settings = ss.getSheetByName(APP.sheets.settings);
  settings.clear();
  settings.getRange(1, 1, 1, 2).setValues([APP.headers.settings]);
  settings.appendRow(['bookYear', year]);
  settings.appendRow(['closed', 'false']);
  settings.appendRow(['receiptFolderId', '']);
  settings.appendRow(['lastCloseFolderUrl', '']);
  settings.appendRow(['nextYearBookUrl', '']);
  return file;
}

function copyMasterSheet_(sheetName, targetSs) {
  const source = getSheet_(sheetName);
  const target = targetSs.getSheetByName(sheetName);
  const values = source.getDataRange().getValues();

  target.clear();
  target.getRange(1, 1, values.length, values[0].length).setValues(values);
}

function createAnnualSummary(year) {
  const sheet = resetSheet_(year + '年間集計');
  const rows = getTransactions_().filter(function(tx) { return tx.year === Number(year); });

  sheet.getRange(1, 1).setValue(year + '年 年間集計').setFontSize(18).setFontWeight('bold');
  if (!rows.length) {
    sheet.getRange(3, 1).setValue('データなし');
    formatSummarySheet_(sheet);
    return { ok: true, count: 0 };
  }

  const totals = summarizeTotals_(rows);
  const monthlyRows = summarizeAnnualByMonth_(rows);
  const categoryRows = summarizeByKey_(rows, 'category');
  const storeRows = summarizeByKey_(rows, 'store');

  sheet.getRange(3, 1, 4, 2).setValues([
    ['年間収入', totals.income],
    ['年間支出', totals.expense],
    ['年間残高', totals.balance],
    ['件数', rows.length]
  ]);
  sheet.getRange(8, 1, 1, 4).setValues([['月', '収入', '支出', '残高']]);
  sheet.getRange(9, 1, monthlyRows.length, 4).setValues(monthlyRows);

  const categoryStart = 11 + monthlyRows.length;
  sheet.getRange(categoryStart, 1, 1, 4).setValues([['カテゴリー', '収入', '支出', '残高']]);
  if (categoryRows.length) sheet.getRange(categoryStart + 1, 1, categoryRows.length, 4).setValues(categoryRows);

  const storeStart = categoryStart + categoryRows.length + 3;
  sheet.getRange(storeStart, 1, 1, 4).setValues([['店名', '収入', '支出', '残高']]);
  if (storeRows.length) sheet.getRange(storeStart + 1, 1, storeRows.length, 4).setValues(storeRows);

  formatSummarySheet_(sheet);
  return { ok: true, count: rows.length };
}

function createAnnualGraphs(year) {
  const graphSheet = resetSheet_(year + '年間グラフ');
  const rows = getTransactions_().filter(function(tx) { return tx.year === Number(year); });
  clearCharts_(graphSheet);

  graphSheet.getRange(1, 1).setValue(year + '年 年間グラフ').setFontSize(18).setFontWeight('bold');
  const monthlyRows = [['月', '収入', '支出', '残高']].concat(summarizeAnnualByMonth_(rows));
  const categoryRows = buildChartRows_('カテゴリー', '支出', summarizeExpenseOnly_(rows, 'category'));
  const storeRows = buildChartRows_('店名', '支出', summarizeExpenseOnly_(rows, 'store'));

  graphSheet.getRange(3, 1, monthlyRows.length, 4).setValues(monthlyRows);
  graphSheet.getRange(3, 6, categoryRows.length, 2).setValues(categoryRows);
  graphSheet.getRange(3, 9, storeRows.length, 2).setValues(storeRows);

  graphSheet.insertChart(graphSheet.newChart().setChartType(Charts.ChartType.COLUMN).addRange(graphSheet.getRange(3, 1, monthlyRows.length, 4)).setOption('title', '月別収入・支出・残高グラフ').setPosition(3, 12, 0, 0).build());
  graphSheet.insertChart(graphSheet.newChart().setChartType(Charts.ChartType.PIE).addRange(graphSheet.getRange(3, 6, categoryRows.length, 2)).setOption('title', 'カテゴリー別年間支出グラフ').setPosition(20, 12, 0, 0).build());
  graphSheet.insertChart(graphSheet.newChart().setChartType(Charts.ChartType.PIE).addRange(graphSheet.getRange(3, 9, storeRows.length, 2)).setOption('title', '店名別年間支出グラフ').setPosition(37, 12, 0, 0).build());
  formatSummarySheet_(graphSheet);
}

function summarizeAnnualByMonth_(rows) {
  const map = {};
  for (let month = 1; month <= 12; month++) map[month] = { income: 0, expense: 0, balance: 0 };

  rows.forEach(function(row) {
    if (row.type === '収入') map[row.month].income += row.amount;
    if (row.type === '支出') map[row.month].expense += row.amount;
    map[row.month].balance = map[row.month].income - map[row.month].expense;
  });
  return Object.keys(map).map(function(month) {
    return [Number(month) + '月', map[month].income, map[month].expense, map[month].balance];
  });
}

function formatDate_(date) {
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function csvCell_(value) {
  const text = String(value == null ? '' : value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
