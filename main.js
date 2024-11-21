const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 定義欄位配置
const FIELD_CONFIG = [
  { name: '商品代碼', start: 0, length: 12 },
  { name: '公司代號', start: 12, length: 2 },
  { name: '分支機構代號', start: 14, length: 2 },
  { name: '保單號碼', start: 16, length: 12 },
  { name: '批單號碼', start: 28, length: 12 },
  { name: '保批單性質代號', start: 40, length: 1 },
  { name: '幣別', start: 41, length: 2 },
  { name: '保險金額正負號', start: 43, length: 1 },
  { name: '保險金額', start: 44, length: 11 },
  { name: '保費金額正負號', start: 55, length: 1 },
  { name: '保費金額', start: 56, length: 11 },
  { name: '出險原因代號', start: 67, length: 2 },
  { name: '貨物類別代號', start: 69, length: 3 },
  { name: '承保條件', start: 72, length: 1 },
  { name: '進出口別代號', start: 73, length: 1 },
  { name: '航程國家代號', start: 74, length: 4 },
  { name: '運輸方法代號', start: 78, length: 1 },
  { name: '啟航年月', start: 79, length: 6 },
  { name: '簽單日期', start: 85, length: 8 },
  { name: '保單出單年度', start: 93, length: 4 },
  { name: '批單交易型態代號', start: 97, length: 1 },
  { name: '通路別代號', start: 98, length: 2 },
  { name: '資料製送日期', start: 100, length: 8 },
  { name: '純保費金額正負號', start: 108, length: 1 },
  { name: '純保費金額', start: 109, length: 11 }
];

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 處理檔案選擇
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  });
  return result.filePaths;
});

// 輔助函數：為CSV欄位加上引號，處理包含逗號的情況
function escapeCSV(field) {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// 處理檔案內容並輸出CSV
ipcMain.handle('process-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // 準備轉置後的CSV內容
    let csvContent = [];
    
    // 第一列: 空白,資料1,資料2,資料3,...
    let firstRow = [' '];
    for (let i = 0; i < lines.length; i++) {
      firstRow.push(`資料${i + 1}`);
    }
    csvContent.push(firstRow.map(escapeCSV).join(','));
    
    // 欄位名稱在最左邊，後面接著每筆資料的對應值
    FIELD_CONFIG.forEach(field => {
      let row = [field.name];
      lines.forEach(line => {
        const value = line.substr(field.start, field.length).trim();
        row.push(escapeCSV(value));
      });
      csvContent.push(row.join(','));
    });
    
    // 寫入檔案
    const outputPath = filePath.replace('.txt', '_output.csv');
    fs.writeFileSync(outputPath, '\uFEFF' + csvContent.join('\n')); // 加入 BOM 以支援中文
    
    return { success: true, path: outputPath };
  } catch (error) {
    console.error('Error processing file:', error);
    return { success: false, error: error.message };
  }
});