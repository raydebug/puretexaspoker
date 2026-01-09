# Port Conflict Resolution Guide

This guide explains how to resolve "Port already in use" errors that occur when running the Texas Hold'em Poker Game development servers and tests.

## 🔥 Quick Fix

If you're getting port conflict errors, run this command:

```bash
npm run cleanup:force
```

This will force-kill all development servers and free up ports 3000 and 3001.

## 🚨 Common Port Conflict Scenarios

### Scenario 1: "Port 3000 is already in use"
**Cause**: Frontend development server (Vite/React) is still running from a previous session
**Solution**: Run `npm run cleanup:force` to kill all frontend processes

### Scenario 2: "Port 3001 is already in use"  
**Cause**: Backend development server (Node.js/TypeScript) is still running
**Solution**: Run `npm run cleanup:force` to kill all backend processes

### Scenario 3: Test script fails with port conflicts
**Cause**: Previous test run didn't clean up properly, servers are still running
**Solution**: The test script `npm run test:5player:full` now automatically handles this

## 🛠️ Available Tools

### 1. Automatic Cleanup (Recommended)
The main verification script now includes automatic port conflict resolution:

```bash
./run_verification.sh
```

Or via npm:

```bash
npm run test:5player:full
```

**What it does:**
- ✅ Force kills existing processes on ports 3000 and 3001 using `./scripts/force-cleanup-servers.sh`
- ✅ Verifies ports are free before starting servers
- ✅ Provides detailed logging of cleanup actions
- ✅ Automatically cleans up after test completion

### 2. Manual Force Cleanup
For manual cleanup when needed:

```bash
npm run cleanup:force
```

**What it does:**
- 🔥 Kills all Node.js development servers
- 🔥 Force terminates processes using ports 3000 and 3001
- 🔥 Cleans up webpack, vite, and build tool processes
- 🔥 Removes test-related processes (cucumber, selenium, chromedriver)
- ✅ Verifies ports are free after cleanup

### 3. Direct Script Execution
You can also run the cleanup script directly:

```bash
./scripts/force-cleanup-servers.sh
```

## 🔍 Manual Diagnosis

If you need to manually check what's using your ports:

### Check Port 3000 (Frontend)
```bash
lsof -i :3000
```

### Check Port 3001 (Backend)
```bash
lsof -i :3001
```

### Kill Specific Process
```bash
kill -9 <PID>
```

## 🧹 What Gets Cleaned Up

The force cleanup process terminates:

### Development Servers
- `ts-node src/server.ts` (Backend)
- `react-scripts start` (React dev server)
- `vite` (Vite dev server)
- `npm start` processes

### Build Tools
- `webpack` processes
- `webpack-dev-server`
- `@esbuild` processes

### Test Processes
- `cucumber` test runners
- `selenium` WebDriver instances
- `chromedriver` browser drivers

### Port-Specific Cleanup
- Any process using port 3000 (Frontend)
- Any process using port 3001 (Backend)

## 📊 Enhanced Verification Script Features

The `run_verification.sh` script now includes:

### Pre-Run Cleanup
```bash
🔥 Force closing all existing servers to prevent port conflicts...
🗑️ Killing Node.js server processes by pattern...
🔥 Force killing processes on target ports...
✅ Port 3000 is free and available
✅ Port 3001 is free and available
```

### Post-Run Cleanup
```bash
🧹 Enhanced cleanup - ensuring all processes are terminated...
✅ All services stopped and ports freed.
```

## 🚀 Best Practices

### 1. Always Use the Main Verification Script
```bash
npm run test:5player:full
```
This handles all cleanup automatically.

### 2. Clean Up After Development Sessions
```bash
npm run cleanup:force
```
Run this when you're done developing to ensure clean slate.

### 3. Before Starting Development
```bash
npm run cleanup:force
npm start
```
Ensure clean environment before starting servers.

## 🐛 Troubleshooting

### Problem: Cleanup script reports port still in use
**Solution**: Some processes may require additional time to terminate
```bash
# Wait a few seconds and try again
sleep 5
npm run cleanup:force
```

### Problem: Permission denied when killing processes
**Solution**: Some processes may require sudo (use with caution)
```bash
sudo npm run cleanup:force
```

### Problem: Ports freed but servers won't start
**Solution**: Check for other applications using the ports
```bash
# Check what else might be using the ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
```

## ⚡ Integration with CI/CD

The enhanced cleanup is automatically integrated into:
- Test scripts
- Development workflows  
- Server startup scripts

No additional configuration needed - it just works!

## 🎯 Success Indicators

When cleanup is successful, you'll see:
```
🎉 SUCCESS: All servers cleaned up successfully!
   📊 Port 3000 (frontend): Available
   📊 Port 3001 (backend): Available
   🚀 Ready to start fresh development servers
```

The enhanced port conflict resolution ensures reliable test execution and development experience!