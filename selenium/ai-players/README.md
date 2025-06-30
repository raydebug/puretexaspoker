# 🤖 UI-Based AI Players for Poker

This system creates AI players that interact with the poker game through the actual browser UI, just like human players. They use Selenium WebDriver to click buttons, read cards, and make decisions based on what they see on screen.

## 🎯 **Why UI-Based AI Players?**

### **Advantages over WebSocket-only bots:**
- **🔍 Full Stack Testing**: Tests the entire UI/UX stack, not just backend logic
- **🎭 Realistic Behavior**: Indistinguishable from human players from the system's perspective  
- **🐛 Bug Detection**: Can catch UI bugs that WebSocket bots would miss
- **📊 Load Testing**: Tests UI responsiveness under realistic conditions
- **🎮 Demo Ready**: Perfect for demonstrations and showcases

### **Use Cases:**
- **QA Testing**: Automated testing of complete user flows
- **Load Testing**: Simulate realistic user behavior at scale
- **Demonstrations**: Show off the poker platform to stakeholders
- **Development**: Test new features with realistic multi-player scenarios
- **Training**: Practice against different AI personalities

## 🚀 **Quick Start**

### **1. Prerequisites**
```bash
# Make sure servers are running
npm run start  # Starts both backend (port 3001) and frontend (port 3000)
```

### **2. Run AI-Only Demo**
```bash
# 4 AI players with different personalities
cd selenium
node ai-demo.js
```

### **3. Run Human vs AI Demo**
```bash
# 3 AI opponents + you can join as human
cd selenium  
node ai-demo.js human-vs-ai
```

Then open http://localhost:3000 and join Table 1 to play against the AIs!

## 🧠 **AI Personalities**

### **Aggressive Bot** 🔥
- **Strategy**: Raises frequently, high aggression
- **Behavior**: 70% chance to bet/raise, quick decisions
- **Bluff Rate**: 40%
- **Reaction Time**: 1.5 seconds

### **Conservative Bot** 🛡️  
- **Strategy**: Plays tight, folds often
- **Behavior**: Only bets with strong hands
- **Bluff Rate**: 10%
- **Reaction Time**: 3 seconds

### **Bluffer Bot** 🎭
- **Strategy**: Makes big bluffs, unpredictable
- **Behavior**: Large bets to intimidate
- **Bluff Rate**: 70%
- **Reaction Time**: 2 seconds

### **Balanced Bot** ⚖️
- **Strategy**: Mixed strategy, moderate aggression
- **Behavior**: Adapts to game flow
- **Bluff Rate**: 30%
- **Reaction Time**: 2.5 seconds

## 🔧 **Advanced Usage**

### **Custom AI Player**
```javascript
const { UIAIPlayer } = require('./ai-players/uiAIPlayer');

const customAI = new UIAIPlayer({
  name: 'MyCustomBot',
  personality: 'aggressive',
  reactionTime: 2000,
  aggressionFactor: 0.8,
  bluffFrequency: 0.5
});

await customAI.initialize();
await customAI.joinGame(1);
```

### **Mass AI Testing**
```javascript
// Create 10 AI players for stress testing
const ais = [];
for (let i = 0; i < 10; i++) {
  const ai = new UIAIPlayer({
    name: `StressTest_${i}`,
    personality: ['aggressive', 'conservative', 'balanced'][i % 3],
    reactionTime: 1000 + Math.random() * 2000
  });
  ais.push(ai);
}
```

## 🎮 **How It Works**

### **1. Browser Automation**
- Each AI gets its own Chrome browser instance
- Uses Selenium WebDriver for UI interaction
- Completely isolated user data directories

### **2. Game State Reading**
```javascript
// AI reads the UI to understand game state
await this.readGameState();  // Reads cards, chips, pot size
if (await this.isMyTurn()) { // Checks for enabled action buttons
  await this.makeDecision(); // Clicks appropriate button
}
```

### **3. Decision Making**
```javascript
// Different strategies based on personality
calculateDecision(actions) {
  switch (this.config.personality) {
    case 'aggressive': return this.aggressiveStrategy(actions);
    case 'conservative': return this.conservativeStrategy(actions);
    case 'bluffer': return this.blufferStrategy(actions);
    default: return this.balancedStrategy(actions);
  }
}
```

### **4. Realistic Timing**
- Configurable "thinking time" delays
- Random variations to simulate human behavior
- Different reaction speeds per personality

## 🔬 **Integration with Existing Tests**

### **Enhance Selenium Tests**
```javascript
// Add AI players to existing test scenarios
const ai1 = new UIAIPlayer({ name: 'TestBot1', personality: 'balanced' });
const ai2 = new UIAIPlayer({ name: 'TestBot2', personality: 'aggressive' });

// Use in multi-player test scenarios
await ai1.initialize();
await ai2.initialize();
await Promise.all([ai1.joinGame(1), ai2.joinGame(1)]);
```

### **Cucumber Integration**
```gherkin
Given I have 2 AI players and 1 human player at the table
When the AI players make their moves
Then the game should progress normally
And all players should see consistent game state
```

## 📊 **Performance Considerations**

### **Browser Resources**
- Each AI uses ~100MB RAM per browser instance
- Recommend max 10 concurrent AI players on standard hardware
- Use `HEADLESS=true` for reduced resource usage

### **Optimization Tips**
```javascript
// Headless mode for better performance
process.env.HEADLESS = 'true';

// Faster reaction times for stress testing
const speedyAI = new UIAIPlayer({
  name: 'SpeedTest',
  reactionTime: 500, // Very fast
  personality: 'balanced'
});
```

## 🐛 **Troubleshooting**

### **Common Issues**

**Chrome crashes:**
```bash
# Clear old browser data
rm -rf /tmp/ai_player_*
```

**Login failures:**
```javascript
// Check if UI elements match your implementation
// Update selectors in uiAIPlayer.js if needed
By.css('input[placeholder*="nickname"]') // Update this selector
```

**Seat selection issues:**
```javascript
// Verify seat selection UI matches expectations  
By.css('.seat:not(.occupied)') // Update this selector
```

### **Debug Mode**
```javascript
// Enable verbose logging
const debugAI = new UIAIPlayer({
  name: 'DebugBot',
  debug: true // Add this flag for extra logging
});
```

## 🎯 **Use Cases in Production**

### **1. QA Automation**
- Automated regression testing of poker flows
- Multi-player scenario validation
- UI responsiveness testing

### **2. Load Testing**  
- Simulate realistic user behavior patterns
- Test server performance under realistic conditions
- Validate WebSocket connection stability

### **3. Product Demos**
- Showcase poker platform to stakeholders  
- Demonstrate multi-player functionality
- Show AI vs human interaction

### **4. Development Support**
- Test new features with multiple players
- Validate game logic with realistic scenarios
- Debug UI issues with consistent players

## 📈 **Future Enhancements**

### **Planned Features**
- **🧠 Advanced AI**: Hand strength evaluation, position awareness
- **📊 Analytics**: AI performance tracking, win rate analysis  
- **🎨 Customization**: More personality types, custom strategies
- **🔧 Integration**: API for external AI systems
- **📱 Mobile**: Support for mobile UI testing

### **Contributing**
Want to improve the AI players? Check areas for enhancement:
- Better hand evaluation logic
- More sophisticated betting strategies  
- Tournament play support
- Multi-table management

---

## 🚀 **Ready to Play?**

Start your servers and run the demo:
```bash
npm run start        # Start poker servers
cd selenium          # Navigate to selenium directory  
node ai-demo.js      # Watch AIs play each other
# OR
node ai-demo.js human-vs-ai  # Play against AIs yourself!
```

**Have fun watching (or playing against) your AI poker opponents!** 🎰🤖 