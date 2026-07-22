# 📅 日程规划 Schedule Planner

个人日程规划工具，支持 Mac 和 iPhone 跨设备使用。

## 功能

- 📆 **日历视图** — 月/周/日视图，拖拽调整时间
- 📊 **甘特图** — 项目里程碑时间线，进度追踪
- 📋 **列表视图** — 按状态/优先级/分类筛选排序
- 🔔 **提醒通知** — macOS 系统通知 + 浏览器通知
- 🏷️ **分类与标签** — 颜色标识、灵活筛选
- 📱 **iPhone 支持** — PWA，添加到主屏幕即可使用
- 🌗 **暗色模式** — 自动适配系统主题
- 📥 **数据导入导出** — JSON 格式备份

## 快速开始

```bash
# 1. 安装依赖
cd schedule-planner
pip install -r requirements.txt

# 2. 启动
python run.py

# 浏览器自动打开 http://localhost:8765
```

## iPhone 访问

1. 确保 iPhone 与 Mac 连接同一个 WiFi
2. 启动程序后，终端会显示 iPhone 访问地址（如 `http://192.168.1.5:8765`）
3. 在 iPhone Safari 中打开该地址
4. 点击「分享」→「添加到主屏幕」
5. 之后可以像原生 App 一样从桌面图标打开

## API 文档

启动后访问 http://localhost:8765/docs 查看 Swagger API 文档。

## 技术栈

- **后端**: FastAPI + SQLAlchemy + SQLite
- **前端**: Alpine.js + FullCalendar + Frappe Gantt + Pico.css
- **通知**: macOS osascript + Web Notification API
