# 轻量级测试目录迁移

## 📁 目录结构

```
tests/
├── unit/                                      # 轻量级单元测试
│   ├── README.md                              # 完整使用说明
│   ├── test-player-call-action-api.sh        # API 端点测试
│   ├── verify-player4-call-step-definitions.js # 代码验证
│   ├── test-mock-backend-server.js            # Mock 服务器测试
│   ├── test-session-data-socket-io.js         # Socket.IO 连接测试
│   ├── test-single-screenshot-capture.js      # 截图功能测试
│   └── setup-manual-test-environment.sh       # 手动测试环境准备
├── scripts/
│   └── test_bet_fix.sh
├── cucumber.js
└── test_results_history.md
```

## 🎯 文件命名规则

所有测试文件现在使用**清晰的描述性名称**：

| 旧名称 | 新名称 | 说明 |
|--|--|--|
| `quick_test.sh` | `test-player-call-action-api.sh` | 清晰指向 Player CALL 动作 API |
| `verify_fix.js` | `verify-player4-call-step-definitions.js` | 明确指向 Player4 CALL 步骤定义验证 |
| `test-mock-server.js` | `test-mock-backend-server.js` | 明确指向 Mock 后端服务器 |
| `prepare_manual_test.sh` | `setup-manual-test-environment.sh` | 清晰的动词+对象结构 |
| `simple-screenshot-test.js` | `test-single-screenshot-capture.js` | 更清晰的功能描述 |
| `test-session-data-fix.js` | `test-session-data-socket-io.js` | 明确指向 Socket.IO 层面 |

## ✨ 命名约定

- **动作优先**: `test-{what}` 或 `verify-{what}` 或 `setup-{what}`
- **对象清晰**: 明确指向被测试的组件或功能
- **避免缩写**: 使用完整单词，不用 `quick`、`simple` 这样模糊的词
- **使用连字符**: `test-player-call` 而不是 `testPlayerCall`

## 🚀 快速使用

### 代码级验证（<1秒）
```bash
node tests/unit/verify-player4-call-step-definitions.js
```

### API 端点验证（~20秒）
```bash
bash tests/unit/test-player-call-action-api.sh
```

### Mock 服务器测试（~5秒）
```bash
node tests/unit/test-mock-backend-server.js
```

### Socket.IO 连接测试（~5秒）
```bash
node tests/unit/test-session-data-socket-io.js
```

### 环境准备（~30秒）
```bash
bash tests/unit/setup-manual-test-environment.sh
```

## 📚 详细说明

访问 [tests/unit/README.md](README.md) 获取每个测试的详细使用说明。

## 🔄 路径兼容性

所有脚本已更新，现在可以从任何目录执行：
- ✅ 使用相对路径而不是绝对路径
- ✅ 自动定位项目根目录
- ✅ 无需修改即可直接运行

## 📝 后续维护

新增轻量级测试时：
1. 放在 `tests/unit/` 目录
2. 使用清晰的描述性名称
3. 在 `tests/unit/README.md` 中添加说明
4. 确保使用相对路径
